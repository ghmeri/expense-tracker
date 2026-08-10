import React, { useState } from 'react';
import { FilterState, Category, User } from '../../types';
import { COLORS, FONT_HEAD, border, shadow } from '../../theme';

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
      <div style={{ display: 'flex', padding: '12px 16px', gap: 10 }}>
        <input
          type="text"
          placeholder="🔍 Buscar gastos..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          style={{
            flex: 1, padding: '11px 15px', borderRadius: 10,
            border: border(2), fontSize: 15,
            backgroundColor: COLORS.card, outline: 'none',
          }}
        />
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 15px', borderRadius: 10,
            border: border(2),
            backgroundColor: filterActive ? COLORS.ink : COLORS.card,
            color: filterActive ? COLORS.yellow : COLORS.muted,
            fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14,
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
            backgroundColor: 'rgba(38,32,26,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            backgroundColor: COLORS.bg, borderRadius: '16px 16px 0 0',
            border: border(2.5), borderBottom: 'none',
            padding: '20px 20px 32px',
            width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 700, color: COLORS.ink }}>Filtros avanzados</div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: COLORS.muted, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Fechas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8 }}>📅 Rango de fechas</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: COLORS.mutedLighter, marginBottom: 4 }}>Desde</div>
                  <input
                    type="date"
                    value={filters.dateFrom ? filters.dateFrom.slice(0, 10) : ''}
                    onChange={e =>
                      onChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : null })
                    }
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: border(1.5), fontSize: 13, outline: 'none', backgroundColor: COLORS.card,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: COLORS.mutedLighter, marginBottom: 4 }}>Hasta</div>
                  <input
                    type="date"
                    value={filters.dateTo ? filters.dateTo.slice(0, 10) : ''}
                    onChange={e =>
                      onChange({ ...filters, dateTo: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : null })
                    }
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: border(1.5), fontSize: 13, outline: 'none', backgroundColor: COLORS.card,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Categorías */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8 }}>📂 Categoría</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => onChange({ ...filters, category: cat.value })}
                    style={{
                      padding: '7px 12px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
                      border: border(2),
                      backgroundColor: filters.category === cat.value ? COLORS.ink : COLORS.card,
                      color: filters.category === cat.value ? COLORS.yellow : COLORS.ink,
                      fontWeight: filters.category === cat.value ? 700 : 500,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8 }}>👤 Persona</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onChange({ ...filters, userId: 'todos' })}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, cursor: 'pointer', fontSize: 13.5,
                    border: border(2),
                    backgroundColor: filters.userId === 'todos' ? COLORS.ink : COLORS.card,
                    color: filters.userId === 'todos' ? COLORS.yellow : COLORS.ink,
                    fontWeight: filters.userId === 'todos' ? 700 : 500,
                  }}
                >
                  Todos
                </button>
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onChange({ ...filters, userId: user.id })}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10, cursor: 'pointer', fontSize: 13,
                      border: border(2),
                      backgroundColor: filters.userId === user.id ? user.color : COLORS.card,
                      color: filters.userId === user.id ? '#fff' : COLORS.ink,
                      fontWeight: 600,
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
                  flex: 1, padding: 14, borderRadius: 10, fontSize: 14, cursor: 'pointer',
                  border: border(2), backgroundColor: COLORS.card, color: COLORS.ink, fontWeight: 600,
                }}
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 2, padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  border: border(2.5), backgroundColor: COLORS.ink, color: COLORS.yellow, boxShadow: shadow(3),
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
