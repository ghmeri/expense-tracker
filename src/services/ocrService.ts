import { LineItem } from '../types';

export interface OCRResult {
  total: number | null;
  items: LineItem[];
  rawText: string;
  storeName?: string;
}

/**
 * Envía la imagen a nuestro endpoint /api/analyze-receipt (Vercel Edge Function)
 * que usa Google Gemini 1.5 Flash para extraer productos y total del ticket.
 *
 * Requiere que la variable de entorno GEMINI_API_KEY esté configurada en Vercel.
 */
export const analyzeReceiptImage = async (base64Image: string): Promise<OCRResult> => {
  const response = await fetch('/api/analyze-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  const data = await response.json() as {
    storeName?: string;
    total?: number;
    items?: LineItem[];
    error?: string;
  };

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
