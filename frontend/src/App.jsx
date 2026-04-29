import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Truck, BarChart3 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AnalyticsView from './components/AnalyticsView';
import './index.css';

function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="glass-panel" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 24px',
      height: '60px',
      position: 'relative',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '18px' }}>
        <Truck size={24} color="var(--accent-blue)" />
        <span>B2B Logistics <span style={{ color: 'var(--text-secondary)' }}>Pro</span></span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Link 
          to="/" 
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '980px', textDecoration: 'none',
            color: location.pathname === '/' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            background: location.pathname === '/' ? 'rgba(0,122,255,0.1)' : 'transparent',
            fontWeight: 500, fontSize: '14px', transition: 'all 0.2s'
          }}
        >
          <Truck size={18} /> Routing Map
        </Link>
        <Link 
          to="/analytics" 
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '980px', textDecoration: 'none',
            color: location.pathname === '/analytics' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            background: location.pathname === '/analytics' ? 'rgba(0,122,255,0.1)' : 'transparent',
            fontWeight: 500, fontSize: '14px', transition: 'all 0.2s'
          }}
        >
          <BarChart3 size={18} /> Analytics
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Navbar />
        <div style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
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
