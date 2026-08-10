import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { saveUsers } from '../store/expenseSlice';
import { COLORS, FONT_HEAD, border, shadow } from '../theme';

export default function SettingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { users } = useSelector((state: RootState) => state.expenses);
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(users.map(u => [u.id, u.name]))
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    dispatch(saveUsers(users.map(u => ({ ...u, name: names[u.id] ?? u.name }))));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ padding: 24, backgroundColor: COLORS.bg, height: '100%', overflowY: 'auto' }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 19, fontWeight: 700, marginBottom: 8, color: COLORS.ink }}>
        ⚙️ Ajustes
      </div>
      <div style={{ fontSize: 13, color: COLORS.mutedLighter, marginBottom: 24 }}>
        Personaliza los nombres de cada persona
      </div>

      {users.map(user => (
        <div key={user.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          backgroundColor: COLORS.card, borderRadius: 12, padding: '12px 14px',
          border: border(2), boxShadow: shadow(3),
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            backgroundColor: user.color, border: `1.5px solid ${COLORS.ink}`, flexShrink: 0,
          }} />
          <input
            type="text"
            value={names[user.id] ?? ''}
            onChange={e => setNames(prev => ({ ...prev, [user.id]: e.target.value }))}
            placeholder="Nombre"
            style={{
              flex: 1, padding: '10px 0', border: 'none', outline: 'none',
              fontSize: 16, backgroundColor: 'transparent', color: COLORS.ink,
            }}
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        style={{
          width: '100%', marginTop: 8, padding: 16, borderRadius: 12,
          backgroundColor: saved ? COLORS.teal : COLORS.ink,
          color: saved ? '#fff' : COLORS.yellow, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15,
          border: border(2.5), cursor: 'pointer', boxShadow: shadow(3),
          transition: 'background-color 0.25s',
        }}
      >
        {saved ? '✅ Guardado' : 'Guardar cambios'}
      </button>

      <div style={{ marginTop: 36, padding: 16, backgroundColor: COLORS.card, borderRadius: 12, border: border(2), boxShadow: shadow(3) }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 700, color: COLORS.ink, marginBottom: 6 }}>
          ℹ️ Sobre la app
        </div>
        <div style={{ fontSize: 12, color: COLORS.mutedLighter, lineHeight: 1.6 }}>
          Los gastos, el menú y el recetario se sincronizan entre vuestros dispositivos (las fotos de los tickets se quedan solo en el que las tomó).<br />
          Usa <strong>Exportar CSV</strong> para hacer copias de seguridad.
        </div>
      </div>
    </div>
  );
}
