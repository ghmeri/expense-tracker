import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchGames, persistGames, addGameResult } from '../store/gamesSlice';
import { loadData } from '../store/expenseSlice';
import { GameResult } from '../types';
import { COLORS, FONT_HEAD, border, shadow, cardStyle } from '../theme';

const todayISO = (): string => new Date().toISOString().slice(0, 10);

export default function GamesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { results, loading } = useSelector((state: RootState) => state.games);
  const { users } = useSelector((state: RootState) => state.expenses);

  const [game, setGame] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(loadData());
    dispatch(fetchGames());
  }, []);

  // Set default winner when users load
  useEffect(() => {
    if (users.length > 0 && !winnerId) setWinnerId(users[0].id);
  }, [users]);

  // ── Marcador general acumulado (orden fijo, sin reordenar) ──
  const scoreboard = users.map(user => ({
    ...user,
    wins: results.filter(r => r.winnerId === user.id).length,
  }));

  const handleAdd = async () => {
    if (!game.trim() || !winnerId) return;
    const newResult: GameResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      game: game.trim(),
      winnerId,
      date,
      createdAt: new Date().toISOString(),
    };
    const updated = [newResult, ...results];
    dispatch(addGameResult(newResult));
    setSaving(true);
    try {
      await dispatch(persistGames(updated));
    } finally {
      setSaving(false);
    }
    setGame('');
    setDate(todayISO());
  };

  const formatDate = (iso: string): string => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: border(),
    borderRadius: 10,
    fontSize: 15,
    fontFamily: FONT_HEAD,
    backgroundColor: COLORS.cardAlt,
    color: COLORS.ink,
    outline: 'none',
  };

  return (
    <div style={{ overflowY: 'auto', height: '100%', backgroundColor: COLORS.bg }}>

      {/* Cabecera */}
      <div style={{
        backgroundColor: COLORS.header,
        borderBottom: border(2.5),
        padding: '28px 24px 32px',
      }}>
        <div style={{ color: 'rgba(38,32,26,0.65)', fontSize: 13, fontWeight: 600 }}>Puntuación total acumulada</div>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 32, fontWeight: 700, color: COLORS.ink, marginTop: 4 }}>
          🎲 Contador de juegos
        </div>
      </div>

      <div style={{ padding: '20px 16px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Marcador deportivo ── */}
        <div style={{
          backgroundColor: '#1E2227',
          border: border(),
          borderRadius: 16,
          boxShadow: shadow(4),
          overflow: 'hidden',
        }}>
          {/* Título */}
          <div style={{
            textAlign: 'center', padding: '10px 0 8px',
            fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 11,
            letterSpacing: 2, color: '#6B7280', textTransform: 'uppercase',
          }}>
            🏆 Marcador general
          </div>

          {/* Paneles de jugadores */}
          <div style={{ display: 'flex' }}>
            {scoreboard.map((user, i) => {
              const maxWins = Math.max(...scoreboard.map(u => u.wins));
              const isLeader = user.wins > 0 && user.wins === maxWins && scoreboard.filter(u => u.wins === maxWins).length === 1;
              return (
                <div key={user.id} style={{
                  flex: 1,
                  borderRight: i < scoreboard.length - 1 ? '2px solid #111' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  {/* Franja de color del jugador */}
                  <div style={{
                    width: '100%', height: 6,
                    backgroundColor: user.color,
                  }} />
                  {/* Nombre */}
                  <div style={{
                    fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 12,
                    color: '#CBD5E1', letterSpacing: 1, textTransform: 'uppercase',
                    padding: '10px 8px 4px', textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}>
                    {user.name}
                  </div>
                  {/* Número grande */}
                  <div style={{
                    fontFamily: "'Space Grotesk', 'Arial Black', sans-serif",
                    fontWeight: 800,
                    fontSize: 'clamp(52px, 14vw, 88px)',
                    lineHeight: 1,
                    color: isLeader ? COLORS.yellow : '#E2E8F0',
                    padding: '8px 12px 18px',
                    textShadow: isLeader ? `0 0 30px rgba(255,211,92,0.4)` : 'none',
                    letterSpacing: -2,
                  }}>
                    {user.wins}
                  </div>
                  {/* Etiqueta victorias */}
                  <div style={{
                    fontFamily: FONT_HEAD, fontSize: 10, fontWeight: 600,
                    color: '#4B5563', letterSpacing: 1, textTransform: 'uppercase',
                    paddingBottom: 14,
                  }}>
                    {user.wins === 1 ? 'victoria' : 'victorias'}
                  </div>
                </div>
              );
            })}
            {scoreboard.length === 0 && (
              <div style={{ color: '#6B7280', fontSize: 13, fontFamily: FONT_HEAD, padding: '24px', textAlign: 'center', width: '100%' }}>
                Sin partidas todavía.
              </div>
            )}
          </div>
        </div>

        {/* ── Historial de partidas ── */}
        <div style={cardStyle({ padding: '16px 20px' })}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
            📋 Historial de partidas
          </div>
          {loading && (
            <div style={{ color: COLORS.muted, fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
              Cargando…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ color: COLORS.muted, fontSize: 14 }}>Aún no hay partidas registradas.</div>
          )}
          {!loading && results.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: FONT_HEAD }}>
                <thead>
                  <tr style={{ borderBottom: border(2) }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px 8px 0', color: COLORS.muted, fontWeight: 600 }}>Fecha</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px 8px', color: COLORS.muted, fontWeight: 600 }}>Juego</th>
                    <th style={{ textAlign: 'left', padding: '6px 0 8px 8px', color: COLORS.muted, fontWeight: 600 }}>Ganadora</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const winner = users.find(u => u.id === r.winnerId);
                    return (
                      <tr key={r.id} style={{
                        borderBottom: i < results.length - 1 ? border(1.5, COLORS.dashed) : 'none',
                      }}>
                        <td style={{ padding: '9px 8px 9px 0', color: COLORS.muted, whiteSpace: 'nowrap' }}>
                          {formatDate(r.date)}
                        </td>
                        <td style={{ padding: '9px 8px', fontWeight: 600 }}>{r.game}</td>
                        <td style={{ padding: '9px 0 9px 8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {winner && (
                              <span style={{
                                width: 9, height: 9, borderRadius: '50%',
                                backgroundColor: winner.color, border: border(1.5),
                                display: 'inline-block', flexShrink: 0,
                              }} />
                            )}
                            {winner?.name ?? r.winnerId}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Formulario ── */}
        <div style={cardStyle({ padding: '16px 20px' })}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            ➕ Añadir resultado
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 5 }}>
                Juego
              </label>
              <input
                style={inputStyle}
                placeholder="Ej: Catan, Exploding Kittens…"
                value={game}
                onChange={e => setGame(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 5 }}>
                Ganadora
              </label>
              <select
                style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
                value={winnerId}
                onChange={e => setWinnerId(e.target.value)}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 5 }}>
                Fecha
              </label>
              <input
                type="date"
                style={inputStyle}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={!game.trim() || !winnerId || saving}
              style={{
                marginTop: 4,
                padding: '14px 0',
                backgroundColor: !game.trim() || !winnerId || saving ? COLORS.dashed : COLORS.ink,
                color: !game.trim() || !winnerId || saving ? COLORS.muted : COLORS.yellow,
                border: border(),
                borderRadius: 12,
                fontFamily: FONT_HEAD,
                fontWeight: 700,
                fontSize: 15,
                cursor: !game.trim() || !winnerId || saving ? 'not-allowed' : 'pointer',
                boxShadow: !game.trim() || !winnerId || saving ? 'none' : shadow(3),
                transition: 'background-color 0.15s',
              }}
            >
              {saving ? 'Guardando…' : '🎲 Guardar partida'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
