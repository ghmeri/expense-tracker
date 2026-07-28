import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchWeekMenu, saveMealSlotRows, fetchRecentPurchases, removeRecentPurchase,
  fetchCustomIdeas, pushCustomIdea, removeCustomIdea, setCurrentWeekStart,
} from '../store/menuSlice';
import { DietTag, MealSlot, MenuRow, RowType, WeekDay, WeeklyMenu } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import { registerHousehold, getWeekMenu } from '../services/sharedService';
import {
  WEEK_DAYS, addWeeksISO, formatWeekRange, getMondayISO, getDayDateLabel, isToday,
  getMonthLabel, addMonths, getMonthGrid, MonthDayCell, getTodayISO,
} from '../utils/date';
import { MEAL_IDEAS } from '../data/mealIdeas';
import { COLORS, FONT_HEAD, shadow, border } from '../theme';

const SAVE_DELAY = 500;

// Maria F = naranja, Maria N = verde azulado (misma paleta que comida/cena)
const MARIA_F = { text: COLORS.orangeText, dot: COLORS.orange };
const MARIA_N = { text: COLORS.tealText, dot: COLORS.teal };

const SLOTS: { id: MealSlot; label: string; icon: string; accent: string; dot: string }[] = [
  { id: 'comida', label: 'Comida', icon: '🍲', accent: COLORS.orangeText, dot: COLORS.orange },
  { id: 'cena', label: 'Cena', icon: '🌙', accent: COLORS.tealText, dot: COLORS.teal },
];

const panelStyle: React.CSSProperties = {
  backgroundColor: COLORS.card, border: border(), borderRadius: 14,
  boxShadow: shadow(), marginBottom: 16, overflow: 'hidden',
};

/** Panel lateral colapsable */
function Panel({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={panelStyle}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{title}</span>
        <span style={{ fontSize: 12, color: COLORS.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
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
        background: 'transparent',
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

/** Primer plato de la fila, para la vista de mes (una línea de resumen). */
const miniDish = (rows: MenuRow[] | undefined): string => {
  const row = rows?.[0];
  if (!row) return '';
  if (row.type === 'compartido') return row.shared;
  return row.personF || row.personN;
};

type View = 'week' | 'month';

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentWeekStart, weekMenu, recentPurchases, customIdeas, loading } =
    useSelector((state: RootState) => state.menu);

  const [view, setView] = useState<View>('week');
  const [monthDate, setMonthDate] = useState(new Date());
  const [monthMenus, setMonthMenus] = useState<Record<string, WeeklyMenu>>({});

  const [dietFilter, setDietFilter] = useState<DietTag | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // Buffer local de edición: evita que las respuestas del servidor (que
  // llegan con retraso) pisen lo que estás escribiendo ahora mismo.
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

  const monthGrid = useMemo(() => getMonthGrid(monthDate), [monthDate]);

  useEffect(() => {
    if (view !== 'month') return;
    const weekStarts = Array.from(new Set(monthGrid.map(c => c.weekStart)));
    const missing = weekStarts.filter(ws => !(ws in monthMenus));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(ws => getWeekMenu(HOUSEHOLD_CODE, ws).then(doc => [ws, doc.menu] as const)))
      .then(pairs => {
        if (cancelled) return;
        setMonthMenus(prev => {
          const next = { ...prev };
          for (const [ws, menu] of pairs) next[ws] = menu;
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [view, monthGrid, monthMenus]);

  // Blindaje: si el documento guardado viene de una versión anterior del
  // esquema del menú (no era un array de filas), lo ignoramos en vez de
  // romper el render — al primer cambio se sobrescribe con el formato actual.
  const rowsFrom = (menu: WeeklyMenu, day: WeekDay, slot: MealSlot): MenuRow[] => {
    const raw = menu[day]?.[slot];
    if (!Array.isArray(raw)) return [];
    return raw.filter((r): r is MenuRow =>
      !!r && typeof r === 'object' && (r.type === 'compartido' || r.type === 'separado'));
  };

  const getRows = (day: WeekDay, slot: MealSlot): MenuRow[] => rowsFrom(weekMenu, day, slot);

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
    if (!(key in drafts)) return;
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

  const goToDay = (cell: MonthDayCell) => {
    dispatch(setCurrentWeekStart(cell.weekStart));
    setView('week');
  };

  const filteredIdeas = dietFilter ? MEAL_IDEAS.filter(i => i.dietTag === dietFilter) : MEAL_IDEAS;

  const isFieldSelected = (day: WeekDay, slot: MealSlot, rowId: string, field: Field) =>
    selectedCell?.day === day && selectedCell.slot === slot && selectedCell.rowId === rowId && selectedCell.field === field;

  const draggableIdea = (name: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => e.dataTransfer.setData('text/plain', name),
  });

  const arrowBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 9, border: border(2.5), backgroundColor: COLORS.card,
    fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, cursor: 'pointer', flexShrink: 0,
  };

  const dowLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 20px 40px', backgroundColor: COLORS.bg }}>

      {/* Toggle Semana / Mes */}
      <div style={{
        display: 'inline-flex', gap: 6, backgroundColor: COLORS.card, border: border(2.5),
        borderRadius: 12, padding: 4, boxShadow: shadow(3), marginBottom: 18,
      }}>
        {(['week', 'month'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              border: 'none', borderRadius: 9, padding: '7px 16px', cursor: 'pointer',
              fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12.5,
              backgroundColor: view === v ? COLORS.ink : 'transparent',
              color: view === v ? COLORS.yellow : COLORS.muted,
            }}
          >
            {v === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      <div className="menu-layout">
        <div className="menu-side">
          <Panel title="🛒 Compras recientes">
            {recentPurchases.length === 0 ? (
              <div style={{ fontSize: 13, color: COLORS.muted }}>
                Cuando escaneéis un ticket, los productos aparecerán aquí como inspiración.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {recentPurchases.map(item => (
                  <span key={item.name} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 5px 5px 11px', borderRadius: 8, border: border(2),
                    backgroundColor: COLORS.card, color: COLORS.ink, fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize',
                  }}>
                    {item.name}
                    <button
                      onClick={() => dispatch(removeRecentPurchase(item.name))}
                      title="Quitar de la lista"
                      style={{
                        width: 18, height: 18, borderRadius: '50%', border: 'none',
                        backgroundColor: COLORS.bg, color: COLORS.muted, fontSize: 11,
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

          {/* Panel de ideas: nota amarilla, como en el mockup */}
          <div style={{
            backgroundColor: COLORS.yellow, border: border(2.5), borderRadius: 14,
            boxShadow: shadow(), padding: 15, marginBottom: 16,
          }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14.5, color: COLORS.ink, marginBottom: 3 }}>
              💡 Ideas
            </div>
            <div style={{ fontSize: 11.5, color: '#5C4B2E', marginBottom: 12 }}>
              Arrastra una idea al menú, o toca un plato y luego una idea.
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {([null, 'vegetariano', 'con_carne'] as const).map(tag => (
                <button
                  key={String(tag)}
                  onClick={() => setDietFilter(tag)}
                  style={{
                    padding: '5px 11px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                    border: border(2), fontFamily: FONT_HEAD, fontWeight: 700,
                    backgroundColor: dietFilter === tag ? COLORS.ink : COLORS.card,
                    color: dietFilter === tag ? COLORS.yellow : COLORS.ink,
                  }}
                >
                  {tag === null ? 'Todas' : tag === 'vegetariano' ? '🥦 Veggie' : '🍖 Con carne'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredIdeas.map(idea => (
                <button
                  key={idea.id}
                  {...draggableIdea(idea.name)}
                  onClick={() => applyIdea(idea.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                    border: border(2), borderRadius: 10, padding: '9px 11px',
                    backgroundColor: COLORS.card, color: COLORS.ink, fontSize: 12.5, fontWeight: 600, cursor: 'grab',
                  }}
                >
                  {idea.dietTag === 'vegetariano' ? '🥦' : '🍖'} {idea.name}
                </button>
              ))}
              {customIdeas.length > 0 && (
                <>
                  <div style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, color: '#5C4B2E', textTransform: 'uppercase', marginTop: 6 }}>
                    🧑‍🍳 Vuestras recetas
                  </div>
                  {customIdeas.map(idea => (
                    <div
                      key={idea.name}
                      {...draggableIdea(idea.name)}
                      onClick={() => applyIdea(idea.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab',
                        border: border(2), borderRadius: 10, padding: '9px 11px',
                        backgroundColor: COLORS.card, color: COLORS.ink, fontSize: 12.5, fontWeight: 600,
                      }}
                    >
                      <span style={{ flex: 1 }}>{idea.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); dispatch(removeCustomIdea(idea.name)); }}
                        title="Quitar idea"
                        style={{
                          width: 18, height: 18, borderRadius: '50%', border: 'none',
                          backgroundColor: COLORS.bg, color: COLORS.muted, fontSize: 11,
                          lineHeight: '18px', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="menu-main">
          {view === 'week' ? (
            <>
              {/* Navegador de semana */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <button onClick={() => dispatch(setCurrentWeekStart(addWeeksISO(currentWeekStart, -1)))} style={arrowBtn}>‹</button>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '9px 4px', borderRadius: 10,
                  backgroundColor: COLORS.card, border: border(2.5), boxShadow: shadow(3),
                  fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 700, color: COLORS.ink,
                }}>
                  Semana del {formatWeekRange(currentWeekStart)}
                </div>
                <button onClick={() => dispatch(setCurrentWeekStart(addWeeksISO(currentWeekStart, 1)))} style={arrowBtn}>›</button>
              </div>
              <button onClick={() => dispatch(setCurrentWeekStart(getMondayISO(new Date())))} style={{
                display: 'block', margin: '10px auto 18px',
                padding: '6px 14px', borderRadius: 20, border: border(2), backgroundColor: COLORS.card,
                fontFamily: FONT_HEAD, color: COLORS.ink, fontWeight: 700, fontSize: 11.5, cursor: 'pointer',
              }}>
                Hoy
              </button>

              {loading && (
                <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>Cargando…</div>
              )}

              <div className="responsive-card-grid">
              {WEEK_DAYS.map(({ key, label }, index) => {
                const today = isToday(currentWeekStart, index);
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '0 2px 8px' }}>
                      <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, color: COLORS.ink }}>{label}</span>
                      <span style={{ fontSize: 12, color: COLORS.muted }}>{getDayDateLabel(currentWeekStart, index)}</span>
                      {today && (
                        <span style={{
                          marginLeft: 'auto', backgroundColor: COLORS.ink, color: COLORS.yellow,
                          fontFamily: FONT_HEAD, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                          padding: '3px 10px', borderRadius: 6,
                        }}>
                          Hoy
                        </span>
                      )}
                    </div>

                    {SLOTS.map(slot => {
                      const rows = getRows(key, slot.id);
                      return (
                        <div key={slot.id} style={{
                          backgroundColor: COLORS.card, border: border(2.5, slot.dot), borderRadius: 14,
                          boxShadow: shadow(), padding: '12px 14px 13px', marginBottom: 10,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: slot.dot, border: `1.5px solid ${COLORS.ink}` }} />
                            <span style={{
                              fontFamily: FONT_HEAD, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6,
                              textTransform: 'uppercase', color: slot.accent,
                            }}>
                              {slot.icon} {slot.label}
                            </span>
                          </div>

                          <div
                            onDragOver={e => rows.length === 0 && e.preventDefault()}
                            onDrop={e => {
                              if (rows.length > 0) return;
                              e.preventDefault();
                              const name = e.dataTransfer.getData('text/plain');
                              if (name) addRowWithDish(key, slot.id, name);
                            }}
                          >
                            {rows.length === 0 && (
                              <div style={{
                                border: `2px dashed ${COLORS.dashed}`, borderRadius: 10, padding: 11,
                                textAlign: 'center', color: COLORS.mutedLighter, fontSize: 12, marginBottom: 8,
                              }}>
                                Aún no has planificado {slot.id === 'comida' ? 'la comida' : 'la cena'} de este día
                              </div>
                            )}

                            {rows.map(row => (
                              <div key={row.id} style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginBottom: 8 }}>
                                {row.type === 'compartido' ? (
                                  <AutoTextarea
                                    value={getFieldValue(key, slot.id, row, 'shared')}
                                    placeholder="Plato compartido…"
                                    onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'shared' })}
                                    onChange={v => handleFieldChange(key, slot.id, row.id, 'shared', v)}
                                    onBlur={() => commitField(key, slot.id, row.id, 'shared')}
                                    onDrop={name => setFieldNow(key, slot.id, row.id, 'shared', name)}
                                    style={{
                                      flex: 1, fontSize: 14, fontWeight: 700, color: COLORS.ink, padding: '2px 0',
                                      outline: isFieldSelected(key, slot.id, row.id, 'shared') ? `2px solid ${COLORS.ink}` : 'none',
                                    }}
                                  />
                                ) : (
                                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                                    <div style={{ flex: 1, border: border(2), borderRadius: 10, padding: '8px 10px', backgroundColor: COLORS.cardAlt }}>
                                      <div style={{ fontFamily: FONT_HEAD, fontSize: 9, fontWeight: 700, color: MARIA_F.text, marginBottom: 3 }}>MARIA F</div>
                                      <AutoTextarea
                                        value={getFieldValue(key, slot.id, row, 'personF')}
                                        placeholder="Su plato…"
                                        onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'personF' })}
                                        onChange={v => handleFieldChange(key, slot.id, row.id, 'personF', v)}
                                        onBlur={() => commitField(key, slot.id, row.id, 'personF')}
                                        onDrop={name => setFieldNow(key, slot.id, row.id, 'personF', name)}
                                        style={{
                                          fontSize: 12.5, fontWeight: 600, color: COLORS.ink,
                                          outline: isFieldSelected(key, slot.id, row.id, 'personF') ? `2px solid ${COLORS.ink}` : 'none',
                                        }}
                                      />
                                    </div>
                                    <div style={{ flex: 1, border: border(2), borderRadius: 10, padding: '8px 10px', backgroundColor: COLORS.cardAlt }}>
                                      <div style={{ fontFamily: FONT_HEAD, fontSize: 9, fontWeight: 700, color: MARIA_N.text, marginBottom: 3 }}>MARIA N</div>
                                      <AutoTextarea
                                        value={getFieldValue(key, slot.id, row, 'personN')}
                                        placeholder="Su plato…"
                                        onFocus={() => setSelectedCell({ day: key, slot: slot.id, rowId: row.id, field: 'personN' })}
                                        onChange={v => handleFieldChange(key, slot.id, row.id, 'personN', v)}
                                        onBlur={() => commitField(key, slot.id, row.id, 'personN')}
                                        onDrop={name => setFieldNow(key, slot.id, row.id, 'personN', name)}
                                        style={{
                                          fontSize: 12.5, fontWeight: 600, color: COLORS.ink,
                                          outline: isFieldSelected(key, slot.id, row.id, 'personN') ? `2px solid ${COLORS.ink}` : 'none',
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                                <button
                                  onClick={() => removeRow(key, slot.id, row.id)}
                                  title="Quitar fila"
                                  style={{
                                    width: 24, flexShrink: 0, border: 'none', background: 'none',
                                    color: COLORS.mutedLighter, fontSize: 15, cursor: 'pointer',
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}

                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => addRow(key, slot.id, 'compartido')} style={{
                                flex: 1, border: `2px dashed ${COLORS.dashed}`, borderRadius: 10, padding: 8,
                                backgroundColor: 'transparent', color: COLORS.mutedLight, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                              }}>
                                + Plato compartido
                              </button>
                              <button onClick={() => addRow(key, slot.id, 'separado')} style={{
                                flex: 1, border: `2px dashed ${COLORS.dashed}`, borderRadius: 10, padding: 8,
                                backgroundColor: 'transparent', color: COLORS.mutedLight, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                              }}>
                                + Plato para cada una
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              </div>
            </>
          ) : (
            <>
              {/* Navegador de mes */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
                <button onClick={() => setMonthDate(d => addMonths(d, -1))} style={arrowBtn}>‹</button>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, color: COLORS.ink }}>
                  {getMonthLabel(monthDate)}
                </div>
                <button onClick={() => setMonthDate(d => addMonths(d, 1))} style={arrowBtn}>›</button>
              </div>

              <div className="month-grid">
                {dowLabels.map(d => <div key={d} className="dow">{d}</div>)}
                {monthGrid.map(cell => {
                  const menu = monthMenus[cell.weekStart];
                  const comida = menu ? miniDish(rowsFrom(menu, WEEK_DAYS[cell.dayIndex].key, 'comida')) : '';
                  const cena = menu ? miniDish(rowsFrom(menu, WEEK_DAYS[cell.dayIndex].key, 'cena')) : '';
                  const isToday_ = cell.dateISO === getTodayISO();
                  return (
                    <div
                      key={cell.dateISO}
                      onClick={() => cell.inCurrentMonth && goToDay(cell)}
                      style={{
                        backgroundColor: isToday_ ? COLORS.yellow : COLORS.card,
                        border: border(2), borderRadius: 9, minHeight: 60, padding: '5px 4px 4px',
                        cursor: cell.inCurrentMonth ? 'pointer' : 'default',
                        opacity: cell.inCurrentMonth ? 1 : 0.35,
                        borderStyle: cell.inCurrentMonth ? 'solid' : 'dashed',
                      }}
                    >
                      <div style={{ fontFamily: FONT_HEAD, fontSize: 11, fontWeight: 700, marginBottom: 3, color: COLORS.ink }}>{cell.day}</div>
                      {comida && (
                        <div style={{ fontSize: 8.5, lineHeight: 1.2, fontWeight: 700, color: COLORS.orangeText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {comida}
                        </div>
                      )}
                      {cena && (
                        <div style={{ fontSize: 8.5, lineHeight: 1.2, fontWeight: 700, color: COLORS.tealText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cena}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14, fontSize: 11.5 }}>
                <span><span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', marginRight: 5, border: `1.5px solid ${COLORS.ink}`, backgroundColor: COLORS.orange }} />Comida</span>
                <span><span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', marginRight: 5, border: `1.5px solid ${COLORS.ink}`, backgroundColor: COLORS.teal }} />Cena</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.55, marginTop: 10 }}>Toca un día para ver el detalle</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
