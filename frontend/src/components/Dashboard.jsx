import React, { useState, useEffect } from 'react';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';
import MidDayModal from './MidDayModal';

export default function Dashboard() {
  const [scheduleData, setScheduleData]       = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [locationMap, setLocationMap]         = useState({});  // { id -> { lat, lng, name } }
  const [selectedVehicle, setSelectedVehicle] = useState('All');
  const [showMidDayModal, setShowMidDayModal] = useState(false);

  // Load locations from backend once — single source of truth
  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(list => {
        const map = {};
        list.forEach(loc => {
          map[loc.id] = { lat: loc.latitude, lng: loc.longitude, name: loc.name };
        });
        setLocationMap(map);
      })
      .catch(err => console.error('Failed to load locations:', err));
  }, []);

  const handleRunOptimization = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/optimize');
      if (!res.ok) throw new Error('Backend error ' + res.status);
      const data = await res.json();
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
        locationMap={locationMap}
        onOptimize={handleRunOptimization}
        onOpenMidDay={() => setShowMidDayModal(true)}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
      />
      <div style={{ flexGrow: 1, position: 'relative' }}>
        {/* MapComponent fetches its own locationMap from the same /api/locations */}
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
