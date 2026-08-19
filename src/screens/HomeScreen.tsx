import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loadData } from '../store/expenseSlice';
import { COLORS, FONT_HEAD, shadow, border } from '../theme';

type Section = 'tickets' | 'add' | 'summary' | 'menu' | 'recipes' | 'games' | 'settings';

interface Props { onNavigate: (section: Section) => void; }

const SECTIONS: { id: Section; icon: string; title: string; desc: string }[] = [
  { id: 'tickets', icon: '🧾', title: 'Gastos y tickets', desc: 'Consulta, filtra y exporta todos los gastos registrados.' },
  { id: 'add', icon: '➕', title: 'Añadir gasto', desc: 'Escanea un ticket o añade un gasto manualmente.' },
  { id: 'summary', icon: '📊', title: 'Resumen', desc: 'Estadísticas por categoría, periodo y persona.' },
  { id: 'menu', icon: '🍽️', title: 'Menú semanal', desc: 'Planifica comidas y cenas de lunes a domingo.' },
  { id: 'recipes', icon: '📖', title: 'Recetario', desc: 'Guarda vuestras recetas con tipo y puntuación.' },
  { id: 'games', icon: '🎲', title: 'Juegos', desc: 'Contador de victorias y historial de partidas.' },
  { id: 'settings', icon: '⚙️', title: 'Ajustes', desc: 'Gestiona los nombres de los usuarios.' },
];

export default function HomeScreen({ onNavigate }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { expenses } = useSelector((state: RootState) => state.expenses);

  useEffect(() => { dispatch(loadData()); }, []);

  const now = new Date();
  const thisMonthTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div style={{ overflowY: 'auto', height: '100%', backgroundColor: COLORS.bg }}>
      <div style={{ backgroundColor: COLORS.header, borderBottom: border(2.5), padding: '28px 24px 40px' }}>
        <div style={{ color: 'rgba(38,32,26,0.65)', fontSize: 13, fontWeight: 600 }}>Este mes has gastado</div>
        <div style={{ color: COLORS.headerText, fontFamily: FONT_HEAD, fontSize: 38, fontWeight: 700, lineHeight: 1.1 }}>
          {thisMonthTotal.toFixed(2)} €
        </div>
        <div style={{ color: 'rgba(38,32,26,0.65)', fontSize: 13, marginTop: 4 }}>
          {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} en total
        </div>
      </div>

      <div style={{ padding: '20px 24px 40px', marginTop: 4 }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onNavigate(s.id)}
            style={{
              width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
              backgroundColor: COLORS.card, border: border(), borderRadius: 14,
              padding: '15px 17px', marginBottom: 12, boxShadow: shadow(), cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 26, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 14.5, fontWeight: 700, color: COLORS.ink }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 2 }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
