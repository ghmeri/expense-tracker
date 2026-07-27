import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import HomeScreen from './screens/HomeScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import SummaryScreen from './screens/SummaryScreen';
import SettingsScreen from './screens/SettingsScreen';
import './App.css';

type Tab = 'home' | 'add' | 'summary' | 'settings';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Inicio' },
  { id: 'add', icon: '➕', label: 'Añadir' },
  { id: 'summary', icon: '📊', label: 'Resumen' },
  { id: 'settings', icon: '⚙️', label: 'Ajustes' },
];

function AppContent() {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 480,
      margin: '0 auto', backgroundColor: '#f5f5f5',
      position: 'relative',
    }}>
      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'home' && <HomeScreen />}
        {tab === 'add' && <AddExpenseScreen onSave={() => setTab('home')} />}
        {tab === 'summary' && <SummaryScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </div>

      {/* Barra de navegación inferior */}
      <nav style={{
        display: 'flex',
        backgroundColor: '#fff',
        borderTop: '1px solid #ebebeb',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.07)',
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 0 8px',
              color: tab === t.id ? '#6200ee' : '#aaa',
            }}
          >
            {/* Indicador activo */}
            {t.id === 'add' ? (
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: '50%',
                backgroundColor: tab === t.id ? '#6200ee' : '#f0e6ff',
                fontSize: 22, marginTop: -20,
                boxShadow: '0 2px 8px rgba(98,0,238,0.3)',
              }}>
                ➕
              </span>
            ) : (
              <span style={{ fontSize: 22 }}>{t.icon}</span>
            )}
            <span style={{
              fontSize: 10, fontWeight: tab === t.id ? 'bold' : 'normal',
              color: tab === t.id ? '#6200ee' : '#aaa',
            }}>
              {t.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
