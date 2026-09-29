import { memo } from 'react';

function NavigationHUD({
  isNavigating,
  showRoutePreview,
  routes,
  currentStopIndex,
  deliveryStops = [],
  currentTargetStop,
  distanceToNextStop,
  onStartJourney,
  onExitNavigation,
  onClosePreview,
  onMarkDelivered,
}) {
  if (!isNavigating && !showRoutePreview) return null;

  const firstDeliveryStop = deliveryStops[0] || null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[2000] glass-panel rounded-3xl p-6 w-11/12 max-w-xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.25)] animate-in fade-in slide-in-from-top-12 zoom-in-95 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden pointer-events-auto">
      {/* Glass specular top reflection highlight */}
      <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

      {/* Total Route Mini Banner */}
      {routes?.total_distance_m && (
        <div className="relative flex items-center justify-between text-xs font-medium text-slate-700 glass-card rounded-xl px-4 py-2.5 mb-4 border border-white/60">
          <span className="flex items-center gap-2 text-emerald-800 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            Optimum Dağıtım Rotası
          </span>
          <span className="font-semibold text-slate-800">
            {(routes.total_distance_m / 1000).toFixed(1)} km · ~{Math.round((routes.total_distance_m / 1000) * 2.2)} dk · {deliveryStops.length} Durak
          </span>
        </div>
      )}

      {/* ── Mode 1: Route Ready Preview Card ("Yolculuğa Başla") ── */}
      {showRoutePreview && !isNavigating ? (
        <div className="relative">
          {/* Top Status & Close Header */}
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-3.5 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full px-3 py-1 text-xs font-medium">
                Rota Hazır · Başlangıç
              </span>
            </div>

            <button
              onClick={onClosePreview}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-white/60 transition cursor-pointer"
            >
              ✕ Kapat
            </button>
          </div>

          {/* Target Customer Info */}
          <div className="mb-5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              İlk Hedef Müşteri
            </span>
            <h3 className="text-xl font-semibold text-slate-900 truncate mt-1">
              {firstDeliveryStop?.customer_name || 'Dağıtım Başlangıcı'}
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed mt-1 line-clamp-2">
              {firstDeliveryStop?.raw_address || 'Merkez Dağıtım Deposu (Ana Üs)'}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm font-medium glass-card rounded-2xl p-4 border border-white/60">
              <div>
                <span className="text-slate-400 text-[10.5px] block font-medium uppercase tracking-wider">Mesafe</span>
                <strong className="text-slate-800 font-semibold text-base">
                  {distanceToNextStop} km
                </strong>
              </div>
              <div className="border-x border-slate-200/50 px-1">
                <span className="text-slate-400 text-[10.5px] block font-medium uppercase tracking-wider">Tahmini Varış</span>
                <strong className="text-emerald-700 font-semibold text-base">
                  ~{Math.max(1, Math.round(distanceToNextStop * 2.2))} dk
                </strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10.5px] block font-medium uppercase tracking-wider">Ağırlık</span>
                <strong className="text-slate-800 font-semibold text-base">
                  {firstDeliveryStop?.weight_kg ?? 1} kg
                </strong>
              </div>
            </div>
          </div>

          {/* Yolculuğa Başla Button */}
          <button
            onClick={() => onStartJourney(routes)}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 text-sm shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Yolculuğa Başla</span>
          </button>
        </div>
      ) : currentStopIndex >= deliveryStops.length ? (
        /* ── Mode 2: Route Completed Screen ── */
        <div className="relative text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 border border-emerald-200/80">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-1.5">
            Rota Tamamlandı!
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed font-normal">
            Tüm paketler teslim edildi. Depoya dönüş rotasını tamamlayabilir veya ana panele dönebilirsiniz.
          </p>
          <button
            onClick={onExitNavigation}
            className="w-full rounded-xl bg-slate-900 hover:bg-black text-emerald-400 font-medium py-3 text-sm shadow-sm transition active:scale-98 cursor-pointer"
          >
            Normal Görünüme Dön
          </button>
        </div>
      ) : (
        /* ── Mode 3: Active Driver Navigation HUD ── */
        <div className="relative">
          {/* Top Status & Exit Header */}
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-3.5 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full px-3 py-1 text-xs font-medium">
                Durak {currentStopIndex + 1} / {deliveryStops.length}
              </span>
            </div>

            <button
              onClick={onExitNavigation}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50/60 transition cursor-pointer"
            >
              Sürüşten Çık
            </button>
          </div>

          {/* Target Customer Info */}
          <div className="mb-5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Hedef Müşteri
            </span>
            <h3 className="text-xl font-semibold text-slate-900 truncate mt-1">
              {currentTargetStop?.customer_name}
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed mt-1 line-clamp-2">
              {currentTargetStop?.raw_address}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm font-medium glass-card rounded-2xl p-4 border border-white/60">
              <div>
                <span className="text-slate-400 text-[10.5px] block font-medium uppercase tracking-wider">Mesafe</span>
                <strong className="text-slate-800 font-semibold text-base">
                  {distanceToNextStop} km
                </strong>
              </div>
              <div className="border-x border-slate-200/50 px-1">
                <span className="text-slate-400 text-[10.5px] block font-medium uppercase tracking-wider">Tahmini Varış</span>
                <strong className="text-emerald-700 font-semibold text-base">
                  ~{Math.max(1, Math.round(distanceToNextStop * 2.2))} dk
                </strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10.5px] block font-medium uppercase tracking-wider">Ağırlık</span>
                <strong className="text-slate-800 font-semibold text-base">
                  {currentTargetStop?.weight_kg ?? 1} kg
                </strong>
              </div>
            </div>
          </div>

          {/* Mark Delivered Button */}
          <button
            onClick={onMarkDelivered}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 text-sm shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Teslim Edildi</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(NavigationHUD);
