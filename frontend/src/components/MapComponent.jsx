import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const dotIcon = new L.DivIcon({
  className: 'custom-dot-icon',
  html: '<div style="width:12px;height:12px;background:var(--bg-secondary, #fff);border:3px solid var(--text-primary, #1d1d1f);border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const ROUTE_COLORS = [
  '#2563EB', '#16A34A', '#DC2626', '#D97706', 
  '#7C3AED', '#0891B2', '#DB2777', '#65A30D'
];

/**
 * Fetches real road geometry from OSRM for a single segment.
 * Falls back to a straight line if the request fails or is rate-limited.
 */
async function fetchRoadGeometry(startLoc, endLoc, fallbackCoords) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLoc.lng},${startLoc.lat};${endLoc.lng},${endLoc.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return fallbackCoords;
    const json = await res.json();
    if (json.routes?.length > 0) {
      return json.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }
  } catch (_) { /* fall through */ }
  return fallbackCoords;
}

/* ── Map Legend overlay ── */
function MapLegend({ segments }) {
  // Collect unique vehicles (not COMMUTE) with their colors
  const vehicles = useMemo(() => {
    if (!segments?.length) return [];
    const seen = new Map();
    segments.forEach((seg, idx) => {
      if (seg.vehicleId === 'COMMUTE') return;
      if (!seen.has(seg.vehicleId)) {
        seen.set(seg.vehicleId, ROUTE_COLORS[idx % ROUTE_COLORS.length]);
      }
    });
    return Array.from(seen.entries()).map(([id, color]) => ({ id, color }));
  }, [segments]);

  if (vehicles.length === 0) return null;

  return (
    <div className="map-legend">
      <div className="map-legend-title">Route Legend</div>
      {vehicles.map(v => (
        <div key={v.id} className="map-legend-item">
          <div className="map-legend-dot" style={{ background: v.color }} />
          {v.id}
        </div>
      ))}
    </div>
  );
}

export default function MapComponent({ scheduleData, selectedVehicle, activeRouteId, locationMap }) {
  // locationMap now comes from props (Dashboard), no duplicate API call
  const [routes, setRoutes] = useState([]);
  const polylineRefs = useRef({});

  // Draw routes whenever schedule or filter changes
  useEffect(() => {
    if (!scheduleData?.schedule || Object.keys(locationMap).length === 0) return;

    // Attach originalIndex to match Sidebar logic
    const segmentsWithIndex = scheduleData.schedule.map((seg, idx) => ({ ...seg, originalIndex: idx }));

    const filtered = selectedVehicle === 'All'
      ? segmentsWithIndex
      : segmentsWithIndex.filter(s => s.vehicleId === selectedVehicle);

    const drawRoutes = async () => {
      setRoutes([]);
      polylineRefs.current = {}; // Reset refs on redraw

      for (const seg of filtered) {
        const start = locationMap[seg.startLocationId];
        const end   = locationMap[seg.endLocationId];

        if (!start || !end) continue;

        // Static locations (WAITING/BREAKDOWN): no line needed, just a marker
        if (seg.type === 'BREAKDOWN') {
          setRoutes(prev => [...prev, { ...seg, _isBreakdown: true, _pos: [start.lat, start.lng] }]);
          continue;
        }

        // Same start/end = waiting segment — skip drawing
        if (start.lat === end.lat && start.lng === end.lng) continue;

        const straightLine = [[start.lat, start.lng], [end.lat, end.lng]];
        const coords = await fetchRoadGeometry(start, end, straightLine);
        setRoutes(prev => [...prev, { ...seg, coords }]);
      }
    };

    drawRoutes();
  }, [scheduleData, selectedVehicle, locationMap]);

  // Handle activeRouteId changes directly via Leaflet refs
  useEffect(() => {
    Object.keys(polylineRefs.current).forEach(key => {
      const idx = parseInt(key, 10);
      const polyline = polylineRefs.current[idx];
      if (polyline) {
        // Apply smooth transition if not already applied
        if (polyline._path && !polyline._path.style.transition) {
          polyline._path.style.transition = 'opacity 150ms ease';
        }

        if (activeRouteId === null) {
          polyline.setStyle({ opacity: 0.75, weight: 4 });
        } else if (activeRouteId === idx) {
          polyline.setStyle({ opacity: 1.0, weight: 5 });
          polyline.bringToFront();
        } else {
          polyline.setStyle({ opacity: 0.08, weight: 3 });
        }
      }
    });
  }, [activeRouteId, routes]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
      <MapContainer
        center={[49.833, 24.013]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        />

        {/* Location markers — sourced from backend via props */}
        {Object.values(locationMap).map((loc, idx) => (
          <Marker key={idx} position={[loc.lat, loc.lng]} icon={dotIcon}>
            <Popup>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{loc.name}</span>
            </Popup>
          </Marker>
        ))}

        {/* Route polylines + breakdown markers */}
        {routes.map((r, idx) => {
          if (r._isBreakdown) {
            return (
              <Marker key={idx} position={r._pos}>
                <Popup><b style={{ color: 'var(--danger)' }}>BREAKDOWN!</b><br />{r.vehicleId}</Popup>
              </Marker>
            );
          }
          
          const routeColor = ROUTE_COLORS[r.originalIndex % ROUTE_COLORS.length];
          const isActive = activeRouteId === r.originalIndex;
          const initialOpacity = activeRouteId === null ? 0.75 : (isActive ? 1.0 : 0.08);
          const initialWeight = activeRouteId === null ? 4 : (isActive ? 5 : 3);

          return (
            <Polyline 
              key={r.originalIndex}
              ref={(ref) => {
                if (ref) polylineRefs.current[r.originalIndex] = ref;
              }}
              positions={r.coords} 
              pathOptions={{ color: routeColor, weight: initialWeight, opacity: initialOpacity }}
            >
              <Popup>
                <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  <b style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-secondary)' }}>{r.type}</b>
                  <div style={{ fontWeight: 600 }}>{r.vehicleId}</div>
                  <div style={{ color: r.profitOrCost >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {r.profitOrCost > 0 ? '+' : ''}{r.profitOrCost?.toFixed(2)} ₴
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>

      {/* Legend overlay */}
      <MapLegend segments={scheduleData?.schedule} />
    </div>
  );
}
