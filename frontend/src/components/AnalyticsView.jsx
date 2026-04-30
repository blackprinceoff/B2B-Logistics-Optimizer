import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { Activity, Zap, TrendingUp, AlertTriangle, RefreshCcw } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px',
      border: '1px solid var(--border-color)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
        <Icon size={16} />
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1px', color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis/monte-carlo');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px', color: 'var(--text-secondary)' }}>
        <RefreshCcw size={28} className="spin" />
        <span style={{ fontSize: '14px' }}>Running Monte Carlo Simulation (100 iterations)…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px' }}>
        <AlertTriangle size={32} color="var(--warning)" />
        <p style={{ color: 'var(--text-secondary)' }}>Could not load analytics: {error}</p>
        <button className="btn-primary" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  // Map backend AnalysisResult fields to display
  const { baselineProfit, smartProfit, optimalityGap, monteCarloStats, lookAheadSensitivity } = data;
  const { expectedValue, stdDev, minProfit, maxProfit, distribution } = monteCarloStats;

  // Build chart data from distribution array
  const chartData = distribution.map((profit, i) => ({ iteration: i + 1, profit: Math.round(profit) }));

  // Build sensitivity chart from map
  const sensitivityData = lookAheadSensitivity
    ? Object.entries(lookAheadSensitivity).map(([k, v]) => ({ minutes: `${k}m`, profit: Math.round(v) }))
    : [];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 40px', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Risk Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          Monte Carlo Simulation · {distribution.length} iterations · Traffic &amp; breakdown variability
        </p>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <StatCard icon={TrendingUp} label="Baseline (no lookahead)" value={`${Math.round(baselineProfit).toLocaleString()} ₴`} />
          <StatCard icon={Zap} label="Smart optimizer profit" value={`${Math.round(smartProfit).toLocaleString()} ₴`} color="var(--accent-blue)" />
          <StatCard icon={Activity} label="Expected (risk-adjusted)" value={`${Math.round(expectedValue).toLocaleString()} ₴`} color="var(--success)" />
          <StatCard icon={AlertTriangle} label="Std deviation (risk)" value={`±${Math.round(stdDev).toLocaleString()} ₴`} color="var(--warning)" />
        </div>

        {/* Optimality gap */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px 20px',
          border: '1px solid var(--border-color)', marginBottom: '28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Optimality Gap vs Baseline</div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>Smart algorithm outperforms greedy baseline by this margin</div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: optimalityGap >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {optimalityGap >= 0 ? '+' : ''}{Math.round(optimalityGap).toLocaleString()} ₴
          </div>
        </div>

        {/* Monte Carlo chart */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)', marginBottom: '28px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Profit Distribution — Monte Carlo Simulation</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Range: {Math.round(minProfit).toLocaleString()} ₴ – {Math.round(maxProfit).toLocaleString()} ₴</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="iteration" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} domain={['auto', 'auto']} width={70}
                tickFormatter={v => v.toLocaleString()} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '13px' }}
                formatter={v => [`${Number(v).toLocaleString()} ₴`, 'Profit']} />
              <ReferenceLine y={expectedValue} stroke="var(--success)" strokeDasharray="5 4" label={{ value: 'Expected', position: 'insideTopRight', fontSize: 11, fill: 'var(--success)' }} />
              <Line type="monotone" dataKey="profit" stroke="var(--accent-blue)" strokeWidth={2.5} dot={false}
                activeDot={{ r: 5, fill: 'var(--accent-blue)', stroke: 'white', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sensitivity chart */}
        {sensitivityData.length > 0 && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Look-Ahead Sensitivity Analysis</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>How far-ahead planning horizon affects total profit</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sensitivityData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="minutes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70} tickFormatter={v => v.toLocaleString()} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '13px' }}
                  formatter={v => [`${Number(v).toLocaleString()} ₴`, 'Profit']} />
                <Bar dataKey="profit" fill="var(--accent-blue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
