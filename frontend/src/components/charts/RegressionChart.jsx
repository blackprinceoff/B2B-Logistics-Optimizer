import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Legend,
} from 'recharts';
import Section from '../ui/Section';
import { COLORS } from '../../constants/colors';

export default function RegressionChart({ orderPoints, transferPoints, reg, regressionLine }) {
  if (orderPoints.length === 0) return null;

  return (
    <Section
      title="Distance vs Revenue — Regression Analysis"
      subtitle={`OLS linear regression: ŷ = ${reg.a.toFixed(0)} ${reg.b >= 0 ? '+' : '-'} ${Math.abs(reg.b).toFixed(1)}x · R² = ${reg.r2.toFixed(3)} — ${reg.r2 > 0.5 ? 'strong linear correlation' : reg.r2 > 0.2 ? 'weak correlation — other factors dominate' : 'distance is not the dominant revenue factor'}`}
    >
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '8px 14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>R² (coefficient of determination)</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: reg.r2 > 0.5 ? 'var(--success)' : reg.r2 > 0.2 ? 'var(--warning)' : 'var(--danger)', marginTop: '2px' }}>{reg.r2.toFixed(3)}</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis type="number" dataKey="x" name="Distance" unit=" km" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} label={{ value: 'Distance (km)', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-secondary)' }} />
          <YAxis type="number" dataKey="y" name="Profit" unit=" ₴" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d?.vehicle}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{d?.x} km</div>
                <div style={{ fontWeight: 700, color: d?.y >= 0 ? 'var(--success)' : 'var(--danger)' }}>{d?.y >= 0 ? '+' : ''}{d?.y} ₴</div>
              </div>
            );
          }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Scatter name="Order" data={orderPoints} fill={COLORS.success} opacity={0.75} />
          <Scatter name="Transfer" data={transferPoints} fill={COLORS.accent} opacity={0.4} />
          <Scatter name="OLS Regression Line" data={regressionLine} fill="none" line={{ stroke: COLORS.warning, strokeWidth: 2, strokeDasharray: '6 3' }} shape={() => null} />
        </ScatterChart>
      </ResponsiveContainer>
    </Section>
  );
}
