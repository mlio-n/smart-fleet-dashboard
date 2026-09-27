const CARDS = [
  { 
    key: 'total',              
    label: 'TOPLAM SİPARİŞ',   
    icon: '📦', 
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    activeGlow: 'ring-2 ring-indigo-500/50 bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10',
    numColor: 'text-indigo-400'
  },
  { 
    key: 'PENDING',            
    label: 'BEKLEMEDE',        
    icon: '⚡', 
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    activeGlow: 'ring-2 ring-sky-500/50 bg-sky-950/40 border-sky-500/50 shadow-lg shadow-sky-500/10',
    numColor: 'text-sky-400'
  },
  { 
    key: 'ANOMALY',            
    label: 'ANOMALİ',          
    icon: '🚨', 
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    activeGlow: 'ring-2 ring-rose-500/50 bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-500/20',
    numColor: 'text-rose-400 font-bold'
  },
  { 
    key: 'RESOLVED_MANUALLY',  
    label: 'DÜZELTİLDİ',       
    icon: '🛠️', 
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    activeGlow: 'ring-2 ring-amber-500/50 bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10',
    numColor: 'text-amber-400'
  },
  { 
    key: 'ROUTED',             
    label: 'ROTALANDI',        
    icon: '🗺️', 
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    activeGlow: 'ring-2 ring-emerald-500/50 bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10',
    numColor: 'text-emerald-400'
  },
];

export default function StatsBar({ stats, onFilter, activeFilter }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shadow-xl z-20">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-lg">🛰️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">
                SMART <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">FLEET</span>
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO OS
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">Canlı Bağlantı Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Filter Bar */}
      <div className="flex items-center gap-3">
        {CARDS.map(({ key, label, icon, badgeColor, activeGlow, numColor }) => {
          const isActive = activeFilter === (key === 'total' ? null : key);
          const count = stats[key] ?? 0;
          
          return (
            <button
              key={key}
              onClick={() => onFilter(key === 'total' ? null : key)}
              className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer border ${
                isActive
                  ? activeGlow
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg border text-xs ${badgeColor}`}>
                {icon}
              </div>
              <div className="text-left">
                <div className={`text-base font-bold leading-none font-mono-num ${numColor}`}>
                  {count}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 tracking-wider mt-1">
                  {label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </header>
  );
}
