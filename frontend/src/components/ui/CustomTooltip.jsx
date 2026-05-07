import React from 'react';

/* ── Tooltip Component for Charts ── */
export default function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: '12px', padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || p.fill }} />
            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{p.name}:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {typeof p.value === 'number' ? p.value.toLocaleString('uk-UA') : p.value}{suffix}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
