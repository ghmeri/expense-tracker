// Vercel Function (Node.js) — analiza un ticket con OpenRouter (modelos de visión gratuitos)

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const VISION_MODELS = [
  'google/gemma-4-31b-it:free',                // multimodal Google
  'google/gemma-4-26b-a4b-it:free',            // multimodal Google
  'qwen/qwen3.8-27b:free',                     // multimodal Qwen
];
// Runtime Node.js (no Edge): sin el límite de 25 s para empezar a responder
const TIMEOUT_MS = 50_000;

type Parsed = { storeName?: string | null; total?: number; items?: { name?: string; totalPrice?: number }[] };

class AuthError extends Error {}

/** Pide el análisis a un modelo; lanza si falla o no devuelve JSON utilizable */
async function askModel(model: string, image: string, apiKey: string, signal: AbortSignal): Promise<Parsed> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
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
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
        temperature: 0,
        max_tokens: 2000,
      }),
      signal,
    });
  } catch (err) {
    throw new Error(`${model}: ${err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : err instanceof Error ? err.message : 'error de red'}`);
  }
  if (res.status === 401 || res.status === 402) {
    throw new AuthError(`Error OpenRouter ${res.status}: revisa OPENROUTER_API_KEY. ${await res.text()}`);
  }
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 150)}`);

  // OpenRouter puede devolver 200 con un error del proveedor o contenido vacío
  const data = await res.json() as {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  // Extraer el bloque JSON aunque haya texto antes/después
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`${model}: ${data.error?.message ?? 'respuesta sin JSON'}`);
  try { return JSON.parse(jsonMatch[0]); }
  catch { throw new Error(`${model}: JSON mal formado`); }
}

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
- INCLUYE los descuentos y ofertas como items con totalPrice NEGATIVO (ej: -1.50). Así el usuario ve qué ha ahorrado.
- EXCLUYE SIEMPRE: la línea TOTAL, SUBTOTAL, la línea de pago (Targetes, Tarjeta, Efectiu, Efectivo, Cash, CARVI), IVA, IGF, puntos de fidelidad, Targeta client, líneas sin precio.
- EXCLUYE líneas de desglose de pack/unidades (ej: "2 unitats x 3.85", "unitat x 1.49") — son informativas del cálculo, el precio ya está en la línea del producto.
- Para productos por peso (ej: "0.424kg x 5.99/kg = 2.54") usa el precio final (2.54) y el nombre de la línea anterior.
- Para descuentos usa un nombre descriptivo (ej: "Descuento 50% President", "Dto. Bultoni") y totalPrice negativo.
- Normaliza los nombres: primera letra mayúscula, resto minúsculas.
- El ticket puede estar en español, catalán u otro idioma.
- total = importe final pagado (línea TOTAL, ya con descuentos aplicados).`;

async function handler(req: Request): Promise<Response> {
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
    // Todos los modelos en paralelo: gana el primero que devuelva JSON válido
    const winner = new AbortController();
    const signal = AbortSignal.any([winner.signal, AbortSignal.timeout(TIMEOUT_MS)]);
    let parsed: Parsed;
    try {
      parsed = await Promise.any(VISION_MODELS.map(m => askModel(m, body.image!, apiKey, signal)));
    } catch (err) {
      const errors = err instanceof AggregateError ? err.errors as Error[] : [err as Error];
      const auth = errors.find(e => e instanceof AuthError);
      if (auth) return new Response(JSON.stringify({ error: auth.message }), { status: 500, headers: CORS });
      return new Response(JSON.stringify({
        error: `No se pudo analizar el ticket (modelos gratuitos saturados o sin respuesta). Inténtalo de nuevo. ${errors.map(e => e.message).join(' | ')}`,
      }), { status: 503, headers: CORS });
    } finally {
      winner.abort(); // cancelar las peticiones que sigan en curso
    }

    // Filtro servidor: eliminar solo líneas de pago, cero y duplicados de pack
    const PAYMENT_RE = /^\s*(targetes?|tarjeta|efectiu|efectivo|cash|carvi|total|subtotal|iva|igf)/i;
    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.filter((item: { name?: string; totalPrice?: number }) =>
        typeof item.totalPrice === 'number' &&
        item.totalPrice !== 0 &&
        !PAYMENT_RE.test(item.name ?? '')
      );
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: CORS });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: CORS }
    );
  }
}

export default { fetch: handler };
