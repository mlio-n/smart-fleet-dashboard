import { useState } from 'react';
import { generateRoutes } from '../api';

export default function RoutePanel({ onRoutesGenerated, onStartJourney, scale = 1 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Single delivery vehicle with generous default capacity (1000 kg)
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

  const handleExportCSV = () => {
    if (!result || !result.routes) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Arac_No,Durak_Sira,Dugum_Tipi,Siparis_ID,Musteri_Adi,Adres,Enlem,Boylam,Agirlik_KG\n';

    result.routes.forEach((route) => {
      route.stops.forEach((stop, stopIndex) => {
        const isDepot = stop.node === 'DEPOT';
        const row = [
          route.vehicle + 1,
          stopIndex + 1,
          isDepot ? 'DEPOT' : 'MUSTERI',
          isDepot ? '' : (stop.order_id || ''),
          `"${(stop.customer_name || 'Merkez Depo').replace(/"/g, '""')}"`,
          `"${(stop.raw_address || 'Denizli').replace(/"/g, '""')}"`,
          stop.lat ?? '',
          stop.lon ?? '',
          stop.weight_kg ?? 0,
        ];
        csvContent += row.join(',') + '\n';
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rota_plani_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buttonSize = Math.round(13 * scale);
  const pad = Math.round(14 * scale);
  const labelSize = Math.round(11 * scale);

  return (
    <div
      style={{ padding: `${pad}px` }}
      className="sticky bottom-0 bg-white border-t border-gray-200 shadow-sm z-10"
    >
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          fontSize: `${buttonSize}px`,
          padding: `${Math.round(9 * scale)}px ${Math.round(14 * scale)}px`,
          borderRadius: `${Math.round(6 * scale)}px`,
        }}
        className="w-full bg-indigo-600 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
      >
        {loading ? (
          <span>Rotalar Hesaplanıyor...</span>
        ) : (
          <span>🚀 Rotaları Hesapla</span>
        )}
      </button>

      {error && (
        <div
          style={{
            marginTop: `${Math.round(8 * scale)}px`,
            padding: `${Math.round(6 * scale)}px`,
            fontSize: `${labelSize}px`,
          }}
          className="rounded bg-red-50 border border-red-200 text-red-700"
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
          className="rounded bg-emerald-50 border border-emerald-200 text-emerald-900"
        >
          <div className="flex items-center justify-between font-bold">
            <span>✓ Dağıtım Rotası Hazır</span>
            <span className="text-gray-600">{(result.total_distance_m / 1000).toFixed(1)} km</span>
          </div>

          {result.unassigned_orders.length > 0 && (
            <p className="text-amber-700 font-medium" style={{ marginTop: `${Math.round(4 * scale)}px` }}>
              ⚠️ {result.unassigned_orders.length} sipariş atanamadı.
            </p>
          )}

          <button
            onClick={handleExportCSV}
            style={{
              marginTop: `${Math.round(8 * scale)}px`,
              padding: `${Math.round(6 * scale)}px`,
              fontSize: `${labelSize}px`,
            }}
            className="w-full rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition cursor-pointer"
          >
            📥 Rota Çizelgesini İndir (CSV)
          </button>

          <button
            onClick={() => onStartJourney?.(result)}
            style={{
              marginTop: `${Math.round(8 * scale)}px`,
              padding: `${Math.round(9 * scale)}px`,
              fontSize: `${buttonSize}px`,
            }}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            🚀 Yolculuğa Başla
          </button>
        </div>
      )}
    </div>
  );
}
