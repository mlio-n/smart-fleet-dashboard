import { useState } from 'react';
import { resolveAnomaly } from '../api';

export default function ResolveModal({ order, onClose, onResolved }) {
  const [form, setForm] = useState({
    new_latitude: order.latitude ?? '',
    new_longitude: order.longitude ?? '',
    resolved_by: '',
    support_note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await resolveAnomaly(order.id, {
        new_latitude: parseFloat(form.new_latitude),
        new_longitude: parseFloat(form.new_longitude),
        resolved_by: form.resolved_by,
        support_note: form.support_note || null,
      });
      onResolved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Anomali düzeltilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl glass-panel p-7 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.25)]"
      >
        {/* Specular highlight border effect at top */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Anomali Çözümü</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Sipariş #{order.id} — {order.customer_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-medium cursor-pointer transition p-1 hover:bg-white/60 rounded-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-2 mb-3 rounded-xl bg-rose-50/80 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Yeni Enlem (Latitude)</span>
            <input
              type="number" step="any" required
              value={form.new_latitude} onChange={set('new_latitude')}
              placeholder="Örn: 37.7765"
              className="mt-1 block w-full rounded-xl border border-slate-200/70 glass-card px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:bg-white/80 focus:ring-1 focus:ring-emerald-600 outline-none shadow-xs transition"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Yeni Boylam (Longitude)</span>
            <input
              type="number" step="any" required
              value={form.new_longitude} onChange={set('new_longitude')}
              placeholder="Örn: 29.0864"
              className="mt-1 block w-full rounded-xl border border-slate-200/70 glass-card px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:bg-white/80 focus:ring-1 focus:ring-emerald-600 outline-none shadow-xs transition"
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-xs font-medium text-slate-700">Destek Temsilcisi Adı</span>
          <input
            type="text" required
            value={form.resolved_by} onChange={set('resolved_by')}
            placeholder="Örn: ahmet.destek"
            className="mt-1 block w-full rounded-xl border border-slate-200/70 glass-card px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:bg-white/80 focus:ring-1 focus:ring-emerald-600 outline-none shadow-xs transition"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-medium text-slate-700">Açıklama / Not (Opsiyonel)</span>
          <textarea
            rows={2}
            value={form.support_note} onChange={set('support_note')}
            placeholder="Örn: Müşteri adresi telefonla teyit edilerek düzeltildi."
            className="mt-1 block w-full rounded-xl border border-slate-200/70 glass-card px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:bg-white/80 focus:ring-1 focus:ring-emerald-600 outline-none shadow-xs transition"
          />
        </label>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/50">
          <button
            type="button" onClick={onClose}
            className="rounded-xl border border-slate-200/70 glass-card px-4 py-2 text-xs font-medium text-slate-700 hover:!bg-white/80 transition cursor-pointer shadow-xs"
          >
            İptal
          </button>
          <button
            type="submit" disabled={loading}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-medium transition cursor-pointer disabled:opacity-50 shadow-sm active:scale-98"
          >
            {loading ? 'Kaydediliyor...' : 'Anomaliyi Çöz'}
          </button>
        </div>
      </form>
    </div>
  );
}
