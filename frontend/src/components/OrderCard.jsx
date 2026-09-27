const STATUS_CONFIG = {
  PENDING: {
    label: 'Beklemede',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    dot: 'bg-sky-400 animate-pulse'
  },
  ANOMALY: {
    label: '🚨 ANOMALİ',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/40 font-bold',
    dot: 'bg-rose-500 animate-ping'
  },
  RESOLVED_MANUALLY: {
    label: 'Düzeltildi',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400'
  },
  ROUTED: {
    label: 'Rotalandı',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400'
  },
  DELIVERED: {
    label: 'Teslim Edildi',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400'
  }
};

export default function OrderCard({
  order,
  onResolve,
  onRetry,
  onDelete,
  isSelected,
  onSelect,
}) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  return (
    <div
      onClick={() => onSelect?.(order)}
      className={`group relative mb-3 rounded-2xl p-4 transition-all duration-200 cursor-pointer border ${
        isSelected
          ? 'bg-slate-900 border-indigo-500/70 ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-500/10 translate-x-1'
          : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/50'
      }`}
    >
      {/* Top row: Order ID badge & Status pill & Delete */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono-num text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
          #{order.id}
        </span>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${config.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`}></span>
            {config.label}
          </span>

          <button
            title="Siparişi Sil"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`#${order.id} nolu siparişi silmek istediğinize emin misiniz?`)) {
                onDelete?.(order.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-all duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Customer Name */}
      <h3 className="text-sm font-bold text-slate-100 truncate tracking-tight group-hover:text-indigo-300 transition-colors">
        {order.customer_name}
      </h3>

      {/* Address */}
      <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <p className="line-clamp-2 leading-relaxed text-slate-400">
          {order.raw_address}
        </p>
      </div>

      {/* Metadata & Action Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3 text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Skor:</span>
            <span className="font-mono-num text-slate-300 font-semibold">{order.place_rank ?? '—'}</span>
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Ağırlık:</span>
            <span className="font-mono-num text-slate-300 font-semibold">{order.weight} kg</span>
          </span>
        </div>

        {order.status === 'ANOMALY' && (
          <div className="flex items-center gap-1.5">
            <button
              title="Yeniden tara"
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.(order.id);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all font-medium text-[10px]"
            >
              🔄 Yeniden
            </button>
            <button
              title="Koordinat çöz"
              onClick={(e) => {
                e.stopPropagation();
                onResolve?.(order);
              }}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/20 transition-all text-[10px]"
            >
              🛠️ Çöz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
