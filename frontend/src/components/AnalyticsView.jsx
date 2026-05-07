import React, { useState, useEffect, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, PieChart, Pie, Cell, ScatterChart, Scatter, Legend,
} from 'recharts';
import { Activity, Zap, TrendingUp, AlertTriangle, RefreshCcw, Truck, Fuel, Target } from 'lucide-react';
import { AnimatedNumber } from './Sidebar';
import { buildVehicleColorMap } from '../utils/vehicleColors';

/* ── Ordinary Least Squares linear regression ── */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { a: 0, b: 0, r2: 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { a: sumY / n, b: 0, r2: 0 };
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { a, b, r2 };
}

/* ── Build histogram bins from array of numbers ── */
function buildHistogram(values, numBins = 12) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / numBins || 1;
  const bins = Array.from({ length: numBins }, (_, i) => ({
    label: Math.round(min + i * width),
    count: 0,
    rangeStart: min + i * width,
    rangeEnd: min + (i + 1) * width,
  }));
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / width), numBins - 1);
    bins[idx].count++;
  });
  return bins;
}

/* AnimatedValue — wrapper to reuse Sidebar's component safely */
function AnimatedValue({ value, decimals = 0 }) {
  return (
    <AnimatedNumber value={value} decimals={decimals} color={undefined} />
  );
}

/* ── Stat Card Component ── */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', padding: '20px', borderRadius: '16px',
      border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <div style={{
        background: color ? `${color}15` : 'var(--bg-hover)', color: color || 'var(--text-primary)',
        width: 48, height: 48, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

/* ── Section Wrapper Component ── */
function Section({ title, subtitle, children }) {
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

/* ── Tooltip Component for Charts ── */
function CustomTooltip({ active, payload, label, suffix = '' }) {
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

  const mcData = data?.mcData || {};
  const scheduleData = data?.scheduleData || {};
  const segments = scheduleData?.schedule ?? [];

  // ══════════════════════════════════════════════
  //  Monte Carlo & Sensitivity Data Preparation
  // ══════════════════════════════════════════════
  const { baselineProfit = 0, smartProfit: mcSmartProfit = 0, optimalityGap: mcOptimalityGap = 0, monteCarloStats = {}, lookAheadSensitivity = null } = mcData;
  const { expectedValue = 0, stdDev = 0, minProfit = 0, maxProfit = 0, distribution = [] } = monteCarloStats;
  const iterations = distribution.length;

  // Use the exact profit from the generated schedule to perfectly sync with the Map
  const smartProfit = scheduleData?.totalProfit ?? mcSmartProfit;
  const optimalityGap = baselineProfit !== 0 ? ((smartProfit - baselineProfit) / Math.abs(baselineProfit)) * 100.0 : mcOptimalityGap;

  const mcHistogram = useMemo(() => buildHistogram(distribution, 12), [distribution]);

  const sensitivityData = useMemo(() => (
    lookAheadSensitivity
      ? Object.entries(lookAheadSensitivity).map(([k, v]) => ({ minutes: `${k}m`, profit: Math.round(v) }))
      : []
  ), [lookAheadSensitivity]);

  // ══════════════════════════════════════════════
  //  Schedule Data Preparation
  // ══════════════════════════════════════════════
  const vehicleColorMap = useMemo(() => buildVehicleColorMap(segments), [segments]);

  const fleetUtil = useMemo(() => {
    const map = {};
    segments.forEach(seg => {
      const vid = seg.vehicleId === 'COMMUTE' ? (seg.driverId || 'Unknown') : seg.vehicleId;
      if (!map[vid]) map[vid] = { vehicle: vid, order: 0, transfer: 0, waiting: 0, breakdown: 0, commute: 0 };
      const start = new Date(seg.startTime);
      const end = new Date(seg.endTime);
      const mins = Math.max(0, (end - start) / 60000);
      if (seg.vehicleId === 'COMMUTE' || (seg.type === 'TRANSFER' && seg.profitOrCost < -40)) map[vid].commute += mins;
      else if (seg.type === 'ORDER') map[vid].order += mins;
      else if (seg.type === 'TRANSFER') map[vid].transfer += mins;
      else if (seg.type === 'WAITING') map[vid].waiting += mins;
      else if (seg.type === 'BREAKDOWN') map[vid].breakdown += mins;
    });
    return Object.values(map).sort((a, b) => a.vehicle.localeCompare(b.vehicle));
  }, [segments]);

  const costBreakdown = useMemo(() => {
    let revenue = 0, transferCost = 0, commuteCost = 0, breakdownCost = 0, waitingCost = 0;
    segments.forEach(seg => {
      const p = seg.profitOrCost || 0;
      if (seg.type === 'ORDER') revenue += p;
      else if (seg.vehicleId === 'COMMUTE' || (seg.type === 'TRANSFER' && p < -40)) commuteCost += Math.abs(p);
      else if (seg.type === 'TRANSFER') transferCost += Math.abs(p);
      else if (seg.type === 'BREAKDOWN') breakdownCost += Math.abs(p);
      else if (seg.type === 'WAITING') waitingCost += Math.abs(p);
    });
    return [
      { name: 'Order Revenue', value: Math.round(revenue), color: '#34c759' },
      { name: 'Transfer Cost', value: Math.round(transferCost), color: '#007aff' },
      { name: 'Commute Cost', value: Math.round(commuteCost), color: '#ff9f0a' },
      { name: 'Breakdown Penalty', value: Math.round(breakdownCost), color: '#ff3b30' },
      { name: 'Waiting Cost', value: Math.round(waitingCost), color: '#8e8e93' },
    ].filter(d => d.value > 0);
  }, [segments]);

  const revenuePerVehicle = useMemo(() => {
    const map = {};
    segments.forEach(seg => {
      if (seg.vehicleId === 'COMMUTE') return;
      if (!map[seg.vehicleId]) map[seg.vehicleId] = 0;
      map[seg.vehicleId] += (seg.profitOrCost || 0);
    });
    return Object.entries(map)
      .map(([vehicle, profit]) => ({ vehicle, profit: Math.round(profit) }))
      .sort((a, b) => b.profit - a.profit);
  }, [segments]);

  // Linear Regression Logic
  const { orderPoints, transferPoints, reg, regressionLine } = useMemo(() => {
    const orderPts = segments
      .filter(s => s.type === 'ORDER')
      .map(s => ({ x: +(s.distanceKm || 0).toFixed(1), y: +(s.profitOrCost || 0).toFixed(2), vehicle: s.vehicleId }));

    const transPts = segments
      .filter(s => s.type === 'TRANSFER' && s.vehicleId !== 'COMMUTE')
      .map(s => ({ x: +(s.distanceKm || 0).toFixed(1), y: +(s.profitOrCost || 0).toFixed(2) }));

    const lr = linearRegression(orderPts);
    const xVals = orderPts.map(p => p.x);
    const xMin = Math.min(...xVals, 0);
    const xMax = Math.max(...xVals, 1);
    const lrLine = [
      { x: +xMin.toFixed(1), y: +(lr.a + lr.b * xMin).toFixed(0) },
      { x: +xMax.toFixed(1), y: +(lr.a + lr.b * xMax).toFixed(0) },
    ];
    return { orderPoints: orderPts, transferPoints: transPts, reg: lr, regressionLine: lrLine };
  }, [segments]);

  const totalVehicles = new Set(segments.filter(s => s.vehicleId !== 'COMMUTE').map(s => s.vehicleId)).size;
  const orderSegs = segments.filter(s => s.type === 'ORDER');
  const avgProfitPerOrder = orderSegs.length > 0 ? orderSegs.reduce((sum, s) => sum + s.profitOrCost, 0) / orderSegs.length : 0;

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

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 40px', background: 'var(--bg-primary)', transition: 'background 0.3s' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '6px', color: 'var(--text-primary)' }}>Analytics & Mathematics</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Stochastic robustness and algorithm performance metrics</p>
          </div>
        </div>

        {/* ═══ KPI Grid ═══ */}
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
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Optimality Gap</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: optimalityGap >= 0 ? '#34c75920' : '#ff3b3020', color: optimalityGap >= 0 ? '#34c759' : '#ff3b30', padding: '4px 8px', borderRadius: '6px', fontSize: '16px', fontWeight: 700 }}>
                  <TrendingUp size={16} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'text-bottom' }} />
                  {optimalityGap >= 0 ? '+' : ''}{optimalityGap.toFixed(2)}%
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {smartProfit > baselineProfit ? '+' : ''}{Math.round(smartProfit - baselineProfit).toLocaleString('uk-UA')} ₴ absolute
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ Schedule Quick Stats ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <StatCard icon={Truck} label="Vehicles deployed" value={totalVehicles} />
          <StatCard icon={Target} label="Avg profit/order" value={<><AnimatedValue value={avgProfitPerOrder} /> ₴</>} color={avgProfitPerOrder >= 0 ? 'var(--success)' : 'var(--danger)'} />
          <StatCard icon={Fuel} label="Total distance" value={<><AnimatedValue value={scheduleData?.totalDistanceKm ?? 0} /> km</>} />
        </div>

        {/* ═══ Monte Carlo Histogram ═══ */}
        <Section
          title="Profit Distribution — Monte Carlo Simulation"
          subtitle={`${iterations} simulation runs · μ = ${Math.round(expectedValue).toLocaleString('uk-UA')} ₴ · σ = ±${Math.round(stdDev).toLocaleString('uk-UA')} ₴ · Доводить стохастичну стійкість алгоритму`}
        >
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'μ (Expected)', value: `${Math.round(expectedValue).toLocaleString('uk-UA')} ₴`, color: '#34c759' },
              { label: '±1σ range', value: `${Math.round(expectedValue - stdDev).toLocaleString('uk-UA')} – ${Math.round(expectedValue + stdDev).toLocaleString('uk-UA')} ₴`, color: '#007aff' },
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
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.count} симуляцій</div>
                  </div>
                );
              }} />
              <ReferenceLine x={Math.round(expectedValue)} stroke="#34c759" strokeDasharray="5 4" strokeWidth={2} label={{ value: 'μ', fill: '#34c759', fontSize: 12 }} />
              <ReferenceLine x={Math.round(expectedValue - stdDev)} stroke="#007aff" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine x={Math.round(expectedValue + stdDev)} stroke="#007aff" strokeDasharray="3 3" strokeWidth={1} label={{ value: '±σ', fill: '#007aff', fontSize: 10 }} />
              <Bar dataKey="count" name="Frequency" radius={[4, 4, 0, 0]}>
                {mcHistogram.map((entry, i) => (
                  <Cell key={i} fill={entry.rangeStart <= expectedValue + stdDev && entry.rangeEnd >= expectedValue - stdDev ? '#007aff' : 'var(--border-color)'} opacity={entry.rangeStart <= expectedValue + stdDev && entry.rangeEnd >= expectedValue - stdDev ? 0.75 : 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* ═══ Linear Regression Scatter ═══ */}
        {orderPoints.length > 0 && (
          <Section
            title="Відстань vs Дохід — Регресійний аналіз"
            subtitle={`Лінійна регресія OLS: ŷ = ${reg.a.toFixed(0)} ${reg.b >= 0 ? '+' : '-'} ${Math.abs(reg.b).toFixed(1)}x · R² = ${reg.r2.toFixed(3)} — ${reg.r2 > 0.5 ? 'сильна лінійна залежність' : reg.r2 > 0.2 ? 'слабка залежність — інші фактори важливіші' : 'відстань не є визначальним фактором доходу'}`}
          >
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '8px 14px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>R² (детермінація)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: reg.r2 > 0.5 ? 'var(--success)' : reg.r2 > 0.2 ? 'var(--warning)' : 'var(--danger)', marginTop: '2px' }}>{reg.r2.toFixed(3)}</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" dataKey="x" name="Distance" unit=" km" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} label={{ value: 'Відстань (км)', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-secondary)' }} />
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
                <Scatter name="Замовлення (ORDER)" data={orderPoints} fill="#34c759" opacity={0.75} />
                <Scatter name="Переміщення (TRANSFER)" data={transferPoints} fill="#007aff" opacity={0.4} />
                <Scatter name="Лінія регресії (OLS)" data={regressionLine} fill="none" line={{ stroke: '#ff9f0a', strokeWidth: 2, strokeDasharray: '6 3' }} shape={() => null} />
              </ScatterChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* ═══ Fleet Utilization & Cost Breakdown ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {costBreakdown.length > 0 && (
            <Section title="Cost Breakdown" subtitle="Структура доходів і витрат">
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
          )}

          {fleetUtil.length > 0 && (
            <Section title="Fleet Utilization" subtitle="Часовий розподіл роботи (хв)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fleetUtil} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => `${v}m`} />
                  <YAxis type="category" dataKey="vehicle" axisLine={false} tickLine={false} width={60} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip content={<CustomTooltip suffix=" min" />} />
                  <Bar dataKey="order" stackId="a" fill="#34c759" name="Order" radius={0} />
                  <Bar dataKey="transfer" stackId="a" fill="#007aff" name="Transfer" radius={0} />
                  <Bar dataKey="commute" stackId="a" fill="#ff9f0a" name="Commute" radius={0} />
                  <Bar dataKey="waiting" stackId="a" fill="#8e8e93" name="Waiting" radius={0} />
                  <Bar dataKey="breakdown" stackId="a" fill="#ff3b30" name="Breakdown" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}
        </div>

        {/* ═══ Sensitivity Bar Chart ═══ */}
        {sensitivityData.length > 0 && (
          <Section title="Look-Ahead Sensitivity Analysis" subtitle="Вплив горизонту планування на загальний прибуток (обґрунтування горизонту)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sensitivityData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="minutes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70} tickFormatter={v => v.toLocaleString('uk-UA')} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={sensitivityData[0]?.profit} stroke="var(--danger)" strokeDasharray="4 3" strokeWidth={1} />
                <Bar dataKey="profit" name="Profit" radius={[6, 6, 0, 0]}>
                  {sensitivityData.map((entry, i) => (
                    <Cell key={i} fill={entry.minutes === '120m' ? '#007aff' : entry.profit > (sensitivityData[0]?.profit ?? 0) ? '#34c759' : 'var(--border-color)'} opacity={entry.minutes === '120m' ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        <div style={{ textAlign: 'center', padding: '20px 0 40px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Analysis generated from {iterations} Monte Carlo iterations · {segments.length} schedule segments
        </div>
      </div>
    </div>
  );
}
