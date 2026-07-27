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
      height: '100dvh', maxWidth: 960,
      margin: '0 auto', backgroundColor: '#f0f4f8',
      position: 'relative', boxShadow: '0 0 40px rgba(0,0,0,0.08)',
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
        borderTop: '1px solid #e2e8f0',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 0 10px',
            }}
          >
            {t.id === 'add' ? (
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 52, height: 52, borderRadius: '50%',
                backgroundColor: '#2563eb',
                fontSize: 26, marginTop: -26,
                boxShadow: '0 4px 14px rgba(37,99,235,0.45)',
                color: '#fff',
              }}>
                ＋
              </span>
            ) : (
              <span style={{ fontSize: 26 }}>{t.icon}</span>
            )}
            <span style={{
              fontSize: 11, fontWeight: tab === t.id ? '700' : '400',
              color: tab === t.id ? '#2563eb' : '#94a3b8',
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
