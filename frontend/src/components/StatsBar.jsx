const CARDS = [
  { key: 'total',              label: 'Total Orders',  border: 'border-l-indigo-500',  text: 'text-indigo-600' },
  { key: 'PENDING',            label: 'Pending',       border: 'border-l-blue-500',    text: 'text-blue-600' },
  { key: 'ANOMALY',            label: 'Anomalies',     border: 'border-l-red-500',     text: 'text-red-600' },
  { key: 'RESOLVED_MANUALLY',  label: 'Resolved',      border: 'border-l-amber-500',   text: 'text-amber-600' },
  { key: 'ROUTED',             label: 'Routed',        border: 'border-l-green-500',   text: 'text-green-600' },
];

export default function StatsBar({ stats, onFilter, activeFilter }) {
  return (
    <div className="flex gap-3 p-3 bg-white border-b border-gray-200 overflow-x-auto">
      {CARDS.map(({ key, label, border, text }) => {
        const isActive = activeFilter === (key === 'total' ? null : key);
        return (
          <button
            key={key}
            onClick={() => onFilter(key === 'total' ? null : key)}
            className={`flex-1 min-w-[120px] rounded-lg border-l-4 ${border} bg-white p-3 text-left shadow-sm transition hover:shadow-md ${
              isActive ? 'ring-2 ring-indigo-300' : ''
            }`}
          >
            <p className={`text-2xl font-bold ${text}`}>{stats[key] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </button>
        );
      })}
    </div>
  );
}
