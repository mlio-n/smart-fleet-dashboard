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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm">🛠️</span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Anomali Çözümü</h3>
              <p className="text-xs text-slate-400">Sipariş #{order.id} — {order.customer_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4 mb-3.5">
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Yeni Enlem (Latitude)</span>
            <input
              type="number" step="any" required
              value={form.new_latitude} onChange={set('new_latitude')}
              placeholder="Örn: 37.7765"
              className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm font-mono-num text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Yeni Boylam (Longitude)</span>
            <input
              type="number" step="any" required
              value={form.new_longitude} onChange={set('new_longitude')}
              placeholder="Örn: 29.0864"
              className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm font-mono-num text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </label>
        </div>

        <label className="block mb-3.5">
          <span className="text-xs font-semibold text-slate-300">Destek Temsilcisi Adı</span>
          <input
            type="text" required
            value={form.resolved_by} onChange={set('resolved_by')}
            placeholder="Örn: ahmet.destek"
            className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </label>

        <label className="block mb-6">
          <span className="text-xs font-semibold text-slate-300">Açıklama / Not (Opsiyonel)</span>
          <textarea
            rows={2}
            value={form.support_note} onChange={set('support_note')}
            placeholder="Örn: Müşteri adresi telefonla teyit edilerek düzeltildi."
            className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button" onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit" disabled={loading}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-5 py-2 text-xs font-bold transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Anomaliyi Çöz'}
          </button>
        </div>
      </form>
    </div>
  );
}
