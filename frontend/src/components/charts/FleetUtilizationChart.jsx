import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import Section from '../ui/Section';
import CustomTooltip from '../ui/CustomTooltip';
import { COLORS } from '../../constants/colors';

export default function FleetUtilizationChart({ fleetUtil }) {
  if (fleetUtil.length === 0) return null;

  return (
    <Section title="Fleet Utilization" subtitle="Work time distribution (min)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={fleetUtil} layout="vertical" barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => `${v}m`} label={{ value: 'Time (min)', position: 'insideBottom', offset: -4, fontSize: 11, fill: COLORS.neutral }} />
          <YAxis type="category" dataKey="vehicle" axisLine={false} tickLine={false} width={60} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <Tooltip content={<CustomTooltip suffix=" min" />} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Bar dataKey="order" stackId="a" fill={COLORS.success} name="Order" radius={0} />
          <Bar dataKey="transfer" stackId="a" fill={COLORS.accent} name="Transfer" radius={0} />
          <Bar dataKey="commute" stackId="a" fill={COLORS.warning} name="Commute" radius={0} />
          <Bar dataKey="waiting" stackId="a" fill={COLORS.neutral} name="Waiting" radius={0} />
          <Bar dataKey="breakdown" stackId="a" fill={COLORS.danger} name="Breakdown" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Section>
  );
}
