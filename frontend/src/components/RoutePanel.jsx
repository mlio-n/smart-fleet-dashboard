import { useState } from 'react';
import { generateRoutes } from '../api';

export default function RoutePanel({ routes, onRoutesGenerated, onStartJourney, onOpenPreview }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      onRoutesGenerated?.(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Rota optimizasyonu başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const hasRoutes = Boolean(routes && (!Array.isArray(routes.routes) || routes.routes.length > 0));

  const routeDuration = routes?.routes?.[0]?.duration_minutes;
  const estimatedMins = routeDuration
    ? Math.round(routeDuration)
    : Math.round(((routes?.total_distance_m || 0) / 1000) * 2.2);

  return (
    <div className="sticky bottom-0 bg-slate-50/95 backdrop-blur-md border-t border-slate-200/80 rounded-b-3xl p-4 shadow-xs z-10">
      {!hasRoutes ? (
        <>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-medium py-3.5 px-6 rounded-2xl shadow-xl shadow-green-900/10 transition active:scale-98 text-sm flex items-center justify-center gap-2 cursor-pointer"
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
        </>
      ) : (
        <div className="rounded-3xl p-5 bg-white/85 glass-card border border-green-200/80 text-slate-800 shadow-xl shadow-green-900/10 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between font-semibold text-slate-900 text-xs">
              <span>Dağıtım Rotası Hazır</span>
              <span className="text-green-700 font-bold">{(routes.total_distance_m / 1000).toFixed(1)} km</span>
            </div>

            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Ortalama Sürüş Süresi:</span>
              <span className="font-semibold text-slate-700">~{estimatedMins} dakika</span>
            </div>

            {routes.unassigned_orders?.length > 0 && (
              <p className="text-rose-600 font-medium text-xs mt-1.5">
                {routes.unassigned_orders.length} sipariş atanamadı (uzak/geçersiz konum).
              </p>
            )}
          </div>

          <button
            onClick={() => {
              if (onOpenPreview) {
                onOpenPreview();
              } else {
                onStartJourney?.(routes);
              }
            }}
            className="w-full rounded-2xl bg-green-700 hover:bg-green-800 text-white font-medium py-3.5 px-6 text-sm transition shadow-lg shadow-green-900/15 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            Yolculuk Kartını Aç
          </button>
        </div>
      )}
    </div>
  );
}
