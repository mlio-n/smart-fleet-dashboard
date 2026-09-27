import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const MAP_CENTER = [37.7765, 29.0864];
const MAP_ZOOM = 13;

const STATUS_COLORS = {
  PENDING: '#3b82f6',
  ANOMALY: '#ef4444',
  RESOLVED_MANUALLY: '#f59e0b',
  ROUTED: '#15803d',
  DELIVERED: '#6b7280',
};

const ROUTE_COLORS = ['#15803d', '#18181b', '#047857', '#27272a', '#166534', '#3f3f46'];

// Custom depot icon (Denizlispor Green & Black)
const DEPOT_ICON = L.divIcon({
  className: '',
  html: `<div style="
    background: #000000;
    color: #22c55e;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #16a34a;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  "><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
});

function createColoredIcon(color, isSelected) {
  const size = isSelected ? 20 : 15;
  const borderWidth = isSelected ? 3 : 2;
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: ${borderWidth}px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      ${isSelected ? 'outline: 3px solid #15803d;' : ''}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FlyToSelected({ selected, isNavigating }) {
  const map = useMap();
  useEffect(() => {
    // Only fly to selected when not overriding initial navigation focus
    if (!isNavigating && selected?.latitude != null && selected?.longitude != null) {
      map.flyTo([selected.latitude, selected.longitude], 15, { duration: 0.8 });
    }
  }, [selected, isNavigating, map]);
  return null;
}

function AutoFitRoute({ routes, isNavigating }) {
  const map = useMap();
  useEffect(() => {
    if (!isNavigating && routes?.routes?.length > 0) {
      const allPoints = [];
      routes.routes.forEach((r) => {
        if (r.geometry && r.geometry.length > 0) {
          allPoints.push(...r.geometry);
        } else if (r.stops) {
          r.stops.forEach((s) => {
            if (s.lat != null && s.lon != null) {
              allPoints.push([s.lat, s.lon]);
            }
          });
        }
      });
      if (allPoints.length > 0) {
        map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [routes, isNavigating, map]);
  return null;
}

// Directly zooms into courier's location (Merkez Depo) when navigation starts
function CourierCenterFocus({ isNavigating }) {
  const map = useMap();
  useEffect(() => {
    if (isNavigating) {
      map.flyTo(MAP_CENTER, 16, { duration: 1.0 });
    }
  }, [isNavigating, map]);
  return null;
}

export default function MapView({ orders, selectedOrder, routes, isNavigating }) {
  const ordersWithCoords = orders.filter((o) => o.latitude != null && o.longitude != null);

  // Build real street polylines using OSRM geometry when available
  const routeLines = (routes?.routes || []).map((route, idx) => {
    const hasGeometry = Array.isArray(route.geometry) && route.geometry.length > 1;
    const positions = hasGeometry
      ? route.geometry
      : route.stops
          .filter((s) => s.lat != null && s.lon != null)
          .map((s) => [s.lat, s.lon]);

    return {
      positions,
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
      vehicle: route.vehicle,
      distanceKm: ((route.route_distance_m || 0) / 1000).toFixed(1),
      durationMins: route.duration_minutes || null,
    };
  });

  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSelected selected={selectedOrder} isNavigating={isNavigating} />
      <AutoFitRoute routes={routes} isNavigating={isNavigating} />
      <CourierCenterFocus isNavigating={isNavigating} />

      {/* Main Depot / Distribution Centre Marker (Courier Location) */}
      <Marker position={MAP_CENTER} icon={DEPOT_ICON}>
        <Popup>
          <div className="text-sm p-1">
            <div className="flex items-center gap-1.5 font-black text-black">
              Merkez Dağıtım Deposu (Kurye Konumu)
            </div>
            <p className="text-xs text-gray-600 mt-1">Denizli Dağıtım Merkezi</p>
            <p className="text-[11px] text-gray-400 mt-1 font-mono">37.7765° N, 29.0864° E</p>
          </div>
        </Popup>
      </Marker>

      {/* Customer Order Markers */}
      {ordersWithCoords.map((order) => {
        const isSelected = selectedOrder?.id === order.id;
        return (
          <Marker
            key={order.id}
            position={[order.latitude, order.longitude]}
            icon={createColoredIcon(STATUS_COLORS[order.status] || '#6b7280', isSelected)}
          >
            <Popup>
              <div className="text-sm min-w-[180px] p-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-800">{order.customer_name}</span>
                  <span className="text-xs font-semibold text-gray-400">#{order.id}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{order.raw_address}</p>
                <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">{order.status.replace('_', ' ')}</span>
                  <span className="text-gray-500">{order.weight} kg</span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Real Road Navigation Polylines */}
      {routeLines.map((line, idx) => (
        <Polyline
          key={idx}
          positions={line.positions}
          pathOptions={{
            color: line.color,
            weight: 5,
            opacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      ))}
    </MapContainer>
  );
}
