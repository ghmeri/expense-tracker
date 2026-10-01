// Vercel Function (Node.js) — analiza un ticket con IA, solo con modelos GRATUITOS:
// 1º Gemini (Google AI Studio, cupo gratuito propio de la clave GEMINI_API_KEY)
// 2º OpenRouter (modelos :free, cupo compartido entre todos sus usuarios → a veces 429)

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Grupos de modelos gratuitos con visión. Cada grupo es UNA petición con el parámetro
// `models` de OpenRouter, que salta al siguiente si uno da error (429 incluido).
// Los grupos se lanzan en paralelo y gana el primero que devuelva JSON válido.
const FREE_MODEL_GROUPS = [
  ['google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free', 'thinkingmachines/inkling:free'],
  ['google/gemma-4-26b-a4b-it:free', 'thinkingmachines/inkling-small:free', 'dots-studio/dots-3-note-preview:free'],
  ['openrouter/free'], // router de OpenRouter: elige un modelo gratuito disponible
];
// Modelos de Gemini con plan gratuito y visión. Cada uno tiene su propio cupo diario,
// así que si uno da 429 se prueba el siguiente.
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GEMINI_URL = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
// Runtime Node.js (no Edge): sin el límite de 25 s para empezar a responder
const TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 3_000;

type Parsed = { storeName?: string | null; total?: number; items?: { name?: string; totalPrice?: number }[] };

class AuthError extends Error {}

/** Pide el análisis a un grupo de modelos; lanza si fallan todos o no devuelven JSON utilizable */
async function askOpenRouter(models: string[], image: string, apiKey: string, signal: AbortSignal): Promise<Parsed> {
  const label = models.join(', ');
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...(models.length === 1 ? { model: models[0] } : { models }),
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
        temperature: 0,
        max_tokens: 3000,
      }),
      signal,
    });
  } catch (err) {
    throw new Error(`${label}: ${err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : err instanceof Error ? err.message : 'error de red'}`);
  }
  if (res.status === 401) {
    throw new AuthError(`Error OpenRouter 401: revisa OPENROUTER_API_KEY. ${await res.text()}`);
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = text.slice(0, 150);
    try {
      const e = JSON.parse(text).error;
      msg = (e?.metadata?.raw ?? e?.message ?? msg).toString().slice(0, 150);
    } catch { /* texto no JSON */ }
    throw new Error(`${label} → ${res.status}: ${msg}`);
  }

  // OpenRouter puede devolver 200 con un error del proveedor o contenido vacío
  const data = await res.json() as {
    model?: string;
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content && data.error?.message) throw new Error(`${data.model ?? label}: ${data.error.message}`);
  return parseModelJson(content, data.model ?? label);
}

/** Extrae el JSON del texto del modelo aunque haya texto antes/después */
function parseModelJson(content: string, label: string): Parsed {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`${label}: respuesta sin JSON`);
  try { return JSON.parse(jsonMatch[0]); }
  catch { throw new Error(`${label}: JSON mal formado`); }
}

/** Pide el análisis a un modelo de Gemini (API de Google AI Studio) */
async function askGemini(model: string, image: string, apiKey: string): Promise<Parsed> {
  const [, mimeType, data] = image.match(/^data:([^;]+);base64,(.*)$/s) ?? [];
  let res: Response;
  try {
    res = await fetch(GEMINI_URL(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data } },
            { text: PROMPT },
          ],
        }],
        generationConfig: { temperature: 0, response_mime_type: 'application/json' },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(`${model}: ${err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : err instanceof Error ? err.message : 'error de red'}`);
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = text.slice(0, 150);
    try { msg = (JSON.parse(text).error?.message ?? msg).toString().slice(0, 150); } catch { /* texto no JSON */ }
    if (/API key/i.test(msg) && (res.status === 400 || res.status === 403)) {
      throw new AuthError(`Gemini: revisa GEMINI_API_KEY (${msg})`);
    }
    throw new Error(`${model} → ${res.status}: ${msg}`);
  }
  const json = await res.json() as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const content = (json.candidates?.[0]?.content?.parts ?? [])
    .filter(p => !p.thought).map(p => p.text ?? '').join('');
  return parseModelJson(content, model);
}

/** Primero Gemini (modelo a modelo), después los grupos gratuitos de OpenRouter en paralelo */
async function analyze(image: string, keys: { gemini?: string; openRouter?: string }): Promise<Parsed> {
  const errors: unknown[] = [];

  if (keys.gemini) {
    for (const model of GEMINI_MODELS) {
      try { return await askGemini(model, image, keys.gemini); }
      catch (err) {
        errors.push(err);
        if (err instanceof AuthError) break;
      }
    }
  }

  if (keys.openRouter) {
    const winner = new AbortController();
    const signal = AbortSignal.any([winner.signal, AbortSignal.timeout(TIMEOUT_MS)]);
    try {
      return await Promise.any(FREE_MODEL_GROUPS.map(g => askOpenRouter(g, image, keys.openRouter!, signal)));
    } catch (err) {
      errors.push(...(err instanceof AggregateError ? err.errors : [err]));
    } finally {
      winner.abort(); // cancelar las peticiones que sigan en curso
    }
  }

  throw new AggregateError(errors, 'Todos los modelos fallaron');
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

  const keys = { gemini: process.env.GEMINI_API_KEY, openRouter: process.env.OPENROUTER_API_KEY };
  if (!keys.gemini && !keys.openRouter) {
    return new Response(
      JSON.stringify({
        error: 'Falta GEMINI_API_KEY. Obtén una clave GRATIS en aistudio.google.com → Get API key y añádela en Vercel → Settings → Environment Variables → GEMINI_API_KEY.',
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
    let parsed: Parsed;
    try {
      try { parsed = await analyze(body.image!, keys); }
      catch (err) {
        // Si fallan todos (normalmente por 429 en los modelos gratuitos), reintentar una vez
        if (err instanceof AggregateError && err.errors.length && err.errors.every(e => e instanceof AuthError)) throw err;
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        parsed = await analyze(body.image!, keys);
      }
    } catch (err) {
      const errors = err instanceof AggregateError ? err.errors as Error[] : [err as Error];
      const auth = errors.find(e => e instanceof AuthError);
      if (auth && errors.every(e => e instanceof AuthError)) return new Response(JSON.stringify({ error: auth.message }), { status: 500, headers: CORS });
      const allRateLimited = errors.every(e => / 429:/.test(e.message) || e instanceof AuthError);
      return new Response(JSON.stringify({
        error: allRateLimited
          ? 'Se ha agotado el cupo gratuito de IA por ahora. Espera un minuto y vuelve a intentarlo.'
          : `No se pudo analizar el ticket. Inténtalo de nuevo. ${errors.map(e => e.message).join(' | ')}`,
      }), { status: 503, headers: CORS });
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
