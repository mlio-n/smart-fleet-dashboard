const STATUS_CONFIG = {
  PENDING: {
    label: 'Beklemede',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  ANOMALY: {
    label: 'Anomali',
    badge: 'bg-rose-50 text-rose-700 border-rose-100 font-semibold',
  },
  RESOLVED_MANUALLY: {
    label: 'Düzeltildi',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  ROUTED: {
    label: 'Rotalandı',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  DELIVERED: {
    label: 'Teslim Edildi',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

export default function OrderCard({
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
  const pad = Math.round(15 * scale);
  const radius = Math.round(12 * scale);
  const gap = Math.round(8 * scale);

  const titleSize = Math.round(15 * scale);
  const addressSize = Math.round(12.5 * scale);
  const metaSize = Math.round(11.5 * scale);
  const badgeSize = Math.round(11 * scale);
  const buttonSize = Math.round(11.5 * scale);

  return (
    <div
      onClick={() => onSelect?.(order)}
      style={{
        padding: `${pad}px`,
        borderRadius: `${radius}px`,
        gap: `${gap}px`,
      }}
      className={`group relative flex flex-col justify-between w-full border bg-white shadow-xs transition-all duration-150 cursor-pointer select-text ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20 shadow-sm'
          : 'border-gray-100/90 hover:border-gray-200 hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Header: ID & Status Badge */}
        <div className="flex items-center justify-between" style={{ marginBottom: `${Math.round(6 * scale)}px` }}>
          <span
            className="font-bold text-gray-400"
            style={{ fontSize: `${badgeSize}px` }}
          >
            #{order.id}
          </span>

          <div className="flex items-center" style={{ gap: `${Math.round(6 * scale)}px` }}>
            <span
              className={`border font-medium ${config.badge}`}
              style={{
                fontSize: `${badgeSize}px`,
                padding: `${Math.round(2.5 * scale)}px ${Math.round(8 * scale)}px`,
                borderRadius: `${Math.round(6 * scale)}px`,
              }}
            >
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
              style={{
                fontSize: `${titleSize}px`,
                padding: `${Math.round(2 * scale)}px`,
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Customer Name */}
        <h3
          className="font-bold text-gray-900 tracking-tight"
          style={{
            fontSize: `${titleSize}px`,
            lineHeight: 1.3,
            marginBottom: `${Math.round(4 * scale)}px`,
          }}
        >
          {order.customer_name}
        </h3>

        {/* Address */}
        <p
          className="text-gray-500 break-words"
          style={{
            fontSize: `${addressSize}px`,
            lineHeight: 1.45,
          }}
        >
          {order.raw_address}
        </p>
      </div>

      {/* Footer Info & Buttons */}
      <div
        className="border-t border-gray-100 flex items-center justify-between text-gray-400"
        style={{
          marginTop: `${Math.round(10 * scale)}px`,
          paddingTop: `${Math.round(8 * scale)}px`,
          fontSize: `${metaSize}px`,
        }}
      >
        <div className="flex items-center" style={{ gap: `${Math.round(6 * scale)}px` }}>
          <span>
            Rank: <strong className="text-gray-600 font-semibold">{order.place_rank ?? '—'}</strong>
          </span>
          <span>•</span>
          <span>
            <strong className="text-gray-600 font-semibold">{order.weight}</strong> kg
          </span>
        </div>

        {order.status === 'ANOMALY' && (
          <div className="flex items-center" style={{ gap: `${Math.round(6 * scale)}px` }}>
            <button
              title="Yeniden tara"
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.(order.id);
              }}
              style={{
                fontSize: `${buttonSize}px`,
                padding: `${Math.round(3.5 * scale)}px ${Math.round(8 * scale)}px`,
                borderRadius: `${Math.round(6 * scale)}px`,
              }}
              className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium transition cursor-pointer"
            >
              🔄 Yeniden
            </button>
            <button
              title="Koordinat çöz"
              onClick={(e) => {
                e.stopPropagation();
                onResolve?.(order);
              }}
              style={{
                fontSize: `${buttonSize}px`,
                padding: `${Math.round(3.5 * scale)}px ${Math.round(10 * scale)}px`,
                borderRadius: `${Math.round(6 * scale)}px`,
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold transition cursor-pointer shadow-xs"
            >
              Çöz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
