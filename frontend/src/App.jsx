import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Truck, BarChart3, Moon, Sun, Route as RouteIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AnalyticsView from './components/AnalyticsView';
import { ToastProvider } from './components/Toast';
import './index.css';

function NavLink({ to, icon: Icon, label }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '7px 14px', borderRadius: '8px', textDecoration: 'none',
      color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
      background: active ? 'var(--accent-blue-soft)' : 'transparent',
      fontWeight: 500, fontSize: '13px',
      transition: 'all 200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

function Navbar({ isDark, onToggleTheme }) {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 24px', height: 'var(--navbar-height)', flexShrink: 0,
      background: 'var(--glass-bg)',
      backdropFilter: 'saturate(180%) blur(12px)',
      WebkitBackdropFilter: 'saturate(180%) blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky', top: 0, zIndex: 1000,
      transition: 'background 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.3px', color: 'var(--text-primary)', cursor: 'pointer', transition: 'opacity 200ms ease' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        <RouteIcon size={18} color="var(--accent-blue)" />
        LogiOpt
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <NavLink to="/" icon={Truck} label="Routing Map" />
        <NavLink to="/analytics" icon={BarChart3} label="Analytics" />
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 6px' }} />
        <button className="theme-toggle" onClick={onToggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </nav>
  );
}

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const [sharedSchedule, setSharedSchedule] = useState(null);

  return (
    <ToastProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <Navbar isDark={isDark} onToggleTheme={() => setIsDark(d => !d)} />
          <div style={{ flexGrow: 1, overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Dashboard sharedSchedule={sharedSchedule} setSharedSchedule={setSharedSchedule} />} />
              <Route path="/analytics" element={<AnalyticsView sharedSchedule={sharedSchedule} />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
