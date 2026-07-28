// Vercel Edge Function — lista de "ideas" (platos ya usados en el menú) de un hogar compartido
import { getRedis, jsonError, CORS, CODE_RE } from './_kv';
import type { RecentPurchaseItem } from '../src/types';

export const config = { runtime: 'edge' };

const MAX_ITEMS = 60;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

  const redis = getRedis();
  if (!redis) return jsonError('Falta configurar KV_REST_API_URL / KV_REST_API_TOKEN en Vercel.', 500);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') ?? '';
    if (!CODE_RE.test(code)) return jsonError('Código de hogar inválido', 400);

    const items = await redis.get<RecentPurchaseItem[]>(`household:${code}:ideas`);
    return new Response(JSON.stringify(items ?? []), { status: 200, headers: CORS });
  }

  if (req.method === 'POST') {
    let body: { code?: string; names?: string[] };
    try { body = await req.json(); }
    catch { return jsonError('JSON inválido', 400); }

    if (!body.code || !CODE_RE.test(body.code)) return jsonError('Código de hogar inválido', 400);
    if (!Array.isArray(body.names)) return jsonError('names inválido', 400);

    const key = `household:${body.code}:ideas`;
    const existing = (await redis.get<RecentPurchaseItem[]>(key)) ?? [];
    const now = new Date().toISOString();

    const byName = new Map(existing.map(item => [item.name, item]));
    for (const raw of body.names) {
      const name = raw.trim();
      if (!name) continue;
      byName.set(name, { name, lastSeenAt: now });
    }

    const merged = Array.from(byName.values())
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
      .slice(0, MAX_ITEMS);

    await redis.set(key, merged);
    return new Response(JSON.stringify(merged), { status: 200, headers: CORS });
  }

  if (req.method === 'DELETE') {
    let body: { code?: string; name?: string };
    try { body = await req.json(); }
    catch { return jsonError('JSON inválido', 400); }

    if (!body.code || !CODE_RE.test(body.code)) return jsonError('Código de hogar inválido', 400);
    if (!body.name) return jsonError('name inválido', 400);

    const key = `household:${body.code}:ideas`;
    const existing = (await redis.get<RecentPurchaseItem[]>(key)) ?? [];
    const filtered = existing.filter(item => item.name !== body.name);

    await redis.set(key, filtered);
    return new Response(JSON.stringify(filtered), { status: 200, headers: CORS });
  }

  return jsonError('Method not allowed', 405);
}
