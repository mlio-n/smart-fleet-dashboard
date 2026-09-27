const CARDS = [
  { key: 'total',              label: 'Toplam Sipariş',  textColor: 'text-black',         bgColor: 'bg-green-100/75 border-green-400/80 shadow-xs' },
  { key: 'PENDING',            label: 'Beklemede',       textColor: 'text-zinc-900',      bgColor: 'bg-zinc-200/75 border-zinc-400/80 shadow-xs' },
  { key: 'ANOMALY',            label: 'Anomali',         textColor: 'text-red-700',       bgColor: 'bg-red-100/75 border-red-300 shadow-xs' },
  { key: 'RESOLVED_MANUALLY',  label: 'Düzeltildi',      textColor: 'text-amber-800',     bgColor: 'bg-amber-100/75 border-amber-300 shadow-xs' },
  { key: 'ROUTED',             label: 'Rotalandı',       textColor: 'text-green-800',     bgColor: 'bg-green-100/75 border-green-400 shadow-xs' },
];

export default function StatsBar({ stats, onFilter, activeFilter }) {
  return (
    <header className="flex items-center justify-between px-7 py-3.5 glass-panel rounded-2xl z-20 relative shadow-[0_16px_40px_-10px_rgba(0,0,0,0.15)]">
      {/* Specular top reflection highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

      {/* Brand & Denizlispor Green/Black Logo */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-black text-green-500 shadow-lg border-2 border-green-600 shrink-0">
          <svg
            className="w-7 h-7 text-green-500"
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
          <h1 className="text-xl font-black text-black tracking-tight leading-none flex items-center gap-1.5">
            Smart Fleet
            <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
          </h1>
          <p className="text-xs text-zinc-600 font-semibold mt-1">
            Lojistik Operasyon & Rota Yönetimi
          </p>
        </div>
      </div>

      {/* Metric Filter Buttons with Glassmorphic polish */}
      <div className="flex items-center gap-2.5">
        {CARDS.map(({ key, label, textColor, bgColor }) => {
          const isActive = activeFilter === (key === 'total' ? null : key);
          const count = stats[key] ?? 0;

          return (
            <button
              key={key}
              onClick={() => onFilter(key === 'total' ? null : key)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all duration-200 apple-spring cursor-pointer active:scale-95 ${
                isActive
                  ? `${bgColor} font-black ring-2 ring-green-600 shadow-md scale-102`
                  : 'glass-panel-subtle text-zinc-800 hover:bg-white/80 hover:shadow-xs'
              }`}
            >
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">{label}:</span>
              <span className={`text-lg font-black ${textColor}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
