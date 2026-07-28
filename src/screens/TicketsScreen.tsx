import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loadData, removeExpense } from '../store/expenseSlice';
import ExpenseCard from '../components/Expenses/ExpenseCard';
import FilterBar from '../components/Filters/FilterBar';
import { FilterState } from '../types';
import { exportToPDF, exportToCSV } from '../services/exportService';
import { COLORS, FONT_HEAD, border, shadow } from '../theme';

const initialFilters: FilterState = {
  search: '',
  dateFrom: null,
  dateTo: null,
  category: 'todas',
  userId: 'todos',
};

export default function TicketsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { expenses, users } = useSelector((state: RootState) => state.expenses);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => { dispatch(loadData()); }, []);

  const getUserName = (userId: string) =>
    users.find(u => u.id === userId)?.name ?? 'Desconocido';
  const getUserColor = (userId: string) =>
    users.find(u => u.id === userId)?.color ?? '#000';

  const filtered = expenses.filter(e => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!e.description?.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
    }
    if (filters.category !== 'todas' && e.category !== filters.category) return false;
    if (filters.userId !== 'todos' && e.userId !== filters.userId) return false;
    if (filters.dateFrom && new Date(e.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(e.date) > new Date(filters.dateTo)) return false;
    return true;
  });

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: COLORS.bg }}>
      {/* Cabecera */}
      <div style={{ backgroundColor: COLORS.ink, padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'rgba(251,239,221,0.7)', fontSize: 13 }}>Total gastado</div>
            <div style={{ color: COLORS.yellow, fontFamily: FONT_HEAD, fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>
              {total.toFixed(2)} €
            </div>
            {filtered.length !== expenses.length && (
              <div style={{ color: 'rgba(251,239,221,0.6)', fontSize: 12, marginTop: 4 }}>
                {filtered.length} de {expenses.length} gastos
              </div>
            )}
          </div>

          {/* Botón exportar */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExport(!showExport)}
              style={{
                backgroundColor: COLORS.yellow, borderRadius: 8,
                padding: '9px 13px', border: `2px solid ${COLORS.ink}`,
                color: COLORS.ink, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
              }}
            >
              📤 Exportar
            </button>

            {showExport && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                  onClick={() => setShowExport(false)}
                />
                <div style={{
                  position: 'absolute', right: 0, top: '110%', zIndex: 10,
                  backgroundColor: COLORS.card, borderRadius: 10, border: border(),
                  boxShadow: shadow(3), overflow: 'hidden', minWidth: 170,
                }}>
                  <button
                    onClick={() => { setShowExport(false); exportToPDF(filtered, users); }}
                    style={{
                      display: 'block', width: '100%', padding: '13px 16px',
                      background: 'none', border: 'none', textAlign: 'left',
                      cursor: 'pointer', fontSize: 13, borderBottom: `1.5px solid ${COLORS.dashed}`,
                    }}
                  >
                    📄 Exportar PDF
                  </button>
                  <button
                    onClick={() => { setShowExport(false); exportToCSV(filtered, users); }}
                    style={{
                      display: 'block', width: '100%', padding: '13px 16px',
                      background: 'none', border: 'none', textAlign: 'left',
                      cursor: 'pointer', fontSize: 13,
                    }}
                  >
                    📊 Exportar CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FilterBar filters={filters} users={users} onChange={setFilters} />

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 70, color: COLORS.mutedLighter, fontSize: 15 }}>
            {expenses.length === 0
              ? '¡Añade tu primer gasto con el botón +!'
              : 'Sin resultados para los filtros aplicados'}
          </div>
        ) : (
          filtered.map(item => (
            <ExpenseCard
              key={item.id}
              expense={item}
              userName={getUserName(item.userId)}
              userColor={getUserColor(item.userId)}
              onDelete={() => dispatch(removeExpense(item.id))}
            />
          ))
        )}
      </div>
    </div>
  );
}
