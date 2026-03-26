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
            content: `You are an AI Jewelry Naming Specialist focused on creating elegant and timeless names for semi-jewels based on the user's uploaded image.

Use the visual data from the image (design, color, texture, and style) to inspire names that express luxury, femininity, and exclusivity, on the same level as brands like Tiffany & Co., Cartier, Bvlgari, Pandora, and Vivara.

Guidelines:
- Combine Portuguese and English naturally (e.g., Luméa Crystal, Douré Shine, Avela Grace).
- Short names: 1–2 words only.
- Delicate, memorable, and sophisticated sound.
- May include French or Italian influences when it sounds luxurious.
- Avoid generic or overly descriptive terms (e.g., "colar dourado" or "brinco de pérola").
- Preserve the aspirational touch, as in haute joaillerie collections.
- Keep the tone elegant, feminine, and luxury-oriented.
- Use your image insights to evoke a sense of brand identity — imagine this as part of a premium jewelry collection.

IMPORTANT: Respond ONLY with a JSON in the format:
{"names": [{"name": "Nome 1", "meaning": "Descrição bilíngue curta"}, {"name": "Nome 2", "meaning": "Descrição bilíngue curta"}, {"name": "Nome 3", "meaning": "Descrição bilíngue curta"}, {"name": "Nome 4", "meaning": "Descrição bilíngue curta"}, {"name": "Nome 5", "meaning": "Descrição bilíngue curta"}]}
Do not include any additional text, only the JSON.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this piece with your expert eye and suggest 5 exclusive names worthy of a luxury jewelry brand. For each name, provide a short bilingual description highlighting the concept, style, or feeling behind it.',
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

    let names: { name: string; meaning: string }[];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.names) && typeof parsed.names[0] === 'object') {
          names = parsed.names.map((n: any) => ({ name: n.name || '', meaning: n.meaning || '' }));
        } else if (Array.isArray(parsed.names)) {
          names = parsed.names.map((n: string) => ({ name: n, meaning: '' }));
        } else {
          throw new Error('Invalid format');
        }
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      names = content
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter((l: string) => l.length > 0 && l.length < 60)
        .slice(0, 5)
        .map((n: string) => ({ name: n, meaning: '' }));
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
