import { Redis } from '@upstash/redis';

export const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: CORS });
}

export const CODE_RE = /^[A-Z0-9]{8}$/;
export const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
