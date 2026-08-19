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

  // ── Marcador general acumulado ──
  const scoreboard = users.map(user => ({
    ...user,
    wins: results.filter(r => r.winnerId === user.id).length,
  })).sort((a, b) => b.wins - a.wins);

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

        {/* ── Marcador general ── */}
        <div style={cardStyle({ padding: '16px 20px' })}>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
            🏆 Marcador general
          </div>
          {scoreboard.length === 0 ? (
            <div style={{ color: COLORS.muted, fontSize: 14 }}>Sin resultados todavía.</div>
          ) : (
            scoreboard.map((user, i) => (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < scoreboard.length - 1 ? border(1.5, COLORS.dashed) : 'none',
              }}>
                <span style={{ fontSize: 22, minWidth: 28, textAlign: 'center' }}>
                  {i === 0 && user.wins > 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}
                </span>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: user.color, border: border(1.5),
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, flex: 1 }}>
                  {user.name}
                </span>
                <span style={{
                  fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 18,
                  color: i === 0 && user.wins > 0 ? COLORS.orange : COLORS.ink,
                }}>
                  {user.wins} <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.muted }}>
                    {user.wins === 1 ? 'victoria' : 'victorias'}
                  </span>
                </span>
              </div>
            ))
          )}
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
