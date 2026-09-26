import { useState } from 'react';
import { generateRoutes } from '../api';

export default function RoutePanel({ onRoutesGenerated }) {
  const [numVehicles, setNumVehicles] = useState(3);
  const [capacity, setCapacity] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateRoutes({
        num_vehicles: numVehicles,
        vehicle_capacity: capacity,
      });
      setResult(data);
      onRoutesGenerated?.(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Route generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-200 p-3 bg-gray-50">
      <h3 className="text-sm font-bold text-gray-700 mb-2">🚚 Route Generation</h3>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <label className="block">
          <span className="text-xs text-gray-500">Vehicles</span>
          <input
            type="number" min={1} value={numVehicles}
            onChange={(e) => setNumVehicles(parseInt(e.target.value) || 1)}
            className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Capacity (kg)</span>
          <input
            type="number" min={1} value={capacity}
            onChange={(e) => setCapacity(parseFloat(e.target.value) || 1)}
            className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <button
        onClick={handleGenerate} disabled={loading}
        className="w-full rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
      >
        {loading ? 'Optimizing...' : 'Generate Routes'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {result && (
        <div className="mt-2 rounded-md bg-green-50 border border-green-200 p-2 text-xs text-green-700">
          <p className="font-medium">✓ {result.num_vehicles_used} vehicle(s) used</p>
          <p>Total distance: {(result.total_distance_m / 1000).toFixed(1)} km</p>
          {result.unassigned_orders.length > 0 && (
            <p className="text-amber-600 mt-1">⚠ {result.unassigned_orders.length} order(s) unassigned</p>
          )}
        </div>
      )}
    </div>
  );
}
