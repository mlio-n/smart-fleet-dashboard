const CARDS = [
  { key: 'total',              label: 'Toplam Sipariş',  textColor: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200' },
  { key: 'PENDING',            label: 'Beklemede',       textColor: 'text-blue-600',   bgColor: 'bg-blue-50 border-blue-200' },
  { key: 'ANOMALY',            label: 'Anomali',         textColor: 'text-red-600',    bgColor: 'bg-red-50 border-red-200' },
  { key: 'RESOLVED_MANUALLY',  label: 'Düzeltildi',      textColor: 'text-amber-600',  bgColor: 'bg-amber-50 border-amber-200' },
  { key: 'ROUTED',             label: 'Rotalandı',       textColor: 'text-emerald-600',bgColor: 'bg-emerald-50 border-emerald-200' },
];

export default function StatsBar({ stats, onFilter, activeFilter }) {
  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 shadow-xs z-20">
      {/* Brand & Prominent Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md shrink-0">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Professional Logistics & Fleet Icon */}
            <rect x="1" y="4" width="15" height="12" rx="2" />
            <path d="M16 8h4.5l2.5 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
            Smart Fleet
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1.5">
            Lojistik Operasyon & Rota Yönetimi
          </p>
        </div>
      </div>

      {/* Prominent Metric Filter Buttons */}
      <div className="flex items-center gap-3">
        {CARDS.map(({ key, label, textColor, bgColor }) => {
          const isActive = activeFilter === (key === 'total' ? null : key);
          const count = stats[key] ?? 0;

          return (
            <button
              key={key}
              onClick={() => onFilter(key === 'total' ? null : key)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition cursor-pointer ${
                isActive
                  ? `${bgColor} font-bold ring-2 ring-indigo-500 shadow-xs`
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}:</span>
              <span className={`text-xl font-extrabold ${textColor}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
