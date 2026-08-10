import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Expense, Category, LineItem } from '../../types';
import { updateExpense } from '../../store/expenseSlice';
import { AppDispatch, RootState } from '../../store';
import { COLORS, FONT_HEAD, border, shadow } from '../../theme';

interface Props {
  expense: Expense;
  userName: string;
  userColor: string;
  onDelete: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};
const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'Alimentación', value: 'alimentacion', icon: '🛒' },
  { label: 'Transporte',   value: 'transporte',   icon: '🚗' },
  { label: 'Ocio',         value: 'ocio',         icon: '🎮' },
  { label: 'Salud',        value: 'salud',        icon: '💊' },
  { label: 'Hogar',        value: 'hogar',        icon: '🏠' },
  { label: 'Ropa',         value: 'ropa',         icon: '👕' },
  { label: 'Tecnología',   value: 'tecnologia',   icon: '💻' },
  { label: 'Otros',        value: 'otros',        icon: '📦' },
];

export default function ExpenseCard({ expense, userName, userColor, onDelete }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { users } = useSelector((state: RootState) => state.expenses);

  const [showImage, setShowImage] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);

  const [editAmount, setEditAmount] = useState('');
  const [editDesc,   setEditDesc]   = useState('');
  const [editCat,    setEditCat]    = useState<Category>('alimentacion');
  const [editUser,   setEditUser]   = useState('');
  const [editDate,   setEditDate]   = useState('');
  const [editItems,  setEditItems]  = useState<LineItem[]>([]);
  const [newName,    setNewName]    = useState('');
  const [newPrice,   setNewPrice]   = useState('');

  const date = new Date(expense.date).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const hasItems = expense.lineItems && expense.lineItems.length > 0;

  const openEdit = () => {
    setEditAmount(expense.amount.toFixed(2));
    setEditDesc(expense.description || '');
    setEditCat(expense.category);
    setEditUser(expense.userId);
    setEditDate(expense.date.slice(0, 10));
    setEditItems(expense.lineItems ? [...expense.lineItems] : []);
    setNewName(''); setNewPrice('');
    setShowEdit(true);
  };

  const saveEdit = () => {
    const parsed = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;
    dispatch(updateExpense({
      ...expense,
      amount: parsed,
      description: editDesc.trim(),
      category: editCat,
      userId: editUser,
      date: new Date(editDate + 'T12:00:00').toISOString(),
      lineItems: editItems.length > 0 ? editItems : undefined,
    }));
    setShowEdit(false);
  };

  const addEditItem = () => {
    const p = parseFloat(newPrice.replace(',', '.'));
    if (!newName.trim() || isNaN(p) || p <= 0) return;
    setEditItems(prev => [...prev, { name: newName.trim(), totalPrice: p }]);
    setNewName(''); setNewPrice('');
  };

  const confirmDelete = () => {
    if (window.confirm('¿Eliminar este gasto?')) onDelete();
  };

  return (
    <>
      <div style={{
        backgroundColor: COLORS.card, borderRadius: 14,
        margin: '8px 16px', overflow: 'hidden',
        border: border(2), boxShadow: shadow(3),
      }}>
        {/* Fila principal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
          {/* Icono */}
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            backgroundColor: COLORS.cardAlt, border: border(2),
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            {CATEGORY_ICONS[expense.category]}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {expense.description || expense.category}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: COLORS.mutedLighter }}>{date}</span>
              <span style={{ backgroundColor: userColor, color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 7px', border: `1.5px solid ${COLORS.ink}` }}>
                {userName}
              </span>
              {hasItems && (
                <span style={{ backgroundColor: COLORS.yellow, color: COLORS.ink, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 7px', cursor: 'pointer', border: `1.5px solid ${COLORS.ink}` }}
                  onClick={() => setShowItems(s => !s)}>
                  {expense.lineItems!.length} productos {showItems ? '▲' : '▼'}
                </span>
              )}
            </div>
          </div>

          {/* Importe + acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 700, color: COLORS.ink }}>
              {expense.amount.toFixed(2)} €
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {expense.imageUri && (
                <button onClick={() => setShowImage(true)} title="Ver ticket"
                  style={{ background: 'none', border: 'none', fontSize: 18, padding: '2px 4px', cursor: 'pointer', borderRadius: 6, color: COLORS.muted }}>
                  🧾
                </button>
              )}
              <button onClick={openEdit} title="Editar"
                style={{ background: 'none', border: 'none', fontSize: 18, padding: '2px 4px', cursor: 'pointer', borderRadius: 6, color: COLORS.muted }}>
                ✏️
              </button>
              <button onClick={confirmDelete} title="Eliminar"
                style={{ background: 'none', border: 'none', fontSize: 18, padding: '2px 4px', cursor: 'pointer', borderRadius: 6, color: COLORS.mutedLighter }}>
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Lista de productos (expandible) */}
        {hasItems && showItems && (
          <div style={{ borderTop: `1.5px solid ${COLORS.dashed}`, padding: '12px 16px 14px', backgroundColor: COLORS.cardAlt }} className="fade-in">
            {expense.lineItems!.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < expense.lineItems!.length - 1 ? `1px solid ${COLORS.dashed}` : 'none' }}>
                <span style={{ fontSize: 13, color: COLORS.ink, flex: 1 }}>{item.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.orangeText, marginLeft: 16 }}>{item.totalPrice.toFixed(2)} €</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: `1.5px solid ${COLORS.ink}` }}>
              <span style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: COLORS.ink }}>
                Total: {expense.lineItems!.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)} €
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox imagen */}
      {showImage && expense.imageUri && (
        <div onClick={() => setShowImage(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(38,32,26,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={expense.imageUri} alt="ticket" style={{ maxWidth: '92%', maxHeight: '88vh', objectFit: 'contain', borderRadius: 10 }} />
          <button onClick={() => setShowImage(false)} style={{ position: 'fixed', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, borderRadius: '50%', width: 42, height: 42, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Modal edición */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(38,32,26,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <div style={{ backgroundColor: COLORS.bg, borderRadius: '20px 20px 0 0', border: border(2.5), borderBottom: 'none', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', padding: '24px 20px 40px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONT_HEAD, fontSize: 19, fontWeight: 700, color: COLORS.ink, margin: 0 }}>✏️ Editar gasto</h3>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: COLORS.muted }}>✕</button>
            </div>

            {expense.imageUri && (
              <div style={{ marginBottom: 16, cursor: 'pointer' }} onClick={() => { setShowEdit(false); setShowImage(true); }}>
                <img src={expense.imageUri} alt="ticket" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 12, border: border(2) }} />
                <div style={{ textAlign: 'center', fontSize: 12, color: COLORS.mutedLighter, marginTop: 4 }}>Toca para ver el ticket completo</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 18, border: border(2), boxShadow: shadow(3) }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 Fecha</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: border(2), fontSize: 15, outline: 'none', color: COLORS.ink, backgroundColor: '#fff' }} />
              </div>

              <div style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 18, border: border(2), boxShadow: shadow(3) }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Importe</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" inputMode="decimal" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: border(2.5), fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 700, color: COLORS.ink, outline: 'none', textAlign: 'right', backgroundColor: COLORS.yellow }} />
                  <span style={{ fontFamily: FONT_HEAD, fontSize: 24, fontWeight: 700, color: COLORS.ink }}>€</span>
                </div>
              </div>

              <div style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 18, border: border(2), boxShadow: shadow(3) }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📝 Descripción</label>
                <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: border(2), fontSize: 15, outline: 'none' }} />
              </div>

              <div style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 18, border: border(2), boxShadow: shadow(3) }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📂 Categoría</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setEditCat(cat.value)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px', borderRadius: 10, cursor: 'pointer', gap: 3, minWidth: 64,
                      border: border(2, editCat === cat.value ? COLORS.ink : COLORS.dashed),
                      backgroundColor: editCat === cat.value ? COLORS.yellow : COLORS.cardAlt,
                    }}>
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <span style={{ fontSize: 10, color: COLORS.ink, fontWeight: editCat === cat.value ? 700 : 500 }}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 18, border: border(2), boxShadow: shadow(3) }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>👤 Quién paga</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {users.map(user => (
                    <button key={user.id} onClick={() => setEditUser(user.id)} style={{
                      flex: 1, minWidth: 80, padding: '12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      border: border(2, editUser === user.id ? COLORS.ink : COLORS.dashed),
                      backgroundColor: editUser === user.id ? user.color : COLORS.cardAlt,
                      color: editUser === user.id ? '#fff' : COLORS.ink,
                    }}>
                      {user.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: COLORS.card, borderRadius: 14, padding: 18, border: border(2), boxShadow: shadow(3) }}>
                <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🛍️ Productos ({editItems.length})</label>
                {editItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < editItems.length - 1 ? `1px solid ${COLORS.dashed}` : 'none' }}>
                    <span style={{ flex: 1, fontSize: 13, color: COLORS.ink }}>{item.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.orangeText, minWidth: 55, textAlign: 'right' }}>{item.totalPrice.toFixed(2)} €</span>
                    <button onClick={() => setEditItems(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: COLORS.mutedLighter }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input placeholder="Nombre" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEditItem()}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: border(1.5), fontSize: 13, outline: 'none' }} />
                  <input type="number" placeholder="€" value={newPrice} onChange={e => setNewPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEditItem()}
                    style={{ width: 64, padding: '8px', borderRadius: 8, border: border(1.5), fontSize: 13, outline: 'none', textAlign: 'right' }} />
                  <button onClick={addEditItem} style={{ padding: '8px 12px', borderRadius: 8, border: border(2), backgroundColor: COLORS.yellow, color: COLORS.ink, fontWeight: 700, fontSize: 18, cursor: 'pointer' }}>＋</button>
                </div>
              </div>

              <button onClick={saveEdit} style={{ width: '100%', padding: 17, borderRadius: 14, backgroundColor: COLORS.ink, color: COLORS.yellow, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, border: border(2.5), cursor: 'pointer', boxShadow: shadow(4) }}>
                💾 Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
