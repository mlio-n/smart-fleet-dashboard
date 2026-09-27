const CARDS = [
  { key: 'total',              label: 'Toplam Sipariş',  textColor: 'text-black',         bgColor: 'bg-green-50 border-green-300' },
  { key: 'PENDING',            label: 'Beklemede',       textColor: 'text-zinc-800',      bgColor: 'bg-zinc-100 border-zinc-300' },
  { key: 'ANOMALY',            label: 'Anomali',         textColor: 'text-red-700',       bgColor: 'bg-red-50 border-red-200' },
  { key: 'RESOLVED_MANUALLY',  label: 'Düzeltildi',      textColor: 'text-amber-700',     bgColor: 'bg-amber-50 border-amber-200' },
  { key: 'ROUTED',             label: 'Rotalandı',       textColor: 'text-green-700',     bgColor: 'bg-green-50 border-green-300' },
];

export default function StatsBar({ stats, onFilter, activeFilter }) {
  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white border-b-2 border-zinc-200 shadow-xs z-20">
      {/* Brand & Denizlispor Green/Black Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-black text-green-500 shadow-md border-2 border-green-600 shrink-0">
          <svg
            className="w-8 h-8 text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Fleet & Logistics Vector */}
            <rect x="1" y="4" width="15" height="12" rx="2" />
            <path d="M16 8h4.5l2.5 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-black text-black tracking-tight leading-none flex items-center gap-2">
            Smart Fleet
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600"></span>
          </h1>
          <p className="text-sm text-zinc-600 font-semibold mt-1.5">
            Lojistik Operasyon & Rota Yönetimi
          </p>
        </div>
      </div>

      {/* Metric Filter Buttons */}
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
                  ? `${bgColor} font-black ring-2 ring-green-600 shadow-xs`
                  : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100 hover:border-zinc-300'
              }`}
            >
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{label}:</span>
              <span className={`text-xl font-black ${textColor}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
