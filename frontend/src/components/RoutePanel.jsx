import { useState, useEffect } from 'react';
import { generateRoutes } from '../api';

export default function RoutePanel({ routes, onRoutesGenerated, onStartJourney, onOpenPreview, scale = 1 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!routes) {
      setResult(null);
    }
  }, [routes]);

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
    <div className="sticky bottom-0 bg-slate-50/95 backdrop-blur-md border-t border-slate-200/80 rounded-b-3xl p-4 shadow-xs z-10">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl shadow-sm transition active:scale-98 text-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <span>Rotalar Hesaplanıyor...</span>
        ) : (
          <span>Rotaları Hesapla</span>
        )}
      </button>

      {error && (
        <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 p-3.5 rounded-xl bg-white border border-emerald-200/80 text-slate-800 shadow-xs">
          <div className="flex items-center justify-between font-semibold text-slate-900 text-xs">
            <span>Dağıtım Rotası Hazır</span>
            <span className="text-emerald-700 font-bold">{(result.total_distance_m / 1000).toFixed(1)} km</span>
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Ortalama Sürüş Süresi:</span>
            <span className="font-semibold text-slate-700">~{estimatedMins} dakika</span>
          </div>

          {result.unassigned_orders.length > 0 && (
            <p className="text-rose-600 font-medium text-xs mt-1.5">
              {result.unassigned_orders.length} sipariş atanamadı (uzak/geçersiz konum).
            </p>
          )}

          <button
            onClick={() => {
              if (onOpenPreview) {
                onOpenPreview();
              } else {
                onStartJourney?.(result);
              }
            }}
            className="w-full mt-2.5 rounded-xl bg-slate-900 hover:bg-black text-emerald-400 font-medium py-2.5 text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            Yolculuk Kartını Aç
          </button>
        </div>
      )}
    </div>
  );
}
