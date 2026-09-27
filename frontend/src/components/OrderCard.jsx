const STATUS_STYLES = {
  PENDING:            { bg: 'bg-sky-50',     text: 'text-sky-600',     dot: 'bg-sky-500' },
  ANOMALY:            { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500' },
  RESOLVED_MANUALLY:  { bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-500' },
  ROUTED:             { bg: 'bg-emerald-50',  text: 'text-emerald-600', dot: 'bg-emerald-500' },
  DELIVERED:          { bg: 'bg-slate-50',    text: 'text-slate-600',   dot: 'bg-slate-400' },
};

const STATUS_LABELS = {
  PENDING: 'Beklemede',
  ANOMALY: 'Anomali',
  RESOLVED_MANUALLY: 'Düzeltildi',
  ROUTED: 'Rotalandı',
  DELIVERED: 'Teslim Edildi',
};

export default function OrderCard({
  order,
  onResolve,
  onRetry,
  onDelete,
  isSelected,
  onSelect,
}) {
  const style = STATUS_STYLES[order.status] || STATUS_STYLES.PENDING;
  const label = STATUS_LABELS[order.status] || order.status;

  return (
    <div
      onClick={() => onSelect?.(order)}
      className={`group relative mb-3 rounded-xl border bg-white p-4 transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-indigo-500/40 border-indigo-300 shadow-md shadow-indigo-100/50'
          : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
      }`}
    >
      {/* Header: ID, Badge and Delete Button */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">
          #{order.id}
        </span>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${style.bg} ${style.text}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
            {label}
          </span>
          <button
            title="Siparişi Sil"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`#${order.id} nolu siparişi silmek istediğinize emin misiniz?`)) {
                onDelete?.(order.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all duration-150 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Customer Name */}
      <p className="text-sm font-semibold text-slate-800 truncate" title={order.customer_name}>
        {order.customer_name}
      </p>

      {/* Address */}
      <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2" title={order.raw_address}>
        {order.raw_address}
      </p>

      {/* Footer: Rank, Weight and Action Buttons */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            <strong className="text-slate-600 font-semibold">{order.place_rank ?? '—'}</strong>
          </span>
          <span className="w-px h-3 bg-slate-200"></span>
          <span>
            <strong className="text-slate-600 font-semibold">{order.weight}</strong> kg
          </span>
        </div>

        {order.status === 'ANOMALY' && (
          <div className="flex items-center gap-1.5">
            <button
              title="Nominatim ile adresi tekrar tara"
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.(order.id);
              }}
              className="rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:ring-slate-300 transition-all duration-150 cursor-pointer"
            >
              Yeniden Dene
            </button>
            <button
              title="Manuel koordinat girerek çöz"
              onClick={(e) => {
                e.stopPropagation();
                onResolve?.(order);
              }}
              className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-400 active:bg-amber-600 transition-all duration-150 cursor-pointer shadow-sm shadow-amber-200"
            >
              Çöz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
