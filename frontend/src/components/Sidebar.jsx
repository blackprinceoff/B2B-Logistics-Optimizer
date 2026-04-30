import React from 'react';
import { Play, RefreshCcw, Activity, MapPin, CalendarClock } from 'lucide-react';

const LOCATIONS = {
  "1": "Гараж (Городоцька)", "2": "Залізничний вокзал", "3": "Оперний театр",
  "4": "Аеропорт", "5": "Сихів (Шувар)", "6": "King Cross",
  "7": "Політехніка", "8": "IT Park", "9": "Forum Lviv",
  "10": "Високий Замок", "11": "Епіцентр (Кільцева)", "12": "Винники (Госпіталь)"
};

const TYPE_COLOR = {
  ORDER: 'var(--success)', TRANSFER: 'var(--accent-blue)',
  WAITING: 'var(--warning)', BREAKDOWN: 'var(--danger)', COMMUTE: 'var(--neutral)',
};

function SegmentCard({ seg }) {
  const isCommute = seg.vehicleId === 'COMMUTE' || (seg.type === 'TRANSFER' && seg.profitOrCost < -50);
  const displayType = isCommute ? 'COMMUTE' : seg.type;
  const color = TYPE_COLOR[displayType] || 'var(--neutral)';

  const timeStart = seg.startTime?.split('T')[1]?.substr(0, 5) ?? '--:--';
  const timeEnd   = seg.endTime?.split('T')[1]?.substr(0, 5) ?? '--:--';
  const locStart  = LOCATIONS[seg.startLocationId] ?? 'Depot';
  const locEnd    = LOCATIONS[seg.endLocationId] ?? 'Depot';

  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px 14px 14px 18px',
      border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: color, borderRadius: '4px 0 0 4px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span className={`badge ${displayType}`}>{displayType}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{seg.vehicleId}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
        <MapPin size={14} color="var(--neutral)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>
          {locStart} <span style={{ color: 'var(--text-secondary)' }}>→</span> {locEnd}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{timeStart}–{timeEnd} · {seg.distanceKm?.toFixed(1) ?? 0} km</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: seg.profitOrCost > 0 ? 'var(--success)' : seg.profitOrCost < 0 ? 'var(--danger)' : 'var(--neutral)' }}>
          {seg.profitOrCost > 0 ? '+' : ''}{seg.profitOrCost?.toFixed(2) ?? '0.00'} ₴
        </span>
      </div>
    </div>
  );
}

export default function Sidebar({ data, loading, onOptimize, onOpenMidDay, selectedVehicle, setSelectedVehicle }) {
  const segments = data?.schedule ?? [];
  const profit = data?.totalProfit ?? 0;

  const vehicleIds = ['All', ...new Set(segments.filter(s => s.vehicleId !== 'COMMUTE').map(s => s.vehicleId))].sort();
  const filtered = selectedVehicle === 'All' ? segments : segments.filter(s => s.vehicleId === selectedVehicle || s.vehicleId === 'COMMUTE');

  return (
    <div style={{
      width: '400px', flexShrink: 0, height: '100%',
      background: 'var(--glass-bg)', backdropFilter: 'blur(24px)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Control header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>Dispatch Control</h2>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button className="btn-primary" onClick={onOptimize} disabled={loading}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '7px', padding: '11px 0' }}>
            {loading ? <RefreshCcw size={15} className="spin" /> : <Play size={15} />}
            Run Full Day
          </button>
          <button onClick={onOpenMidDay} disabled={loading} style={{
            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '7px',
            padding: '11px 0', borderRadius: '980px', border: '1px solid var(--border-color)',
            background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
            fontWeight: 500, color: 'var(--text-primary)', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <CalendarClock size={15} color="var(--accent-blue)" />
            Mid-Day Sync
          </button>
        </div>

        {/* Stats card */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Financial Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px' }}>Net Profit</span>
            <span style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {profit.toFixed(0)} ₴
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Orders completed</span>
            <b>{data?.completedOrders ?? 0}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total distance</span>
            <b>{data?.totalDistanceKm?.toFixed(1) ?? 0} km</b>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Timeline</span>
          {segments.length > 0 && (
            <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} style={{
              padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', fontSize: '12px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {vehicleIds.map(v => <option key={v} value={v}>{v === 'All' ? 'All Vehicles' : v}</option>)}
            </select>
          )}
        </div>

        {segments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '48px' }}>
            <Activity size={30} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px' }}>No routes generated yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Run Full Day" to start.</p>
          </div>
        )}

        {filtered.map((seg, idx) => <SegmentCard key={idx} seg={seg} />)}
      </div>
    </div>
  );
}
