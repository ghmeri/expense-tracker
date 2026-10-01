import { LineItem } from '../types';

export interface OCRResult {
  total: number | null;
  items: LineItem[];
  rawText: string;
  storeName?: string;
}

/**
 * Envía la imagen a nuestro endpoint /api/analyze-receipt (Vercel Edge Function)
 * que usa modelos de visión gratuitos de OpenRouter para extraer productos y total del ticket.
 *
 * Requiere que la variable de entorno OPENROUTER_API_KEY esté configurada en Vercel.
 */
export const analyzeReceiptImage = async (base64Image: string): Promise<OCRResult> => {
  const response = await fetch('/api/analyze-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  const raw = await response.text();
  let data: { storeName?: string; total?: number; items?: LineItem[]; error?: string } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    // Respuesta no-JSON (p. ej. timeout 504 de Vercel)
    throw new Error(response.status === 504
      ? 'El análisis tardó demasiado. Inténtalo de nuevo.'
      : raw.slice(0, 200) || `Error ${response.status} al analizar el ticket`);
  }

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Error ${response.status} al analizar el ticket`);
  }

  return {
    total:     typeof data.total === 'number' ? data.total : null,
    items:     Array.isArray(data.items) ? data.items : [],
    rawText:   '(Análisis realizado con IA — texto original no disponible)',
    storeName: data.storeName ?? undefined,
  };
};
