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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border-2 border-zinc-200"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-black text-black">Anomali Çözümü</h3>
            <p className="text-xs text-zinc-500 font-medium">Sipariş #{order.id} — {order.customer_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-black text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-2 mb-3 rounded bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-bold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4 mb-3">
          <label className="block">
            <span className="text-xs font-bold text-black">Yeni Enlem (Latitude)</span>
            <input
              type="number" step="any" required
              value={form.new_latitude} onChange={set('new_latitude')}
              placeholder="Örn: 37.7765"
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-1.5 text-sm text-black focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-black">Yeni Boylam (Longitude)</span>
            <input
              type="number" step="any" required
              value={form.new_longitude} onChange={set('new_longitude')}
              placeholder="Örn: 29.0864"
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-1.5 text-sm text-black focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-xs font-bold text-black">Destek Temsilcisi Adı</span>
          <input
            type="text" required
            value={form.resolved_by} onChange={set('resolved_by')}
            placeholder="Örn: ahmet.destek"
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-1.5 text-sm text-black focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-bold text-black">Açıklama / Not (Opsiyonel)</span>
          <textarea
            rows={2}
            value={form.support_note} onChange={set('support_note')}
            placeholder="Örn: Müşteri adresi telefonla teyit edilerek düzeltildi."
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-1.5 text-sm text-black focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </label>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-200">
          <button
            type="button" onClick={onClose}
            className="rounded border border-zinc-300 bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit" disabled={loading}
            className="rounded bg-green-700 hover:bg-green-800 text-white px-4 py-1.5 text-xs font-black transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Anomaliyi Çöz'}
          </button>
        </div>
      </form>
    </div>
  );
}
