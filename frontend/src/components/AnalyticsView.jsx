import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Area, AreaChart,
  PieChart, Pie, Cell, ScatterChart, Scatter, Legend,
} from 'recharts';
import { Activity, Zap, TrendingUp, AlertTriangle, RefreshCcw, Truck, Fuel, Clock, Target } from 'lucide-react';

/* ── Animated Counter (reusable) ── */
function AnimatedValue({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    const dur = 700;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * e);
      if (p < 1) ref.current = requestAnimationFrame(tick);
      else prev.current = end;
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);

  return decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('uk-UA');
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className="stagger-item" style={{
      background: 'var(--bg-secondary)', borderRadius: '16px', padding: '20px',
      border: '1px solid var(--border-color)', transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
        <Icon size={16} />
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1px', color: color ?? 'var(--text-primary)' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, subtitle, children, style }) {
  return (
    <div className="stagger-item" style={{
      background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px',
      border: '1px solid var(--border-color)', marginBottom: '20px', ...style,
    }}>
      {title && <h3 style={{ fontSize: '15px', marginBottom: '4px', color: 'var(--text-primary)' }}>{title}</h3>}
      {subtitle && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{subtitle}</p>}
      {children}
    </div>
  );
}

/* ── Custom Recharts Tooltip ── */
const CustomTooltip = ({ active, payload, label, suffix = ' ₴' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--border-color)',
      fontSize: '13px', color: 'var(--text-primary)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toLocaleString('uk-UA') : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Color palette for charts ── */
const VEHICLE_COLORS = ['#2563EB', '#16A34A', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];
const COST_COLORS = ['#34c759', '#ff3b30', '#007aff', '#ff9f0a', '#8e8e93'];

export default function AnalyticsView() {
  const [mcData, setMcData] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both analytics and schedule in parallel
      const [mcRes, schedRes] = await Promise.all([
        fetch('/api/analysis/monte-carlo'),
        fetch('/api/optimize'),
      ]);
      if (!mcRes.ok) throw new Error('Analytics: HTTP ' + mcRes.status);
      if (!schedRes.ok) throw new Error('Schedule: HTTP ' + schedRes.status);
      
      const [mc, sched] = await Promise.all([mcRes.json(), schedRes.json()]);
      setMcData(mc);
      setScheduleData(sched);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px', color: 'var(--text-secondary)' }}>
        <RefreshCcw size={28} className="spin" />
        <span style={{ fontSize: '14px' }}>Running Monte Carlo Simulation & Schedule Analysis…</span>
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

  // ══════════════════════════════════════════════
  //  Monte Carlo data
  // ══════════════════════════════════════════════
  const { baselineProfit, smartProfit, optimalityGap, monteCarloStats, lookAheadSensitivity } = mcData;
  const { expectedValue, stdDev, minProfit, maxProfit, distribution } = monteCarloStats;
  const iterations = distribution.length;

  // Chart data for MC distribution
  const chartData = distribution.map((profit, i) => ({ iteration: i + 1, profit: Math.round(profit) }));

  // Confidence interval band data
  const ciData = chartData.map(d => ({
    ...d,
    upper2: Math.round(expectedValue + 2 * stdDev),
    upper1: Math.round(expectedValue + stdDev),
    mean: Math.round(expectedValue),
    lower1: Math.round(expectedValue - stdDev),
    lower2: Math.round(expectedValue - 2 * stdDev),
  }));

  // Sensitivity chart from map
  const sensitivityData = lookAheadSensitivity
    ? Object.entries(lookAheadSensitivity).map(([k, v]) => ({ minutes: `${k}m`, profit: Math.round(v) }))
    : [];

  // ══════════════════════════════════════════════
  //  Schedule-based analytics
  // ══════════════════════════════════════════════
  const segments = scheduleData?.schedule ?? [];

  // ── Fleet Utilization per vehicle ──
  const fleetUtil = (() => {
    const map = {};
    segments.forEach(seg => {
      const vid = seg.vehicleId === 'COMMUTE' ? (seg.driverId || 'Unknown') : seg.vehicleId;
      if (!map[vid]) map[vid] = { vehicle: vid, order: 0, transfer: 0, waiting: 0, breakdown: 0, commute: 0 };

      const start = new Date(seg.startTime);
      const end = new Date(seg.endTime);
      const mins = Math.max(0, (end - start) / 60000);

      if (seg.vehicleId === 'COMMUTE' || (seg.type === 'TRANSFER' && seg.profitOrCost < -40)) {
        map[vid].commute += mins;
      } else if (seg.type === 'ORDER') {
        map[vid].order += mins;
      } else if (seg.type === 'TRANSFER') {
        map[vid].transfer += mins;
      } else if (seg.type === 'WAITING') {
        map[vid].waiting += mins;
      } else if (seg.type === 'BREAKDOWN') {
        map[vid].breakdown += mins;
      }
    });
    return Object.values(map).sort((a, b) => a.vehicle.localeCompare(b.vehicle));
  })();

  // ── Cost Breakdown (donut) ──
  const costBreakdown = (() => {
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
  })();

  // ── Revenue per Vehicle ──
  const revenuePerVehicle = (() => {
    const map = {};
    segments.forEach(seg => {
      if (seg.vehicleId === 'COMMUTE') return;
      if (!map[seg.vehicleId]) map[seg.vehicleId] = 0;
      map[seg.vehicleId] += (seg.profitOrCost || 0);
    });
    return Object.entries(map)
      .map(([vehicle, profit]) => ({ vehicle, profit: Math.round(profit) }))
      .sort((a, b) => b.profit - a.profit);
  })();

  // ── Distance vs Revenue (scatter) ──
  const scatterData = segments
    .filter(s => s.type === 'ORDER' || s.type === 'TRANSFER')
    .map(s => ({
      distance: +(s.distanceKm || 0).toFixed(1),
      profit: +(s.profitOrCost || 0).toFixed(2),
      type: s.type,
      vehicle: s.vehicleId,
    }));
  const scatterOrders = scatterData.filter(d => d.type === 'ORDER');
  const scatterTransfers = scatterData.filter(d => d.type === 'TRANSFER');

  // ── Quick stats for schedule ──
  const totalVehicles = new Set(segments.filter(s => s.vehicleId !== 'COMMUTE').map(s => s.vehicleId)).size;
  const avgProfitPerOrder = segments.filter(s => s.type === 'ORDER').length > 0
    ? segments.filter(s => s.type === 'ORDER').reduce((sum, s) => sum + s.profitOrCost, 0) / segments.filter(s => s.type === 'ORDER').length
    : 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 40px', background: 'var(--bg-primary)', transition: 'background 0.3s' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '6px', color: 'var(--text-primary)' }}>Risk Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
          Monte Carlo Simulation · {iterations} iterations · Traffic &amp; breakdown variability
        </p>

        {/* ═══ KPI Grid ═══ */}
        <div className="analytics-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          <StatCard icon={TrendingUp} label="Baseline (no lookahead)"
            value={<><AnimatedValue value={baselineProfit} /> ₴</>} />
          <StatCard icon={Zap} label="Smart optimizer profit"
            value={<><AnimatedValue value={smartProfit} /> ₴</>} color="var(--accent-blue)" />
          <StatCard icon={Activity} label="Expected (risk-adjusted)"
            value={<><AnimatedValue value={expectedValue} /> ₴</>} color="var(--success)" />
          <StatCard icon={AlertTriangle} label="Std deviation (risk)"
            value={<>±<AnimatedValue value={stdDev} /> ₴</>} color="var(--warning)" />
        </div>

        {/* ═══ Optimality Gap ═══ */}
        <Section style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Optimality Gap vs Baseline</div>
            <div style={{ fontSize: '14px', marginTop: '4px', color: 'var(--text-primary)' }}>Smart algorithm outperforms greedy baseline by this margin</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: optimalityGap >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {optimalityGap >= 0 ? '+' : ''}{optimalityGap.toFixed(2)}%
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {smartProfit > baselineProfit ? '+' : ''}{Math.round(smartProfit - baselineProfit).toLocaleString('uk-UA')} ₴ absolute
            </div>
          </div>
        </Section>

        {/* ═══ Schedule Quick Stats ═══ */}
        <div className="analytics-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          <StatCard icon={Truck} label="Vehicles deployed" value={totalVehicles} />
          <StatCard icon={Target} label="Avg profit/order" 
            value={<><AnimatedValue value={avgProfitPerOrder} /> ₴</>} 
            color={avgProfitPerOrder >= 0 ? 'var(--success)' : 'var(--danger)'} />
          <StatCard icon={Fuel} label="Total distance"
            value={<><AnimatedValue value={scheduleData?.totalDistanceKm ?? 0} /> km</>} />
        </div>

        {/* ═══ Monte Carlo — Confidence Interval Band ═══ */}
        <Section 
          title="Profit Distribution — Monte Carlo Simulation" 
          subtitle={`Range: ${Math.round(minProfit).toLocaleString('uk-UA')} ₴ – ${Math.round(maxProfit).toLocaleString('uk-UA')} ₴ · Green line = expected value (μ), bands = ±1σ / ±2σ`}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={ciData}>
              <defs>
                <linearGradient id="band2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007aff" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#007aff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="band1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007aff" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#007aff" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="iteration" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70}
                tickFormatter={v => v.toLocaleString('uk-UA')} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              {/* ±2σ band */}
              <Area type="monotone" dataKey="upper2" stroke="none" fill="url(#band2)" />
              <Area type="monotone" dataKey="lower2" stroke="none" fill="url(#band2)" />
              {/* ±1σ band */}
              <Area type="monotone" dataKey="upper1" stroke="none" fill="url(#band1)" />
              <Area type="monotone" dataKey="lower1" stroke="none" fill="url(#band1)" />
              {/* Mean reference */}
              <ReferenceLine y={expectedValue} stroke="#34c759" strokeDasharray="5 4" strokeWidth={1.5} />
              {/* Actual profit line */}
              <Line type="monotone" dataKey="profit" stroke="#007aff" strokeWidth={2.5} dot={false}
                activeDot={{ r: 5, fill: '#007aff', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* ═══ Fleet Utilization ═══ */}
        {fleetUtil.length > 0 && (
          <Section title="Fleet Utilization" subtitle="Time breakdown per vehicle (minutes)">
            <ResponsiveContainer width="100%" height={Math.max(200, fleetUtil.length * 44)}>
              <BarChart data={fleetUtil} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={v => `${v}m`} />
                <YAxis type="category" dataKey="vehicle" axisLine={false} tickLine={false} width={70}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip suffix=" min" />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="order" stackId="a" fill="#34c759" name="Order" radius={0} />
                <Bar dataKey="transfer" stackId="a" fill="#007aff" name="Transfer" radius={0} />
                <Bar dataKey="commute" stackId="a" fill="#ff9f0a" name="Commute" radius={0} />
                <Bar dataKey="waiting" stackId="a" fill="#8e8e93" name="Waiting" radius={0} />
                <Bar dataKey="breakdown" stackId="a" fill="#ff3b30" name="Breakdown" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* ═══ Revenue per Vehicle ═══ */}
        {revenuePerVehicle.length > 0 && (
          <Section title="Revenue per Vehicle" subtitle="Net profit/loss contribution by each vehicle">
            <ResponsiveContainer width="100%" height={Math.max(180, revenuePerVehicle.length * 38)}>
              <BarChart data={revenuePerVehicle} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={v => v.toLocaleString('uk-UA')} />
                <YAxis type="category" dataKey="vehicle" axisLine={false} tickLine={false} width={70}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="var(--border-color)" />
                <Bar dataKey="profit" name="Profit" radius={[0, 6, 6, 0]}>
                  {revenuePerVehicle.map((entry, i) => (
                    <Cell key={i} fill={entry.profit >= 0 ? '#34c759' : '#ff3b30'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* ═══ Cost Breakdown Donut ═══ */}
        {costBreakdown.length > 0 && (
          <Section title="Cost Breakdown" subtitle="Revenue vs operational costs">
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <ResponsiveContainer width={260} height={260}>
                <PieChart>
                  <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {costBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
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

        {/* ═══ Distance vs Revenue Scatter ═══ */}
        {scatterData.length > 0 && (
          <Section title="Distance vs Revenue" subtitle="Each dot = one segment. Is distance always proportional to revenue?">
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" dataKey="distance" name="Distance" unit=" km" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis type="number" dataKey="profit" name="Profit" unit=" ₴" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{
                      background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px 16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--border-color)',
                      fontSize: '13px', color: 'var(--text-primary)',
                    }}>
                      <div style={{ fontWeight: 600 }}>{d?.vehicle}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{d?.type} · {d?.distance} km</div>
                      <div style={{ color: d?.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {d?.profit >= 0 ? '+' : ''}{d?.profit} ₴
                      </div>
                    </div>
                  );
                }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Scatter name="Orders" data={scatterOrders} fill="#34c759" opacity={0.7} />
                <Scatter name="Transfers" data={scatterTransfers} fill="#007aff" opacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* ═══ Look-Ahead Sensitivity ═══ */}
        {sensitivityData.length > 0 && (
          <Section title="Look-Ahead Sensitivity Analysis" subtitle="How far-ahead planning horizon affects total profit">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sensitivityData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="minutes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70}
                  tickFormatter={v => v.toLocaleString('uk-UA')} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" fill="var(--accent-blue)" radius={[6, 6, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* ═══ Footer ═══ */}
        <div style={{ textAlign: 'center', padding: '20px 0 40px', color: 'var(--text-secondary)', fontSize: '12px' }}>
          Analysis generated from {iterations} Monte Carlo iterations · {segments.length} schedule segments · {totalVehicles} vehicles
        </div>
      </div>
    </div>
  );
}
