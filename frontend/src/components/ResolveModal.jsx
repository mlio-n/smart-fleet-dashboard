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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 p-4 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl glass-panel p-6 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden shadow-xl shadow-green-900/10"
      >
        {/* Specular highlight border effect at top */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200/60">
          <div className="flex items-start gap-2.5">
            <span className="flex h-2.5 w-2.5 relative mt-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
            </span>
            <div>
              <h3 className="text-lg font-medium text-gray-800 tracking-tight">Anomali Çözümü</h3>
              <p className="text-xs text-gray-500 font-normal mt-0.5">Sipariş #{order.id} — {order.customer_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-xl hover:bg-white/60 transition cursor-pointer"
          >
            ✕ Kapat
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50/80 border border-rose-200/70 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="glass-card rounded-2xl p-5 border border-white/60 mb-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Yeni Enlem (Latitude)</span>
              <input
                type="number" step="any" required
                value={form.new_latitude} onChange={set('new_latitude')}
                placeholder="Örn: 37.7765"
                className="mt-1.5 block w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none transition"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Yeni Boylam (Longitude)</span>
              <input
                type="number" step="any" required
                value={form.new_longitude} onChange={set('new_longitude')}
                placeholder="Örn: 29.0864"
                className="mt-1.5 block w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none transition"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Destek Temsilcisi Adı</span>
            <input
              type="text" required
              value={form.resolved_by} onChange={set('resolved_by')}
              placeholder="Örn: ahmet.destek"
              className="mt-1.5 block w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none transition"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Açıklama / Not (Opsiyonel)</span>
            <textarea
              rows={2}
              value={form.support_note} onChange={set('support_note')}
              placeholder="Örn: Müşteri adresi telefonla teyit edilerek düzeltildi."
              className="mt-1.5 block w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none transition resize-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200/60">
          <button
            type="button" onClick={onClose}
            className="rounded-2xl border border-gray-200/70 bg-gray-50/80 hover:bg-white px-5 py-3 text-sm font-medium text-gray-700 transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit" disabled={loading}
            className="rounded-2xl bg-green-700 hover:bg-green-800 text-white font-medium py-3.5 px-6 text-sm shadow-lg shadow-green-900/15 transition active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Anomaliyi Çöz'}
          </button>
        </div>
      </form>
    </div>
  );
}
