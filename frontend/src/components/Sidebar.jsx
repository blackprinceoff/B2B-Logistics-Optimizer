import React from 'react';
import { Play, RefreshCcw, Activity, MapPin, CalendarClock } from 'lucide-react';

const LOCATIONS = {
  "1": "Гараж (Городоцька)", "2": "Залізничний вокзал", "3": "Оперний театр",
  "4": "Аеропорт", "5": "Сихів (Шувар)", "6": "King Cross",
  "7": "Політехніка", "8": "IT Park", "9": "Forum Lviv",
  "10": "Високий Замок", "11": "Епіцентр (Кільцева)", "12": "Винники (Госпіталь)"
};

const TYPE_COLOR = {
  ORDER: '#34c759', TRANSFER: '#007aff', WAITING: '#ff9f0a',
  BREAKDOWN: '#ff3b30', COMMUTE: '#8e8e93',
};

const TYPE_LABEL = {
  ORDER: 'Order', TRANSFER: 'Transfer', WAITING: 'Waiting',
  BREAKDOWN: 'Breakdown', COMMUTE: 'Commute',
};

function SegmentCard({ seg }) {
  const isCommute = seg.vehicleId === 'COMMUTE' ||
    (seg.type === 'TRANSFER' && seg.profitOrCost < -40);
  const displayType = isCommute ? 'COMMUTE' : seg.type;
  const color = TYPE_COLOR[displayType] || '#8e8e93';
  const label = TYPE_LABEL[displayType] || displayType;

  const timeStart = seg.startTime?.split('T')[1]?.substr(0, 5) ?? '--:--';
  const timeEnd   = seg.endTime?.split('T')[1]?.substr(0, 5)   ?? '--:--';
  const locStart  = LOCATIONS[seg.startLocationId] ?? 'Depot';
  const locEnd    = LOCATIONS[seg.endLocationId]   ?? 'Depot';
  const vehicleLabel = seg.vehicleId === 'COMMUTE' 
    ? (seg.driverId ?? '') 
    : (seg.vehicleId ?? '');

  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      border: '1px solid rgba(0,0,0,0.07)',
      position: 'relative', overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Left color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
        background: color, borderRadius: '4px 0 0 4px',
      }} />

      <div style={{ padding: '12px 12px 12px 15px' }}>
        {/* Row 1: Badge + Vehicle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{
            display: 'inline-block', padding: '3px 9px', borderRadius: '999px',
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
            background: `${color}18`, color,
          }}>{label}</span>
          <span style={{ fontSize: '11px', color: '#86868b', fontWeight: 600 }}>{vehicleLabel}</span>
        </div>

        {/* Row 2: Route */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '10px' }}>
          <MapPin size={13} color="#8e8e93" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', lineHeight: 1.5 }}>
            {locStart}
            <span style={{ color: '#8e8e93', margin: '0 4px', fontWeight: 400 }}>→</span>
            {locEnd}
          </div>
        </div>

        {/* Row 3: Time · km | profit */}
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

export default function Sidebar({ data, loading, onOptimize, onOpenMidDay, selectedVehicle, setSelectedVehicle }) {
  const segments = data?.schedule ?? [];
  const profit   = data?.totalProfit ?? 0;

  const vehicleIds = ['All', ...new Set(
    segments.filter(s => s.vehicleId !== 'COMMUTE').map(s => s.vehicleId)
  )].sort();

  const filtered = selectedVehicle === 'All'
    ? segments
    : segments.filter(s => s.vehicleId === selectedVehicle || s.vehicleId === 'COMMUTE');

  return (
    <div style={{
      width: '380px', flexShrink: 0, height: '100%',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.3px' }}>
          Dispatch Control
        </h2>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button
            className="btn-primary"
            onClick={onOptimize}
            disabled={loading}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 0', fontSize: '13px' }}
          >
            {loading ? <RefreshCcw size={14} className="spin" /> : <Play size={14} />}
            Run Full Day
          </button>

          <button
            onClick={onOpenMidDay}
            disabled={loading}
            style={{
              flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              padding: '10px 0', borderRadius: '999px',
              border: '1.5px solid rgba(0,0,0,0.12)',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '13px', fontWeight: 500, color: '#1d1d1f', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <CalendarClock size={14} color="#007aff" />
            Mid-Day Sync
          </button>
        </div>

        {/* Stats card */}
        <div style={{
          background: '#f5f5f7', borderRadius: '12px', padding: '14px 16px',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
            Financial Summary
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#1d1d1f' }}>Net Profit</span>
            <span style={{
              fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px',
              color: profit > 0 ? '#34c759' : profit < 0 ? '#ff3b30' : '#1d1d1f',
            }}>
              {profit.toFixed(0)} ₴
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868b', marginBottom: '5px' }}>
            <span>Orders completed</span>
            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{data?.completedOrders ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#86868b' }}>
            <span>Total distance</span>
            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{(data?.totalDistanceKm ?? 0).toFixed(1)} km</span>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Timeline header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#86868b' }}>
            Timeline
          </span>
          {segments.length > 0 && (
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              style={{
                padding: '3px 8px', borderRadius: '7px',
                border: '1px solid rgba(0,0,0,0.12)',
                background: '#fff', fontSize: '11px', fontFamily: 'inherit',
                outline: 'none', cursor: 'pointer', color: '#1d1d1f',
              }}
            >
              {vehicleIds.map(v => <option key={v} value={v}>{v === 'All' ? 'All Vehicles' : v}</option>)}
            </select>
          )}
        </div>

        {/* Empty state */}
        {segments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: '#86868b', marginTop: '40px' }}>
            <Activity size={28} style={{ opacity: 0.18, display: 'block', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', fontWeight: 500 }}>No routes generated yet.</p>
            <p style={{ fontSize: '12px', marginTop: '3px', opacity: 0.7 }}>Click "Run Full Day" to start.</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', color: '#86868b', marginTop: '40px' }}>
            <RefreshCcw size={24} className="spin" style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontSize: '13px' }}>Optimizing routes…</p>
          </div>
        )}

        {/* Segment cards */}
        {!loading && filtered.map((seg, idx) => <SegmentCard key={idx} seg={seg} />)}
      </div>
    </div>
  );
}
