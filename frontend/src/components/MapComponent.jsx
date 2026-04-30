import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const locations = {
  "1": { lat: 49.8327, lng: 23.9992, name: "Гараж (Городоцька)" },
  "2": { lat: 49.8406, lng: 24.0297, name: "Залізничний вокзал" },
  "3": { lat: 49.8440, lng: 24.0262, name: "Оперний театр" },
  "4": { lat: 49.8125, lng: 23.9561, name: "Аеропорт" },
  "5": { lat: 49.7958, lng: 24.0538, name: "Сихів (Шувар)" },
  "6": { lat: 49.7738, lng: 23.9785, name: "King Cross" },
  "7": { lat: 49.8351, lng: 24.0145, name: "Політехніка" },
  "8": { lat: 49.8252, lng: 24.0378, name: "IT Park" },
  "9": { lat: 49.8499, lng: 24.0224, name: "Forum Lviv" },
  "10": { lat: 49.8484, lng: 24.0393, name: "Високий Замок" },
  "11": { lat: 49.8600, lng: 23.9000, name: "Епіцентр (Кільцева)" },
  "12": { lat: 49.8150, lng: 24.1300, name: "Винники (Госпіталь)" }
};

// Custom minimal marker for locations
const dotIcon = new L.DivIcon({
  className: 'custom-dot-icon',
  html: '<div style="width: 12px; height: 12px; background: #fff; border: 3px solid #1d1d1f; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export default function MapComponent({ scheduleData, selectedVehicle }) {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    if (!scheduleData?.schedule) return;

    const fetchGeometries = async () => {
      const filteredSchedule = selectedVehicle === 'All' 
        ? scheduleData.schedule 
        : scheduleData.schedule.filter(s => s.vehicleId === selectedVehicle);

      // 1. Instantly draw straight lines for all routes
      const initialRoutes = filteredSchedule.map(seg => {
        const start = locations[seg.startLocationId];
        const end = locations[seg.endLocationId];
        if (!start || !end) return null;
        if (start === end && seg.type === 'BREAKDOWN') return { type: 'BREAKDOWN', start, vehicleId: seg.vehicleId };
        return { ...seg, coords: [[start.lat, start.lng], [end.lat, end.lng]] };
      }).filter(Boolean);

      // We don't set initial straight lines to avoid the "spiderweb" effect.
      // Instead, we will animate them appearing one by one.
      setRoutes([]);

      // 2. Fetch actual road geometries sequentially and update incrementally
      for (let i = 0; i < initialRoutes.length; i++) {
        const route = initialRoutes[i];
        
        if (route.type === 'BREAKDOWN') {
          setRoutes(prev => [...prev, route]);
          continue;
        }
        
        const start = locations[route.startLocationId];
        const end = locations[route.endLocationId];
        
        if (start.lat === end.lat && start.lng === end.lng) continue;

        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          if (!res.ok) {
            // On rate limit, just add the straight line
            setRoutes(prev => [...prev, route]);
            continue;
          }
          const json = await res.json();
          if (json.routes && json.routes.length > 0) {
            const coords = json.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRoutes(prev => [...prev, { ...route, coords }]);
          } else {
            setRoutes(prev => [...prev, route]);
          }
        } catch (e) {
          // keep straight line if fetch fails
          setRoutes(prev => [...prev, route]);
        }
      }
    };

    fetchGeometries();
  }, [scheduleData, selectedVehicle]);

  const getPathOptions = (seg) => {
    if (seg.type === 'ORDER') return { color: '#34c759', weight: 4, opacity: 0.8 };
    if (seg.type === 'TRANSFER' && seg.profitOrCost < -100) return { color: '#8e8e93', weight: 3, dashArray: '5, 8', opacity: 0.6 }; // Commute
    if (seg.type === 'TRANSFER') return { color: '#007aff', weight: 3, dashArray: '8, 8', opacity: 0.7 };
    return { color: '#8e8e93', weight: 2 };
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
      <MapContainer 
        center={[49.825, 24.02]} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#e5e5ea' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        />

        {Object.values(locations).map((loc, idx) => (
          <Marker key={idx} position={[loc.lat, loc.lng]} icon={dotIcon}>
            <Popup>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{loc.name}</span>
            </Popup>
          </Marker>
        ))}

        {routes.map((r, idx) => {
          if (r.type === 'BREAKDOWN') {
            return (
              <Marker key={idx} position={[r.start.lat, r.start.lng]}>
                <Popup><b style={{ color: 'var(--danger)' }}>BREAKDOWN!</b><br/>{r.vehicleId}</Popup>
              </Marker>
            );
          }
          return (
            <Polyline key={idx} positions={r.coords} pathOptions={getPathOptions(r)}>
              <Popup>
                <div style={{ fontSize: '13px' }}>
                  <b style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-secondary)' }}>{r.type}</b>
                  <div style={{ marginTop: '4px', fontWeight: 600 }}>{r.vehicleId}</div>
                  <div style={{ color: r.profitOrCost >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {r.profitOrCost > 0 ? '+' : ''}{r.profitOrCost.toFixed(2)} ₴
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
}
