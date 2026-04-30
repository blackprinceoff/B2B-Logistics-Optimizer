import React, { useState } from 'react';
import { X, Clock, Truck, AlertTriangle, RefreshCcw, Play } from 'lucide-react';

const TIME_OPTIONS = [
  { label: '10:00 — Morning check', value: '2025-06-20T10:00:00' },
  { label: '12:00 — Midday',        value: '2025-06-20T12:00:00' },
  { label: '14:00 — Afternoon',     value: '2025-06-20T14:00:00' },
  { label: '16:00 — Late shift',    value: '2025-06-20T16:00:00' },
];

export default function MidDayModal({ onClose, onResult }) {
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[1].value);
  const [snapshot, setSnapshot] = useState(null);
  const [breakdownVehicle, setBreakdownVehicle] = useState('none');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('pick'); // 'pick' | 'review' | 'done'

  const handleFetchSnapshot = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/snapshot?time=${selectedTime}`);
      if (!res.ok) throw new Error('Backend error');
      const data = await res.json();
      setSnapshot(data);
      setStep('review');
    } catch (err) {
      alert('Failed to fetch snapshot: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReoptimize = async () => {
    if (!snapshot) return;
    setLoading(true);
    try {
      // Inject breakdown: remove broken vehicle from driver states
      const filteredDriverStates = breakdownVehicle === 'none'
        ? snapshot.driverStates
        : snapshot.driverStates.filter(d => d.vehicleId !== breakdownVehicle);

      const payload = {
        currentTime: selectedTime,
        driverStates: filteredDriverStates,
        remainingOrders: snapshot.remainingOrders,
      };

      const res = await fetch('/api/reoptimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Re-optimization failed');
      const result = await res.json();
      onResult(result);
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const uniqueVehicles = snapshot?.driverStates?.map(d => d.vehicleId) || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px' }}>Mid-Day Re-Optimization</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Simulate a disruption and re-route the afternoon fleet
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {step === 'pick' && (
          <>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
              <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Select Re-optimization Time
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
              {TIME_OPTIONS.map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '12px', cursor: 'pointer',
                  border: `2px solid ${selectedTime === opt.value ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                  background: selectedTime === opt.value ? 'rgba(0,122,255,0.05)' : 'var(--bg-primary)',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="time" value={opt.value} checked={selectedTime === opt.value}
                    onChange={() => setSelectedTime(opt.value)} style={{ accentColor: 'var(--accent-blue)' }} />
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{opt.label}</span>
                </label>
              ))}
            </div>

            <button className="btn-primary" onClick={handleFetchSnapshot} disabled={loading}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              {loading ? <RefreshCcw size={16} className="spin" /> : <Truck size={16} />}
              {loading ? 'Loading fleet state...' : 'Fetch Fleet State'}
            </button>
          </>
        )}

        {step === 'review' && snapshot && (
          <>
            {/* Snapshot summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Active Drivers</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>{snapshot.driverStates?.length ?? 0}</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Orders Remaining</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>{snapshot.remainingOrders?.length ?? 0}</div>
              </div>
            </div>

            {/* Breakdown simulator */}
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              <AlertTriangle size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--warning)' }} />
              Simulate Vehicle Breakdown (optional)
            </label>
            <select value={breakdownVehicle} onChange={e => setBreakdownVehicle(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px', marginBottom: '24px',
                border: `1px solid ${breakdownVehicle !== 'none' ? 'var(--danger)' : 'var(--border-color)'}`,
                background: breakdownVehicle !== 'none' ? 'rgba(255,59,48,0.05)' : 'var(--bg-primary)',
                fontSize: '14px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <option value="none">No breakdown — everything is fine</option>
              {uniqueVehicles.map(v => <option key={v} value={v}>🚨 {v} — engine failure</option>)}
            </select>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep('pick')} style={{
                flex: '0 0 auto', padding: '12px 20px', borderRadius: '980px', border: '1px solid var(--border-color)',
                background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
              }}>← Back</button>
              <button className="btn-primary" onClick={handleReoptimize} disabled={loading}
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                {loading ? <RefreshCcw size={16} className="spin" /> : <Play size={16} />}
                {loading ? 'Re-optimizing...' : 'Execute Re-Optimization'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
