// Vercel Edge Function — gastos compartidos de un hogar (sin la foto del ticket,
// que se queda solo en el dispositivo donde se escaneó, para no disparar el tamaño en KV)
import { getRedis, jsonError, CORS, CODE_RE } from './_kv';
import type { Expense } from '../src/types';

export const config = { runtime: 'edge' };

const stripImage = (e: Expense): Expense => {
  const { imageUri, ...rest } = e;
  return rest as Expense;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });

  const redis = getRedis();
  if (!redis) return jsonError('Falta configurar KV_REST_API_URL / KV_REST_API_TOKEN en Vercel.', 500);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') ?? '';
    if (!CODE_RE.test(code)) return jsonError('Código de hogar inválido', 400);

    const expenses = await redis.get<Expense[]>(`household:${code}:expenses`);
    return new Response(JSON.stringify(expenses ?? []), { status: 200, headers: CORS });
  }

  if (req.method === 'PUT') {
    let body: { code?: string; expenses?: Expense[] };
    try { body = await req.json(); }
    catch { return jsonError('JSON inválido', 400); }

    if (!body.code || !CODE_RE.test(body.code)) return jsonError('Código de hogar inválido', 400);
    if (!Array.isArray(body.expenses)) return jsonError('expenses inválido', 400);

    const stripped = body.expenses.map(stripImage);
    await redis.set(`household:${body.code}:expenses`, stripped);
    return new Response(JSON.stringify(stripped), { status: 200, headers: CORS });
  }

  return jsonError('Method not allowed', 405);
}
