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
    <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h2.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-2a1 1 0 00-.293-.707l-3-3A1 1 0 0016 3h-3a1 1 0 00-1 1v5H3V4z" />
        </svg>
        Rota Optimizasyonu
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Araç Sayısı</span>
          <input
            type="number"
            min={1}
            max={20}
            value={numVehicles}
            onChange={(e) => setNumVehicles(parseInt(e.target.value) || 1)}
            className="mt-1 block w-full rounded-lg ring-1 ring-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all duration-150"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Kapasite (kg)</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(parseFloat(e.target.value) || 1)}
            className="mt-1 block w-full rounded-lg ring-1 ring-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all duration-150"
          />
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer shadow-sm shadow-indigo-200"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Hesaplanıyor...
          </span>
        ) : 'Rotaları Hesapla'}
      </button>

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {result.num_vehicles_used} araç görevlendirildi
            </span>
            <span className="text-slate-500 font-semibold">{(result.total_distance_m / 1000).toFixed(1)} km</span>
          </div>

          {result.unassigned_orders.length > 0 && (
            <p className="text-amber-700 mt-1.5 font-semibold">
              {result.unassigned_orders.length} sipariş kapasite yetersizliğinden atanamadı.
            </p>
          )}

          <button
            onClick={handleExportCSV}
            className="mt-2.5 w-full rounded-lg ring-1 ring-emerald-200 bg-white py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white hover:ring-emerald-600 transition-all duration-150 cursor-pointer"
          >
            Rota Çizelgesini İndir (CSV)
          </button>
        </div>
      )}
    </div>
  );
}
