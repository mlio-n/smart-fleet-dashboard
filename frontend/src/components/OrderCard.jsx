const STATUS_STYLES = {
  PENDING:            { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  ANOMALY:            { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  RESOLVED_MANUALLY:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  ROUTED:             { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  DELIVERED:          { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200' },
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
      className={`group relative mb-2.5 rounded-lg border bg-white p-3 shadow-2xs transition cursor-pointer hover:shadow-md ${
        isSelected ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20' : 'border-gray-200'
      }`}
    >
      {/* Header: ID, Badge and Delete Button */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-400">#{order.id}</span>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
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
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition cursor-pointer text-xs"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Customer Name */}
      <p className="text-sm font-semibold text-gray-800 truncate" title={order.customer_name}>
        {order.customer_name}
      </p>

      {/* Address */}
      <p className="mt-0.5 text-xs text-gray-500 leading-relaxed line-clamp-2" title={order.raw_address}>
        {order.raw_address}
      </p>

      {/* Footer: Rank, Weight and Action Buttons */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span>Rank: <strong className="text-gray-600">{order.place_rank ?? '—'}</strong></span>
          <span className="text-gray-300">|</span>
          <span><strong className="text-gray-600">{order.weight}</strong> kg</span>
        </div>

        {order.status === 'ANOMALY' && (
          <div className="flex items-center gap-1">
            <button
              title="Nominatim ile adresi tekrar tara"
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.(order.id);
              }}
              className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition cursor-pointer"
            >
              🔄 Yeniden Dene
            </button>
            <button
              title="Manuel koordinat girerek çöz"
              onClick={(e) => {
                e.stopPropagation();
                onResolve?.(order);
              }}
              className="rounded bg-amber-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-600 transition cursor-pointer shadow-2xs"
            >
              Çöz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
