import React, { useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense } from '../store/expenseSlice';
import { pushRecentPurchases } from '../store/menuSlice';
import { RootState, AppDispatch } from '../store';
import { Category, Expense, LineItem } from '../types';
import { analyzeReceiptImage } from '../services/ocrService';

const BLUE = '#2563eb';
const BLUE_LIGHT = '#eff6ff';

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
    <div style={{ overflowY: 'auto', height: '100%', padding: '40px 40px 48px', backgroundColor: '#f0f4f8' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>Añadir gasto</h1>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 16 }}>Sube la foto de tu ticket y detectamos todo automáticamente</p>
        </div>

        <div
          className={`drop-zone${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => galleryRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? BLUE : '#cbd5e1'}`,
            borderRadius: 20, padding: '56px 32px',
            backgroundColor: dragging ? BLUE_LIGHT : '#fff',
            textAlign: 'center', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🧾</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Arrastra aquí la foto del ticket</div>
          <div style={{ color: '#94a3b8', fontSize: 15, marginBottom: 28 }}>o haz clic para seleccionar una imagen</div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={e => { e.stopPropagation(); cameraRef.current?.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, border: 'none', backgroundColor: BLUE, color: '#fff', fontWeight: 700, fontSize: 16, boxShadow: '0 4px 14px rgba(37,99,235,0.35)', cursor: 'pointer' }}>📷 Abrir cámara</button>
            <button onClick={e => { e.stopPropagation(); galleryRef.current?.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, border: `2px solid ${BLUE}`, backgroundColor: '#fff', color: BLUE, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>🖼️ Subir imagen</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          <span style={{ color: '#94a3b8', fontSize: 14 }}>o sin foto</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
        </div>
        <button onClick={() => setStep('form')} style={{ width: '100%', padding: '16px', borderRadius: 12, border: '2px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Sin foto — Introducir gasto manualmente →</button>
      </div>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );

  /* ─── STEP 2: Analizando ─── */
  if (step === 'analyzing') return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8', padding: 40, gap: 28 }}>
      {imageUri && (
        <div className="ocr-scanning" style={{ position: 'relative', width: 200, height: 240, borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.14)' }}>
          <img src={imageUri} alt="ticket" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)`, top: '8%', animation: 'scanLine 1.8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(37,99,235,0.06), rgba(37,99,235,0.18))' }} />
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>🔍 Leyendo ticket...</div>
        <div style={{ color: '#64748b', fontSize: 15, marginBottom: 22 }}>
          {progress < 40 ? 'Procesando imagen...' : progress < 70 ? 'Extrayendo texto...' : progress < 90 ? 'Detectando productos y precios...' : 'Casi listo...'}
        </div>
        <div style={{ width: 300, height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, overflow: 'hidden', margin: '0 auto' }}>
          <div style={{ height: '100%', borderRadius: 5, backgroundColor: BLUE, width: `${progress}%`, transition: 'width 0.35s ease' }} />
        </div>
        <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 14 }}>{Math.round(progress)}%</div>
      </div>
    </div>
  );

  /* ─── STEP 3: REVISIÓN / ANÁLISIS ─── */
  if (step === 'review') {
    const checkedItems  = reviewItems.filter(i => i.checked);
    const checkedTotal  = ocrTotal ?? checkedItems.reduce((s, i) => s + i.totalPrice, 0);
    const allChecked    = reviewItems.length > 0 && reviewItems.every(i => i.checked);

    return (
      <div style={{ overflowY: 'auto', height: '100%', backgroundColor: '#f0f4f8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <button onClick={resetCapture} style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748b', cursor: 'pointer', padding: '4px 8px' }}>←</button>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
                {ocrError ? '⚠️ Error en el análisis' : reviewItems.length > 0 ? '🔬 Análisis del ticket' : '🔬 Análisis del ticket'}
              </h2>
              <p style={{ color: '#64748b', fontSize: 14, marginTop: 3 }}>
                {ocrError
                  ? 'No se pudo leer el ticket — revisa y añade productos manualmente'
                  : `${reviewItems.length} productos detectados · Total OCR: ${ocrTotal ? ocrTotal.toFixed(2) + ' €' : 'no detectado'}`}
              </p>
            </div>
          </div>

          {ocrError && (
            <div style={{ padding: '14px 18px', backgroundColor: '#fef3c7', borderRadius: 12, border: '1px solid #fcd34d', color: '#92400e', fontSize: 14, marginBottom: 20 }}>
              ⚠️ {ocrError}
            </div>
          )}

          {/* Layout 2 columnas */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Columna imagen */}
            {imageUri && (
              <div style={{ flex: '1 1 280px', minWidth: 240, position: 'sticky', top: 0 }}>
                <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    🧾 Ticket original
                  </div>
                  <img src={imageUri} alt="ticket" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
                  <button onClick={resetCapture} style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Cambiar foto
                  </button>
                </div>
              </div>
            )}

            {/* Columna análisis */}
            <div style={{ flex: '2 1 400px', minWidth: 320 }}>
              <div style={{ backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9' }}>
                  {([['productos', '📦 Productos detectados'], ['ocr', '📄 Texto OCR']] as [ReviewTab, string][]).map(([tab, label]) => (
                    <button key={tab} onClick={() => setReviewTab(tab)} style={{
                      flex: 1, padding: '14px 8px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                      backgroundColor: 'transparent',
                      color: reviewTab === tab ? BLUE : '#94a3b8',
                      borderBottom: reviewTab === tab ? `3px solid ${BLUE}` : '3px solid transparent',
                      marginBottom: -2,
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
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#475569', fontWeight: 600 }}>
                        <input type="checkbox" checked={allChecked}
                          onChange={e => setReviewItems(prev => prev.map(i => ({ ...i, checked: e.target.checked })))}
                          style={{ width: 16, height: 16, accentColor: BLUE }} />
                        Seleccionar todos
                      </label>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>
                        {checkedItems.length} / {reviewItems.length} seleccionados
                      </span>
                    </div>

                    {/* Lista de productos */}
                    {reviewItems.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 15 }}>
                        No se detectaron productos.<br />Añade uno manualmente abajo.
                      </div>
                    )}

                    <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 16 }}>
                      {reviewItems.map((item) => (
                        <div key={item.rid} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                          borderBottom: '1px solid #f1f5f9',
                          opacity: item.checked ? 1 : 0.45,
                        }}>
                          {/* Checkbox */}
                          <input type="checkbox" checked={item.checked}
                            onChange={e => setReviewItems(prev => prev.map(i => i.rid === item.rid ? { ...i, checked: e.target.checked } : i))}
                            style={{ width: 17, height: 17, accentColor: BLUE, flexShrink: 0 }} />

                          {/* Nombre / edición */}
                          {editRid === item.rid ? (
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              autoFocus
                              style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: `2px solid ${BLUE}`, fontSize: 14, outline: 'none' }} />
                          ) : (
                            <span style={{ flex: 1, fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{item.name}</span>
                          )}

                          {/* Precio / edición */}
                          {editRid === item.rid ? (
                            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              style={{ width: 75, padding: '5px 8px', borderRadius: 6, border: `2px solid ${BLUE}`, fontSize: 14, textAlign: 'right', outline: 'none' }} />
                          ) : (
                            <span style={{ fontSize: 14, fontWeight: 700, color: item.totalPrice < 0 ? '#dc2626' : BLUE, flexShrink: 0, minWidth: 55, textAlign: 'right' }}>
                              {item.totalPrice.toFixed(2)} €
                            </span>
                          )}

                          {/* Botones editar / guardar / eliminar */}
                          {editRid === item.rid ? (
                            <>
                              <button onClick={saveEdit} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#16a34a' }} title="Guardar">✔</button>
                              <button onClick={() => setEditRid(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }} title="Cancelar">✕</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', color: '#94a3b8' }} title="Editar">✏️</button>
                              <button onClick={() => setReviewItems(prev => prev.filter(i => i.rid !== item.rid))} style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', color: '#cbd5e1' }} title="Eliminar">🗑️</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Añadir producto manual */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                      <input placeholder="Nombre del producto" value={newName} onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && reviewAddItem()}
                        style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                      <input type="number" placeholder="€" inputMode="decimal" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && reviewAddItem()}
                        style={{ width: 72, padding: '10px 8px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', textAlign: 'right' }} />
                      <button onClick={reviewAddItem} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', backgroundColor: BLUE, color: '#fff', fontWeight: 700, fontSize: 20, cursor: 'pointer' }}>＋</button>
                    </div>

                    {/* Resumen */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>{checkedItems.length} productos seleccionados</div>
                        {ocrTotal && (
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                            Total OCR: {ocrTotal.toFixed(2)} € {Math.abs(checkedTotal - ocrTotal) > 0.05 ? '· ⚠️ diferencia' : '· ✅ coincide'}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: BLUE }}>{checkedTotal.toFixed(2)} €</div>
                    </div>
                  </div>
                )}

                {/* Tab: Texto OCR */}
                {reviewTab === 'ocr' && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                      Texto extraído automáticamente por OCR. Puede contener errores.
                    </div>
                    {ocrRawText ? (
                      <pre style={{
                        backgroundColor: '#f8fafc', borderRadius: 10, padding: '14px 16px',
                        fontSize: 12, lineHeight: 1.7, color: '#334155',
                        overflowX: 'auto', maxHeight: 500, overflowY: 'auto',
                        fontFamily: "'Courier New', Courier, monospace",
                        border: '1px solid #e2e8f0',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {ocrRawText}
                      </pre>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                        Sin texto OCR disponible
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botón confirmar */}
              <button onClick={confirmReview} style={{
                width: '100%', marginTop: 20, padding: '18px', borderRadius: 16,
                backgroundColor: BLUE, color: '#fff', fontWeight: 800, fontSize: 17,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
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
    <div style={{ overflowY: 'auto', height: '100%', backgroundColor: '#f0f4f8' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 28px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={resetCapture} style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748b', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>←</button>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{lineItems.length > 0 ? '✅ Ticket analizado' : '📝 Nuevo gasto'}</h2>
            {lineItems.length > 0 && <p style={{ color: '#64748b', fontSize: 14, marginTop: 3 }}>Se detectaron {lineItems.length} productos · Revisa y confirma</p>}
          </div>
        </div>

        {ocrError && <div style={{ padding: '14px 18px', backgroundColor: '#fef3c7', borderRadius: 12, border: '1px solid #fcd34d', color: '#92400e', fontSize: 14, marginBottom: 24 }}>⚠️ {ocrError}</div>}

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Columna imagen */}
          {imageUri && (
            <div style={{ flex: '1 1 260px', minWidth: 240 }}>
              <img src={imageUri} alt="ticket" style={{ width: '100%', borderRadius: 16, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', marginBottom: 12 }} />
              <button onClick={resetCapture} style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🔄 Cambiar foto</button>
            </div>
          )}

          {/* Columna formulario */}
          <div style={{ flex: '2 1 360px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Total */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Total del gasto</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
                  onChange={e => { setAmount(e.target.value); setAmountErr(''); }}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: `2px solid ${amountErr ? '#ef4444' : amount ? BLUE : '#e2e8f0'}`, fontSize: 30, fontWeight: 800, color: '#1e293b', outline: 'none', backgroundColor: amount ? BLUE_LIGHT : '#f8fafc', textAlign: 'right' }} />
                <span style={{ fontSize: 30, fontWeight: 800, color: BLUE }}>€</span>
              </div>
              {amountErr && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{amountErr}</div>}
            </div>

            {/* Fecha */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 Fecha de la compra</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 15, outline: 'none', color: '#1e293b' }}
                onFocus={e => (e.target.style.borderColor = BLUE)} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>

            {/* Productos */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🛍️ Productos ({lineItems.length})</label>
                {lineItems.length > 0 && <button onClick={() => setLineItems([])} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>Limpiar</button>}
              </div>
              {lineItems.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '10px 0 14px' }}>Sin productos detectados. Añade uno abajo.</div>}
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ flex: 1, fontSize: 15, color: '#1e293b', fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: BLUE, minWidth: 60, textAlign: 'right' }}>{item.totalPrice.toFixed(2)} €</div>
                  <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <input placeholder="Nombre del producto" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                <input type="number" placeholder="€" inputMode="decimal" value={newPrice} onChange={e => setNewPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
                  style={{ width: 75, padding: '10px 10px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', textAlign: 'right' }} />
                <button onClick={addItem} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', backgroundColor: BLUE, color: '#fff', fontWeight: 700, fontSize: 20, cursor: 'pointer' }}>＋</button>
              </div>
            </div>

            {/* Descripción */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📝 Descripción</label>
              <input type="text" placeholder="Ej: Mercadona, gasolinera..." value={description} onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 15, outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = BLUE)} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>

            {/* Categoría */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📂 Categoría</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => setCategory(cat.value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 14px', borderRadius: 12, cursor: 'pointer', gap: 4, minWidth: 76, border: `2px solid ${category === cat.value ? BLUE : '#e2e8f0'}`, backgroundColor: category === cat.value ? BLUE_LIGHT : '#f8fafc', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 26 }}>{cat.icon}</span>
                    <span style={{ fontSize: 11, color: category === cat.value ? BLUE : '#64748b', fontWeight: category === cat.value ? 700 : 400 }}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quién paga */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>👤 ¿Quién paga?</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {users.map(user => (
                  <button key={user.id} onClick={() => setUserId(user.id)} style={{ flex: 1, padding: '16px', borderRadius: 12, cursor: 'pointer', fontSize: 16, border: `2px solid ${userId === user.id ? user.color : '#e2e8f0'}`, backgroundColor: userId === user.id ? user.color : '#f8fafc', color: userId === user.id ? '#fff' : '#475569', fontWeight: 700, transition: 'all 0.15s' }}>
                    {user.name}
                  </button>
                ))}
              </div>
            </div>

            {!imageUri && (
              <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📎 Adjuntar ticket (opcional)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => cameraRef.current?.click()} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 15, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>📷 Cámara</button>
                  <button onClick={() => galleryRef.current?.click()} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 15, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>🖼️ Galería</button>
                </div>
              </div>
            )}

            <button onClick={handleSave} style={{ width: '100%', padding: '20px', borderRadius: 16, backgroundColor: BLUE, color: '#fff', fontWeight: 800, fontSize: 18, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(37,99,235,0.4)' }}>💾 Guardar gasto</button>
          </div>
        </div>
      </div>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}
