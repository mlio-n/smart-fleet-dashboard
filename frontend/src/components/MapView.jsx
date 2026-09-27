import { useEffect, useMemo } from 'react';
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

// Dynamic Delivery Vehicle Marker with pulsating radar ring
const VEHICLE_ICON = L.divIcon({
  className: '',
  html: `<div style="
    position: relative;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 107, 0, 0.4);
      animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    "></span>
    <div style="
      position: relative;
      background: #000000;
      color: #ff6b00;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="4" width="15" height="12" rx="2" />
        <path d="M16 8h4.5l2.5 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    </div>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
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

// Smoothly zooms into courier's current location on navigation start or upon stop delivery
function CourierNavigationFocus({ isNavigating, courierPosition }) {
  const map = useMap();
  useEffect(() => {
    if (isNavigating && courierPosition) {
      map.flyTo(courierPosition, 16, { duration: 1.1 });
    }
  }, [isNavigating, courierPosition, map]);
  return null;
}

// Automatically recalculates map dimensions during smooth sidebar slide animations
function AutoResizeMap({ isNavigating }) {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isNavigating, map]);
  return null;
}

export default function MapView({
  orders,
  selectedOrder,
  routes,
  isNavigating = false,
  currentStopIndex = 0,
  deliveryStops = [],
}) {
  const ordersWithCoords = orders.filter((o) => o.latitude != null && o.longitude != null);

  // Active courier location in Navigation mode (starts at depot, moves to last delivered stop)
  const courierPosition = useMemo(() => {
    if (!isNavigating) return null;
    if (currentStopIndex === 0 || !deliveryStops || deliveryStops.length === 0) {
      return MAP_CENTER;
    }
    const prev = deliveryStops[currentStopIndex - 1];
    if (prev && prev.lat != null && prev.lon != null) {
      return [prev.lat, prev.lon];
    }
    return MAP_CENTER;
  }, [isNavigating, currentStopIndex, deliveryStops]);

  // Extract turn-by-turn road legs for the primary vehicle route
  const primaryRoute = routes?.routes?.[0];
  const routeLegs = useMemo(() => {
    if (!primaryRoute) return [];
    if (Array.isArray(primaryRoute.legs_geometry) && primaryRoute.legs_geometry.length > 0) {
      return primaryRoute.legs_geometry;
    }
    // Fallback: build straight segments between consecutive stops
    const validStops = (primaryRoute.stops || []).filter((s) => s.lat != null && s.lon != null);
    const result = [];
    for (let i = 0; i < validStops.length - 1; i++) {
      result.push([
        [validStops[i].lat, validStops[i].lon],
        [validStops[i + 1].lat, validStops[i + 1].lon],
      ]);
    }
    return result;
  }, [primaryRoute]);

  // Fallback whole-route polylines for standard overview mode
  const overviewRouteLines = (routes?.routes || []).map((route, idx) => {
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
      <CourierNavigationFocus isNavigating={isNavigating} courierPosition={courierPosition} />
      <AutoResizeMap isNavigating={isNavigating} />

      {/* Main Depot / Distribution Centre Marker */}
      <Marker position={MAP_CENTER} icon={DEPOT_ICON}>
        <Popup>
          <div className="text-sm p-1">
            <div className="flex items-center gap-1.5 font-black text-black">
              Merkez Dağıtım Deposu (Ana Üs)
            </div>
            <p className="text-xs text-zinc-600 mt-1">Denizli Lojistik Merkezi</p>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono">37.7765° N, 29.0864° E</p>
          </div>
        </Popup>
      </Marker>

      {/* Live Courier Vehicle Marker in Navigation Mode */}
      {isNavigating && courierPosition && (
        <Marker position={courierPosition} icon={VEHICLE_ICON} zIndexOffset={2000}>
          <Popup>
            <div className="text-xs font-black text-black p-1 text-center">
              🚚 Dağıtım Aracı (Mevcut Konum)
            </div>
          </Popup>
        </Marker>
      )}

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
                  <span className="font-bold text-zinc-900">{order.customer_name}</span>
                  <span className="text-xs font-semibold text-zinc-400">#{order.id}</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{order.raw_address}</p>
                <div className="mt-2 pt-1.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-800">{order.status.replace('_', ' ')}</span>
                  <span className="text-zinc-500 font-medium">{order.weight} kg</span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* ── Polylines Rendering ───────────────────────────────────── */}
      {isNavigating ? (
        /* Navigation Mode: Leg-by-leg dynamic styling */
        routeLegs.map((legPositions, legIdx) => {
          let color = '#15803d'; // Upcoming route: dark green
          let opacity = 0.5;
          let weight = 4.5;
          let dashArray = null;

          if (legIdx < currentStopIndex) {
            // Past leg: sönük yeşil (faded muted green with dash)
            color = '#86efac';
            opacity = 0.35;
            weight = 3.5;
            dashArray = '6, 6';
          } else if (legIdx === currentStopIndex) {
            // Active leg (arabanın olduğu yerden gideceği yer): standout vibrant amber/orange
            color = '#ff6b00';
            opacity = 1.0;
            weight = 7;
          }

          return (
            <Polyline
              key={`nav-leg-${legIdx}`}
              positions={legPositions}
              pathOptions={{
                color,
                weight,
                opacity,
                dashArray,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          );
        })
      ) : (
        /* Overview Mode: Full unified polylines */
        overviewRouteLines.map((line, idx) => (
          <Polyline
            key={`overview-route-${idx}`}
            positions={line.positions}
            pathOptions={{
              color: line.color,
              weight: 5,
              opacity: 0.85,
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
        ))
      )}
    </MapContainer>
  );
}
