import React, { useState, useEffect } from 'react';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';

export default function Dashboard() {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRunOptimization = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/optimize');
      if (!response.ok) throw new Error('Failed to fetch schedule');
      const data = await response.json();
      setScheduleData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMidDayReoptimization = async () => {
    setLoading(true);
    setError(null);
    try {
      // Dummy request for mid-day. In reality, you'd pull real vehicle states.
      const request = {
        currentTime: "2025-06-20T14:00:00",
        driverStates: [],
        remainingOrders: []
      };
      
      const response = await fetch('/api/reoptimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) throw new Error('Failed to fetch mid-day schedule');
      const data = await response.json();
      setScheduleData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar 
        data={scheduleData} 
        loading={loading} 
        onOptimize={handleRunOptimization}
        onMidDayOptimize={handleMidDayReoptimization}
      />
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <MapComponent scheduleData={scheduleData} />
      </div>
    </div>
  );
}
