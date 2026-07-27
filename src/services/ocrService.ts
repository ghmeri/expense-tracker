import { LineItem } from '../types';

const OCR_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'helloworld'; // clave pública de OCR.space para pruebas

export interface OCRResult {
  total: number | null;
  items: LineItem[];
  rawText: string;
  storeName?: string;
}

export const analyzeReceiptImage = async (base64Image: string): Promise<OCRResult> => {
  const formData = new FormData();
  formData.append('apikey', OCR_API_KEY);
  formData.append('language', 'spa');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('base64Image', base64Image);

  const response = await fetch(OCR_URL, { method: 'POST', body: formData });

  if (!response.ok) throw new Error('Error de red al conectar con el servicio OCR');

  const data = await response.json();

  if (data.IsErroredOnProcessing || !data.ParsedResults?.[0]?.ParsedText) {
    throw new Error(data.ErrorMessage?.[0] ?? 'No se pudo leer el texto del ticket');
  }

  const rawText: string = data.ParsedResults[0].ParsedText;
  const parsed = parseSpanishReceipt(rawText);
  return { ...parsed, rawText };
};

// ──────────────────────────────────────────────
// Parser de tickets españoles
// ──────────────────────────────────────────────

const SKIP_PATTERN =
  /^(TOTAL|SUBTOTAL|IVA|IGF|IGIC|DTO\.?|DESCUENTO|CAMBIO|EFECTIVO|TARJETA|VISA|MASTER|AMEX|CIF|NIF|FECHA|HORA|TICKET|N[Oº°]|CAJA|CAJERO|DEPENDIENT|GRACIAS|IMPORTE|PVP|PESO|TELF|TEL[EÉ]F|TEL:|FAX|HTTP|WWW|ESTABLECIMIENTO|DOMICILIO|CP:|LOCAL|TURNO|OPERACI[OÓ]N|REF|FACTURA|ALBAR[AÁ]N)/i;

const TOTAL_PATTERN =
  /(?:TOTAL|IMPORTE|A\s+PAGAR|IMPORTE\s+TOTAL|TOTAL\s+COMPRA|TOTAL\s+A\s+PAGAR)[^0-9]*(\d{1,4}[.,]\d{2})\s*[€]?\s*$/i;

const ITEM_LINE_PATTERN = /^(.+?)\s{2,}(\d{1,3}[.,]\d{2})\s*[€]?\s*$/;
const ITEM_LINE_SHORT  = /^(.+?)\s+(\d{1,3}[.,]\d{2})\s*[€]?\s*$/;

const toNumber = (s: string) => parseFloat(s.replace(',', '.'));

function parseSpanishReceipt(text: string): Omit<OCRResult, 'rawText'> {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1);

  let total: number | null = null;
  let storeName: string | undefined;
  const items: LineItem[] = [];

  // Store name: often the first non-empty, non-number line
  for (const l of lines.slice(0, 5)) {
    if (/^[A-ZÀ-Ú\s]{3,}$/.test(l) && l.length > 3) { storeName = l; break; }
  }

  // Total: scan bottom-up
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(TOTAL_PATTERN);
    if (m) { total = toNumber(m[1]); break; }
  }

  // Items
  for (const line of lines) {
    if (SKIP_PATTERN.test(line)) continue;
    if (/^\d{1,3}[.,]\d{2}\s*[€]?\s*$/.test(line)) continue; // precio solo

    const match = line.match(ITEM_LINE_PATTERN) ?? line.match(ITEM_LINE_SHORT);
    if (!match) continue;

    let name = match[1].trim();
    const price = toNumber(match[2]);

    if (price <= 0 || price > 500) continue;

    // Quitar prefijo de cantidad: "2x ", "3 X ", "1 "
    name = name.replace(/^\d+\s*[xX*]\s*/, '').replace(/^\d+\s+/, '').trim();

    if (name.length < 2) continue;
    if (/^\d{2}[\/\-]\d{2}/.test(name)) continue; // fecha
    if (/^\*+$/.test(name)) continue;

    // Capitalize primera letra
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    items.push({ name, totalPrice: price });
  }

  return { total, items, storeName };
}
