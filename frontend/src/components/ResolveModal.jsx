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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-white/85 backdrop-blur-2xl p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-white/70 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden"
      >
        {/* Specular highlight border effect at top */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200/60">
          <div>
            <h3 className="text-base font-black text-black">Anomali Çözümü</h3>
            <p className="text-xs text-zinc-500 font-medium">Sipariş #{order.id} — {order.customer_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-black text-lg font-bold cursor-pointer transition p-1 hover:bg-zinc-100/80 rounded-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-2 mb-3 rounded-xl bg-red-50/90 border border-red-200 p-2.5 text-xs text-red-700 font-bold backdrop-blur-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
          <label className="block">
            <span className="text-xs font-black text-black">Yeni Enlem (Latitude)</span>
            <input
              type="number" step="any" required
              value={form.new_latitude} onChange={set('new_latitude')}
              placeholder="Örn: 37.7765"
              className="mt-1 block w-full rounded-xl border border-zinc-200/90 bg-white/80 backdrop-blur-xs px-3.5 py-2 text-sm text-black focus:border-green-600 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none shadow-xs transition"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-black">Yeni Boylam (Longitude)</span>
            <input
              type="number" step="any" required
              value={form.new_longitude} onChange={set('new_longitude')}
              placeholder="Örn: 29.0864"
              className="mt-1 block w-full rounded-xl border border-zinc-200/90 bg-white/80 backdrop-blur-xs px-3.5 py-2 text-sm text-black focus:border-green-600 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none shadow-xs transition"
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-xs font-black text-black">Destek Temsilcisi Adı</span>
          <input
            type="text" required
            value={form.resolved_by} onChange={set('resolved_by')}
            placeholder="Örn: ahmet.destek"
            className="mt-1 block w-full rounded-xl border border-zinc-200/90 bg-white/80 backdrop-blur-xs px-3.5 py-2 text-sm text-black focus:border-green-600 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none shadow-xs transition"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-black text-black">Açıklama / Not (Opsiyonel)</span>
          <textarea
            rows={2}
            value={form.support_note} onChange={set('support_note')}
            placeholder="Örn: Müşteri adresi telefonla teyit edilerek düzeltildi."
            className="mt-1 block w-full rounded-xl border border-zinc-200/90 bg-white/80 backdrop-blur-xs px-3.5 py-2 text-sm text-black focus:border-green-600 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none shadow-xs transition"
          />
        </label>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-200/60">
          <button
            type="button" onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white/70 backdrop-blur-xs px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-white transition cursor-pointer shadow-xs"
          >
            İptal
          </button>
          <button
            type="submit" disabled={loading}
            className="rounded-xl bg-green-700 hover:bg-green-800 text-white px-5 py-2 text-xs font-black transition cursor-pointer disabled:opacity-50 shadow-xs active:scale-98"
          >
            {loading ? 'Kaydediliyor...' : 'Anomaliyi Çöz'}
          </button>
        </div>
      </form>
    </div>
  );
}
