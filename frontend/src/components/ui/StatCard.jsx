import React from 'react';

/* ── Stat Card Component ── */
export default function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div 
      style={{
        background: 'var(--bg-secondary)', padding: '20px', borderRadius: '16px',
        border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px',
        transition: 'transform 200ms cubic-bezier(0.25,0.1,0.25,1), box-shadow 200ms cubic-bezier(0.25,0.1,0.25,1)'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        background: color ? `${color}15` : 'var(--bg-hover)', color: color || 'var(--text-primary)',
        width: 48, height: 48, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
