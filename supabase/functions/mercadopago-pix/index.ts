import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado. Adicione nas secrets do projeto.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { pedido_id, valor, descricao, email_cliente, nome_cliente } = await req.json();

    if (!pedido_id || !valor) {
      return new Response(JSON.stringify({ error: 'pedido_id e valor são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Pix payment via Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': pedido_id,
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        description: descricao || `Pedido ${pedido_id}`,
        payment_method_id: 'pix',
        payer: {
          email: email_cliente || 'cliente@email.com',
          first_name: nome_cliente || 'Cliente',
        },
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', JSON.stringify(mpData));
      throw new Error(`Erro Mercado Pago [${mpResponse.status}]: ${mpData.message || JSON.stringify(mpData)}`);
    }

    const pixInfo = mpData.point_of_interaction?.transaction_data;
    const qrCodeBase64 = pixInfo?.qr_code_base64 || null;
    const pixText = pixInfo?.qr_code || null;

    // Save to transacoes_pix
    const { error: insertError } = await supabase.from('transacoes_pix').insert({
      pedido_id,
      valor: Number(valor),
      id_mercadopago: String(mpData.id),
      status: 'pendente',
      qr_code_base64: qrCodeBase64,
      pix_text: pixText,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Erro ao salvar transação Pix: ' + insertError.message);
    }

    // Update order status
    await supabase.from('pedidos').update({ status_pedido: 'aguardando_pagamento' }).eq('id', pedido_id);

    return new Response(JSON.stringify({
      success: true,
      id_mercadopago: mpData.id,
      qr_code_base64: qrCodeBase64,
      pix_text: pixText,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
