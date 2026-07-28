import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchWeekMenu, saveMealSlotRows, fetchRecentPurchases, removeRecentPurchase, setCurrentWeekStart,
} from '../store/menuSlice';
import { DietTag, MealSlot, MenuRow, RowType, WeekDay } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import { registerHousehold } from '../services/sharedService';
import { WEEK_DAYS, addWeeksISO, formatWeekRange, getMondayISO, getDayDateLabel, isToday } from '../utils/date';
import { MEAL_IDEAS } from '../data/mealIdeas';

const BLUE = '#2563eb';

// Colores: comida compartida = azul, Maria F = verde, Maria N = rojo
const COMPARTIDO = { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
const MARIA_F = { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' };
const MARIA_N = { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' };

const SLOTS: { id: MealSlot; label: string; icon: string; solid: string; bg: string }[] = [
  { id: 'comida', label: 'Comida', icon: '🍲', solid: '#f59e0b', bg: '#fffbeb' },
  { id: 'cena', label: 'Cena', icon: '🌙', solid: '#6366f1', bg: '#f5f3ff' },
];

const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
  <div style={{
    backgroundColor: '#fff', borderRadius: 16, padding: '18px 20px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16, ...extra,
  }}>
    {children}
  </div>
);

const newRow = (type: RowType): MenuRow => ({
  id: crypto.randomUUID(), type, shared: '', personF: '', personN: '',
});

type Field = 'shared' | 'personF' | 'personN';

interface SelectedCell { day: WeekDay; slot: MealSlot; rowId: string; field: Field; }

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentWeekStart, weekMenu, recentPurchases, loading } =
    useSelector((state: RootState) => state.menu);

  const [dietFilter, setDietFilter] = useState<DietTag | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  useEffect(() => {
    registerHousehold(HOUSEHOLD_CODE);
  }, []);

  useEffect(() => {
    dispatch(fetchWeekMenu(currentWeekStart));
    dispatch(fetchRecentPurchases());
  }, [currentWeekStart]);

  // Blindaje: si el documento guardado viene de una versión anterior del
  // esquema del menú (no era un array de filas), lo ignoramos en vez de
  // romper el render — al primer cambio se sobrescribe con el formato actual.
  const getRows = (day: WeekDay, slot: MealSlot): MenuRow[] => {
    const raw = weekMenu[day]?.[slot];
    if (!Array.isArray(raw)) return [];
    return raw.filter((r): r is MenuRow =>
      !!r && typeof r === 'object' && (r.type === 'compartido' || r.type === 'separado'));
  };

  const saveRows = (day: WeekDay, slot: MealSlot, rows: MenuRow[]) => {
    dispatch(saveMealSlotRows({ weekStart: currentWeekStart, day, slot, rows }));
  };

  const updateField = (day: WeekDay, slot: MealSlot, rowId: string, field: Field, value: string) => {
    const rows = getRows(day, slot).map(r => r.id === rowId ? { ...r, [field]: value } : r);
    saveRows(day, slot, rows);
  };

  const addRow = (day: WeekDay, slot: MealSlot, type: RowType) => {
    saveRows(day, slot, [...getRows(day, slot), newRow(type)]);
  };

  const removeRow = (day: WeekDay, slot: MealSlot, rowId: string) => {
    saveRows(day, slot, getRows(day, slot).filter(r => r.id !== rowId));
  };

  const applyIdea = (name: string) => {
    if (!selectedCell) return;
    updateField(selectedCell.day, selectedCell.slot, selectedCell.rowId, selectedCell.field, name);
  };

  const filteredIdeas = dietFilter ? MEAL_IDEAS.filter(i => i.dietTag === dietFilter) : MEAL_IDEAS;

  const isFieldSelected = (day: WeekDay, slot: MealSlot, rowId: string, field: Field) =>
    selectedCell?.day === day && selectedCell.slot === slot && selectedCell.rowId === rowId && selectedCell.field === field;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 20px 40px', backgroundColor: '#f0f4f8' }}>
      <div className="menu-layout">

        {/* Barra lateral: compras recientes + ideas */}
        <div className="menu-side">
          {card(
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
                🛒 Compras recientes
              </div>
              {recentPurchases.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Cuando escaneéis un ticket, los productos aparecerán aquí como inspiración.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {recentPurchases.map(item => (
                    <span key={item.name} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 6px 6px 12px', borderRadius: 20, backgroundColor: '#f0f4f8',
                      color: '#334155', fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
                    }}>
                      {item.name}
                      <button
                        onClick={() => dispatch(removeRecentPurchase(item.name))}
                        title="Quitar de la lista"
                        style={{
                          width: 18, height: 18, borderRadius: '50%', border: 'none',
                          backgroundColor: '#e2e8f0', color: '#64748b', fontSize: 11,
                          lineHeight: '18px', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {card(
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  💡 Ideas
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([null, 'vegetariano', 'con_carne'] as const).map(tag => (
                    <button
                      key={String(tag)}
                      onClick={() => setDietFilter(tag)}
                      style={{
                        padding: '4px 9px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                        border: `1.5px solid ${dietFilter === tag ? BLUE : '#e2e8f0'}`,
                        backgroundColor: dietFilter === tag ? '#eff6ff' : '#fff',
                        color: dietFilter === tag ? BLUE : '#94a3b8', fontWeight: 600,
                      }}
                    >
                      {tag === null ? 'Todas' : tag === 'vegetariano' ? '🥦' : '🍖'}
                    </button>
                  ))}
                </div>
              </div>
              {!selectedCell && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                  Toca un plato del calendario y luego una idea para rellenarlo.
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filteredIdeas.map(idea => (
                  <button
                    key={idea.id}
                    onClick={() => applyIdea(idea.name)}
                    disabled={!selectedCell}
                    style={{
                      padding: '7px 12px', borderRadius: 20, border: '1.5px solid #e2e8f0',
                      backgroundColor: '#fff', color: '#334155', fontSize: 13, fontWeight: 500,
                      cursor: selectedCell ? 'pointer' : 'not-allowed', opacity: selectedCell ? 1 : 0.5,
                    }}
                  >
                    {idea.dietTag === 'vegetariano' ? '🥦' : '🍖'} {idea.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calendario semanal */}
        <div className="menu-main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <button onClick={() => dispatch(setCurrentWeekStart(addWeeksISO(currentWeekStart, -1)))} style={{
              width: 40, height: 40, borderRadius: 10, border: '2px solid #e2e8f0',
              backgroundColor: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0,
            }}>‹</button>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10,
              backgroundColor: '#fff', border: '2px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#1e293b',
            }}>
              Semana del {formatWeekRange(currentWeekStart)}
            </div>
            <button onClick={() => dispatch(setCurrentWeekStart(addWeeksISO(currentWeekStart, 1)))} style={{
              width: 40, height: 40, borderRadius: 10, border: '2px solid #e2e8f0',
              backgroundColor: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0,
            }}>›</button>
          </div>
          <button onClick={() => dispatch(setCurrentWeekStart(getMondayISO(new Date())))} style={{
            display: 'block', margin: '8px auto 18px',
            padding: '6px 14px', borderRadius: 20, border: 'none', backgroundColor: '#eff6ff',
            color: BLUE, fontWeight: 600, fontSize: 12, cursor: 'pointer',
          }}>
            Hoy
          </button>

          {loading && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Cargando…</div>
          )}

          {WEEK_DAYS.map(({ key, label }, index) => {
            const today = isToday(currentWeekStart, index);
            return (
              <div key={key} style={{
                backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden',
                boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                border: today ? `2px solid ${BLUE}` : '2px solid transparent',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 16px',
                  backgroundColor: today ? BLUE : '#f8fafc', borderBottom: '1px solid #e2e8f0',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: today ? '#fff' : '#1e293b', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontSize: 12, color: today ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>
                    {getDayDateLabel(currentWeekStart, index)}
                  </span>
                </div>

                <div style={{ padding: '12px 16px' }}>
                  {SLOTS.map((slot, si) => {
                    const rows = getRows(key, slot.id);
                    return (
                      <div key={slot.id} style={{
                        display: 'flex', alignItems: 'stretch', marginBottom: si === 0 ? 12 : 0,
                        borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0',
                      }}>
                        {/* Etiqueta lateral */}
                        <div style={{
                          width: 30, flexShrink: 0, backgroundColor: slot.solid,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{
                            display: 'inline-block', transform: 'rotate(-90deg)', whiteSpace: 'nowrap',
                            fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 1, textTransform: 'uppercase',
                          }}>
                            {slot.icon} {slot.label}
                          </span>
                        </div>

                        <div style={{ flex: 1, backgroundColor: slot.bg, padding: '10px 12px' }}>
                          {rows.map(row => (
                            <div key={row.id} style={{
                              display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 8,
                              borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0',
                            }}>
                              {row.type === 'compartido' ? (
                                <input
                                  value={row.shared}
                                  placeholder="Plato compartido…"
                                  onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'shared' })}
                                  onChange={e => updateField(key, slot.id, row.id, 'shared', e.target.value)}
                                  style={{
                                    flex: 1, border: 'none', outline: isFieldSelected(key, slot.id, row.id, 'shared') ? `2px solid ${BLUE}` : 'none',
                                    fontSize: 13, fontWeight: 600, color: COMPARTIDO.text, padding: '10px 12px',
                                    backgroundColor: COMPARTIDO.bg,
                                  }}
                                />
                              ) : (
                                <>
                                  <div style={{ flex: 1, backgroundColor: MARIA_F.bg, borderRight: `1px solid ${MARIA_F.border}` }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: MARIA_F.text, padding: '4px 12px 0' }}>MARIA F</div>
                                    <input
                                      value={row.personF}
                                      placeholder="Su plato…"
                                      onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'personF' })}
                                      onChange={e => updateField(key, slot.id, row.id, 'personF', e.target.value)}
                                      style={{
                                        width: '100%', border: 'none', outline: isFieldSelected(key, slot.id, row.id, 'personF') ? `2px solid ${BLUE}` : 'none',
                                        fontSize: 13, fontWeight: 600, color: MARIA_F.text, padding: '2px 12px 8px',
                                        backgroundColor: 'transparent',
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1, backgroundColor: MARIA_N.bg }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: MARIA_N.text, padding: '4px 12px 0' }}>MARIA N</div>
                                    <input
                                      value={row.personN}
                                      placeholder="Su plato…"
                                      onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'personN' })}
                                      onChange={e => updateField(key, slot.id, row.id, 'personN', e.target.value)}
                                      style={{
                                        width: '100%', border: 'none', outline: isFieldSelected(key, slot.id, row.id, 'personN') ? `2px solid ${BLUE}` : 'none',
                                        fontSize: 13, fontWeight: 600, color: MARIA_N.text, padding: '2px 12px 8px',
                                        backgroundColor: 'transparent',
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                              <button
                                onClick={() => removeRow(key, slot.id, row.id)}
                                title="Quitar fila"
                                style={{
                                  width: 28, flexShrink: 0, border: 'none', borderLeft: '1px solid rgba(0,0,0,0.06)',
                                  backgroundColor: '#fff', color: '#cbd5e1', fontSize: 14, cursor: 'pointer',
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          <div style={{ display: 'flex', gap: 6, marginTop: rows.length > 0 ? 4 : 0 }}>
                            <button onClick={() => addRow(key, slot.id, 'compartido')} style={{
                              flex: 1, padding: '6px 8px', borderRadius: 8, border: '1.5px dashed #cbd5e1',
                              backgroundColor: '#fff', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            }}>
                              + Plato compartido
                            </button>
                            <button onClick={() => addRow(key, slot.id, 'separado')} style={{
                              flex: 1, padding: '6px 8px', borderRadius: 8, border: '1.5px dashed #cbd5e1',
                              backgroundColor: '#fff', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            }}>
                              + Plato para cada una
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
