import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: 'Envie uma imagem' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é uma especialista em design de joias de luxo, com profundo conhecimento em semijoias, bijuterias finas e alta joalheria. Ao analisar a foto de uma peça, você identifica:
- O tipo de peça (brinco, colar, anel, pulseira, etc.)
- Materiais aparentes (cristais, pérolas, pedras, banho de ouro, etc.)
- Estilo do design (clássico, moderno, boho, minimalista, etc.)
- Detalhes distintivos (formas, texturas, acabamentos)

Com base nisso, você cria nomes elegantes, sofisticados e comercialmente atrativos para a peça. Os nomes devem ser curtos (2-4 palavras), em português, e evocar luxo e exclusividade.

IMPORTANTE: Responda APENAS com um JSON no formato: {"names": ["Nome 1", "Nome 2", "Nome 3", "Nome 4", "Nome 5"]}
Não inclua nenhum texto adicional, apenas o JSON.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta peça de semijoia e sugira 5 nomes exclusivos e sofisticados para ela.',
              },
              {
                type: 'image_url',
                image_url: { url: image },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos em Configurações.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`Erro na IA: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let names: string[];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        names = parsed.names || [];
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Fallback: try to extract names from text
      names = content
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter((l: string) => l.length > 0 && l.length < 60)
        .slice(0, 5);
    }

    return new Response(JSON.stringify({ names: names.slice(0, 5) }), {
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
