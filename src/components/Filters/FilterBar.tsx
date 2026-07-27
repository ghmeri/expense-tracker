import React, { useState } from 'react';
import { FilterState, Category, User } from '../../types';

interface Props {
  filters: FilterState;
  users: User[];
  onChange: (filters: FilterState) => void;
}

const CATEGORIES: { label: string; value: Category | 'todas' }[] = [
  { label: 'Todas', value: 'todas' },
  { label: '🛒 Alimentación', value: 'alimentacion' },
  { label: '🚗 Transporte', value: 'transporte' },
  { label: '🎮 Ocio', value: 'ocio' },
  { label: '💊 Salud', value: 'salud' },
  { label: '🏠 Hogar', value: 'hogar' },
  { label: '👕 Ropa', value: 'ropa' },
  { label: '💻 Tecnología', value: 'tecnologia' },
  { label: '📦 Otros', value: 'otros' },
];

export default function FilterBar({ filters, users, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);

  const activeFiltersCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.category !== 'todas' ? filters.category : null,
    filters.userId !== 'todos' ? filters.userId : null,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onChange({ search: filters.search, dateFrom: null, dateTo: null, category: 'todas', userId: 'todos' });
  };

  const filterActive = activeFiltersCount > 0;

  return (
    <div>
      {/* Barra de búsqueda */}
      <div style={{ display: 'flex', padding: '8px 16px', gap: 8 }}>
        <input
          type="text"
          placeholder="🔍 Buscar gastos..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            border: '1px solid #ddd', fontSize: 14,
            backgroundColor: '#fff', outline: 'none',
          }}
        />
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${filterActive ? '#6200ee' : '#ddd'}`,
            backgroundColor: filterActive ? '#6200ee' : '#fff',
            color: filterActive ? '#fff' : '#333',
            fontWeight: 'bold', fontSize: 14,
          }}
        >
          ⚙️{filterActive ? ` (${activeFiltersCount})` : ''}
        </button>
      </div>

      {/* Modal filtros */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px 16px 0 0',
            padding: '20px 20px 32px',
            width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>Filtros avanzados</div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#666', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Fechas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>📅 Rango de fechas</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Desde</div>
                  <input
                    type="date"
                    value={filters.dateFrom ? filters.dateFrom.slice(0, 10) : ''}
                    onChange={e =>
                      onChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : null })
                    }
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1px solid #ddd', fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Hasta</div>
                  <input
                    type="date"
                    value={filters.dateTo ? filters.dateTo.slice(0, 10) : ''}
                    onChange={e =>
                      onChange({ ...filters, dateTo: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : null })
                    }
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1px solid #ddd', fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Categorías */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>📂 Categoría</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => onChange({ ...filters, category: cat.value })}
                    style={{
                      padding: '6px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${filters.category === cat.value ? '#6200ee' : '#ddd'}`,
                      backgroundColor: filters.category === cat.value ? '#6200ee' : '#fff',
                      color: filters.category === cat.value ? '#fff' : '#333',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>👤 Persona</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onChange({ ...filters, userId: 'todos' })}
                  style={{
                    flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    border: `1px solid ${filters.userId === 'todos' ? '#6200ee' : '#ddd'}`,
                    backgroundColor: filters.userId === 'todos' ? '#6200ee' : '#fff',
                    color: filters.userId === 'todos' ? '#fff' : '#333',
                  }}
                >
                  Todos
                </button>
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onChange({ ...filters, userId: user.id })}
                    style={{
                      flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      border: `1px solid ${filters.userId === user.id ? user.color : '#ddd'}`,
                      backgroundColor: filters.userId === user.id ? user.color : '#fff',
                      color: filters.userId === user.id ? '#fff' : '#333',
                    }}
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={resetFilters}
                style={{
                  flex: 1, padding: 12, borderRadius: 8, fontSize: 14, cursor: 'pointer',
                  border: '1px solid #ddd', backgroundColor: '#fff', color: '#333',
                }}
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 2, padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
                  border: 'none', backgroundColor: '#6200ee', color: '#fff',
                }}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
