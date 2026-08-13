import React, { useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import ErrorBoundary from './components/ErrorBoundary';
import HomeScreen from './screens/HomeScreen';
import TicketsScreen from './screens/TicketsScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import QuickAddScreen from './screens/QuickAddScreen';
import SummaryScreen from './screens/SummaryScreen';
import MenuScreen from './screens/MenuScreen';
import RecipesScreen from './screens/RecipesScreen';
import SettingsScreen from './screens/SettingsScreen';
import { loadData } from './store/expenseSlice';
import { AppDispatch } from './store';
import { COLORS, FONT_HEAD, shadow } from './theme';
import './App.css';

/** Lee ?quick=gasto|ingreso|foto de la URL de arranque (accesos directos de la PWA). */
function getQuickKind(): 'gasto' | 'ingreso' | 'foto' | null {
  const value = new URLSearchParams(window.location.search).get('quick');
  return value === 'gasto' || value === 'ingreso' || value === 'foto' ? value : null;
}

type Tab = 'home' | 'tickets' | 'add' | 'summary' | 'menu' | 'recipes' | 'settings';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Inicio' },
  { id: 'tickets', icon: '🧾', label: 'Gastos' },
  { id: 'add', icon: '➕', label: 'Añadir' },
  { id: 'summary', icon: '📊', label: 'Resumen' },
  { id: 'menu', icon: '🍽️', label: 'Menú' },
  { id: 'recipes', icon: '📖', label: 'Recetas' },
  { id: 'settings', icon: '⚙️', label: 'Ajustes' },
];

function AppContent() {
  const [tab, setTab] = useState<Tab>('home');
  const [quickKind, setQuickKind] = useState(getQuickKind);
  const [captureRound, setCaptureRound] = useState(0);
  const dispatch = useDispatch<AppDispatch>();

  // El acceso rápido necesita los datos (usuarios) cargados igual que HomeScreen.
  React.useEffect(() => { if (quickKind) dispatch(loadData()); }, []);

  const exitQuick = () => {
    window.history.replaceState(null, '', window.location.pathname);
    setQuickKind(null);
    setTab('home');
  };

  if (quickKind === 'gasto' || quickKind === 'ingreso') {
    return (
      <div className="app-shell" style={{
        display: 'flex', flexDirection: 'column',
        height: '100%',
        margin: '0 auto', backgroundColor: COLORS.bg,
        position: 'relative', boxShadow: '0 0 40px rgba(38,32,26,0.18)',
      }}>
        <QuickAddScreen initialKind={quickKind} onOpenApp={exitQuick} />
      </div>
    );
  }

  if (quickKind === 'foto') {
    return (
      <div className="app-shell" style={{
        display: 'flex', flexDirection: 'column',
        height: '100%',
        margin: '0 auto', backgroundColor: COLORS.bg,
        position: 'relative', boxShadow: '0 0 40px rgba(38,32,26,0.18)',
      }}>
        {/* key cambia tras cada guardado: remonta la pantalla y vuelve al paso de captura */}
        <AddExpenseScreen key={captureRound} onSave={() => setCaptureRound(n => n + 1)} />
      </div>
    );
  }

  return (
    <div className="app-shell" style={{
      display: 'flex', flexDirection: 'column',
      height: '100%',
      margin: '0 auto', backgroundColor: COLORS.bg,
      position: 'relative', boxShadow: '0 0 40px rgba(38,32,26,0.18)',
    }}>
      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ErrorBoundary key={tab}>
          {tab === 'home' && <HomeScreen onNavigate={setTab} />}
          {tab === 'tickets' && <TicketsScreen />}
          {tab === 'add' && <AddExpenseScreen onSave={() => setTab('tickets')} />}
          {tab === 'summary' && <SummaryScreen />}
          {tab === 'menu' && <MenuScreen />}
          {tab === 'recipes' && <RecipesScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </ErrorBoundary>
      </div>

      {/* Barra de navegación inferior */}
      <nav style={{
        display: 'flex',
        backgroundColor: COLORS.card,
        borderTop: `2.5px solid ${COLORS.ink}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
                backgroundColor: COLORS.ink,
                fontSize: 26, marginTop: -26,
                border: `2.5px solid ${COLORS.ink}`,
                boxShadow: shadow(3),
                color: COLORS.yellow,
              }}>
                ＋
              </span>
            ) : (
              <span style={{ fontSize: 24 }}>{t.icon}</span>
            )}
            <span style={{
              fontFamily: FONT_HEAD,
              fontSize: 10.5, fontWeight: 700,
              color: tab === t.id ? COLORS.ink : COLORS.mutedLighter,
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
