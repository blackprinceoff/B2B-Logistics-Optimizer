import React from 'react';
import { Play, RefreshCcw, Activity, MapPin, CalendarClock, X } from 'lucide-react';

const ROUTE_COLORS = [
  '#2563EB', '#16A34A', '#DC2626', '#D97706', 
  '#7C3AED', '#0891B2', '#DB2777', '#65A30D'
];

function SkeletonCard({ index }) {
  return (
    <div className="stagger-item" style={{
      background: '#fff', borderRadius: '12px', padding: '13px 14px 13px 16px',
      border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '12px',
      animationDelay: `${index * 0.08}s`, flexShrink: 0
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '60px', height: '18px', borderRadius: '999px' }} />
        <div className="skeleton" style={{ width: '45px', height: '14px', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div className="skeleton" style={{ width: '13px', height: '13px', borderRadius: '50%', marginTop: '2px' }} />
        <div className="skeleton" style={{ width: '100%', maxWidth: '220px', height: '16px', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
        <div className="skeleton" style={{ width: '110px', height: '12px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ width: '50px', height: '14px', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

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

  // Calculate hex with opacity for background
  const hexToRgba = (hex, opacity) => {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const activeBg = isActive ? hexToRgba(routeColor, 0.1) : '#fff';
  const leftBorderColor = routeColor;

  return (
    <div 
      className="stagger-item"
      onClick={onToggleActive}
      style={{
        background: activeBg, borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.07)',
        position: 'relative', overflow: 'hidden',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        animationDelay: `${index * 0.05}s`
      }}
    >
      {/* Left color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
        background: leftBorderColor, borderRadius: '4px 0 0 4px',
        transition: 'all 150ms ease',
      }} />

      <div style={{ padding: '13px 14px 13px 16px', position: 'relative' }}>
        
        {/* Clear button if active */}
        {isActive && (
          <button 
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%',
              width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center',
              cursor: 'pointer', color: '#1d1d1f'
            }}
            title="Clear selection"
          >
            <X size={14} />
          </button>
        )}

        {/* Row 1: Badge (left) ↔ Vehicle ID (right) — space-between + center */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px', paddingRight: isActive ? '24px' : '0' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 10px', borderRadius: '999px',
            fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
            background: `rgba(0,0,0,0.05)`, color: '#1d1d1f',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: routeColor, marginRight: '6px' }} />
            {displayType}
          </span>
          <span style={{ fontSize: '11px', color: '#86868b', fontWeight: 600 }}>{vehicleLabel}</span>
        </div>

        {/* Row 2: Pin icon (with margin-right) + Route text */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
          <MapPin size={13} color="#8e8e93" style={{ marginTop: '2px', flexShrink: 0, marginRight: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', lineHeight: 1.5 }}>
            {locStart}
            <span style={{ color: '#8e8e93', margin: '0 5px', fontWeight: 400 }}>→</span>
            {locEnd}
          </div>
        </div>

        {/* Row 3: Time+km (left) ↔ Profit (right) — space-between + center */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '9px',
        }}>
          <span style={{ fontSize: '12px', color: '#86868b' }}>
            {timeStart}–{timeEnd} · {(seg.distanceKm ?? 0).toFixed(1)} km
          </span>
          <span style={{
            fontSize: '13px', fontWeight: 600,
            color: seg.profitOrCost > 0 ? '#34c759' : seg.profitOrCost < 0 ? '#ff3b30' : '#8e8e93',
          }}>
            {seg.profitOrCost > 0 ? '+' : ''}{(seg.profitOrCost ?? 0).toFixed(2)} ₴
          </span>
        </div>

      </div>
    </div>
  );
}

export default function Sidebar({ 
  data, loading, locationMap, onOptimize, onOpenMidDay, 
  selectedVehicle, setSelectedVehicle,
  activeRouteId, setActiveRouteId 
}) {
  const segments = data?.schedule ?? [];
  const profit   = data?.totalProfit ?? 0;

  const vehicleIds = ['All', ...new Set(
    segments.filter(s => s.vehicleId !== 'COMMUTE').map(s => s.vehicleId)
  )].sort();

  // Attach original indices so we can identify them and consistently color them
  const segmentsWithIndex = segments.map((seg, idx) => ({ ...seg, originalIndex: idx }));

  const filtered = selectedVehicle === 'All'
    ? segmentsWithIndex
    : segmentsWithIndex.filter(s => s.vehicleId === selectedVehicle || s.vehicleId === 'COMMUTE');

  return (
    <div style={{
      width: '380px', flexShrink: 0, height: '100%',
      background: 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderRight: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.4px', color: '#1d1d1f' }}>
          Dispatch Control
        </h2>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className="btn-primary"
            onClick={onOptimize}
            disabled={loading}
            style={{ 
              flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', 
              height: '36px', padding: '0', fontSize: '13px', fontWeight: 600 
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
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '13px', fontWeight: 600, color: '#1d1d1f', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
          >
            <CalendarClock size={14} color="#007aff" />
            Mid-Day Sync
          </button>
        </div>

        {/* Stats card */}
        <div style={{
          background: '#ffffff', borderRadius: '14px', padding: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
            Financial Summary
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#86868b' }}>Net Profit</span>
            <span style={{
              fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px',
              color: profit > 0 ? '#34c759' : profit < 0 ? '#ff3b30' : '#1d1d1f',
            }}>
              {profit.toFixed(0)} ₴
            </span>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#86868b' }}>
              <span>Orders completed</span>
              <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{data?.completedOrders ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#86868b' }}>
              <span>Total distance</span>
              <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{(data?.totalDistanceKm ?? 0).toFixed(1)} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '28px', marginBottom: '4px', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#86868b', lineHeight: '28px' }}>
            Timeline
          </span>
          {segments.length > 0 && (
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              style={{
                height: '26px', padding: '0 8px', borderRadius: '7px',
                border: '1px solid rgba(0,0,0,0.12)',
                background: '#fff', fontSize: '11px', fontFamily: 'inherit',
                outline: 'none', cursor: 'pointer', color: '#1d1d1f',
                display: 'flex', alignItems: 'center',
              }}
            >
              {vehicleIds.map(v => <option key={v} value={v}>{v === 'All' ? 'All Vehicles' : v}</option>)}
            </select>
          )}
        </div>

        {segments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: '#86868b', marginTop: '40px' }}>
            <Activity size={28} style={{ opacity: 0.18, display: 'block', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', fontWeight: 500 }}>No routes generated yet.</p>
            <p style={{ fontSize: '12px', marginTop: '3px', opacity: 0.7 }}>Click "Run Full Day" to start.</p>
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
          const routeColor = ROUTE_COLORS[seg.originalIndex % ROUTE_COLORS.length];
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
