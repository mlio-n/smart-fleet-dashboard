import { useState } from 'react';
import { generateRoutes } from '../api';

export default function RoutePanel({ onRoutesGenerated, onStartJourney, scale = 1 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const FIXED_VEHICLES = 1;
  const FIXED_CAPACITY = 1000;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateRoutes({
        num_vehicles: FIXED_VEHICLES,
        vehicle_capacity: FIXED_CAPACITY,
      });
      setResult(data);
      onRoutesGenerated?.(data);
      onStartJourney?.(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Rota optimizasyonu başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const buttonSize = Math.round(13 * scale);
  const pad = Math.round(14 * scale);
  const labelSize = Math.round(11 * scale);

  const routeDuration = result?.routes?.[0]?.duration_minutes;
  const estimatedMins = routeDuration
    ? Math.round(routeDuration)
    : Math.round(((result?.total_distance_m || 0) / 1000) * 2.2);

  return (
    <div
      style={{ padding: `${pad}px` }}
      className="sticky bottom-0 glass-panel !border-b-0 !border-x-0 !border-t !rounded-none shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-10"
    >
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          fontSize: `${buttonSize}px`,
          padding: `${Math.round(9 * scale)}px ${Math.round(14 * scale)}px`,
          borderRadius: `${Math.round(8 * scale)}px`,
        }}
        className="w-full bg-green-700 font-extrabold text-white hover:bg-green-800 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-98"
      >
        {loading ? (
          <span>Rotalar Hesaplanıyor...</span>
        ) : (
          <span>Rotaları Hesapla</span>
        )}
      </button>

      {error && (
        <div
          style={{
            marginTop: `${Math.round(8 * scale)}px`,
            padding: `${Math.round(6 * scale)}px`,
            fontSize: `${labelSize}px`,
          }}
          className="rounded-lg bg-red-50/90 border border-red-200 text-red-700 font-medium"
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: `${Math.round(10 * scale)}px`,
            padding: `${Math.round(10 * scale)}px`,
            fontSize: `${labelSize}px`,
          }}
          className="rounded-2xl glass-panel-subtle !border-green-300/80 text-green-950 shadow-xs"
        >
          <div className="flex items-center justify-between font-black text-black">
            <span>Dağıtım Rotası Hazır</span>
            <span className="text-green-800">{(result.total_distance_m / 1000).toFixed(1)} km</span>
          </div>

          <div
            style={{ marginTop: `${Math.round(4 * scale)}px` }}
            className="flex items-center justify-between text-xs text-green-900 font-semibold"
          >
            <span>Ortalama Sürüş Süresi:</span>
            <span className="font-black text-black">~{estimatedMins} dakika</span>
          </div>

          {result.unassigned_orders.length > 0 && (
            <p className="text-red-700 font-bold" style={{ marginTop: `${Math.round(6 * scale)}px` }}>
              {result.unassigned_orders.length} sipariş atanamadı (uzak/geçersiz konum).
            </p>
          )}

          <button
            onClick={() => onStartJourney?.(result)}
            style={{
              marginTop: `${Math.round(8 * scale)}px`,
              padding: `${Math.round(9 * scale)}px`,
              fontSize: `${buttonSize}px`,
            }}
            className="w-full rounded-lg bg-black hover:bg-zinc-900 text-green-400 border border-green-600 font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            Yolculuğa Başla
          </button>
        </div>
      )}
    </div>
  );
}
