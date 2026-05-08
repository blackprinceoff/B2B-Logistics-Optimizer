import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Truck, Fuel, Target, Info } from 'lucide-react';
import AnimatedNumber from './ui/AnimatedNumber';
import StatCard from './ui/StatCard';
import Section from './ui/Section';
import MonteCarloChart from './charts/MonteCarloChart';
import RegressionChart from './charts/RegressionChart';
import CostBreakdownChart from './charts/CostBreakdownChart';
import FleetUtilizationChart from './charts/FleetUtilizationChart';
import SensitivityChart from './charts/SensitivityChart';
import useAnalyticsData from '../hooks/useAnalyticsData';
import { COLORS } from '../constants/colors';

/* AnimatedValue — convenience wrapper */
function AnimatedValue({ value, decimals = 0 }) {
  return <AnimatedNumber value={value} decimals={decimals} color={undefined} />;
}

/* ═════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════════ */
export default function AnalyticsView({ sharedSchedule }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const analysisRes = await fetch('http://localhost:8080/api/analysis/monte-carlo').then(r => r.json());

      let scheduleRes = sharedSchedule;
      if (!scheduleRes) {
        scheduleRes = await fetch('http://localhost:8080/api/optimize').then(r => r.json());
      }

      setData({ mcData: analysisRes, scheduleData: scheduleRes });
    } catch (e) {
      console.error('Failed to load analytics:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const analytics = useAnalyticsData(data?.mcData, data?.scheduleData);
  const scheduleData = data?.scheduleData || {};

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px' }}>
        <Activity size={32} color="var(--accent-blue)" className="spin" />
        <p style={{ color: 'var(--text-secondary)' }}>Gathering mathematics & simulating realities...</p>
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

  const { baselineProfit, smartProfit, optimalityGap, totalVehicles, avgProfitPerOrder, iterations, segments } = analytics;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 40px', background: 'var(--bg-primary)', transition: 'background 0.3s' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ animation: 'fadeSlideUp 400ms cubic-bezier(0.25,0.1,0.25,1) both' }}>
            <h1 style={{ fontSize: '28px', marginBottom: '6px', color: 'var(--text-primary)' }}>Analytics</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Algorithm performance & stochastic robustness metrics</p>
          </div>
        </div>

        {/* ═══ KPI Grid ═══ */}
        <div style={{ animation: 'fadeSlideUp 500ms cubic-bezier(0.25,0.1,0.25,1) both', animationDelay: '50ms' }}>
          <Section title="Algorithm Performance" subtitle="Smart Graph vs Greedy Baseline">
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Baseline (Greedy) Profit</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <AnimatedValue value={baselineProfit} /> ₴
              </div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Smart Graph Profit</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                <AnimatedValue value={smartProfit} /> ₴
              </div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Optimality Gap
                <Info size={13} color="var(--text-secondary)" style={{ cursor: 'help' }} title="Relative profit improvement of the Smart Graph algorithm compared to the Greedy Baseline" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: optimalityGap >= 0 ? COLORS.successBg : COLORS.dangerBg, color: optimalityGap >= 0 ? COLORS.success : COLORS.danger, padding: '4px 8px', borderRadius: '6px', fontSize: '16px', fontWeight: 700 }}>
                  {optimalityGap >= 0 ? 
                    <TrendingUp size={16} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'text-bottom' }} /> :
                    <TrendingDown size={16} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'text-bottom' }} />
                  }
                  {optimalityGap >= 0 ? '+' : ''}{optimalityGap.toFixed(2)}%
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {smartProfit > baselineProfit ? '+' : ''}{Math.round(smartProfit - baselineProfit).toLocaleString('uk-UA')} ₴ absolute
                </div>
              </div>
            </div>
          </div>
          </Section>
        </div>

        {/* ═══ Schedule Quick Stats ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <StatCard icon={Truck} label="Vehicles deployed" value={totalVehicles} />
          <StatCard icon={Target} label="Avg profit/order" value={<><AnimatedValue value={avgProfitPerOrder} /> ₴</>} color={avgProfitPerOrder >= 0 ? 'var(--success)' : 'var(--danger)'} />
          <StatCard icon={Fuel} label="Total distance" value={<><AnimatedValue value={scheduleData?.totalDistanceKm ?? 0} /> km</>} />
        </div>

        {/* ═══ Charts ═══ */}
        <div style={{ animation: 'fadeSlideUp 500ms cubic-bezier(0.25,0.1,0.25,1) both', animationDelay: '100ms' }}>
          <MonteCarloChart {...analytics} />
        </div>
        <div style={{ animation: 'fadeSlideUp 500ms cubic-bezier(0.25,0.1,0.25,1) both', animationDelay: '150ms' }}>
          <RegressionChart {...analytics} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', animation: 'fadeSlideUp 500ms cubic-bezier(0.25,0.1,0.25,1) both', animationDelay: '200ms' }}>
          <CostBreakdownChart costBreakdown={analytics.costBreakdown} />
          <FleetUtilizationChart fleetUtil={analytics.fleetUtil} />
        </div>

        <div style={{ animation: 'fadeSlideUp 500ms cubic-bezier(0.25,0.1,0.25,1) both', animationDelay: '250ms' }}>
          <SensitivityChart sensitivityData={analytics.sensitivityData} />
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0 40px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Analysis generated from {iterations} Monte Carlo iterations · {segments.length} schedule segments
        </div>
      </div>
    </div>
  );
}
