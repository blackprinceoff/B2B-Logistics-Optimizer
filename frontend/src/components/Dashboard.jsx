import React, { useState, useEffect } from 'react';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';
import MidDayModal from './MidDayModal';
import { useToast } from './Toast';

export default function Dashboard({ sharedSchedule, setSharedSchedule }) {
  const scheduleData = sharedSchedule;
  const [loading, setLoading]                 = useState(false);
  const [locationMap, setLocationMap]         = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState('All');
  const [showMidDayModal, setShowMidDayModal] = useState(false);
  const [activeRouteId, setActiveRouteId]     = useState(null);
  const addToast = useToast();

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
      .catch(err => {
        console.error('Failed to load locations:', err);
        addToast('Failed to load locations from server', 'error');
      });
  }, []);

  const handleRunOptimization = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/optimize');
      if (!res.ok) throw new Error('Backend error ' + res.status);
      const data = await res.json();
      setSharedSchedule(data);
      setSelectedVehicle('All');
      setActiveRouteId(null);
      addToast(`Optimization complete — ${data.completedOrders} orders, ${data.totalProfit.toFixed(0)} ₴ profit`, 'success');
    } catch (err) {
      console.error('Full-day optimization failed:', err);
      addToast('Optimization failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMidDayResult = (data) => {
    setSharedSchedule(data);
    setSelectedVehicle('All');
    setActiveRouteId(null);
    addToast(`Re-optimization complete — ${data.completedOrders} orders rescheduled`, 'success');
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar
        data={scheduleData}
        loading={loading}
        locationMap={locationMap}
        onOptimize={handleRunOptimization}
        onOpenMidDay={() => setShowMidDayModal(true)}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
        activeRouteId={activeRouteId}
        setActiveRouteId={setActiveRouteId}
      />
      <div className="dashboard-map" style={{ flexGrow: 1, position: 'relative' }}>
        {/* locationMap passed as prop — no duplicate API call */}
        <MapComponent 
          scheduleData={scheduleData} 
          selectedVehicle={selectedVehicle}
          activeRouteId={activeRouteId}
          locationMap={locationMap}
        />
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
