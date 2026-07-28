// Vercel Edge Function — lee/guarda el menú semanal de un hogar compartido
import { getRedis, jsonError, CORS, CODE_RE, WEEK_RE } from './_kv';
import type { WeekMenuDocument, WeeklyMenu } from '../src/types';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

  const redis = getRedis();
  if (!redis) return jsonError('Falta configurar KV_REST_API_URL / KV_REST_API_TOKEN en Vercel.', 500);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') ?? '';
    const weekStart = url.searchParams.get('weekStart') ?? '';
    if (!CODE_RE.test(code)) return jsonError('Código de hogar inválido', 400);
    if (!WEEK_RE.test(weekStart)) return jsonError('weekStart inválido', 400);

    const doc = await redis.get<WeekMenuDocument>(`household:${code}:menu:${weekStart}`);
    const result: WeekMenuDocument = doc ?? { weekStart, menu: {}, updatedAt: '' };
    return new Response(JSON.stringify(result), { status: 200, headers: CORS });
  }

  if (req.method === 'PUT') {
    let body: { code?: string; weekStart?: string; menu?: WeeklyMenu };
    try { body = await req.json(); }
    catch { return jsonError('JSON inválido', 400); }

    if (!body.code || !CODE_RE.test(body.code)) return jsonError('Código de hogar inválido', 400);
    if (!body.weekStart || !WEEK_RE.test(body.weekStart)) return jsonError('weekStart inválido', 400);
    if (!body.menu || typeof body.menu !== 'object') return jsonError('menu inválido', 400);

    const doc: WeekMenuDocument = {
      weekStart: body.weekStart,
      menu: body.menu,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(`household:${body.code}:menu:${body.weekStart}`, doc);
    return new Response(JSON.stringify(doc), { status: 200, headers: CORS });
  }

  return jsonError('Method not allowed', 405);
}
