import React, { useState, useEffect } from 'react';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';
import MidDayModal from './MidDayModal';

export default function Dashboard() {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('All');
  const [showMidDayModal, setShowMidDayModal] = useState(false);

  const handleRunOptimization = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/optimize');
      if (!response.ok) throw new Error('Backend error ' + response.status);
      const data = await response.json();
      setScheduleData(data);
      setSelectedVehicle('All');
    } catch (err) {
      console.error('Full-day optimization failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMidDayResult = (data) => {
    setScheduleData(data);
    setSelectedVehicle('All');
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar
        data={scheduleData}
        loading={loading}
        onOptimize={handleRunOptimization}
        onOpenMidDay={() => setShowMidDayModal(true)}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
      />
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <MapComponent scheduleData={scheduleData} selectedVehicle={selectedVehicle} />
      </div>

      {showMidDayModal && (
        <MidDayModal
          onClose={() => setShowMidDayModal(false)}
          onResult={handleMidDayResult}
        />
      )}
    </div>
  );
}
