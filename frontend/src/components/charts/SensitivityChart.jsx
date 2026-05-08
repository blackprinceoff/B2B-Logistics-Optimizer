import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Cell, LabelList,
} from 'recharts';
import Section from '../ui/Section';
import CustomTooltip from '../ui/CustomTooltip';
import { COLORS } from '../../constants/colors';

export default function SensitivityChart({ sensitivityData }) {
  if (sensitivityData.length === 0) return null;

  const maxProfit = Math.max(...sensitivityData.map(d => d.profit));

  return (
    <Section title="Look-Ahead Sensitivity Analysis" subtitle="Impact of planning horizon on total profit · Grey bars indicate no improvement over baseline">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={sensitivityData} barSize={36} margin={{ top: 24, right: 60, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey="minutes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70} tickFormatter={v => v.toLocaleString('uk-UA')} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={sensitivityData[0]?.profit} stroke="var(--danger)" strokeDasharray="4 3" strokeWidth={1} />
          <ReferenceLine y={maxProfit} stroke={COLORS.neutral} strokeDasharray="4 3" strokeWidth={1} label={{ value: 'Theoretical max', position: 'right', fontSize: 10, fill: COLORS.neutral }} />
          <Bar dataKey="profit" name="Profit" radius={[6, 6, 0, 0]}>
            <LabelList
              dataKey="minutes"
              position="top"
              fontSize={11}
              fontWeight={600}
              fill={COLORS.accent}
              formatter={(v) => v === '120m' ? 'Current' : ''}
            />
            {sensitivityData.map((entry, i) => (
              <Cell key={i} fill={entry.minutes === '120m' ? COLORS.accent : entry.profit > (sensitivityData[0]?.profit ?? 0) ? COLORS.success : 'var(--border-color)'} opacity={entry.minutes === '120m' ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Section>
  );
}
