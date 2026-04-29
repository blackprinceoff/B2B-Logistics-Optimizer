import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AnalyticsView() {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/analysis/monte-carlo');
        const data = await res.json();
        setAnalysisData(data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, []);

  if (loading || !analysisData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <Activity className="animate-spin" size={32} style={{ marginRight: '12px' }} />
        <span>Running Monte Carlo Simulations (100 Iterations)...</span>
      </div>
    );
  }

  const { baselineProfit, stats, chartData } = analysisData;

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Risk Analytics</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '15px' }}>
        Monte Carlo Simulation based on 100 variations of traffic and breakdown probabilities.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <TrendingUp size={18} /> <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>Baseline Profit</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px' }}>{baselineProfit.toFixed(0)} ₴</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <Activity size={18} /> <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>Expected Profit (Risk-Adjusted)</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', color: 'var(--accent-blue)' }}>{stats.expectedProfit.toFixed(0)} ₴</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <AlertTriangle size={18} /> <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>Worst Case (95% Confidence)</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', color: 'var(--warning)' }}>{stats.percentile5.toFixed(0)} ₴</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <Zap size={18} /> <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>Standard Deviation</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', color: 'var(--danger)' }}>±{stats.standardDeviation.toFixed(0)} ₴</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '32px', borderRadius: '16px', height: '400px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '24px' }}>Profit Distribution over 100 Simulations</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis dataKey="iteration" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              formatter={(value) => [`${Number(value).toFixed(2)} ₴`, 'Profit']}
            />
            <Line type="monotone" dataKey="profit" stroke="var(--accent-blue)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--accent-blue)', stroke: 'white', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
