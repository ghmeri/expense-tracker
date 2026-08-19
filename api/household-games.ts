// Vercel Edge Function — historial de juegos de un hogar
import { getRedis, jsonError, CORS, CODE_RE } from './_kv';
import type { GameResult } from '../src/types';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

  const redis = getRedis();
  if (!redis) return jsonError('Falta configurar KV_REST_API_URL / KV_REST_API_TOKEN en Vercel.', 500);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') ?? '';
    if (!CODE_RE.test(code)) return jsonError('Código de hogar inválido', 400);

    const results = await redis.get<GameResult[]>(`household:${code}:games`);
    return new Response(JSON.stringify(results ?? []), { status: 200, headers: CORS });
  }

  if (req.method === 'PUT') {
    let body: { code?: string; results?: GameResult[] };
    try { body = await req.json(); }
    catch { return jsonError('JSON inválido', 400); }

    if (!body.code || !CODE_RE.test(body.code)) return jsonError('Código de hogar inválido', 400);
    if (!Array.isArray(body.results)) return jsonError('results inválido', 400);

    await redis.set(`household:${body.code}:games`, body.results);
    return new Response(JSON.stringify(body.results), { status: 200, headers: CORS });
  }

  return jsonError('Method not allowed', 405);
}
