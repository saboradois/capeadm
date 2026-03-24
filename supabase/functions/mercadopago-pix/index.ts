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
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get('content-type') || '';

    // Handle Mercado Pago webhook notification
    if (req.method === 'POST' && req.url.includes('?source=webhook')) {
      const body = await req.json();
      console.log('Webhook received:', JSON.stringify(body));

      if (body.type === 'payment' && body.data?.id) {
        const paymentId = String(body.data.id);

        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
        });
        const mpData = await mpRes.json();
        console.log('Payment status from MP:', mpData.status, 'for payment:', paymentId);

        if (mpData.status === 'approved') {
          const { data: txData } = await supabase
            .from('transacoes_pix')
            .update({ status: 'pago' })
            .eq('id_mercadopago', paymentId)
            .select('pedido_id')
            .single();

          if (txData?.pedido_id) {
            await supabase
              .from('pedidos')
              .update({ status_pedido: 'pago' })
              .eq('id', txData.pedido_id);
            console.log('Pedido atualizado para pago:', txData.pedido_id);
          }
        } else if (mpData.status === 'rejected' || mpData.status === 'cancelled') {
          const { data: txData } = await supabase
            .from('transacoes_pix')
            .update({ status: 'cancelado' })
            .eq('id_mercadopago', paymentId)
            .select('pedido_id')
            .single();

          if (txData?.pedido_id) {
            await supabase
              .from('pedidos')
              .update({ status_pedido: 'cancelado' })
              .eq('id', txData.pedido_id);
          }
        }
      }

      // Handle merchant_order webhook (from checkout preferences)
      if (body.type === 'merchant_order' && body.data?.id) {
        const orderId = String(body.data.id);
        const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
        });
        const moData = await moRes.json();
        console.log('Merchant order status:', moData.order_status, 'for order:', orderId);

        if (moData.order_status === 'paid' && moData.external_reference) {
          // external_reference is the pedido_id
          await supabase
            .from('transacoes_pix')
            .update({ status: 'pago' })
            .eq('pedido_id', moData.external_reference)
            .eq('tipo', 'cartao');

          await supabase
            .from('pedidos')
            .update({ status_pedido: 'pago' })
            .eq('id', moData.external_reference);

          console.log('Pedido cartão atualizado para pago:', moData.external_reference);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Handle status check request
    if (body.action === 'check_status') {
      const { id_mercadopago } = body;
      if (!id_mercadopago) {
        return new Response(JSON.stringify({ error: 'id_mercadopago é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id_mercadopago}`, {
        headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
      });
      const mpData = await mpRes.json();
      console.log('Check status for payment:', id_mercadopago, 'status:', mpData.status);

      let newStatus = 'pendente';
      if (mpData.status === 'approved') newStatus = 'pago';
      else if (mpData.status === 'rejected' || mpData.status === 'cancelled') newStatus = 'cancelado';

      if (newStatus !== 'pendente') {
        const { data: txData } = await supabase
          .from('transacoes_pix')
          .update({ status: newStatus })
          .eq('id_mercadopago', id_mercadopago)
          .select('pedido_id')
          .single();

        if (txData?.pedido_id) {
          const pedidoStatus = newStatus === 'pago' ? 'pago' : 'cancelado';
          await supabase
            .from('pedidos')
            .update({ status_pedido: pedidoStatus })
            .eq('id', txData.pedido_id);
        }
      }

      return new Response(JSON.stringify({ status: newStatus, mp_status: mpData.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle card payment link creation
    if (body.action === 'create_card_link') {
      const { pedido_id, valor, descricao, nome_cliente, user_id } = body;

      if (!pedido_id || !valor) {
        return new Response(JSON.stringify({ error: 'pedido_id e valor são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-pix?source=webhook`;

      const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            title: descricao || `Pedido ${pedido_id}`,
            quantity: 1,
            unit_price: Number(valor),
            currency_id: 'BRL',
          }],
          payer: {
            name: nome_cliente || 'Cliente',
          },
          payment_methods: {
            excluded_payment_types: [{ id: 'ticket' }],
          },
          external_reference: pedido_id,
          notification_url: webhookUrl,
          back_urls: {
            success: 'https://capeadm.lovable.app',
            failure: 'https://capeadm.lovable.app',
            pending: 'https://capeadm.lovable.app',
          },
          auto_return: 'approved',
        }),
      });

      const prefData = await prefResponse.json();

      if (!prefResponse.ok) {
        console.error('Mercado Pago preference error:', JSON.stringify(prefData));
        throw new Error(`Erro Mercado Pago [${prefResponse.status}]: ${prefData.message || JSON.stringify(prefData)}`);
      }

      // Save to transacoes_pix
      await supabase.from('transacoes_pix').insert({
        pedido_id,
        valor: Number(valor),
        id_mercadopago: String(prefData.id),
        status: 'pendente',
        tipo: 'cartao',
        link_pagamento: prefData.init_point,
        user_id: user_id || null,
      });

      await supabase.from('pedidos').update({ status_pedido: 'aguardando_pagamento' }).eq('id', pedido_id);

      return new Response(JSON.stringify({
        success: true,
        link_pagamento: prefData.init_point,
        id_mercadopago: prefData.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle normal Pix creation request
    const { pedido_id, valor, descricao, email_cliente, nome_cliente, user_id } = body;

    if (!pedido_id || !valor) {
      return new Response(JSON.stringify({ error: 'pedido_id e valor são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-pix?source=webhook`;

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
        notification_url: webhookUrl,
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

    const { error: insertError } = await supabase.from('transacoes_pix').insert({
      pedido_id,
      valor: Number(valor),
      id_mercadopago: String(mpData.id),
      status: 'pendente',
      tipo: 'pix',
      qr_code_base64: qrCodeBase64,
      pix_text: pixText,
      user_id: user_id || null,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Erro ao salvar transação Pix: ' + insertError.message);
    }

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
