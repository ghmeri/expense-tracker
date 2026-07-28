import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchWeekMenu, saveMealSlot, fetchRecentPurchases,
  setHouseholdCode, clearHousehold, setCurrentWeekStart,
} from '../store/menuSlice';
import { DietTag, MealSlot, WeekDay } from '../types';
import {
  getHouseholdCode, setHouseholdCode as persistHouseholdCode,
  clearHouseholdCode, generateHouseholdCode,
} from '../services/household';
import { registerHousehold } from '../services/sharedService';
import { WEEK_DAYS, addWeeksISO, formatWeekRange, getMondayISO } from '../utils/date';
import { MEAL_IDEAS } from '../data/mealIdeas';

const BLUE = '#2563eb';

const SLOTS: { id: MealSlot; label: string; icon: string }[] = [
  { id: 'comida', label: 'Comida', icon: '🍲' },
  { id: 'cena', label: 'Cena', icon: '🌙' },
];

const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
  <div style={{
    backgroundColor: '#fff', borderRadius: 16, padding: '18px 20px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16, ...extra,
  }}>
    {children}
  </div>
);

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { householdCode, currentWeekStart, weekMenu, recentPurchases, loading } =
    useSelector((state: RootState) => state.menu);

  const [dietFilter, setDietFilter] = useState<DietTag>(null);
  const [selectedCell, setSelectedCell] = useState<{ day: WeekDay; slot: MealSlot } | null>(null);
  const [copied, setCopied] = useState(false);

  // Emparejamiento vía enlace: ?household=CODE en la URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const incoming = url.searchParams.get('household');
    if (incoming && incoming !== householdCode) {
      const proceed = householdCode
        ? window.confirm(`Este enlace pertenece a otro hogar (${incoming}). ¿Cambiar a ese hogar compartido?`)
        : true;
      if (proceed) {
        persistHouseholdCode(incoming);
        dispatch(setHouseholdCode(incoming));
      }
      url.searchParams.delete('household');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    if (!householdCode) return;
    dispatch(fetchWeekMenu({ code: householdCode, weekStart: currentWeekStart }));
    dispatch(fetchRecentPurchases(householdCode));
  }, [householdCode, currentWeekStart]);

  const handleCreateShare = async () => {
    const code = generateHouseholdCode();
    await registerHousehold(code);
    persistHouseholdCode(code);
    dispatch(setHouseholdCode(code));
  };

  const shareLink = householdCode ? `${window.location.origin}/?household=${householdCode}` : '';

  const handleShare = async () => {
    if (!shareLink) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Menú semanal compartido', url: shareLink }); return; }
      catch { /* usuario canceló, seguimos con copiar */ }
    }
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStopSharing = () => {
    if (!window.confirm('¿Dejar de compartir el menú en este dispositivo? El menú seguirá disponible para quien tenga el enlace.')) return;
    clearHouseholdCode();
    dispatch(clearHousehold());
  };

  const updateCell = (day: WeekDay, slot: MealSlot, text: string, dietTag: DietTag) => {
    if (!householdCode) return;
    dispatch(saveMealSlot({
      code: householdCode, weekStart: currentWeekStart,
      day, slot, entry: { text, dietTag },
    }));
  };

  const applyIdea = (name: string, tag: DietTag) => {
    if (!selectedCell) return;
    updateCell(selectedCell.day, selectedCell.slot, name, tag);
  };

  const filteredIdeas = dietFilter
    ? MEAL_IDEAS.filter(i => i.dietTag === dietFilter)
    : MEAL_IDEAS;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '24px 24px 40px', backgroundColor: '#f0f4f8' }}>

      {!householdCode ? (
        card(
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              Comparte el menú semanal con tu pareja
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Crea un enlace y envíaselo — cualquiera de los dos podrá ver y editar el menú.
            </div>
            <button onClick={handleCreateShare} style={{
              padding: '13px 22px', borderRadius: 12, backgroundColor: BLUE, color: '#fff',
              fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
            }}>
              🔗 Crear enlace para compartir
            </button>
          </div>
        )
      ) : (
        <>
          {card(
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Código de hogar: <strong style={{ color: '#1e293b' }}>{householdCode}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleShare} style={{
                  padding: '9px 14px', borderRadius: 10, border: `2px solid ${BLUE}`,
                  backgroundColor: '#fff', color: BLUE, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  {copied ? '✅ Copiado' : '🔗 Compartir enlace'}
                </button>
                <button onClick={handleStopSharing} style={{
                  padding: '9px 14px', borderRadius: 10, border: '2px solid #e2e8f0',
                  backgroundColor: '#fff', color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  Dejar de compartir
                </button>
              </div>
            </div>
          )}

          {/* Navegador de semana */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={() => dispatch(setCurrentWeekStart(addWeeksISO(currentWeekStart, -1)))} style={{
              width: 40, height: 40, borderRadius: 10, border: '2px solid #e2e8f0',
              backgroundColor: '#fff', fontSize: 18, cursor: 'pointer',
            }}>‹</button>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10,
              backgroundColor: '#fff', border: '2px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#1e293b',
            }}>
              Semana del {formatWeekRange(currentWeekStart)}
            </div>
            <button onClick={() => dispatch(setCurrentWeekStart(addWeeksISO(currentWeekStart, 1)))} style={{
              width: 40, height: 40, borderRadius: 10, border: '2px solid #e2e8f0',
              backgroundColor: '#fff', fontSize: 18, cursor: 'pointer',
            }}>›</button>
          </div>
          <button onClick={() => dispatch(setCurrentWeekStart(getMondayISO(new Date())))} style={{
            display: 'block', margin: '-8px 0 16px', marginLeft: 'auto', marginRight: 'auto',
            padding: '6px 14px', borderRadius: 20, border: 'none', backgroundColor: '#eff6ff',
            color: BLUE, fontWeight: 600, fontSize: 12, cursor: 'pointer',
          }}>
            Hoy
          </button>

          {loading && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Cargando…</div>
          )}

          {/* Grid semanal */}
          {WEEK_DAYS.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.4 }}>
                {label}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {SLOTS.map(slot => {
                  const entry = weekMenu[key]?.[slot.id];
                  return (
                    <div key={slot.id} style={{
                      flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: '12px 14px',
                      boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                      border: selectedCell?.day === key && selectedCell.slot === slot.id ? `2px solid ${BLUE}` : '2px solid transparent',
                    }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{slot.icon} {slot.label}</div>
                      <input
                        value={entry?.text ?? ''}
                        placeholder="¿Qué toca?"
                        onFocus={() => setSelectedCell({ day: key, slot: slot.id })}
                        onChange={e => updateCell(key, slot.id, e.target.value, entry?.dietTag ?? null)}
                        style={{
                          width: '100%', border: 'none', outline: 'none', fontSize: 14,
                          fontWeight: 600, color: '#1e293b', marginBottom: 8, background: 'transparent',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['vegetariano', 'con_carne'] as const).map(tag => (
                          <button
                            key={tag}
                            onClick={() => updateCell(key, slot.id, entry?.text ?? '', entry?.dietTag === tag ? null : tag)}
                            style={{
                              padding: '4px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                              border: `1.5px solid ${entry?.dietTag === tag ? BLUE : '#e2e8f0'}`,
                              backgroundColor: entry?.dietTag === tag ? '#eff6ff' : '#fff',
                              color: entry?.dietTag === tag ? BLUE : '#94a3b8', fontWeight: 600,
                            }}
                          >
                            {tag === 'vegetariano' ? '🥦 Veggie' : '🍖 Con carne'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
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
                  Toca una comida del calendario y luego una idea para rellenarla.
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filteredIdeas.map(idea => (
                  <button
                    key={idea.id}
                    onClick={() => applyIdea(idea.name, idea.dietTag)}
                    disabled={!selectedCell}
                    style={{
                      padding: '7px 12px', borderRadius: 20, border: '1.5px solid #e2e8f0',
                      backgroundColor: '#fff', color: '#334155', fontSize: 13, fontWeight: 500,
                      cursor: selectedCell ? 'pointer' : 'not-allowed', opacity: selectedCell ? 1 : 0.6,
                    }}
                  >
                    {idea.dietTag === 'vegetariano' ? '🥦' : '🍖'} {idea.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
