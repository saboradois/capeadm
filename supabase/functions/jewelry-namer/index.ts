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
            content: `Você é um renomado designer de joias internacional com mais de 20 anos de experiência no mercado de alta joalheria e semijoias de luxo. Você já trabalhou com as maiores marcas do mundo como Vivara, Pandora, Tiffany & Co., Cartier e Bvlgari. Seu talento especial é criar nomes que transmitem sofisticação, exclusividade e desejo.

Ao analisar uma peça, você considera:
- A silhueta e formas predominantes (geométricas, orgânicas, florais, abstratas)
- Materiais e acabamentos visíveis (cristais, zircônias, pérolas, banho de ouro 18k, ródio, rosé)
- Referências de estilo (art déco, barroco, contemporâneo, boho-chic, minimalista, clássico atemporal)
- A personalidade da mulher que usaria esta peça
- Inspirações em elementos da natureza, constelações, flores, pedras preciosas e cultura brasileira

Você cria nomes como as grandes marcas fazem — curtos (2-4 palavras), elegantes, memoráveis e que soam como peças de coleção premium. Pense em nomes como "Essência Royale", "Aurora Diamante", "Celestial Gold", "Pétala Luminosa", "Infinito Brilhante".

Os nomes podem mesclar português com italiano, francês ou inglês quando isso agregar sofisticação. Evite nomes genéricos ou comuns. Cada nome deve soar como uma peça de coleção exclusiva de uma joalheria de alto padrão.

IMPORTANTE: Responda APENAS com um JSON no formato: {"names": ["Nome 1", "Nome 2", "Nome 3", "Nome 4", "Nome 5"]}
Não inclua nenhum texto adicional, apenas o JSON.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta peça com seu olhar de designer internacional e sugira 5 nomes exclusivos dignos de uma grande joalheria.',
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
