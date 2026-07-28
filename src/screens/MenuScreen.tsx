import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchWeekMenu, saveMealSlotRows, fetchRecentPurchases, removeRecentPurchase,
  fetchCustomIdeas, pushCustomIdea, removeCustomIdea, setCurrentWeekStart,
} from '../store/menuSlice';
import { DietTag, MealSlot, MenuRow, RowType, WeekDay } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import { registerHousehold } from '../services/sharedService';
import { WEEK_DAYS, addWeeksISO, formatWeekRange, getMondayISO, getDayDateLabel, isToday } from '../utils/date';
import { MEAL_IDEAS } from '../data/mealIdeas';

const BLUE = '#2563eb';
const SAVE_DELAY = 500;

// Colores: comida compartida = azul, Maria F = verde, Maria N = rojo
const COMPARTIDO = { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
const MARIA_F = { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' };
const MARIA_N = { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' };

const SLOTS: { id: MealSlot; label: string; icon: string; solid: string; bg: string }[] = [
  { id: 'comida', label: 'Comida', icon: '🍲', solid: '#f59e0b', bg: '#fffbeb' },
  { id: 'cena', label: 'Cena', icon: '🌙', solid: '#6366f1', bg: '#f5f3ff' },
];

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16, overflow: 'hidden',
};

/** Panel lateral colapsable */
function Panel({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={cardStyle}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ fontSize: 12, color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </button>
      {open && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  );
}

const capitalizeFirst = (s: string): string => s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

/** Textarea que crece con el contenido y hace wrap del texto (mejor lectura en tablet) */
function AutoTextarea(props: {
  value: string; placeholder: string; style: React.CSSProperties;
  onFocus: () => void; onChange: (value: string) => void;
  onDrop: (name: string) => void; onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => { resize(ref.current); }, [props.value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={props.value}
      placeholder={props.placeholder}
      onFocus={props.onFocus}
      onChange={e => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        const name = e.dataTransfer.getData('text/plain');
        if (name) props.onDrop(name);
      }}
      style={{
        width: '100%', border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', lineHeight: 1.35,
        ...props.style,
      }}
    />
  );
}

const newRow = (type: RowType): MenuRow => ({
  id: crypto.randomUUID(), type, shared: '', personF: '', personN: '',
});

type Field = 'shared' | 'personF' | 'personN';

interface SelectedCell { day: WeekDay; slot: MealSlot; rowId: string; field: Field; }

const fieldKey = (day: WeekDay, slot: MealSlot, rowId: string, field: Field) => `${day}|${slot}|${rowId}|${field}`;

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentWeekStart, weekMenu, recentPurchases, customIdeas, loading } =
    useSelector((state: RootState) => state.menu);

  const [dietFilter, setDietFilter] = useState<DietTag | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // Buffer local de edición: evita que las respuestas del servidor (que
  // llegan con retraso) pisen lo que estás escribiendo ahora mismo — antes,
  // al escribir rápido, cada tecla disparaba un guardado y una respuesta
  // desactualizada podía "comerse" letras o dejar el texto revuelto.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    registerHousehold(HOUSEHOLD_CODE);
  }, []);

  useEffect(() => {
    dispatch(fetchWeekMenu(currentWeekStart));
    dispatch(fetchRecentPurchases());
    dispatch(fetchCustomIdeas());
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

  const getFieldValue = (day: WeekDay, slot: MealSlot, row: MenuRow, field: Field): string => {
    const key = fieldKey(day, slot, row.id, field);
    return key in drafts ? drafts[key] : row[field];
  };

  /** Escritura: actualiza al instante en pantalla (con mayúscula inicial) y guarda tras una pausa breve. */
  const handleFieldChange = (day: WeekDay, slot: MealSlot, rowId: string, field: Field, rawValue: string) => {
    const value = capitalizeFirst(rawValue);
    const key = fieldKey(day, slot, rowId, field);
    setDrafts(prev => ({ ...prev, [key]: value }));

    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      const rows = getRows(day, slot).map(r => r.id === rowId ? { ...r, [field]: value } : r);
      dispatch(saveMealSlotRows({ weekStart: currentWeekStart, day, slot, rows }));
    }, SAVE_DELAY);
  };

  /** Al salir del campo: guarda ya (sin esperar la pausa) y, si hay texto, lo añade a "vuestras recetas". */
  const commitField = (day: WeekDay, slot: MealSlot, rowId: string, field: Field) => {
    const key = fieldKey(day, slot, rowId, field);
    if (!(key in drafts)) return; // no había cambios pendientes
    const value = drafts[key];
    clearTimeout(timers.current[key]);

    const rows = getRows(day, slot).map(r => r.id === rowId ? { ...r, [field]: value } : r);
    saveRows(day, slot, rows);
    setDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
    if (value.trim()) dispatch(pushCustomIdea(value.trim()));
  };

  /** Cambio inmediato (arrastrar, botones, aplicar idea): sin debounce. */
  const setFieldNow = (day: WeekDay, slot: MealSlot, rowId: string, field: Field, rawValue: string) => {
    const value = capitalizeFirst(rawValue);
    const key = fieldKey(day, slot, rowId, field);
    setDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
    const rows = getRows(day, slot).map(r => r.id === rowId ? { ...r, [field]: value } : r);
    saveRows(day, slot, rows);
    if (value.trim()) dispatch(pushCustomIdea(value.trim()));
  };

  const addRow = (day: WeekDay, slot: MealSlot, type: RowType) => {
    saveRows(day, slot, [...getRows(day, slot), newRow(type)]);
  };

  const addRowWithDish = (day: WeekDay, slot: MealSlot, name: string) => {
    const value = capitalizeFirst(name);
    const row = newRow('compartido');
    row.shared = value;
    saveRows(day, slot, [...getRows(day, slot), row]);
    dispatch(pushCustomIdea(value));
  };

  const removeRow = (day: WeekDay, slot: MealSlot, rowId: string) => {
    saveRows(day, slot, getRows(day, slot).filter(r => r.id !== rowId));
  };

  const applyIdea = (name: string) => {
    if (!selectedCell) return;
    setFieldNow(selectedCell.day, selectedCell.slot, selectedCell.rowId, selectedCell.field, name);
  };

  const filteredIdeas = dietFilter ? MEAL_IDEAS.filter(i => i.dietTag === dietFilter) : MEAL_IDEAS;

  const isFieldSelected = (day: WeekDay, slot: MealSlot, rowId: string, field: Field) =>
    selectedCell?.day === day && selectedCell.slot === slot && selectedCell.rowId === rowId && selectedCell.field === field;

  const draggableIdea = (name: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => e.dataTransfer.setData('text/plain', name),
  });

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 20px 40px', backgroundColor: '#f0f4f8' }}>
      <div className="menu-layout">

        {/* Barra lateral: compras recientes + ideas (colapsables) */}
        <div className="menu-side">
          <Panel title="🛒 Compras recientes">
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
          </Panel>

          <Panel title="💡 Ideas">
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
              Arrastra una idea al menú, o toca un plato y luego una idea para rellenarlo.
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: customIdeas.length > 0 ? 14 : 0 }}>
              {filteredIdeas.map(idea => (
                <button
                  key={idea.id}
                  {...draggableIdea(idea.name)}
                  onClick={() => applyIdea(idea.name)}
                  disabled={!selectedCell}
                  style={{
                    padding: '7px 12px', borderRadius: 20, border: '1.5px solid #e2e8f0',
                    backgroundColor: '#fff', color: '#334155', fontSize: 13, fontWeight: 500,
                    cursor: 'grab', opacity: selectedCell ? 1 : 0.85,
                  }}
                >
                  {idea.dietTag === 'vegetariano' ? '🥦' : '🍖'} {idea.name}
                </button>
              ))}
            </div>
            {customIdeas.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                  🧑‍🍳 Vuestras recetas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {customIdeas.map(idea => (
                    <span
                      key={idea.name}
                      {...draggableIdea(idea.name)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'grab',
                        padding: '6px 6px 6px 12px', borderRadius: 20, border: '1.5px solid #e2e8f0',
                        backgroundColor: '#fff', color: '#334155', fontSize: 13, fontWeight: 500,
                      }}
                      onClick={() => applyIdea(idea.name)}
                    >
                      {idea.name}
                      <button
                        onClick={e => { e.stopPropagation(); dispatch(removeCustomIdea(idea.name)); }}
                        title="Quitar idea"
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
              </>
            )}
          </Panel>
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

                        <div
                          style={{ flex: 1, backgroundColor: slot.bg, padding: '10px 12px' }}
                          onDragOver={e => rows.length === 0 && e.preventDefault()}
                          onDrop={e => {
                            if (rows.length > 0) return;
                            e.preventDefault();
                            const name = e.dataTransfer.getData('text/plain');
                            if (name) addRowWithDish(key, slot.id, name);
                          }}
                        >
                          {rows.map(row => (
                            <div key={row.id} style={{
                              display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 8,
                              borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0',
                            }}>
                              {row.type === 'compartido' ? (
                                <AutoTextarea
                                  value={getFieldValue(key, slot.id, row, 'shared')}
                                  placeholder="Plato compartido…"
                                  onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'shared' })}
                                  onChange={v => handleFieldChange(key, slot.id, row.id, 'shared', v)}
                                  onBlur={() => commitField(key, slot.id, row.id, 'shared')}
                                  onDrop={name => setFieldNow(key, slot.id, row.id, 'shared', name)}
                                  style={{
                                    flex: 1, outline: isFieldSelected(key, slot.id, row.id, 'shared') ? `2px solid ${BLUE}` : 'none',
                                    fontSize: 13, fontWeight: 600, color: COMPARTIDO.text, padding: '10px 12px',
                                    backgroundColor: COMPARTIDO.bg,
                                  }}
                                />
                              ) : (
                                <>
                                  <div style={{ flex: 1, backgroundColor: MARIA_F.bg, borderRight: `1px solid ${MARIA_F.border}` }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: MARIA_F.text, padding: '4px 12px 0' }}>MARIA F</div>
                                    <AutoTextarea
                                      value={getFieldValue(key, slot.id, row, 'personF')}
                                      placeholder="Su plato…"
                                      onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'personF' })}
                                      onChange={v => handleFieldChange(key, slot.id, row.id, 'personF', v)}
                                      onBlur={() => commitField(key, slot.id, row.id, 'personF')}
                                      onDrop={name => setFieldNow(key, slot.id, row.id, 'personF', name)}
                                      style={{
                                        outline: isFieldSelected(key, slot.id, row.id, 'personF') ? `2px solid ${BLUE}` : 'none',
                                        fontSize: 13, fontWeight: 600, color: MARIA_F.text, padding: '2px 12px 8px',
                                        backgroundColor: 'transparent',
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1, backgroundColor: MARIA_N.bg }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: MARIA_N.text, padding: '4px 12px 0' }}>MARIA N</div>
                                    <AutoTextarea
                                      value={getFieldValue(key, slot.id, row, 'personN')}
                                      placeholder="Su plato…"
                                      onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'personN' })}
                                      onChange={v => handleFieldChange(key, slot.id, row.id, 'personN', v)}
                                      onBlur={() => commitField(key, slot.id, row.id, 'personN')}
                                      onDrop={name => setFieldNow(key, slot.id, row.id, 'personN', name)}
                                      style={{
                                        outline: isFieldSelected(key, slot.id, row.id, 'personN') ? `2px solid ${BLUE}` : 'none',
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
