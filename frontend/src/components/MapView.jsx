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
  ROUTED: '#22c55e',
  DELIVERED: '#6b7280',
};

const ROUTE_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function FlyToSelected({ selected }) {
  const map = useMap();
  useEffect(() => {
    if (selected?.latitude != null && selected?.longitude != null) {
      map.flyTo([selected.latitude, selected.longitude], 15, { duration: 0.8 });
    }
  }, [selected, map]);
  return null;
}

export default function MapView({ orders, selectedOrder, routes }) {
  const ordersWithCoords = orders.filter((o) => o.latitude != null && o.longitude != null);

  // Build route polylines from route data
  const routeLines = (routes?.routes || []).map((route, idx) => {
    const positions = route.stops
      .filter((s) => s.lat != null && s.lon != null)
      .map((s) => [s.lat, s.lon]);
    return { positions, color: ROUTE_COLORS[idx % ROUTE_COLORS.length] };
  });

  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSelected selected={selectedOrder} />

      {ordersWithCoords.map((order) => (
        <Marker
          key={order.id}
          position={[order.latitude, order.longitude]}
          icon={createColoredIcon(STATUS_COLORS[order.status] || '#6b7280')}
        >
          <Popup>
            <div className="text-sm min-w-[160px]">
              <p className="font-bold">{order.customer_name}</p>
              <p className="text-xs text-gray-500 mt-1">{order.raw_address}</p>
              <p className="text-xs mt-1">
                <span className="font-medium">{order.status.replace('_', ' ')}</span>
                {order.weight && <> · {order.weight} kg</>}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {routeLines.map((line, idx) => (
        <Polyline
          key={idx}
          positions={line.positions}
          pathOptions={{ color: line.color, weight: 3, opacity: 0.8 }}
        />
      ))}
    </MapContainer>
  );
}
