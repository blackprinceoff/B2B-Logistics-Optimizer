import React from 'react';
import { Play, RefreshCcw, Activity, MapPin } from 'lucide-react';

const locations = {
  "1": "Гараж (Городоцька)", "2": "Залізничний вокзал", "3": "Оперний театр",
  "4": "Аеропорт", "5": "Сихів (Шувар)", "6": "King Cross",
  "7": "Політехніка", "8": "IT Park", "9": "Forum Lviv",
  "10": "Високий Замок", "11": "Епіцентр (Кільцева)", "12": "Винники (Госпіталь)"
};

export default function Sidebar({ data, loading, onOptimize, onMidDayOptimize }) {
  
  const segments = data?.segments || [];
  const profit = data?.totalProfit || 0;
  
  return (
    <div style={{
      width: '420px',
      height: '100%',
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(30px)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
    }}>
      
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Dispatch Control</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button className="btn-primary" onClick={onOptimize} disabled={loading} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {loading ? <RefreshCcw className="animate-spin" size={16} /> : <Play size={16} />}
            Run Full Day
          </button>
          <button className="btn-primary" onClick={onMidDayOptimize} disabled={loading} style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
            Mid-Day Sync
          </button>
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px' }}>Net Profit</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: profit >= 0 ? 'var(--success)' : 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {profit.toFixed(2)} ₴
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Completed Orders</span>
            <span style={{ fontWeight: 600 }}>{data?.completedOrders || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Distance</span>
            <span style={{ fontWeight: 600 }}>{data?.totalDistance?.toFixed(1) || 0} km</span>
          </div>
        </div>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timeline</h3>
        
        {segments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <Activity size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
            <p>No routes generated yet.</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Click "Run Full Day" to start.</p>
          </div>
        )}

        {segments.map((seg, idx) => {
          let isCommute = seg.type === 'TRANSFER' && (seg.profitOrCost > -20 || -100 > seg.profitOrCost);
          let displayType = isCommute ? 'COMMUTE' : seg.type;
          
          let timeStart = seg.startTime.split('T')[1]?.substr(0,5);
          let timeEnd = seg.endTime.split('T')[1]?.substr(0,5);
          let locStart = locations[seg.startLocationId] || "Depot";
          let locEnd = locations[seg.endLocationId] || "Depot";

          return (
            <div key={idx} style={{
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--border-color)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              {/* Colored left bar indicator */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                backgroundColor: displayType === 'ORDER' ? 'var(--success)' : 
                                 displayType === 'WAITING' ? 'var(--warning)' : 
                                 displayType === 'BREAKDOWN' ? 'var(--danger)' : 
                                 displayType === 'COMMUTE' ? 'var(--neutral)' : 'var(--accent-blue)'
              }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingLeft: '8px' }}>
                <span className={`badge ${displayType}`}>{displayType}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{seg.vehicleId}</span>
              </div>
              
              <div style={{ paddingLeft: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                  <MapPin size={16} color="var(--neutral)" style={{ marginTop: '2px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    <div>{locStart}</div>
                    <div style={{ color: 'var(--text-secondary)', margin: '4px 0' }}>↓</div>
                    <div>{locEnd}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {timeStart} - {timeEnd} • {seg.distanceKm.toFixed(1)} km
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: seg.profitOrCost > 0 ? 'var(--success)' : seg.profitOrCost < 0 ? 'var(--danger)' : 'var(--text-secondary)'
                  }}>
                    {seg.profitOrCost > 0 ? '+' : ''}{seg.profitOrCost.toFixed(2)} ₴
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
