// Vercel Edge Function — registra/confirma un código de hogar compartido
import { getRedis, jsonError, CORS, CODE_RE } from './_kv';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const redis = getRedis();
  if (!redis) return jsonError('Falta configurar KV_REST_API_URL / KV_REST_API_TOKEN en Vercel.', 500);

  let body: { code?: string };
  try { body = await req.json(); }
  catch { return jsonError('JSON inválido', 400); }

  if (!body.code || !CODE_RE.test(body.code)) {
    return jsonError('Código de hogar inválido', 400);
  }

  const key = `household:${body.code}:meta`;
  const created = await redis.set(key, { createdAt: new Date().toISOString() }, { nx: true });

  return new Response(JSON.stringify({ code: body.code, created: created !== null }), { status: 200, headers: CORS });
}
