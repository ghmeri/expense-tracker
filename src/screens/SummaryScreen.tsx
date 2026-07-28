import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loadData } from '../store/expenseSlice';
import { Category } from '../types';
import { COLORS, FONT_HEAD, border, shadow } from '../theme';

const CATEGORY_ICONS: Record<Category, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

type Period = 'todo' | 'mes' | 'semana';

export default function SummaryScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { expenses, users } = useSelector((state: RootState) => state.expenses);
  const [period, setPeriod] = useState<Period>('mes');

  useEffect(() => { dispatch(loadData()); }, []);

  const now = new Date();
  const filtered = expenses.filter(e => {
    const date = new Date(e.date);
    if (period === 'semana') return (now.getTime() - date.getTime()) / 86400000 <= 7;
    if (period === 'mes') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return true;
  });

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const byUser = users.map(user => ({
    ...user,
    total: filtered.filter(e => e.userId === user.id).reduce((sum, e) => sum + e.amount, 0),
  }));

  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  // ── Productos más comprados (de los tickets con lineItems) ──
  const allItems = filtered.flatMap(e => e.lineItems ?? []);
  const productStats = Object.values(
    allItems.reduce((acc, item) => {
      const key = item.name.toLowerCase().trim();
      if (!acc[key]) acc[key] = { name: item.name, count: 0, totalSpent: 0 };
      acc[key].count++;
      acc[key].totalSpent += item.totalPrice;
      return acc;
    }, {} as Record<string, { name: string; count: number; totalSpent: number }>)
  ).sort((a, b) => b.count - a.count).slice(0, 10);

  const PERIODS = [
    { id: 'semana' as Period, label: 'Esta semana' },
    { id: 'mes' as Period, label: 'Este mes' },
    { id: 'todo' as Period, label: 'Todo' },
  ];

  const card = (children: React.ReactNode) => (
    <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: '20px 22px', border: border(2), boxShadow: shadow(3), marginBottom: 16 }}>
      {children}
    </div>
  );

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '24px 24px 40px', backgroundColor: COLORS.bg }}>

      {/* Selector período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            flex: 1, padding: '11px 4px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
            border: border(2), fontFamily: FONT_HEAD,
            backgroundColor: period === p.id ? COLORS.ink : COLORS.card,
            color: period === p.id ? COLORS.yellow : COLORS.muted,
            fontWeight: 700,
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Total */}
      <div style={{
        backgroundColor: COLORS.ink,
        border: border(2.5), borderRadius: 18, padding: '28px 24px', textAlign: 'center', marginBottom: 20,
        boxShadow: shadow(4),
      }}>
        <div style={{ color: 'rgba(251,239,221,0.75)', fontSize: 13 }}>Total</div>
        <div style={{ color: COLORS.yellow, fontFamily: FONT_HEAD, fontSize: 40, fontWeight: 700, marginTop: 4 }}>{total.toFixed(2)} €</div>
        <div style={{ color: 'rgba(251,239,221,0.6)', fontSize: 13, marginTop: 4 }}>
          {filtered.length} {filtered.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </div>

      {/* Por persona */}
      {card(<>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por persona</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {byUser.map(user => (
            <div key={user.id} style={{ flex: 1, backgroundColor: COLORS.cardAlt, borderRadius: 12, padding: '16px 12px', textAlign: 'center', border: border(1.5), borderTop: `4px solid ${user.color}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{user.name}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 700, color: user.color, marginTop: 4 }}>{user.total.toFixed(2)} €</div>
              <div style={{ fontSize: 12, color: COLORS.mutedLighter, marginTop: 2 }}>
                {total > 0 ? ((user.total / total) * 100).toFixed(0) : 0}%
              </div>
              {/* Mini barra */}
              <div style={{ height: 5, backgroundColor: COLORS.bg, border: `1px solid ${COLORS.ink}`, borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: user.color, width: `${total > 0 ? (user.total / total) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </>)}

      {/* Por categoría */}
      {card(<>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por categoría</div>
        {sortedCategories.length === 0
          ? <div style={{ textAlign: 'center', color: COLORS.mutedLighter, padding: '20px 0', fontSize: 14 }}>Sin gastos en este período</div>
          : sortedCategories.map(([cat, amount]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1.5px solid ${COLORS.dashed}` }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{CATEGORY_ICONS[cat as Category]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.orangeText }}>{amount.toFixed(2)} €</span>
                </div>
                <div style={{ height: 8, backgroundColor: COLORS.bg, border: `1px solid ${COLORS.ink}`, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: COLORS.orange, width: `${total > 0 ? (amount / total) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          ))
        }
      </>)}

      {/* Productos más comprados */}
      {productStats.length > 0 && card(<>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🛍️ Lo que más compráis</div>
        <div style={{ fontSize: 12, color: COLORS.mutedLighter, marginBottom: 16 }}>De los tickets analizados con foto</div>
        {productStats.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < productStats.length - 1 ? `1.5px solid ${COLORS.dashed}` : 'none' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: COLORS.yellow, border: `1.5px solid ${COLORS.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: COLORS.ink, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{p.name}</div>
              <div style={{ fontSize: 12, color: COLORS.mutedLighter, marginTop: 1 }}>{p.count}x comprado</div>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>{p.totalSpent.toFixed(2)} €</div>
          </div>
        ))}
      </>)}

      {productStats.length === 0 && (
        <div style={{ backgroundColor: COLORS.yellow, borderRadius: 16, padding: '20px 22px', border: border(2.5), boxShadow: shadow(3), textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>📊</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 700, color: COLORS.ink }}>Análisis de productos</div>
          <div style={{ fontSize: 13, color: '#5C4B2E', marginTop: 6 }}>Sube fotos de tus tickets al añadir gastos y aquí verás qué productos compráis más</div>
        </div>
      )}
    </div>
  );
}
