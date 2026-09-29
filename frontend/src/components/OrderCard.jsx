import { memo } from 'react';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Beklemede',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200/60 rounded-full px-2.5 py-0.5 text-xs font-medium',
  },
  ANOMALY: {
    label: 'Anomali',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200/50 rounded-full px-2.5 py-0.5 text-xs font-medium',
  },
  RESOLVED_MANUALLY: {
    label: 'Düzeltildi',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full px-2.5 py-0.5 text-xs font-medium',
  },
  ROUTED: {
    label: 'Rotalandı',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full px-2.5 py-0.5 text-xs font-medium',
  },
  DELIVERED: {
    label: 'Teslim Edildi',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300/50 rounded-full px-2.5 py-0.5 text-xs font-medium',
  },
};

function OrderCard({
  order,
  onResolve,
  onRetry,
  onDelete,
  isSelected,
  onSelect,
  scale = 1,
}) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  // Proportional sizing based on sidebar scale factor
  const titleSize = Math.round(15 * scale);
  const addressSize = Math.round(12 * scale);
  const metaSize = Math.round(11 * scale);
  const badgeSize = Math.round(10.5 * scale);
  const pad = Math.round(15 * scale);

  return (
    <div
      onClick={() => onSelect?.(order)}
      style={{
        padding: `${pad}px`,
      }}
      className={`group relative flex flex-col justify-between w-full rounded-2xl glass-card border border-white/60 transition-all duration-200 cursor-pointer select-text ${
        isSelected
          ? 'ring-2 ring-emerald-600 !bg-emerald-50/70 shadow-md scale-[1.01]'
          : 'shadow-sm hover:shadow-md hover:!bg-white/70 hover:scale-[1.008]'
      }`}
    >
      <div>
        {/* Top Header: ID & Status Badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-medium text-slate-400"
            style={{ fontSize: `${metaSize}px` }}
          >
            #{order.id}
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className={config.badge}
              style={{
                fontSize: `${badgeSize}px`,
                padding: `${Math.round(2 * scale)}px ${Math.round(8 * scale)}px`,
              }}
            >
              {config.label}
            </span>

            <button
              title="Siparişi Sil"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(order.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Customer Name (Proportionally scales with sidebar width) */}
        <h3
          className="font-semibold text-slate-800 leading-snug tracking-tight"
          style={{ fontSize: `${titleSize}px` }}
        >
          {order.customer_name}
        </h3>

        {/* Address */}
        <p
          className="text-slate-500 line-clamp-2 mt-1 leading-relaxed break-words"
          style={{ fontSize: `${addressSize}px` }}
        >
          {order.raw_address}
        </p>
      </div>

      {/* Footer Info & Buttons */}
      <div
        className="border-t border-slate-200/50 flex items-center justify-between text-slate-500"
        style={{
          marginTop: `${Math.round(10 * scale)}px`,
          paddingTop: `${Math.round(8 * scale)}px`,
          fontSize: `${metaSize}px`,
        }}
      >
        <div className="flex items-center gap-1.5 font-medium">
          <span>
            Rank: <strong className="text-slate-700 font-semibold">{order.place_rank ?? '—'}</strong>
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-700 font-semibold">{order.weight}</strong> kg
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
              style={{
                fontSize: `${metaSize}px`,
                padding: `${Math.round(2.5 * scale)}px ${Math.round(8 * scale)}px`,
              }}
              className="font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition cursor-pointer"
            >
              Yeniden Tara
            </button>
            <button
              title="Koordinat çöz"
              onClick={(e) => {
                e.stopPropagation();
                onResolve?.(order);
              }}
              style={{
                fontSize: `${metaSize}px`,
                padding: `${Math.round(2.5 * scale)}px ${Math.round(10 * scale)}px`,
              }}
              className="font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-xs"
            >
              Çöz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(OrderCard);
