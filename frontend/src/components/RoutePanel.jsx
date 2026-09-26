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

  return (
    <div className="border-t border-gray-200 p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <span>🚚</span> Rota Optimizasyonu (CVRP)
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <label className="block">
          <span className="text-[11px] font-medium text-gray-600">Araç Sayısı</span>
          <input
            type="number"
            min={1}
            max={20}
            value={numVehicles}
            onChange={(e) => setNumVehicles(parseInt(e.target.value) || 1)}
            className="mt-0.5 block w-full rounded border border-gray-300 px-2.5 py-1 text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-gray-600">Araç Kapasitesi (kg)</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(parseFloat(e.target.value) || 1)}
            className="mt-0.5 block w-full rounded border border-gray-300 px-2.5 py-1 text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition cursor-pointer shadow-2xs"
      >
        {loading ? 'Rotalar Hesaplanıyor...' : 'Rotaları Hesapla'}
      </button>

      {error && (
        <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-2.5 rounded-lg bg-green-50 border border-green-200 p-2.5 text-xs text-green-800">
          <div className="flex items-center justify-between font-semibold">
            <span>✓ {result.num_vehicles_used} araç görevlendirildi</span>
            <span className="text-gray-600">{(result.total_distance_m / 1000).toFixed(1)} km</span>
          </div>

          {result.unassigned_orders.length > 0 && (
            <p className="text-amber-700 mt-1 font-medium">
              ⚠ {result.unassigned_orders.length} sipariş araç kapasitesi yetersizliğinden atanamadı.
            </p>
          )}

          <button
            onClick={handleExportCSV}
            className="mt-2 w-full rounded border border-green-600 bg-white py-1 text-xs font-semibold text-green-700 hover:bg-green-600 hover:text-white transition cursor-pointer"
          >
            📥 Rota Çizelgesini İndir (CSV)
          </button>
        </div>
      )}
    </div>
  );
}
