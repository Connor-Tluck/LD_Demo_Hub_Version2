import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import type { User } from './types';
import { ChartIcon, CheckIcon, GridIcon, HomeIcon, LogoIcon, PlusIcon, SidebarIcon } from './icons';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import DetailPage from './pages/DetailPage';
import SplitViewPage from './pages/SplitViewPage';
import DashboardPage from './pages/DashboardPage';
import AddDemoPage from './pages/AddDemoPage';

export const ACCENT = '#3355FF';

// ── Toast ─────────────────────────────────────────────────────────────────
const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

// ── View mode (grid | sidebar), persisted per user ────────────────────────
export function useViewMode(): ['grid' | 'sidebar', (m: 'grid' | 'sidebar') => void] {
  const [mode, setMode] = useState<'grid' | 'sidebar'>(
    () => (localStorage.getItem('gallery.viewMode') as 'grid' | 'sidebar') || 'grid',
  );
  const set = useCallback((m: 'grid' | 'sidebar') => {
    localStorage.setItem('gallery.viewMode', m);
    setMode(m);
  }, []);
  return [mode, set];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

function NavRail() {
  const nav = useNavigate();
  const loc = useLocation();
  const [me, setMe] = useState<User | null>(null);
  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const railBtn = (on: boolean): CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all .12s ease',
    background: on ? 'rgba(255,255,255,.14)' : 'transparent',
    color: on ? '#fff' : '#7C8695',
  });

  const isBrowse = loc.pathname === '/browse';
  const viewMode = localStorage.getItem('gallery.viewMode') || 'grid';

  return (
    <nav style={{ width: 64, flex: '0 0 64px', background: '#0E1116', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 6 }}>
      <div
        onClick={() => nav('/')}
        title="SE Demo Hub"
        style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(140deg, ${ACCENT}, #7B5CFF)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(51,85,255,.4)' }}
      >
        <LogoIcon />
      </div>
      <button onClick={() => nav('/')} title="Home" style={railBtn(loc.pathname === '/')}>
        <HomeIcon />
      </button>
      <button onClick={() => nav('/browse?view=grid')} title="Grid view" style={railBtn(isBrowse && viewMode === 'grid')}>
        <GridIcon />
      </button>
      <button onClick={() => nav('/browse?view=sidebar')} title="Sidebar view" style={railBtn(isBrowse && viewMode === 'sidebar')}>
        <SidebarIcon />
      </button>
      <button onClick={() => nav('/dashboard')} title="Dashboard" style={railBtn(loc.pathname === '/dashboard')}>
        <ChartIcon />
      </button>
      <button onClick={() => nav('/add')} title="Add a demo" style={railBtn(loc.pathname === '/add')}>
        <PlusIcon />
      </button>
      <div style={{ flex: 1 }} />
      <div
        title={me ? `${me.name} — Solution Engineer` : ''}
        style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#F97316,#EF4444)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, fontFamily: "'Space Grotesk'" }}
      >
        {me ? initials(me.name) : '…'}
      </div>
    </nav>
  );
}

export default function App() {
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const showToast = useCallback((msg: string) => {
    clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: '#EEF0F3' }}>
        <NavRail />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#EEF0F3' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/demos/:id" element={<DetailPage />} />
            <Route path="/demos/:id/split" element={<SplitViewPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/add" element={<AddDemoPage />} />
          </Routes>
        </main>
        {toast && (
          <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#101317', color: '#fff', fontSize: 13.5, fontWeight: 500, padding: '11px 18px', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,.28)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 9, animation: 'fadeUp .25s ease' }}>
            <CheckIcon size={16} color="#12E29B" />
            {toast}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
