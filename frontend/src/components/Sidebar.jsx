import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Play, RefreshCcw, Activity, MapPin, CalendarClock, X, Route } from 'lucide-react';
import { buildVehicleColorMap, getSegmentColor, COMMUTE_COLOR } from '../utils/vehicleColors';

/* ── Animated Number Counter ── */
export function AnimatedNumber({ value, prefix = '', suffix = '', color, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);

  return (
    <span style={{ color }} className={value !== 0 ? 'count-pop' : ''}>
      {prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('uk-UA')}{suffix}
    </span>
  );
}

/* ── Skeleton placeholder card ── */
function SkeletonCard({ index }) {
  return (
    <div className="stagger-item" style={{
      background: 'var(--bg-secondary)', borderRadius: '12px', padding: '13px 14px 13px 16px',
      border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px',
      animationDelay: `${index * 0.08}s`, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '60px', height: '18px', borderRadius: '999px' }} />
        <div className="skeleton" style={{ width: '45px', height: '14px', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div className="skeleton" style={{ width: '13px', height: '13px', borderRadius: '50%', marginTop: '2px' }} />
        <div className="skeleton" style={{ width: '100%', maxWidth: '220px', height: '16px', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
        <div className="skeleton" style={{ width: '110px', height: '12px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ width: '50px', height: '14px', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

/* ── Single timeline card ── */
function SegmentCard({ seg, locationMap, routeColor, isActive, onToggleActive, onClear, index }) {
  const isCommute = seg.vehicleId === 'COMMUTE' ||
    (seg.type === 'TRANSFER' && seg.profitOrCost < -40);
  const displayType = isCommute ? 'COMMUTE' : seg.type;

  const timeStart = seg.startTime?.split('T')[1]?.substr(0, 5) ?? '--:--';
  const timeEnd   = seg.endTime?.split('T')[1]?.substr(0, 5)   ?? '--:--';
  const locStart  = locationMap[seg.startLocationId]?.name ?? `Loc ${seg.startLocationId}`;
  const locEnd    = locationMap[seg.endLocationId]?.name   ?? `Loc ${seg.endLocationId}`;
  const vehicleLabel = seg.vehicleId === 'COMMUTE'
    ? (seg.driverId ?? '')
    : (seg.vehicleId ?? '');

  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const activeBg = isActive ? hexToRgba(routeColor, 0.1) : 'var(--bg-secondary)';

  return (
    <div
      className="stagger-item"
      onClick={onToggleActive}
      style={{
        background: activeBg, borderRadius: '12px',
        border: '1px solid var(--glass-border)',
        position: 'relative', overflow: 'hidden',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        animationDelay: `${index * 0.05}s`,
      }}
    >
      {/* Left colour bar — vehicle colour */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
        background: routeColor, borderRadius: '4px 0 0 4px',
        transition: 'all 150ms ease',
      }} />

      <div style={{ padding: '13px 14px 13px 16px', position: 'relative' }}>

        {/* Clear button when active */}
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'var(--border-color)', border: 'none', borderRadius: '50%',
              width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center',
              cursor: 'pointer', color: 'var(--text-primary)',
            }}
            title="Clear selection"
          >
            <X size={14} />
          </button>
        )}

        {/* Row 1: Badge ↔ Vehicle ID */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', paddingRight: isActive ? '24px' : '0' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 10px', borderRadius: '999px',
            fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
            background: 'var(--border-color)', color: 'var(--text-primary)',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: routeColor, marginRight: '6px' }} />
            {displayType}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{vehicleLabel}</span>
        </div>

        {/* Row 2: Route A → B */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
          <MapPin size={13} color="var(--neutral)" style={{ marginTop: '2px', flexShrink: 0, marginRight: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {locStart}
            <span style={{ color: 'var(--text-secondary)', margin: '0 5px', fontWeight: 400 }}>→</span>
            {locEnd}
          </div>
        </div>

        {/* Row 3: Time + km ↔ Profit */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid var(--glass-border)', paddingTop: '9px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {timeStart}–{timeEnd} · {(seg.distanceKm ?? 0).toFixed(1)} km
          </span>
          <span style={{
            fontSize: '13px', fontWeight: 600,
            color: seg.profitOrCost > 0 ? 'var(--success)' : seg.profitOrCost < 0 ? 'var(--danger)' : 'var(--neutral)',
          }}>
            {seg.profitOrCost > 0 ? '+' : ''}{(seg.profitOrCost ?? 0).toFixed(2)} ₴
          </span>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Sidebar — main export
   ══════════════════════════════════════════════════════════ */
export default function Sidebar({
  data, loading, locationMap, onOptimize, onOpenMidDay,
  selectedVehicle, setSelectedVehicle,
  activeRouteId, setActiveRouteId,
}) {
  const segments = data?.schedule ?? [];
  const profit   = data?.totalProfit ?? 0;

  // Stable vehicle → colour map (sorted vehicleId order)
  const vehicleColorMap = useMemo(() => buildVehicleColorMap(segments), [segments]);

  const vehicleIds = useMemo(() => ['All', ...new Set(
    segments.filter(s => s.vehicleId !== 'COMMUTE').map(s => s.vehicleId)
  )].sort(), [segments]);

  // Keep original indices so activeRouteId stays consistent with MapComponent
  const segmentsWithIndex = useMemo(
    () => segments.map((seg, idx) => ({ ...seg, originalIndex: idx })),
    [segments]
  );

  const filtered = useMemo(() =>
    selectedVehicle === 'All'
      ? segmentsWithIndex
      : segmentsWithIndex.filter(s => s.vehicleId === selectedVehicle || s.vehicleId === 'COMMUTE'),
    [segmentsWithIndex, selectedVehicle]
  );

  return (
    <div className="dashboard-sidebar" style={{
      width: 'var(--sidebar-width)', flexShrink: 0, height: '100%',
      background: 'var(--glass-bg)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'background 0.3s ease',
    }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--glass-border)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
          Dispatch Control
        </h2>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className="btn-primary"
            onClick={onOptimize}
            disabled={loading}
            style={{
              flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              height: '36px', padding: '0', fontSize: '13px', fontWeight: 600,
            }}
          >
            {loading ? <RefreshCcw size={14} className="spin" /> : <Play size={14} />}
            Run Full Day
          </button>

          <button
            onClick={onOpenMidDay}
            disabled={loading}
            style={{
              flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              height: '36px', borderRadius: '999px',
              background: 'var(--border-color)', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--border-color)'}
          >
            <CalendarClock size={14} color="var(--accent-blue)" />
            Mid-Day Sync
          </button>
        </div>

        {/* Financial summary card */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: '14px', padding: '16px',
          boxShadow: 'var(--card-shadow)', border: '1px solid var(--glass-border)',
          transition: 'background 0.3s ease',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
            Financial Summary
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Net Profit</span>
            <span style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              <AnimatedNumber
                value={profit}
                suffix=" ₴"
                color={profit > 0 ? 'var(--success)' : profit < 0 ? 'var(--danger)' : 'var(--text-primary)'}
              />
            </span>
          </div>
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Orders completed</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data?.completedOrders ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Total distance</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(data?.totalDistanceKm ?? 0).toFixed(1)} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '28px', marginBottom: '4px', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', lineHeight: '28px' }}>
            Timeline
          </span>
          {segments.length > 0 && (
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              style={{
                height: '26px', padding: '0 8px', borderRadius: '7px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)', fontSize: '11px', fontFamily: 'inherit',
                outline: 'none', cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              {vehicleIds.map(v => <option key={v} value={v}>{v === 'All' ? 'All Vehicles' : v}</option>)}
            </select>
          )}
        </div>

        {segments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <div className="empty-state-icon">
              <Route size={24} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No routes generated yet</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>Click "Run Full Day" to optimize your fleet</p>
          </div>
        )}

        {loading && (
          <>
            <SkeletonCard index={0} />
            <SkeletonCard index={1} />
            <SkeletonCard index={2} />
            <SkeletonCard index={3} />
          </>
        )}

        {!loading && filtered.map((seg, i) => {
          const routeColor = getSegmentColor(seg, vehicleColorMap);
          const isActive = activeRouteId === seg.originalIndex;

          return (
            <SegmentCard
              key={seg.originalIndex}
              seg={seg}
              locationMap={locationMap}
              routeColor={routeColor}
              isActive={isActive}
              onToggleActive={() => setActiveRouteId(isActive ? null : seg.originalIndex)}
              onClear={() => setActiveRouteId(null)}
              index={i}
            />
          );
        })}
      </div>
    </div>
  );
}
