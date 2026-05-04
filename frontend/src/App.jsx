import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Truck, BarChart3 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AnalyticsView from './components/AnalyticsView';
import './index.css';

function NavLink({ to, icon: Icon, label }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '7px 14px', borderRadius: '999px', textDecoration: 'none',
      color: active ? '#007aff' : '#86868b',
      background: active ? 'rgba(0,122,255,0.08)' : 'transparent',
      fontWeight: 500, fontSize: '13px', transition: 'all 0.15s',
    }}>
      <Icon size={15} />
      {label}
    </Link>
  );
}

function Navbar() {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 24px', height: '56px', flexShrink: 0,
      background: 'rgba(255,255,255,0.75)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      position: 'relative', zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.4px', color: '#1d1d1f' }}>
        <div style={{ background: '#007aff', padding: '4px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={16} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span>B2B Logistics <span style={{ color: '#86868b', fontWeight: 500 }}>Pro</span></span>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <NavLink to="/" icon={Truck} label="Routing Map" />
        <NavLink to="/analytics" icon={BarChart3} label="Analytics" />
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Navbar />
        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<AnalyticsView />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
