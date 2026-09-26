const STATUS_STYLES = {
  PENDING:            { bg: 'bg-blue-100',   text: 'text-blue-700' },
  ANOMALY:            { bg: 'bg-red-100',    text: 'text-red-700' },
  RESOLVED_MANUALLY:  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  ROUTED:             { bg: 'bg-green-100',  text: 'text-green-700' },
  DELIVERED:          { bg: 'bg-gray-100',   text: 'text-gray-700' },
};

export default function OrderCard({ order, onResolve, isSelected, onSelect }) {
  const style = STATUS_STYLES[order.status] || STATUS_STYLES.PENDING;

  return (
    <div
      onClick={() => onSelect?.(order)}
      className={`mb-2 rounded-lg border bg-white p-3 shadow-sm transition cursor-pointer hover:shadow-md ${
        isSelected ? 'ring-2 ring-indigo-400 border-indigo-300' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-400">#{order.id}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm font-semibold text-gray-800 truncate">{order.customer_name}</p>
      <p className="mt-0.5 text-xs text-gray-500 leading-relaxed truncate">{order.raw_address}</p>

      <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span>Rank: <span className="font-medium text-gray-600">{order.place_rank ?? '—'}</span></span>
          <span className="text-gray-300">|</span>
          <span>{order.weight} kg</span>
        </div>

        {order.status === 'ANOMALY' && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(order); }}
            className="rounded bg-amber-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-600 transition"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
