// Vercel Edge Function — analiza un ticket con OpenRouter (modelos de visión gratuitos)
export const config = { runtime: 'edge' };

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const VISION_MODELS = [
  'nvidia/nemotron-nano-12b-v2-vl:free',       // OCR especializado
  'google/gemma-4-26b-a4b-it:free',            // multimodal Google
  'google/gemma-4-31b-it:free',                // multimodal Google
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', // multimodal NVIDIA
];

const PROMPT = `Analiza esta imagen de un ticket de compra y extrae los datos.
Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto extra):
{
  "storeName": "nombre del comercio o null",
  "total": 37.27,
  "items": [
    {"name": "Nombre del producto", "totalPrice": 0.95}
  ]
}
Reglas ESTRICTAS:
- INCLUYE los productos comprados con precio POSITIVO (mayor que 0).
- INCLUYE también los descuentos y ofertas como items con totalPrice NEGATIVO (ej: -1.50). Así la suma de todos los items coincide con el total pagado.
- EXCLUYE: impuestos (IVA, IGF), subtotales, totales parciales, forma de pago, puntos de fidelidad, líneas de texto sin precio.
- Para productos por peso (ej: "0.424kg x 5.99/kg = 2.54") usa el precio final (2.54) y el nombre de la línea anterior.
- Para descuentos usa un nombre descriptivo (ej: "Descuento socio", "Oferta 2x1", "Cupón") y totalPrice negativo.
- Normaliza los nombres: primera letra mayúscula, resto minúsculas.
- El ticket puede estar en español, catalán u otro idioma.
- total = importe final pagado (línea TOTAL, ya con descuentos aplicados).`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Falta OPENROUTER_API_KEY. Obtén una clave GRATIS en openrouter.ai → Keys → Create Key y añádela en Vercel → Settings → Environment Variables → OPENROUTER_API_KEY.',
      }),
      { status: 500, headers: CORS }
    );
  }

  let body: { image?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: CORS }); }

  if (!body.image) return new Response(JSON.stringify({ error: 'No se recibió imagen' }), { status: 400, headers: CORS });

  // Validar formato data URL
  if (!body.image.match(/^data:[^;]+;base64,/)) {
    return new Response(JSON.stringify({ error: 'Formato de imagen inválido' }), { status: 400, headers: CORS });
  }

  try {
    let result: Response | null = null;
    let lastError = '';
    for (const model of VISION_MODELS) {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: body.image } },
              { type: 'text', text: PROMPT },
            ],
          }],
          temperature: 0,
          max_tokens: 2000,
        }),
      });
      if (res.ok) { result = res; break; }
      lastError = await res.text();
      // 400/404 = modelo no disponible, 429/503 = límite de cuota → intentar siguiente
      if (res.status !== 429 && res.status !== 503 && res.status !== 404 && res.status !== 400) {
        return new Response(JSON.stringify({ error: `Error OpenRouter ${res.status}: ${lastError}` }), { status: 500, headers: CORS });
      }
    }

    if (!result) {
      return new Response(JSON.stringify({ error: `Sin modelos disponibles. ${lastError}` }), { status: 429, headers: CORS });
    }

    const data = await result.json() as {
      choices: { message: { content: string } }[];
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const clean = content.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), { status: 200, headers: CORS });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: CORS }
    );
  }
}
