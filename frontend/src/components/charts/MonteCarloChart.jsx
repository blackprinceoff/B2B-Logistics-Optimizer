import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Cell,
} from 'recharts';
import Section from '../ui/Section';
import { COLORS } from '../../constants/colors';

export default function MonteCarloChart({ mcHistogram, expectedValue, stdDev, minProfit, maxProfit, iterations }) {
  return (
    <Section
      title="Profit Distribution — Monte Carlo Simulation"
      subtitle={`${iterations} simulation runs · μ = ${Math.round(expectedValue).toLocaleString('uk-UA')} ₴ · σ = ±${Math.round(stdDev).toLocaleString('uk-UA')} ₴ · Demonstrates stochastic robustness of the algorithm`}
    >
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { label: 'μ (Expected)', value: `${Math.round(expectedValue).toLocaleString('uk-UA')} ₴`, color: COLORS.success },
          { label: '±1σ range', value: `${Math.round(expectedValue - stdDev).toLocaleString('uk-UA')} – ${Math.round(expectedValue + stdDev).toLocaleString('uk-UA')} ₴`, color: COLORS.accent },
          { label: 'Min / Max', value: `${Math.round(minProfit).toLocaleString('uk-UA')} / ${Math.round(maxProfit).toLocaleString('uk-UA')} ₴`, color: 'var(--text-secondary)' },
        ].map(b => (
          <div key={b.label} style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '8px 14px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.label}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: b.color, marginTop: '2px' }}>{b.value}</div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={mcHistogram} barCategoryGap="4%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={v => v.toLocaleString('uk-UA')} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={34} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                <div style={{ color: 'var(--text-secondary)' }}>{Math.round(d.rangeStart).toLocaleString('uk-UA')} – {Math.round(d.rangeEnd).toLocaleString('uk-UA')} ₴</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.count} runs</div>
              </div>
            );
          }} />
          <ReferenceLine x={Math.round(expectedValue)} stroke={COLORS.success} strokeDasharray="5 4" strokeWidth={2} label={{ value: 'μ', fill: COLORS.success, fontSize: 12 }} />
          <ReferenceLine x={Math.round(expectedValue - stdDev)} stroke={COLORS.accent} strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine x={Math.round(expectedValue + stdDev)} stroke={COLORS.accent} strokeDasharray="3 3" strokeWidth={1} label={{ value: '±σ', fill: COLORS.accent, fontSize: 10 }} />
          <Bar dataKey="count" name="Frequency" radius={[4, 4, 0, 0]}>
            {mcHistogram.map((entry, i) => (
              <Cell key={i} fill={entry.rangeStart <= expectedValue + stdDev && entry.rangeEnd >= expectedValue - stdDev ? COLORS.accent : 'var(--border-color)'} opacity={entry.rangeStart <= expectedValue + stdDev && entry.rangeEnd >= expectedValue - stdDev ? 0.75 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Section>
  );
}
