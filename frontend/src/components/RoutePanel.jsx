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
    <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 shadow-2xl z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs">
            🚚
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
              ROTA OPTİMİZASYONU
            </h3>
            <p className="text-[10px] text-slate-400">Google OR-Tools CVRP Motoru</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <label className="block">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Araç Sayısı</span>
          <input
            type="number"
            min={1}
            max={20}
            value={numVehicles}
            onChange={(e) => setNumVehicles(parseInt(e.target.value) || 1)}
            className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs font-mono-num font-medium text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kapasite (kg)</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(parseFloat(e.target.value) || 1)}
            className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs font-mono-num font-medium text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 active:opacity-90 disabled:opacity-50 text-white font-extrabold text-xs py-2.5 transition-all shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>Rotalar Hesaplanıyor...</span>
          </>
        ) : (
          <span>⚡ Rotaları Hesapla (CVRP)</span>
        )}
      </button>

      {error && (
        <div className="mt-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 font-medium">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-xl bg-slate-950 border border-emerald-500/30 p-3 text-xs">
          <div className="flex items-center justify-between font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span>✓</span> {result.num_vehicles_used} Araç Atandı
            </span>
            <span className="font-mono-num text-slate-300">{(result.total_distance_m / 1000).toFixed(1)} km</span>
          </div>

          {result.unassigned_orders.length > 0 && (
            <p className="text-amber-400 mt-1.5 font-medium text-[11px]">
              ⚠️ {result.unassigned_orders.length} sipariş araç kapasitesi yetersizliğinden atanamadı.
            </p>
          )}

          <button
            onClick={handleExportCSV}
            className="mt-2.5 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-1.5 text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
          >
            📥 Rota Çizelgesini İndir (CSV)
          </button>
        </div>
      )}
    </div>
  );
}
