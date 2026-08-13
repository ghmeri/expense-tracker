import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loadData } from '../store/expenseSlice';
import { Category } from '../types';
import { COLORS, FONT_HEAD, border, shadow } from '../theme';
import DonutChart, { DonutSlice } from '../components/DonutChart';

const CATEGORY_ICONS: Record<Category, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

// Paleta categórica validada (8 series, todas superan lightness/chroma/CVD/contraste —
// ver skill de dataviz). No reutiliza theme.ts tal cual porque esos colores incluyen
// grises de texto no pensados para diferenciar series.
const CATEGORY_COLORS: Record<Category, string> = {
  alimentacion: '#F2622A',
  ocio: '#1F8A70',
  hogar: '#C77D2E',
  tecnologia: '#7C3AED',
  transporte: '#2A6FB0',
  salud: '#D8451C',
  ropa: '#3E8E5A',
  otros: '#B0479A',
};

type Period = 'todo' | 'mes' | 'semana';
type DonutView = 'flujo' | 'categoria' | 'persona';

export default function SummaryScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { expenses, users } = useSelector((state: RootState) => state.expenses);
  const [period, setPeriod] = useState<Period>('mes');
  const [donutView, setDonutView] = useState<DonutView>('flujo');

  useEffect(() => { dispatch(loadData()); }, []);

  const now = new Date();
  const filtered = expenses.filter(e => {
    const date = new Date(e.date);
    if (period === 'semana') return (now.getTime() - date.getTime()) / 86400000 <= 7;
    if (period === 'mes') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return true;
  });

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  // Un ingreso se guarda como importe negativo (mismo modelo Expense para ambos).
  const totalGastado = filtered.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
  const totalIngresado = filtered.filter(e => e.amount < 0).reduce((sum, e) => sum - e.amount, 0);

  const byUser = users.map(user => ({
    ...user,
    total: filtered.filter(e => e.userId === user.id).reduce((sum, e) => sum + e.amount, 0),
  }));

  // ── Datos para el donut según la vista seleccionada ──
  // Categoría y persona se calculan solo sobre gastos (positivos): un ingreso
  // (amount negativo) no "resta" visualmente de una categoría o persona en el donut,
  // a diferencia del neto que usan las secciones de barras de abajo.
  const gastosOnly = filtered.filter(e => e.amount > 0);
  const gastoPorCategoria = gastosOnly.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const gastoPorUsuario = users.map(user => ({
    ...user,
    total: gastosOnly.filter(e => e.userId === user.id).reduce((sum, e) => sum + e.amount, 0),
  }));

  // Solo gastos (positivos): igual criterio que el donut, evita categorías con
  // barra rota si su neto fuese negativo por tener algún ingreso registrado ahí.
  const sortedCategories = Object.entries(gastoPorCategoria).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);

  const flujoSlices: DonutSlice[] = [
    { key: 'gastos', label: 'Gastos', value: totalGastado, color: COLORS.orange, icon: '💸' },
    { key: 'ingresos', label: 'Ingresos', value: totalIngresado, color: COLORS.teal, icon: '💰' },
  ];
  const categoriaSlices: DonutSlice[] = (Object.entries(gastoPorCategoria) as [Category, number][])
    .filter(([, amount]) => amount > 0)
    .map(([cat, amount]) => ({
      key: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: amount, color: CATEGORY_COLORS[cat], icon: CATEGORY_ICONS[cat],
    }));
  const personaSlices: DonutSlice[] = gastoPorUsuario
    .filter(u => u.total > 0)
    .map(u => ({ key: u.id, label: u.name, value: u.total, color: u.color, icon: '👤' }));

  const DONUT_VIEWS: { id: DonutView; label: string; slices: DonutSlice[]; centerLabel: string; centerValue: string }[] = [
    { id: 'flujo', label: 'Ingresos/Gastos', slices: flujoSlices, centerLabel: 'Balance', centerValue: `${total.toFixed(2)} €` },
    { id: 'categoria', label: 'Categorías', slices: categoriaSlices, centerLabel: 'Gastado', centerValue: `${totalGastado.toFixed(2)} €` },
    { id: 'persona', label: 'Por persona', slices: personaSlices, centerLabel: 'Gastado', centerValue: `${totalGastado.toFixed(2)} €` },
  ];
  const activeDonut = DONUT_VIEWS.find(v => v.id === donutView)!;

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
        backgroundColor: COLORS.header,
        border: border(2.5), borderRadius: 18, padding: '28px 24px', textAlign: 'center', marginBottom: 14,
        boxShadow: shadow(4),
      }}>
        <div style={{ color: 'rgba(38,32,26,0.65)', fontSize: 13 }}>Balance</div>
        <div style={{ color: COLORS.headerText, fontFamily: FONT_HEAD, fontSize: 40, fontWeight: 700, marginTop: 4 }}>{total.toFixed(2)} €</div>
        <div style={{ color: 'rgba(38,32,26,0.65)', fontSize: 13, marginTop: 4 }}>
          {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
        </div>
      </div>

      {/* Gastado / Ingresado */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: '16px', border: border(2), boxShadow: shadow(3), borderTop: `4px solid ${COLORS.orange}` }}>
          <div style={{ fontSize: 12.5, color: COLORS.muted, fontWeight: 600 }}>💸 Gastado</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: COLORS.ink, marginTop: 4 }}>{totalGastado.toFixed(2)} €</div>
        </div>
        <div style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: '16px', border: border(2), boxShadow: shadow(3), borderTop: `4px solid ${COLORS.teal}` }}>
          <div style={{ fontSize: 12.5, color: COLORS.muted, fontWeight: 600 }}>💰 Ingresado</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: COLORS.ink, marginTop: 4 }}>{totalIngresado.toFixed(2)} €</div>
        </div>
      </div>

      {/* Donut con selector de vista */}
      {card(<>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {DONUT_VIEWS.map(v => (
            <button key={v.id} onClick={() => setDonutView(v.id)} style={{
              padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5,
              border: border(1.5, donutView === v.id ? COLORS.ink : COLORS.dashed), fontFamily: FONT_HEAD,
              backgroundColor: donutView === v.id ? COLORS.yellow : COLORS.cardAlt,
              color: COLORS.ink, fontWeight: 700,
            }}>
              {v.label}
            </button>
          ))}
        </div>
        <DonutChart slices={activeDonut.slices} centerLabel={activeDonut.centerLabel} centerValue={activeDonut.centerValue} />
      </>)}

      {/* Por persona */}
      {card(<>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: COLORS.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por persona</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {byUser.map(user => {
            // % sobre el gasto total (no el neto, que puede ser negativo si esa persona registró ingresos).
            const gastoUsuario = gastoPorUsuario.find(u => u.id === user.id)?.total ?? 0;
            const pct = totalGastado > 0 ? (gastoUsuario / totalGastado) * 100 : 0;
            return (
            <div key={user.id} style={{ flex: 1, backgroundColor: COLORS.cardAlt, borderRadius: 12, padding: '16px 12px', textAlign: 'center', border: border(1.5), borderTop: `4px solid ${user.color}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{user.name}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 700, color: user.color, marginTop: 4 }}>{user.total.toFixed(2)} €</div>
              <div style={{ fontSize: 12, color: COLORS.mutedLighter, marginTop: 2 }}>
                {pct.toFixed(0)}% del gasto
              </div>
              {/* Mini barra */}
              <div style={{ height: 5, backgroundColor: COLORS.bg, border: `1px solid ${COLORS.ink}`, borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: user.color, width: `${pct}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
            );
          })}
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
                  <div style={{ height: '100%', backgroundColor: COLORS.orange, width: `${totalGastado > 0 ? (amount / totalGastado) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
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
