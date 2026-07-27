import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loadData } from '../store/expenseSlice';
import { Category } from '../types';

const CATEGORY_ICONS: Record<Category, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

type Period = 'todo' | 'mes' | 'semana';

export default function SummaryScreen() {
  const dispatch = useDispatch();
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

  const PERIODS = [
    { id: 'semana' as Period, label: 'Esta semana' },
    { id: 'mes' as Period, label: 'Este mes' },
    { id: 'todo' as Period, label: 'Todo' },
  ];

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: 16, backgroundColor: '#f5f5f5' }}>

      {/* Selector período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              border: `1px solid ${period === p.id ? '#6200ee' : '#ddd'}`,
              backgroundColor: period === p.id ? '#6200ee' : '#fff',
              color: period === p.id ? '#fff' : '#666',
              fontWeight: period === p.id ? 'bold' : 'normal',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Total */}
      <div style={{
        backgroundColor: '#6200ee', borderRadius: 14, padding: '22px 16px',
        textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Total</div>
        <div style={{ color: '#fff', fontSize: 38, fontWeight: 'bold' }}>{total.toFixed(2)} €</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
          {filtered.length} {filtered.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </div>

      {/* Por persona */}
      <div style={{ fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>Por persona</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {byUser.map(user => (
          <div key={user.id} style={{
            flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: '14px 10px',
            textAlign: 'center', borderTop: `4px solid ${user.color}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333' }}>{user.name}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: user.color, marginTop: 4 }}>
              {user.total.toFixed(2)} €
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
              {total > 0 ? ((user.total / total) * 100).toFixed(0) : 0}%
            </div>
          </div>
        ))}
      </div>

      {/* Por categoría */}
      <div style={{ fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>Por categoría</div>
      {sortedCategories.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#bbb', marginTop: 30, fontSize: 15 }}>
          Sin gastos en este período
        </div>
      ) : (
        sortedCategories.map(([cat, amount]) => (
          <div key={cat} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{CATEGORY_ICONS[cat as Category]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 5 }}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </div>
              {/* Barra de progreso */}
              <div style={{ height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: 6, backgroundColor: '#6200ee', borderRadius: 3,
                  width: `${total > 0 ? (amount / total) * 100 : 0}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 'bold', color: '#333', flexShrink: 0 }}>
              {amount.toFixed(2)} €
            </span>
          </div>
        ))
      )}
    </div>
  );
}
