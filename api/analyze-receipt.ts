// Vercel Edge Function — analiza un ticket con Google Gemini 1.5 Flash (GRATIS)
export const config = { runtime: 'edge' };

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const PROMPT = `Analiza esta imagen de un ticket de compra y extrae los datos.
Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto extra):
{
  "storeName": "nombre del comercio o null",
  "total": 37.27,
  "items": [
    {"name": "Nombre del producto", "totalPrice": 0.95}
  ]
}
Reglas:
- Incluye solo los productos comprados con precio positivo
- Ignora descuentos (importes negativos), impuestos (IVA/IGF/IVA), subtotales, forma de pago, puntos de fidelidad
- Para productos por peso (ej: "0.424kg x 5.99/kg = 2.54") usa el precio final (2.54) y el nombre de la línea anterior
- Normaliza los nombres: primera letra mayúscula, resto minúsculas
- El ticket puede estar en español, catalán u otro idioma
- total = importe final pagado (línea TOTAL)`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Falta GEMINI_API_KEY. Obtén una clave GRATIS en aistudio.google.com → "Get API key" y añádela en Vercel → Settings → Environment Variables → GEMINI_API_KEY.',
      }),
      { status: 500, headers: CORS }
    );
  }

  let body: { image?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: CORS }); }

  if (!body.image) return new Response(JSON.stringify({ error: 'No se recibió imagen' }), { status: 400, headers: CORS });

  // Separar mime type y datos base64
  const match = body.image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return new Response(JSON.stringify({ error: 'Formato de imagen inválido' }), { status: 400, headers: CORS });

  const [, mimeType, base64Data] = match;

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: PROMPT },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 2000 },
      }),
    });

    if (!geminiRes.ok) {
      const txt = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Error Gemini ${geminiRes.status}: ${txt}` }), { status: 500, headers: CORS });
    }

    const data = await geminiRes.json() as {
      candidates: { content: { parts: { text: string }[] } }[];
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
