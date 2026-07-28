import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loadData } from '../store/expenseSlice';

type Section = 'tickets' | 'add' | 'summary' | 'menu' | 'settings';

interface Props { onNavigate: (section: Section) => void; }

const SECTIONS: { id: Section; icon: string; title: string; desc: string }[] = [
  { id: 'tickets', icon: '🧾', title: 'Gastos y tickets', desc: 'Consulta, filtra y exporta todos los gastos registrados.' },
  { id: 'add', icon: '➕', title: 'Añadir gasto', desc: 'Escanea un ticket o añade un gasto manualmente.' },
  { id: 'summary', icon: '📊', title: 'Resumen', desc: 'Estadísticas por categoría, periodo y persona.' },
  { id: 'menu', icon: '🍽️', title: 'Menú semanal', desc: 'Planifica comidas y cenas de lunes a domingo.' },
  { id: 'settings', icon: '⚙️', title: 'Ajustes', desc: 'Gestiona los nombres de los usuarios.' },
];

export default function HomeScreen({ onNavigate }: Props) {
  const dispatch = useDispatch();
  const { expenses } = useSelector((state: RootState) => state.expenses);

  useEffect(() => { dispatch(loadData()); }, []);

  const now = new Date();
  const thisMonthTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div style={{ overflowY: 'auto', height: '100%', backgroundColor: '#f0f4f8' }}>
      <div style={{ backgroundColor: '#6200ee', padding: '28px 24px 40px' }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Este mes has gastado</div>
        <div style={{ color: '#fff', fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>
          {thisMonthTotal.toFixed(2)} €
        </div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 }}>
          {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} en total
        </div>
      </div>

      <div style={{ padding: '20px 24px 40px', marginTop: -20 }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onNavigate(s.id)}
            style={{
              width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
              backgroundColor: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 12,
              border: 'none', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
