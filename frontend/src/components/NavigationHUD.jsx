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
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[2000] glass-panel rounded-[28px] p-7 w-11/12 max-w-xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] animate-in fade-in slide-in-from-top-12 zoom-in-95 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden pointer-events-auto">
      {/* Glass specular top reflection highlight */}
      <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
      {/* Subtle glass sheen overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/5 to-transparent pointer-events-none rounded-[28px]" />

      {/* Total Route Mini Banner */}
      {routes?.total_distance_m && (
        <div className="relative flex items-center justify-between text-[11px] font-bold text-zinc-700 glass-panel-subtle rounded-xl px-3.5 py-2 mb-3.5">
          <span className="flex items-center gap-1.5 text-green-900 font-extrabold">
            <span className="w-2 h-2 rounded-full bg-green-600 inline-block animate-pulse"></span>
            Optimum Dağıtım Rotası
          </span>
          <span className="font-black text-black">
            {(routes.total_distance_m / 1000).toFixed(1)} km · ~{Math.round((routes.total_distance_m / 1000) * 2.2)} dk · {deliveryStops.length} Durak
          </span>
        </div>
      )}

      {/* ── Mode 1: Route Ready Preview Card ("Yolculuğa Başla") ── */}
      {showRoutePreview && !isNavigating ? (
        <div className="relative">
          {/* Top Status & Close Header */}
          <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3.5 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-green-950 bg-green-100/90 border border-green-300/80 px-3 py-1.5 rounded-lg shadow-2xs backdrop-blur-xs">
                Rota Hazır · Başlangıç
              </span>
            </div>

            <button
              onClick={onClosePreview}
              className="text-xs font-bold text-zinc-500 hover:text-black px-3 py-1.5 rounded-lg hover:bg-zinc-100/80 transition cursor-pointer"
            >
              ✕ Kapat
            </button>
          </div>

          {/* Target Customer Info */}
          <div className="mb-5">
            <span className="text-xs font-black text-zinc-500 uppercase tracking-wider">
              İlk Hedef Müşteri
            </span>
            <h3 className="text-2xl font-black text-black truncate mt-1">
              {firstDeliveryStop?.customer_name || 'Dağıtım Başlangıcı'}
            </h3>
            <p className="text-sm text-zinc-600 font-medium leading-relaxed mt-1.5 line-clamp-2">
              {firstDeliveryStop?.raw_address || 'Merkez Dağıtım Deposu (Ana Üs)'}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm font-medium text-zinc-700 glass-panel-subtle rounded-2xl p-4">
              <div>
                <span className="text-zinc-500 text-[11px] block font-bold uppercase">Mesafe</span>
                <strong className="text-black font-black text-lg">
                  {distanceToNextStop} km
                </strong>
              </div>
              <div className="border-x border-zinc-300/60 px-1">
                <span className="text-zinc-500 text-[11px] block font-bold uppercase">Tahmini Varış</span>
                <strong className="text-blue-600 font-black text-lg">
                  ~{Math.max(1, Math.round(distanceToNextStop * 2.2))} dk
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] block font-bold uppercase">Ağırlık</span>
                <strong className="text-black font-black text-lg">
                  {firstDeliveryStop?.weight_kg ?? 1} kg
                </strong>
              </div>
            </div>
          </div>

          {/* Yolculuğa Başla Button */}
          <button
            onClick={() => onStartJourney(routes)}
            className="w-full rounded-2xl bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 text-white font-black py-4 text-base shadow-xl shadow-green-900/30 transition-all duration-200 apple-spring cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Yolculuğa Başla</span>
          </button>
        </div>
      ) : currentStopIndex >= deliveryStops.length ? (
        /* ── Mode 2: Route Completed Screen ── */
        <div className="relative text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4 border-2 border-green-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-black mb-2">
            Rota Tamamlandı!
          </h3>
          <p className="text-sm text-zinc-600 mb-6 leading-relaxed font-medium">
            Tüm paketler teslim edildi. Depoya dönüş rotasını tamamlayabilir veya ana panele dönebilirsiniz.
          </p>
          <button
            onClick={onExitNavigation}
            className="w-full rounded-2xl bg-black hover:bg-zinc-900 text-green-400 border border-green-600 font-black py-4 text-base shadow-lg transition cursor-pointer active:scale-98"
          >
            Normal Görünüme Dön
          </button>
        </div>
      ) : (
        /* ── Mode 3: Active Driver Navigation HUD (Screenshot Match) ── */
        <div className="relative">
          {/* Top Status & Exit Header */}
          <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3.5 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-green-950 bg-green-100/90 border border-green-300/80 px-3 py-1.5 rounded-lg shadow-2xs backdrop-blur-xs">
                Durak {currentStopIndex + 1} / {deliveryStops.length}
              </span>
            </div>

            <button
              onClick={onExitNavigation}
              className="text-xs font-bold text-zinc-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50/80 transition cursor-pointer"
            >
              Sürüşten Çık
            </button>
          </div>

          {/* Target Customer Info */}
          <div className="mb-5">
            <span className="text-xs font-black text-zinc-500 uppercase tracking-wider">
              Hedef Müşteri
            </span>
            <h3 className="text-2xl font-black text-black truncate mt-1">
              {currentTargetStop?.customer_name}
            </h3>
            <p className="text-sm text-zinc-600 font-medium leading-relaxed mt-1.5 line-clamp-2">
              {currentTargetStop?.raw_address}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm font-medium text-zinc-700 glass-panel-subtle rounded-2xl p-4">
              <div>
                <span className="text-zinc-500 text-[11px] block font-bold uppercase">Mesafe</span>
                <strong className="text-black font-black text-lg">
                  {distanceToNextStop} km
                </strong>
              </div>
              <div className="border-x border-zinc-300/60 px-1">
                <span className="text-zinc-500 text-[11px] block font-bold uppercase">Tahmini Varış</span>
                <strong className="text-blue-600 font-black text-lg">
                  ~{Math.max(1, Math.round(distanceToNextStop * 2.2))} dk
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] block font-bold uppercase">Ağırlık</span>
                <strong className="text-black font-black text-lg">
                  {currentTargetStop?.weight_kg ?? 1} kg
                </strong>
              </div>
            </div>
          </div>

          {/* Mark Delivered Button */}
          <button
            onClick={onMarkDelivered}
            className="w-full rounded-2xl bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 text-white font-black py-4 text-base shadow-xl shadow-green-900/30 transition-all duration-200 apple-spring cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Teslim Edildi</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(NavigationHUD);
