const CARDS = [
  { key: 'total',              label: 'Toplam',        icon: '📦', color: 'text-indigo-600', bg: 'bg-indigo-50',  ring: 'ring-indigo-100' },
  { key: 'PENDING',            label: 'Beklemede',     icon: '⏳', color: 'text-sky-600',    bg: 'bg-sky-50',     ring: 'ring-sky-100' },
  { key: 'ANOMALY',            label: 'Anomali',       icon: '⚠️', color: 'text-red-600',    bg: 'bg-red-50',     ring: 'ring-red-100' },
  { key: 'RESOLVED_MANUALLY',  label: 'Düzeltildi',    icon: '✓',  color: 'text-amber-600',  bg: 'bg-amber-50',   ring: 'ring-amber-100' },
  { key: 'ROUTED',             label: 'Rotalandı',     icon: '🚚', color: 'text-emerald-600',bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
];

export default function StatsBar({ stats, onFilter, activeFilter }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200/80">
      {CARDS.map(({ key, label, icon, color, bg, ring }) => {
        const isActive = activeFilter === (key === 'total' ? null : key);
        return (
          <button
            key={key}
            onClick={() => onFilter(key === 'total' ? null : key)}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-2 text-left transition-all duration-150 cursor-pointer border ${
              isActive
                ? `${bg} border-transparent ring-2 ${ring} shadow-sm`
                : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
            }`}
          >
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${bg} text-sm`}>
              {icon}
            </span>
            <div>
              <p className={`text-lg font-bold leading-none ${color}`}>{stats[key] ?? 0}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-wide uppercase">{label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
