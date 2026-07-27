import { LineItem } from '../types';

const OCR_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'helloworld';

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
  const parsed = parseReceipt(rawText);
  return { ...parsed, rawText };
};

// ─────────────────────────────────────────────────────────────────────────────
// Parser multiidioma: castellano + catalán + otros formatos europeos
// ─────────────────────────────────────────────────────────────────────────────

const toNum = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

/** Líneas que NO son productos */
const SKIP_RE = new RegExp(
  '^(' + [
    // Cabecera / pie
    'TARGETES','CANVI',"TOTAL D'ARTICLES","TOTAL D.ARTICLES",
    'DESGLOSSAMENT','DESCRIPCIO','BASE\\s+IVA','INFORMACIO',
    'EN AQUESTA','DETALL','TOTAL ACUMULAT','TOTAL DESCOMPTES',
    'TOTAL DESCOMPTOS','VALIDS','BONPREU','ONLINE',
    // Castellano
    'TARJETA','CAMBIO','SUBTOTAL','EFECTIVO','VISA','MASTER','AMEX',
    'CIF','NIF','FECHA','HORA','TICKET','N[Oº°]\\s','CAJA','CAJERO',
    'DEPENDIENT','GRACIAS','PVP','PESO','TELF','TEL[ÉE]F','TEL:','FAX',
    'HTTP','WWW','ESTABLECIMIENTO','DOMICILIO','CP:','LOCAL','TURNO',
    'OPERACI','REF\\s','FACTURA','ALBAR','IVA\\s+\\d',
    // Genérico
    'DESGLOSSAMENT','DESGLOSE','PUNTS','PUNTOS','ACUMULAT','ACUMULADO',
  ].join('|') + ')',
  'i'
);

/** Líneas de descuento/rebaja (aunque tengan precio) */
function isDiscount(name: string): boolean {
  return /^-?\s*\d+\s*%/.test(name)                // -50% / 50%
    || /\b(DTE\.?|DESCOMPTE|DESCUENTO|REGAL|BALANCE|DTO\.?)\b/i.test(name)
    || /^-\s*\d+\s*(EUR|€)/.test(name)             // -2 EUR
    || /%\s*(DTE|OFF|DTO)/i.test(name);
}

/** Línea de detalle de peso: "0.424kg NET X  5.99/kg  2.54" */
function weightDetail(line: string): { price: number } | null {
  const m = line.match(/^[\s]*[\d.,]+\s*kg[^/]*\/kg\s+([\d.,]+)\s*[€]?\s*$/i);
  return m ? { price: toNum(m[1]) } : null;
}

/** Línea de detalle de unidades: "2  unitats x  3.85" */
function unitDetail(line: string): boolean {
  return /^\s*\d+\s*(unitat[s]?|unidad[es]*)\s*[xX]/i.test(line);
}

/** Limpia el nombre del producto */
function cleanName(raw: string): string {
  let n = raw.trim();
  n = n.replace(/^-\s*/, '');       // guión inicial (producto fresco catalán)
  n = n.replace(/^OFE\s+/i, '');    // "OFE " = oferta
  n = n.replace(/^\d+\s*[xX]\s*/, ''); // "2x " cantidad inicial
  n = n.replace(/[*]+$/, '').trim(); // asteriscos finales
  // Capitalizar primera letra, resto minúsculas
  return n.length > 0
    ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
    : n;
}

function parseReceipt(text: string): Omit<OCRResult, 'rawText'> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  let total: number | null = null;
  let storeName: string | undefined;
  const items: LineItem[] = [];

  // Nombre del comercio: primeras líneas en mayúsculas
  for (const l of lines.slice(0, 8)) {
    if (/^[A-ZÀ-Úa-zà-ú'\s+]{3,30}$/.test(l) && !/\d/.test(l)) {
      storeName = l.trim(); break;
    }
  }

  // TOTAL: buscamos de abajo hacia arriba
  // Formato: "TOTAL      37.27" (solo número después de TOTAL)
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    // "TOTAL   37.27" sin nada más
    let m = l.match(/^TOTAL\s+([\d.,]+)\s*[€]?\s*$/i);
    if (m && !l.match(/D'ARTICLES|ARTICLES|ACUMULAT|DESCOMPTES|DESCOMPTOS/i)) {
      total = toNum(m[1]); break;
    }
    // "TOTAL: 37,27" o "IMPORTE TOTAL  37,27"
    m = l.match(/(?:IMPORTE\s+)?TOTAL(?:\s+A\s+PAGAR)?\s*:?\s*([\d.,]+)\s*[€]?\s*$/i);
    if (m && !l.match(/D'ARTICLES|ACUMULAT|DESCOMPTES/i)) {
      total = toNum(m[1]); break;
    }
  }

  // Parsear productos con máquina de estados
  let pendingName: string | null = null;

  for (const line of lines) {
    // Separadores y líneas vacías
    if (/^[-*=_]{3,}/.test(line)) { pendingName = null; continue; }
    // Fechas
    if (/^\d{2}[/.\-]\d{2}[/.\-]\d{2,4}/.test(line)) { pendingName = null; continue; }
    // Líneas de cabecera/pie
    if (SKIP_RE.test(line)) { pendingName = null; continue; }

    // ── Línea de detalle de PESO ──
    const wd = weightDetail(line);
    if (wd) {
      if (pendingName && wd.price > 0 && wd.price < 500) {
        items.push({ name: cleanName(pendingName), totalPrice: wd.price });
      }
      pendingName = null; continue;
    }

    // ── Línea de detalle de UNIDADES ──
    if (unitDetail(line)) { pendingName = null; continue; }

    // ── Línea de producto con precio al final ──
    // Captura: cualquier texto + espacios + precio (con posible signo negativo)
    const pm = line.match(/^(.{2,}?)\s{2,}(-?[\d.,]{1,8})\s*[€]?\s*$/)
            ?? line.match(/^(.{2,}?)\s+(-?[\d.,]{1,8})\s*[€]?\s*$/);

    if (pm) {
      const rawName = pm[1].trim();
      const priceStr = pm[2];

      // El precio debe tener exactamente 2 decimales
      if (!/[.,]\d{2}$/.test(priceStr)) { pendingName = rawName; continue; }

      const price = toNum(priceStr);

      // Descartamos negativos (descuentos) y ceros/precios absurdos
      if (price <= 0 || price > 500) { pendingName = null; continue; }

      // Descartamos líneas de descuento
      if (isDiscount(rawName)) { pendingName = null; continue; }

      const name = cleanName(rawName);
      if (name.length < 2) { pendingName = null; continue; }

      items.push({ name, totalPrice: price });
      pendingName = name; // por si la siguiente línea es detalle de peso
      continue;
    }

    // Línea sin precio → posible nombre de producto multilinea
    if (line.length > 3 && !/^\d/.test(line) && !SKIP_RE.test(line) && !isDiscount(line)) {
      pendingName = line;
    } else {
      pendingName = null;
    }
  }

  return { total, items, storeName };
}


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
