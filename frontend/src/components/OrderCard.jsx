const STATUS_CONFIG = {
  PENDING: {
    label: 'Beklemede',
    badge: 'bg-zinc-100/80 backdrop-blur-xs text-zinc-800 border-zinc-300',
    leftBorder: 'border-l-black',
  },
  ANOMALY: {
    label: 'Anomali',
    badge: 'bg-rose-50/90 backdrop-blur-xs text-rose-800 border-rose-200 font-bold',
    leftBorder: 'border-l-rose-600',
  },
  RESOLVED_MANUALLY: {
    label: 'Düzeltildi',
    badge: 'bg-amber-50/90 backdrop-blur-xs text-amber-800 border-amber-200',
    leftBorder: 'border-l-amber-500',
  },
  ROUTED: {
    label: 'Rotalandı',
    badge: 'bg-green-50/90 backdrop-blur-xs text-green-800 border-green-200 font-bold',
    leftBorder: 'border-l-green-600',
  },
  DELIVERED: {
    label: 'Teslim Edildi',
    badge: 'bg-green-100/90 backdrop-blur-xs text-green-900 border-green-300 font-black',
    leftBorder: 'border-l-green-700',
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
  const radius = Math.round(10 * scale);
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
      className={`group relative flex flex-col justify-between w-full border border-white/80 border-l-4 ${config.leftBorder} bg-white/85 backdrop-blur-xl shadow-xs transition-all duration-200 cursor-pointer select-text ${
        isSelected
          ? 'ring-2 ring-black bg-green-50/70 shadow-lg scale-[1.01]'
          : 'hover:border-zinc-300/80 hover:bg-white/95 hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Header: ID & Status Badge */}
        <div className="flex items-center justify-between" style={{ marginBottom: `${Math.round(6 * scale)}px` }}>
          <span
            className="font-black text-zinc-500"
            style={{ fontSize: `${badgeSize}px` }}
          >
            #{order.id}
          </span>

          <div className="flex items-center" style={{ gap: `${Math.round(6 * scale)}px` }}>
            <span
              className={`border font-semibold ${config.badge}`}
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
                onDelete?.(order.id);
              }}
              style={{
                padding: `${Math.round(2 * scale)}px`,
              }}
              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Customer Name */}
        <h3
          className="font-black text-black tracking-tight"
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
          className="text-zinc-600 break-words font-normal"
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
        className="border-t border-zinc-100 flex items-center justify-between text-zinc-500"
        style={{
          marginTop: `${Math.round(10 * scale)}px`,
          paddingTop: `${Math.round(8 * scale)}px`,
          fontSize: `${metaSize}px`,
        }}
      >
        <div className="flex items-center" style={{ gap: `${Math.round(6 * scale)}px` }}>
          <span>
            Rank: <strong className="text-zinc-800 font-bold">{order.place_rank ?? '—'}</strong>
          </span>
          <span>•</span>
          <span>
            <strong className="text-zinc-800 font-bold">{order.weight}</strong> kg
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
              className="bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 font-bold transition cursor-pointer"
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
                fontSize: `${buttonSize}px`,
                padding: `${Math.round(3.5 * scale)}px ${Math.round(10 * scale)}px`,
                borderRadius: `${Math.round(6 * scale)}px`,
              }}
              className="bg-green-700 hover:bg-green-800 text-white font-bold transition cursor-pointer shadow-xs"
            >
              Çöz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
