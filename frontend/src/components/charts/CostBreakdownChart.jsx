import React from 'react';
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import Section from '../ui/Section';
import CustomTooltip from '../ui/CustomTooltip';

export default function CostBreakdownChart({ costBreakdown }) {
  if (costBreakdown.length === 0) return null;

  return (
    <Section title="Cost Breakdown" subtitle="Revenue & cost structure">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
              {costBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {costBreakdown.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{d.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d.value.toLocaleString('uk-UA')} ₴</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
