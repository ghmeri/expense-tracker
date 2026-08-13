import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense } from '../store/expenseSlice';
import { RootState, AppDispatch } from '../store';
import { Category, Expense } from '../types';
import { COLORS, FONT_HEAD, border, shadow } from '../theme';

type Kind = 'gasto' | 'ingreso';

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

interface Props {
  initialKind: Kind;
  /** Ir a la app completa (navegación normal). */
  onOpenApp: () => void;
}

/** Formulario mínimo, pensado para abrirse desde el acceso directo de la PWA. */
export default function QuickAddScreen({ initialKind, onOpenApp }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { users } = useSelector((state: RootState) => state.expenses);

  const [kind, setKind] = useState<Kind>(initialKind);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('alimentacion');
  const [userId, setUserId] = useState(users[0]?.id ?? 'user1');
  const [amountErr, setAmountErr] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const accent = kind === 'gasto' ? COLORS.orange : COLORS.teal;

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsed) || parsed <= 0) { setAmountErr('Introduce un importe válido'); return; }
    setAmountErr('');

    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: kind === 'ingreso' ? -parsed : parsed,
      category,
      description: description.trim(),
      date: new Date().toISOString(),
      userId,
      createdAt: new Date().toISOString(),
    };
    dispatch(addExpense(expense));

    // Reset para poder añadir el siguiente rápido
    setAmount('');
    setDescription('');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  return (
    <div style={{ overflowY: 'auto', height: '100%', backgroundColor: COLORS.bg }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px 48px' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: COLORS.ink }}>⚡ Añadir rápido</h1>
          <p style={{ color: COLORS.muted, marginTop: 4, fontSize: 13.5 }}>Registra un movimiento en unos segundos</p>
        </div>

        {/* Toggle gasto / ingreso */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button onClick={() => setKind('gasto')} style={{
            flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer',
            fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15,
            border: border(2.5, kind === 'gasto' ? COLORS.ink : COLORS.dashed),
            backgroundColor: kind === 'gasto' ? COLORS.orange : COLORS.card,
            color: kind === 'gasto' ? '#fff' : COLORS.ink,
          }}>
            ➖ Gasto
          </button>
          <button onClick={() => setKind('ingreso')} style={{
            flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer',
            fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15,
            border: border(2.5, kind === 'ingreso' ? COLORS.ink : COLORS.dashed),
            backgroundColor: kind === 'ingreso' ? COLORS.teal : COLORS.card,
            color: kind === 'ingreso' ? '#fff' : COLORS.ink,
          }}>
            ➕ Ingreso
          </button>
        </div>

        {/* Cantidad */}
        <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '20px', border: border(2), boxShadow: shadow(3), marginBottom: 16 }}>
          <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {kind === 'gasto' ? '💰 Importe gastado' : '💰 Importe recibido'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" inputMode="decimal" placeholder="0.00" value={amount} autoFocus
              onChange={e => { setAmount(e.target.value); setAmountErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 12,
                border: border(2.5, amountErr ? COLORS.danger : COLORS.ink),
                fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, color: COLORS.ink,
                outline: 'none', backgroundColor: amount ? COLORS.yellow : COLORS.cardAlt, textAlign: 'right',
              }}
            />
            <span style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, color: COLORS.ink }}>€</span>
          </div>
          {amountErr && <div style={{ color: COLORS.danger, fontSize: 13, marginTop: 8 }}>{amountErr}</div>}
        </div>

        {/* Categoría */}
        <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '20px', border: border(2), boxShadow: shadow(3), marginBottom: 16 }}>
          <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📂 Categoría</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setCategory(cat.value)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '9px 12px',
                borderRadius: 12, cursor: 'pointer', gap: 4, minWidth: 70,
                border: border(2, category === cat.value ? COLORS.ink : COLORS.dashed),
                backgroundColor: category === cat.value ? COLORS.yellow : COLORS.cardAlt,
              }}>
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <span style={{ fontSize: 10.5, color: COLORS.ink, fontWeight: category === cat.value ? 700 : 500 }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '20px', border: border(2), boxShadow: shadow(3), marginBottom: 16 }}>
          <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📝 Descripción (opcional)</label>
          <input
            type="text" placeholder="Ej: Mercadona, nómina..." value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: border(2), fontSize: 15, outline: 'none' }}
          />
        </div>

        {/* Quién */}
        {users.length > 0 && (
          <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '20px', border: border(2), boxShadow: shadow(3), marginBottom: 16 }}>
            <label style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: COLORS.muted, display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>👤 ¿Quién?</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {users.map(user => (
                <button key={user.id} onClick={() => setUserId(user.id)} style={{
                  flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer', fontSize: 14,
                  border: border(2, userId === user.id ? COLORS.ink : COLORS.dashed),
                  backgroundColor: userId === user.id ? user.color : COLORS.cardAlt,
                  color: userId === user.id ? '#fff' : COLORS.ink, fontWeight: 700,
                }}>
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleSave} style={{
          width: '100%', padding: '18px', borderRadius: 16, cursor: 'pointer',
          backgroundColor: accent, color: '#fff', fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 17,
          border: border(2.5), boxShadow: shadow(4), marginBottom: 14,
        }}>
          {savedFlash ? '✅ ¡Guardado!' : `💾 Guardar ${kind}`}
        </button>

        <button onClick={onOpenApp} style={{
          width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
          background: 'none', border: 'none', color: COLORS.muted, fontSize: 14, fontWeight: 600,
        }}>
          Abrir la app completa →
        </button>
      </div>
    </div>
  );
}
