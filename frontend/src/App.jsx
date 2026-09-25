import { useState, useEffect } from 'react';
import axios from 'axios';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------------------
// Leaflet icon fix for Vite
// ---------------------------------------------------------------------------
// React-Leaflet + Vite breaks the default marker icon URLs because Vite
// rewrites asset paths.  The standard fix is to delete the broken prototype
// method and re-point the icons to the correct paths inside node_modules.

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:8000';

// Denizli, Turkey – depot / default map centre
const MAP_CENTER = [37.7765, 29.0864];
const MAP_ZOOM = 13;

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/orders/anomalies/`)
      .then((res) => {
        setAnomalies(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to fetch anomalies:', err);
        setError('Could not reach the backend API.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* Left Sidebar                                                     */}
      {/* ---------------------------------------------------------------- */}
      <aside className="w-1/3 max-w-[400px] flex-shrink-0 overflow-y-auto bg-gray-50 p-4 border-r border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 mb-1">
          Support Dashboard
        </h1>
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          Anomalies
        </h2>

        {/* Loading state */}
        {loading && (
          <p className="text-sm text-gray-400 italic">Loading orders...</p>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && anomalies.length === 0 && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-sm font-medium text-green-700">
              No anomalies. Fleet is ready.
            </p>
          </div>
        )}

        {/* Anomaly cards */}
        {anomalies.map((order) => (
          <div
            key={order.id}
            className="mb-3 rounded-lg bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">
                Order #{order.id}
              </span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                ANOMALY
              </span>
            </div>

            <p className="text-sm font-semibold text-gray-800 truncate">
              {order.customer_name}
            </p>

            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              {order.raw_address}
            </p>

            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <span>
                Place Rank:{' '}
                <span className="font-medium text-gray-600">
                  {order.place_rank ?? 'N/A'}
                </span>
              </span>
              <span className="text-gray-300">|</span>
              <span>
                Weight:{' '}
                <span className="font-medium text-gray-600">
                  {order.weight} kg
                </span>
              </span>
            </div>
          </div>
        ))}
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Right Map Area                                                   */}
      {/* ---------------------------------------------------------------- */}
      <main className="flex-1">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {anomalies
            .filter((o) => o.latitude != null && o.longitude != null)
            .map((order) => (
              <Marker
                key={order.id}
                position={[order.latitude, order.longitude]}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{order.customer_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {order.raw_address}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </main>
    </div>
  );
}

export default App;
