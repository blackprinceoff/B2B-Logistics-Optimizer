import React from 'react';

/* ── Section Wrapper Component ── */
export default function Section({ title, subtitle, children }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      borderRadius: '16px', padding: '24px', marginBottom: '24px',
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{subtitle}</p>}
      {children}
    </div>
  );
}
