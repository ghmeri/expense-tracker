import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateUsers } from '../store/expenseSlice';
import { updateUserName } from '../services/storage';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { users } = useSelector((state: RootState) => state.expenses);
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(users.map(u => [u.id, u.name]))
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    users.forEach(user => {
      if (names[user.id] !== undefined && names[user.id] !== user.name) {
        updateUserName(user.id, names[user.id]);
      }
    });
    dispatch(updateUsers(users.map(u => ({ ...u, name: names[u.id] ?? u.name }))));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#f5f5f5', height: '100%' }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
        ⚙️ Ajustes
      </div>
      <div style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>
        Personaliza los nombres de cada persona
      </div>

      {users.map(user => (
        <div key={user.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          backgroundColor: '#fff', borderRadius: 12, padding: '12px 14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            backgroundColor: user.color, flexShrink: 0,
          }} />
          <input
            type="text"
            value={names[user.id] ?? ''}
            onChange={e => setNames(prev => ({ ...prev, [user.id]: e.target.value }))}
            placeholder="Nombre"
            style={{
              flex: 1, padding: '10px 0', border: 'none', outline: 'none',
              fontSize: 16, backgroundColor: 'transparent',
            }}
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        style={{
          width: '100%', marginTop: 8, padding: 16, borderRadius: 12,
          backgroundColor: saved ? '#43a047' : '#6200ee',
          color: '#fff', fontWeight: 'bold', fontSize: 16,
          border: 'none', cursor: 'pointer',
          transition: 'background-color 0.25s',
        }}
      >
        {saved ? '✅ Guardado' : 'Guardar cambios'}
      </button>

      <div style={{ marginTop: 36, padding: 16, backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 }}>
          ℹ️ Sobre la app
        </div>
        <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>
          Los datos se guardan localmente en el navegador.<br />
          Usa <strong>Exportar CSV</strong> para hacer copias de seguridad.
        </div>
      </div>
    </div>
  );
}
