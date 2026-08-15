import React, { useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense } from '../store/expenseSlice';
import { pushRecentPurchases } from '../store/menuSlice';
import { RootState, AppDispatch } from '../store';
import { Category, Expense, LineItem } from '../types';
import { analyzeReceiptImage } from '../services/ocrService';
import { COLORS, FONT_HEAD, border, shadow } from '../theme';

// 4 pasos: capture → analyzing → review → form
type Step = 'capture' | 'analyzing' | 'review' | 'form';
type ReviewTab = 'productos' | 'ocr';

interface ReviewItem extends LineItem {
  rid: string;   // id temporal para React
  checked: boolean;
  editingName: boolean;
}

const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'Alimentación', value: 'alimentacion', icon: '🛒' },
  { label: 'Transporte', value: 'transporte', icon: '🚗' },
  { label: 'Ocio', value: 'ocio', icon: '🎮' },
  { label: 'Salud', value: 'salud', icon: '💊' },
  { label: 'Hogar', value: 'hogar', icon: '🏠' },
  { label: 'Ropa', value: 'ropa', icon: '👕' },
  { label: 'Tecnología', value: 'tecnologia', icon: '💻' },
  { label: 'Otros', value: 'otros', icon: '📦' },
];

/** Redimensiona la imagen a max 800px y calidad 0.6 → base64 */
const resizeImage = (file: File): Promise<string> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 800;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height / width) * maxSize); width = maxSize; }
          else { width = Math.round((width / height) * maxSize); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });

interface Props { onSave: () => void; }

export default function AddExpenseScreen({ onSave }: Props) {
  const dispatch  = useDispatch<AppDispatch>();
  const { users } = useSelector((state: RootState) => state.expenses);

  const [step,        setStep]        = useState<Step>('capture');
  const [imageUri,    setImageUri]    = useState<string | null>(null);
  const [amount,      setAmount]      = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState<Category>('alimentacion');
  const [userId,      setUserId]      = useState(users[0]?.id ?? 'user1');
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10));
  const [lineItems,   setLineItems]   = useState<LineItem[]>([]);
  const [ocrError,    setOcrError]    = useState('');
  const [progress,    setProgress]    = useState(0);
  const [amountErr,   setAmountErr]   = useState('');
  const [dragging,    setDragging]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newPrice,    setNewPrice]    = useState('');

  // Estado de la pantalla de revisión
  const [reviewItems,  setReviewItems]  = useState<ReviewItem[]>([]);
  const [ocrRawText,   setOcrRawText]   = useState('');
  const [reviewTab,    setReviewTab]    = useState<ReviewTab>('productos');
  const [ocrTotal,     setOcrTotal]     = useState<number | null>(null);
  // Edición inline en revisión
  const [editRid,  setEditRid]  = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice,setEditPrice]= useState('');

  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const runOCR = useCallback(async (imgUri: string) => {
    setStep('analyzing'); setProgress(0); setOcrError('');
    const iv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 12, 82)), 350);
    try {
      const result = await analyzeReceiptImage(imgUri);
      clearInterval(iv); setProgress(100);
      setOcrRawText(result.rawText);
      setOcrTotal(result.total);
      // Convertir items a ReviewItems (todos chequeados por defecto)
      setReviewItems(result.items.map(item => ({
        ...item,
        rid: crypto.randomUUID(),
        checked: true,
        editingName: false,
      })));
      if (result.storeName) setDescription(result.storeName);
      setTimeout(() => setStep('review'), 500);
    } catch (err) {
      clearInterval(iv);
      setOcrError(err instanceof Error ? err.message : 'No se pudo analizar el ticket.');
      setProgress(0);
      setReviewItems([]);
      setTimeout(() => setStep('review'), 400);
    }
  }, []);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const resized = await resizeImage(file);
    setImageUri(resized);
    await runOCR(resized);
  }, [runOCR]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }, [handleFile]);

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsed) || parsed <= 0) { setAmountErr('Introduce un importe válido'); return; }
    setAmountErr('');
    const expense: Expense = {
      id: crypto.randomUUID(), amount: parsed, category,
      description: description.trim(), date: new Date(date + 'T12:00:00').toISOString(),
      imageUri: imageUri ?? undefined, userId, createdAt: new Date().toISOString(),
      lineItems: lineItems.length > 0 ? lineItems : undefined,
    };
    dispatch(addExpense(expense));

    if (expense.lineItems && expense.lineItems.length > 0) {
      const names = expense.lineItems.map(item => item.name).filter(Boolean);
      dispatch(pushRecentPurchases(names)).catch(() => {});
    }

    onSave();
  };

  const removeItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const addItem = () => {
    const p = parseFloat(newPrice.replace(',', '.'));
    if (!newName.trim() || isNaN(p) || p <= 0) return;
    setLineItems(prev => [...prev, { name: newName.trim(), totalPrice: p }]);
    setNewName(''); setNewPrice('');
  };

  const resetCapture = () => {
    setStep('capture'); setLineItems([]); setAmount('');
    setDescription(''); setImageUri(null); setOcrError('');
    setReviewItems([]); setOcrRawText(''); setOcrTotal(null);
    setEditRid(null);
  };

  /** Desde la revisión: confirmar productos y pasar al formulario */
  const confirmReview = () => {
    const confirmed = reviewItems
      .filter(i => i.checked)
      .map(({ name, totalPrice, quantity, unitPrice }) => ({ name, totalPrice, quantity, unitPrice }));
    setLineItems(confirmed);
    // Usar el total del ticket (ya incluye descuentos). Suma de items como fallback.
    const sum = confirmed.reduce((s, i) => s + i.totalPrice, 0);
    const finalTotal = ocrTotal ?? (sum > 0 ? sum : 0);
    if (finalTotal > 0) setAmount(finalTotal.toFixed(2));
    setStep('form');
  };

  /** Añadir item en la revisión */
  const reviewAddItem = () => {
    const p = parseFloat(newPrice.replace(',', '.'));
    if (!newName.trim() || isNaN(p) || p <= 0) return;
    setReviewItems(prev => [...prev, { name: newName.trim(), totalPrice: p, rid: crypto.randomUUID(), checked: true, editingName: false }]);
    setNewName(''); setNewPrice('');
  };

  /** Guardar edición inline en revisión */
  const saveEdit = () => {
    if (!editRid) return;
    const p = parseFloat(editPrice.replace(',', '.'));
    setReviewItems(prev => prev.map(i =>
      i.rid === editRid
        ? { ...i, name: editName.trim() || i.name, totalPrice: isNaN(p) || p <= 0 ? i.totalPrice : p }
        : i
    ));
    setEditRid(null);
  };

  const startEdit = (item: ReviewItem) => {
    setEditRid(item.rid); setEditName(item.name); setEditPrice(item.totalPrice.toFixed(2));
  };

  /* ─── STEP 1: Captura ─── */
  if (step === 'capture') return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '40px 40px 48px', backgroundColor: COLORS.bg }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 700, color: COLORS.ink }}>Añadir gasto</h1>
          <p style={{ color: COLORS.muted, marginTop: 6, fontSize: 15 }}>Sube la foto de tu ticket y detectamos todo automáticamente</p>
        </div>

        <div
          className={`drop-zone${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => galleryRef.current?.click()}
          style={{
            border: `2.5px dashed ${dragging ? COLORS.ink : COLORS.dashed}`,
            borderRadius: 18, padding: '56px 32px',
            backgroundColor: dragging ? COLORS.yellow : COLORS.card,
            textAlign: 'center', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 60, marginBottom: 16 }}>🧾</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 19, fontWeight: 700, color: COLORS.ink, marginBottom: 10 }}>Arrastra aquí la foto del ticket</div>
          <div style={{ color: COLORS.mutedLighter, fontSize: 14, marginBottom: 28 }}>o haz clic para seleccionar una imagen</div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={e => { e.stopPropagation(); cameraRef.current?.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 26px', borderRadius: 12, border: border(2.5), backgroundColor: COLORS.ink, color: COLORS.yellow, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, boxShadow: shadow(3), cursor: 'pointer' }}>📷 Abrir cámara</button>
            <button onClick={e => { e.stopPropagation(); galleryRef.current?.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 26px', borderRadius: 12, border: border(2.5), backgroundColor: COLORS.card, color: COLORS.ink, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>🖼️ Subir imagen</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 2, backgroundColor: COLORS.dashed }} />
          <span style={{ color: COLORS.mutedLighter, fontSize: 13 }}>o sin foto</span>
          <div style={{ flex: 1, height: 2, backgroundColor: COLORS.dashed }} />
        </div>
        <button onClick={() => setStep('form')} style={{ width: '100%', padding: '15px', borderRadius: 12, border: border(2), backgroundColor: COLORS.card, color: COLORS.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Sin foto — Introducir gasto manualmente →</button>
      </div>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );

  /* ─── STEP 2: Analizando ─── */
  if (step === 'analyzing') return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: 40, gap: 28 }}>
      {imageUri && (
        <div className="ocr-scanning" style={{ position: 'relative', width: 200, height: 240, borderRadius: 14, overflow: 'hidden', border: border(2.5), boxShadow: shadow(4) }}>
          <img src={imageUri} alt="ticket" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${COLORS.orange}, transparent)`, top: '8%', animation: 'scanLine 1.8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(242,98,42,0.08), rgba(242,98,42,0.2))' }} />
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: COLORS.ink, marginBottom: 10 }}>🔍 Leyendo ticket...</div>
        <div style={{ color: COLORS.muted, fontSize: 14, marginBottom: 22 }}>
          {progress < 40 ? 'Procesando imagen...' : progress < 70 ? 'Extrayendo texto...' : progress < 90 ? 'Detectando productos y precios...' : 'Casi listo...'}
        </div>
        <div style={{ width: 300, height: 12, backgroundColor: COLORS.card, border: border(2), borderRadius: 6, overflow: 'hidden', margin: '0 auto' }}>
          <div style={{ height: '100%', backgroundColor: COLORS.orange, width: `${progress}%`, transition: 'width 0.35s ease' }} />
        </div>
        <div style={{ marginTop: 10, color: COLORS.mutedLighter, fontSize: 13 }}>{Math.round(progress)}%</div>
      </div>
    </div>
  );

  /* ─── STEP 3: REVISIÓN / ANÁLISIS ─── */
  if (step === 'review') {
    const checkedItems  = reviewItems.filter(i => i.checked);
    const checkedTotal  = ocrTotal ?? checkedItems.reduce((s, i) => s + i.totalPrice, 0);
    const allChecked    = reviewItems.length > 0 && reviewItems.every(i => i.checked);

    return (
      <div style={{ overflowY: 'auto', height: '100%', backgroundColor: COLORS.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <button onClick={resetCapture} style={{ background: 'none', border: 'none', fontSize: 22, color: COLORS.muted, cursor: 'pointer', padding: '4px 8px' }}>←</button>
            <div>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: 21, fontWeight: 700, color: COLORS.ink }}>
                {ocrError ? '⚠️ Error en el análisis' : '🔬 Análisis del ticket'}
              </h2>
              <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 3 }}>
                {ocrError
                  ? 'No se pudo leer el ticket — revisa y añade productos manualmente'
                  : `${reviewItems.length} productos detectados · Total OCR: ${ocrTotal ? ocrTotal.toFixed(2) + ' €' : 'no detectado'}`}
              </p>
            </div>
          </div>

          {ocrError && (
            <div style={{ padding: '14px 18px', backgroundColor: COLORS.yellow, borderRadius: 12, border: border(2), color: COLORS.ink, fontSize: 14, marginBottom: 20 }}>
              ⚠️ {ocrError}
            </div>
          )}

          {/* Layout 2 columnas */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Columna imagen */}
            {imageUri && (
              <div className="review-image-col" style={{ flex: '1 1 280px', minWidth: 240 }}>
                <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, border: border(2), boxShadow: shadow(4) }}>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    🧾 Ticket original
                  </div>
                  <div className="review-image-frame" style={{ maxHeight: 320, overflow: 'hidden', borderRadius: 10, border: border(1.5) }}>
                    <img src={imageUri} alt="ticket" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }} />
                  </div>
                  <button onClick={resetCapture} style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 8, border: border(1.5), backgroundColor: COLORS.cardAlt, color: COLORS.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Cambiar foto
                  </button>
                </div>
              </div>
            )}

            {/* Columna análisis */}
            <div style={{ flex: '2 1 400px', minWidth: 320 }}>
              <div style={{ backgroundColor: COLORS.card, borderRadius: 16, border: border(2), boxShadow: shadow(4), overflow: 'hidden' }}>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: border(2) }}>
                  {([['productos', '📦 Productos detectados'], ['ocr', '📄 Texto OCR']] as [ReviewTab, string][]).map(([tab, label]) => (
                    <button key={tab} onClick={() => setReviewTab(tab)} style={{
                      flex: 1, padding: '14px 8px', border: 'none', cursor: 'pointer', fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700,
                      backgroundColor: reviewTab === tab ? COLORS.yellow : 'transparent',
                      color: COLORS.ink,
                    }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab: Productos */}
                {reviewTab === 'productos' && (
                  <div style={{ padding: '20px' }}>

                    {/* Barra de acciones */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, color: COLORS.ink, fontWeight: 600 }}>
                        <input type="checkbox" checked={allChecked}
                          onChange={e => setReviewItems(prev => prev.map(i => ({ ...i, checked: e.target.checked })))}
                          style={{ width: 16, height: 16, accentColor: COLORS.ink }} />
                        Seleccionar todos
                      </label>
                      <span style={{ fontSize: 12.5, color: COLORS.mutedLighter }}>
                        {checkedItems.length} / {reviewItems.length} seleccionados
                      </span>
                    </div>

                    {/* Lista de productos */}
                    {reviewItems.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: COLORS.mutedLighter, fontSize: 14 }}>
                        No se detectaron productos.<br />Añade uno manualmente abajo.
                      </div>
                    )}

                    <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 16 }}>
                      {reviewItems.map((item) => (
                        <div key={item.rid} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                          borderBottom: `1.5px solid ${COLORS.dashed}`,
                          opacity: item.checked ? 1 : 0.45,
                        }}>
                          {/* Checkbox */}
                          <input type="checkbox" checked={item.checked}
                            onChange={e => setReviewItems(prev => prev.map(i => i.rid === item.rid ? { ...i, checked: e.target.checked } : i))}
                            style={{ width: 17, height: 17, accentColor: COLORS.ink, flexShrink: 0 }} />

                          {/* Nombre / edición */}
                          {editRid === item.rid ? (
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              autoFocus
                              style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: border(2), fontSize: 14, outline: 'none' }} />
                          ) : (
                            <span style={{ flex: 1, fontSize: 13.5, color: COLORS.ink, fontWeight: 500 }}>{item.name}</span>
                          )}

                          {/* Precio / edición */}
                          {editRid === item.rid ? (
                            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              style={{ width: 75, padding: '5px 8px', borderRadius: 6, border: border(2), fontSize: 14, textAlign: 'right', outline: 'none' }} />
                          ) : (
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: item.totalPrice < 0 ? COLORS.danger : COLORS.orangeText, flexShrink: 0, minWidth: 55, textAlign: 'right' }}>
                              {item.totalPrice.toFixed(2)} €
                            </span>
                          )}

                          {/* Botones editar / guardar / eliminar */}
                          {editRid === item.rid ? (
                            <>
                              <button onClick={saveEdit} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: COLORS.teal }} title="Guardar">✔</button>
                              <button onClick={() => setEditRid(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: COLORS.mutedLighter }} title="Cancelar">✕</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', color: COLORS.mutedLighter }} title="Editar">✏️</button>
                              <button onClick={() => setReviewItems(prev => prev.filter(i => i.rid !== item.rid))} style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', color: COLORS.mutedLighter }} title="Eliminar">🗑️</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Añadir producto manual */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                      <input placeholder="Nombre del producto" value={newName} onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && reviewAddItem()}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: border(1.5), fontSize: 14, outline: 'none' }} />
                      <input type="number" placeholder="€" inputMode="decimal" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && reviewAddItem()}
                        style={{ width: 72, padding: '10px 8px', borderRadius: 10, border: border(1.5), fontSize: 14, outline: 'none', textAlign: 'right' }} />
                      <button onClick={reviewAddItem} style={{ padding: '10px 14px', borderRadius: 10, border: border(2), backgroundColor: COLORS.yellow, color: COLORS.ink, fontWeight: 700, fontSize: 20, cursor: 'pointer' }}>＋</button>
                    </div>

                    {/* Resumen */}
                    <div style={{ backgroundColor: COLORS.cardAlt, borderRadius: 12, border: border(1.5), padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, color: COLORS.muted }}>{checkedItems.length} productos seleccionados</div>
                        {ocrTotal && (
                          <div style={{ fontSize: 12, color: COLORS.mutedLighter, marginTop: 2 }}>
                            Total OCR: {ocrTotal.toFixed(2)} € {Math.abs(checkedTotal - ocrTotal) > 0.05 ? '· ⚠️ diferencia' : '· ✅ coincide'}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{checkedTotal.toFixed(2)} €</div>
                    </div>
                  </div>
                )}

                {/* Tab: Texto OCR */}
                {reviewTab === 'ocr' && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: 12, color: COLORS.mutedLighter, marginBottom: 12 }}>
                      Texto extraído automáticamente por OCR. Puede contener errores.
                    </div>
                    {ocrRawText ? (
                      <pre style={{
                        backgroundColor: COLORS.cardAlt, borderRadius: 10, padding: '14px 16px',
                        fontSize: 12, lineHeight: 1.7, color: COLORS.ink,
                        overflowX: 'auto', maxHeight: 500, overflowY: 'auto',
                        fontFamily: "'Courier New', Courier, monospace",
                        border: border(1.5),
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {ocrRawText}
                      </pre>
                    ) : (
                      <div style={{ textAlign: 'center', color: COLORS.mutedLighter, padding: '32px 0' }}>
                        Sin texto OCR disponible
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botón confirmar */}
              <button onClick={confirmReview} style={{
                width: '100%', marginTop: 20, padding: '17px', borderRadius: 16,
                backgroundColor: COLORS.ink, color: COLORS.yellow, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16,
                border: border(2.5), cursor: 'pointer',
                boxShadow: shadow(4),
              }}>
                Confirmar y continuar →
              </button>
            </div>
          </div>
        </div>
        <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
      </div>
    );
  }

  /* ─── STEP 4: Formulario ─── */
  return (
    <div style={{ overflowY: 'auto', height: '100%', backgroundColor: COLORS.bg }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 28px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={resetCapture} style={{ background: 'none', border: 'none', fontSize: 22, color: COLORS.muted, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>←</button>
          <div>
            <h2 style={{ fontFamily: FONT_HEAD, fontSize: 21, fontWeight: 700, color: COLORS.ink }}>{lineItems.length > 0 ? '✅ Ticket analizado' : '📝 Nuevo gasto'}</h2>
            {lineItems.length > 0 && <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 3 }}>Se detectaron {lineItems.length} productos · Revisa y confirma</p>}
          </div>
        </div>

        {ocrError && <div style={{ padding: '14px 18px', backgroundColor: COLORS.yellow, borderRadius: 12, border: border(2), color: COLORS.ink, fontSize: 14, marginBottom: 24 }}>⚠️ {ocrError}</div>}

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Columna imagen */}
          {imageUri && (
            <div style={{ flex: '1 1 260px', minWidth: 240 }}>
              <img src={imageUri} alt="ticket" style={{ width: '100%', borderRadius: 16, border: border(2.5), boxShadow: shadow(4), marginBottom: 12 }} />
              <button onClick={resetCapture} style={{ width: '100%', padding: '11px', borderRadius: 10, border: border(1.5), backgroundColor: COLORS.card, color: COLORS.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🔄 Cambiar foto</button>
            </div>
          )}

          {/* Columna formulario */}
          <div style={{ flex: '2 1 360px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Total */}
            <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '22px', border: border(2), boxShadow: shadow(3) }}>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Total del gasto</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
                  onChange={e => { setAmount(e.target.value); setAmountErr(''); }}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: border(2.5, amountErr ? COLORS.danger : COLORS.ink), fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, color: COLORS.ink, outline: 'none', backgroundColor: amount ? COLORS.yellow : COLORS.cardAlt, textAlign: 'right' }} />
                <span style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, color: COLORS.ink }}>€</span>
              </div>
              {amountErr && <div style={{ color: COLORS.danger, fontSize: 13, marginTop: 8 }}>{amountErr}</div>}
            </div>

            {/* Fecha */}
            <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '22px', border: border(2), boxShadow: shadow(3) }}>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 Fecha de la compra</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: border(2), fontSize: 15, outline: 'none', color: COLORS.ink, backgroundColor: '#fff' }} />
            </div>

            {/* Productos */}
            <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '22px', border: border(2), boxShadow: shadow(3) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🛍️ Productos ({lineItems.length})</label>
                {lineItems.length > 0 && <button onClick={() => setLineItems([])} style={{ background: 'none', border: 'none', color: COLORS.mutedLighter, fontSize: 13, cursor: 'pointer' }}>Limpiar</button>}
              </div>
              {lineItems.length === 0 && <div style={{ color: COLORS.mutedLighter, fontSize: 14, textAlign: 'center', padding: '10px 0 14px' }}>Sin productos detectados. Añade uno abajo.</div>}
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < lineItems.length - 1 ? `1.5px solid ${COLORS.dashed}` : 'none' }}>
                  <div style={{ flex: 1, fontSize: 14.5, color: COLORS.ink, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.orangeText, minWidth: 60, textAlign: 'right' }}>{item.totalPrice.toFixed(2)} €</div>
                  <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: COLORS.mutedLighter, fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <input placeholder="Nombre del producto" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: border(1.5), fontSize: 14, outline: 'none' }} />
                <input type="number" placeholder="€" inputMode="decimal" value={newPrice} onChange={e => setNewPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
                  style={{ width: 75, padding: '10px 10px', borderRadius: 10, border: border(1.5), fontSize: 14, outline: 'none', textAlign: 'right' }} />
                <button onClick={addItem} style={{ padding: '10px 16px', borderRadius: 10, border: border(2), backgroundColor: COLORS.yellow, color: COLORS.ink, fontWeight: 700, fontSize: 20, cursor: 'pointer' }}>＋</button>
              </div>
            </div>

            {/* Descripción */}
            <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '22px', border: border(2), boxShadow: shadow(3) }}>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📝 Descripción</label>
              <input type="text" placeholder="Ej: Mercadona, gasolinera..." value={description} onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: border(2), fontSize: 15, outline: 'none' }} />
            </div>

            {/* Categoría */}
            <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '22px', border: border(2), boxShadow: shadow(3) }}>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📂 Categoría</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => setCategory(cat.value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 14px', borderRadius: 12, cursor: 'pointer', gap: 4, minWidth: 76, border: border(2, category === cat.value ? COLORS.ink : COLORS.dashed), backgroundColor: category === cat.value ? COLORS.yellow : COLORS.cardAlt, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 24 }}>{cat.icon}</span>
                    <span style={{ fontSize: 11, color: COLORS.ink, fontWeight: category === cat.value ? 700 : 500 }}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quién paga */}
            <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '22px', border: border(2), boxShadow: shadow(3) }}>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>👤 ¿Quién paga?</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {users.map(user => (
                  <button key={user.id} onClick={() => setUserId(user.id)} style={{ flex: 1, padding: '16px', borderRadius: 12, cursor: 'pointer', fontSize: 15, border: border(2, userId === user.id ? COLORS.ink : COLORS.dashed), backgroundColor: userId === user.id ? user.color : COLORS.cardAlt, color: userId === user.id ? '#fff' : COLORS.ink, fontWeight: 700, transition: 'all 0.15s' }}>
                    {user.name}
                  </button>
                ))}
              </div>
            </div>

            {!imageUri && (
              <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '22px', border: border(2), boxShadow: shadow(3) }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📎 Adjuntar ticket (opcional)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => cameraRef.current?.click()} style={{ flex: 1, padding: '13px', borderRadius: 10, border: border(2), backgroundColor: COLORS.cardAlt, fontSize: 14, fontWeight: 600, color: COLORS.ink, cursor: 'pointer' }}>📷 Cámara</button>
                  <button onClick={() => galleryRef.current?.click()} style={{ flex: 1, padding: '13px', borderRadius: 10, border: border(2), backgroundColor: COLORS.cardAlt, fontSize: 14, fontWeight: 600, color: COLORS.ink, cursor: 'pointer' }}>🖼️ Galería</button>
                </div>
              </div>
            )}

            <button onClick={handleSave} style={{ width: '100%', padding: '19px', borderRadius: 16, backgroundColor: COLORS.ink, color: COLORS.yellow, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 17, border: border(2.5), cursor: 'pointer', boxShadow: shadow(4) }}>💾 Guardar gasto</button>
          </div>
        </div>
      </div>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}
