// Vercel Edge Function — recetario compartido de un hogar (nombre, tipo, puntuación)
import { getRedis, jsonError, CORS, CODE_RE } from './_kv';
import type { Recipe } from '../src/types';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

  const redis = getRedis();
  if (!redis) return jsonError('Falta configurar KV_REST_API_URL / KV_REST_API_TOKEN en Vercel.', 500);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') ?? '';
    if (!CODE_RE.test(code)) return jsonError('Código de hogar inválido', 400);

    const recipes = await redis.get<Recipe[]>(`household:${code}:recipes`);
    return new Response(JSON.stringify(recipes ?? []), { status: 200, headers: CORS });
  }

  if (req.method === 'PUT') {
    let body: { code?: string; recipes?: Recipe[] };
    try { body = await req.json(); }
    catch { return jsonError('JSON inválido', 400); }

    if (!body.code || !CODE_RE.test(body.code)) return jsonError('Código de hogar inválido', 400);
    if (!Array.isArray(body.recipes)) return jsonError('recipes inválido', 400);

    await redis.set(`household:${body.code}:recipes`, body.recipes);
    return new Response(JSON.stringify(body.recipes), { status: 200, headers: CORS });
  }

  return jsonError('Method not allowed', 405);
}
