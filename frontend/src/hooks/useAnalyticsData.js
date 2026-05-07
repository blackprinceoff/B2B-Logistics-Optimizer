import { useMemo } from 'react';
import { buildVehicleColorMap } from '../utils/vehicleColors';
import { COLORS } from '../constants/colors';

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

/**
 * Custom hook that derives all analytics datasets from raw API data.
 *
 * @param {Object} mcData       - Monte Carlo analysis response
 * @param {Object} scheduleData - Schedule/optimization response
 * @returns {Object} all computed datasets for chart components
 */
export default function useAnalyticsData(mcData = {}, scheduleData = {}) {
  const segments = scheduleData?.schedule ?? [];

  // ── Monte Carlo & Sensitivity ──
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

  // ── Schedule Data ──
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
      { name: 'Order Revenue', value: Math.round(revenue), color: COLORS.success },
      { name: 'Transfer Cost', value: Math.round(transferCost), color: COLORS.accent },
      { name: 'Commute Cost', value: Math.round(commuteCost), color: COLORS.warning },
      { name: 'Breakdown Penalty', value: Math.round(breakdownCost), color: COLORS.danger },
      { name: 'Waiting Cost', value: Math.round(waitingCost), color: COLORS.neutral },
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

  return {
    // Monte Carlo
    baselineProfit,
    smartProfit,
    optimalityGap,
    expectedValue,
    stdDev,
    minProfit,
    maxProfit,
    iterations,
    mcHistogram,
    sensitivityData,
    // Schedule
    segments,
    vehicleColorMap,
    fleetUtil,
    costBreakdown,
    revenuePerVehicle,
    orderPoints,
    transferPoints,
    reg,
    regressionLine,
    totalVehicles,
    avgProfitPerOrder,
  };
}
