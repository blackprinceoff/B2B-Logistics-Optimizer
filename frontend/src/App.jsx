import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Truck, BarChart3, Moon, Sun } from 'lucide-react';
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
      padding: '7px 14px', borderRadius: '999px', textDecoration: 'none',
      color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
      background: active ? 'var(--accent-blue-soft)' : 'transparent',
      fontWeight: 500, fontSize: '13px', transition: 'all 0.15s',
    }}>
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
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid var(--border-color)',
      position: 'relative', zIndex: 1000,
      transition: 'background 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
        <div style={{ background: 'var(--accent-blue)', padding: '4px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={16} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span>B2B Logistics <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Pro</span></span>
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
