import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchWeekMenu, saveMealSlot, fetchRecentPurchases, setCurrentWeekStart } from '../store/menuSlice';
import { DietTag, MealSlot, Person, WeekDay } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import { registerHousehold } from '../services/sharedService';
import { WEEK_DAYS, addWeeksISO, formatWeekRange, getMondayISO, getDayDateLabel, isToday } from '../utils/date';
import { MEAL_IDEAS } from '../data/mealIdeas';

const BLUE = '#2563eb';

const SLOTS: { id: MealSlot; label: string; icon: string }[] = [
  { id: 'comida', label: 'Comida', icon: '🍲' },
  { id: 'cena', label: 'Cena', icon: '🌙' },
];

const CATEGORIES: { id: DietTag; label: string; icon: string }[] = [
  { id: 'vegetariano', label: 'Veggie', icon: '🥦' },
  { id: 'con_carne', label: 'Con carne', icon: '🍖' },
];

const PEOPLE: { id: Exclude<Person, null>; label: string }[] = [
  { id: 'maria_f', label: 'Maria F' },
  { id: 'maria_n', label: 'Maria N' },
  { id: 'ambas', label: 'Las 2' },
];

const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
  <div style={{
    backgroundColor: '#fff', borderRadius: 16, padding: '18px 20px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16, ...extra,
  }}>
    {children}
  </div>
);

interface SelectedCell { day: WeekDay; slot: MealSlot; category: DietTag; }

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

  const updateDish = (day: WeekDay, slot: MealSlot, category: DietTag, text: string, person: Person) => {
    dispatch(saveMealSlot({ weekStart: currentWeekStart, day, slot, category, dish: { text, person } }));
  };

  const applyIdea = (name: string, tag: DietTag) => {
    if (!selectedCell || selectedCell.category !== tag) return;
    const current = weekMenu[selectedCell.day]?.[selectedCell.slot]?.[tag];
    updateDish(selectedCell.day, selectedCell.slot, tag, name, current?.person ?? null);
  };

  const filteredIdeas = dietFilter ? MEAL_IDEAS.filter(i => i.dietTag === dietFilter) : MEAL_IDEAS;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 20px 40px', backgroundColor: '#f0f4f8' }}>

      {/* Navegador de semana */}
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

      {/* Calendario semanal */}
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
              <span style={{ fontSize: 14, fontWeight: 800, color: today ? '#fff' : '#1e293b' }}>{label}</span>
              <span style={{ fontSize: 12, color: today ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>
                {getDayDateLabel(currentWeekStart, index)}
              </span>
            </div>

            <div style={{ padding: '12px 16px' }}>
              {SLOTS.map((slot, si) => (
                <div key={slot.id} style={{ marginBottom: si === 0 ? 14 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                    {slot.icon} {slot.label}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {CATEGORIES.map(cat => {
                      const dish = weekMenu[key]?.[slot.id]?.[cat.id];
                      const isSelected = selectedCell?.day === key && selectedCell.slot === slot.id && selectedCell.category === cat.id;
                      return (
                        <div key={cat.id} style={{
                          flex: 1, borderRadius: 12, padding: '10px 12px',
                          backgroundColor: '#f8fafc',
                          border: isSelected ? `2px solid ${BLUE}` : '2px solid transparent',
                        }}>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                            {cat.icon} {cat.label}
                          </div>
                          <input
                            value={dish?.text ?? ''}
                            placeholder="¿Qué toca?"
                            onFocus={() => setSelectedCell({ day: key, slot: slot.id, category: cat.id })}
                            onChange={e => updateDish(key, slot.id, cat.id, e.target.value, dish?.person ?? null)}
                            style={{
                              width: '100%', border: 'none', outline: 'none', fontSize: 13,
                              fontWeight: 600, color: '#1e293b', marginBottom: 8, background: 'transparent',
                            }}
                          />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {PEOPLE.map(p => (
                              <button
                                key={p.id}
                                onClick={() => updateDish(key, slot.id, cat.id, dish?.text ?? '', dish?.person === p.id ? null : p.id)}
                                style={{
                                  padding: '3px 7px', borderRadius: 7, fontSize: 10, cursor: 'pointer',
                                  border: `1.5px solid ${dish?.person === p.id ? BLUE : '#e2e8f0'}`,
                                  backgroundColor: dish?.person === p.id ? '#eff6ff' : '#fff',
                                  color: dish?.person === p.id ? BLUE : '#94a3b8', fontWeight: 600,
                                }}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Compras recientes */}
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
                  padding: '6px 12px', borderRadius: 20, backgroundColor: '#f0f4f8',
                  color: '#334155', fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
                }}>
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ideas de comida */}
      {card(
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              💡 Ideas de comida
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
                  {tag === null ? 'Todas' : tag === 'vegetariano' ? '🥦 Veggie' : '🍖 Con carne'}
                </button>
              ))}
            </div>
          </div>
          {!selectedCell && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              Toca un hueco del calendario (veggie o con carne) y luego una idea para rellenarlo.
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filteredIdeas.map(idea => {
              const disabled = !selectedCell || selectedCell.category !== idea.dietTag;
              return (
                <button
                  key={idea.id}
                  onClick={() => applyIdea(idea.name, idea.dietTag)}
                  disabled={disabled}
                  style={{
                    padding: '7px 12px', borderRadius: 20, border: '1.5px solid #e2e8f0',
                    backgroundColor: '#fff', color: '#334155', fontSize: 13, fontWeight: 500,
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {idea.dietTag === 'vegetariano' ? '🥦' : '🍖'} {idea.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
