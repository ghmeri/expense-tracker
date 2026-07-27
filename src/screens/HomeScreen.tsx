import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loadData, removeExpense } from '../store/expenseSlice';
import ExpenseCard from '../components/Expenses/ExpenseCard';
import FilterBar from '../components/Filters/FilterBar';
import { FilterState } from '../types';
import { exportToPDF, exportToCSV } from '../services/exportService';

const initialFilters: FilterState = {
  search: '',
  dateFrom: null,
  dateTo: null,
  category: 'todas',
  userId: 'todos',
};

export default function HomeScreen() {
  const dispatch = useDispatch();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Cabecera morada */}
      <div style={{ backgroundColor: '#6200ee', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Total gastado</div>
            <div style={{ color: '#fff', fontSize: 34, fontWeight: 'bold', lineHeight: 1.1 }}>
              {total.toFixed(2)} €
            </div>
            {filtered.length !== expenses.length && (
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 }}>
                {filtered.length} de {expenses.length} gastos
              </div>
            )}
          </div>

          {/* Botón exportar */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExport(!showExport)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
                padding: '10px 14px', border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff', fontWeight: 'bold', fontSize: 13, cursor: 'pointer',
              }}
            >
              📤 Exportar
            </button>

            {showExport && (
              <>
                {/* Overlay para cerrar */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                  onClick={() => setShowExport(false)}
                />
                <div style={{
                  position: 'absolute', right: 0, top: '110%', zIndex: 10,
                  backgroundColor: '#fff', borderRadius: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)', overflow: 'hidden', minWidth: 170,
                }}>
                  <button
                    onClick={() => { setShowExport(false); exportToPDF(filtered, users); }}
                    style={{
                      display: 'block', width: '100%', padding: '13px 16px',
                      background: 'none', border: 'none', textAlign: 'left',
                      cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0',
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
          <div style={{ textAlign: 'center', marginTop: 70, color: '#94a3b8', fontSize: 16 }}>
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
