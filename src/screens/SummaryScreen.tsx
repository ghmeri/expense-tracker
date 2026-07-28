import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loadData } from '../store/expenseSlice';
import { Category } from '../types';

const BLUE = '#2563eb';
const BLUE_LIGHT = '#eff6ff';

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
    <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
      {children}
    </div>
  );

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '24px 24px 40px', backgroundColor: '#f0f4f8' }}>

      {/* Selector período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            flex: 1, padding: '11px 4px', borderRadius: 10, cursor: 'pointer', fontSize: 14,
            border: `2px solid ${period === p.id ? BLUE : '#e2e8f0'}`,
            backgroundColor: period === p.id ? BLUE : '#fff',
            color: period === p.id ? '#fff' : '#64748b',
            fontWeight: period === p.id ? 700 : 400,
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Total */}
      <div style={{
        background: `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)`,
        borderRadius: 18, padding: '28px 24px', textAlign: 'center', marginBottom: 20,
        boxShadow: '0 6px 20px rgba(37,99,235,0.3)',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Total</div>
        <div style={{ color: '#fff', fontSize: 42, fontWeight: 800, marginTop: 4 }}>{total.toFixed(2)} €</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
          {filtered.length} {filtered.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </div>

      {/* Por persona */}
      {card(<>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por persona</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {byUser.map(user => (
            <div key={user.id} style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: '16px 12px', textAlign: 'center', borderTop: `4px solid ${user.color}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{user.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: user.color, marginTop: 4 }}>{user.total.toFixed(2)} €</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {total > 0 ? ((user.total / total) * 100).toFixed(0) : 0}%
              </div>
              {/* Mini barra */}
              <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: 4, backgroundColor: user.color, borderRadius: 2, width: `${total > 0 ? (user.total / total) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </>)}

      {/* Por categoría */}
      {card(<>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por categoría</div>
        {sortedCategories.length === 0
          ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 15 }}>Sin gastos en este período</div>
          : sortedCategories.map(([cat, amount]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{CATEGORY_ICONS[cat as Category]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: BLUE }}>{amount.toFixed(2)} €</span>
                </div>
                <div style={{ height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: 7, backgroundColor: BLUE, borderRadius: 4, width: `${total > 0 ? (amount / total) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          ))
        }
      </>)}

      {/* Productos más comprados */}
      {productStats.length > 0 && card(<>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🛍️ Lo que más compráis</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>De los tickets analizados con foto</div>
        {productStats.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < productStats.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: BLUE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: BLUE, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{p.count}x comprado</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>{p.totalSpent.toFixed(2)} €</div>
          </div>
        ))}
      </>)}

      {productStats.length === 0 && (
        <div style={{ backgroundColor: BLUE_LIGHT, borderRadius: 16, padding: '20px 22px', border: `1px dashed ${BLUE}`, textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: BLUE }}>Análisis de productos</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Sube fotos de tus tickets al añadir gastos y aquí verás qué productos compráis más</div>
        </div>
      )}
    </div>
  );
}
