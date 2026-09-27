import { useState } from 'react';
import { createOrder } from '../api';

export default function NewOrderModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: '',
    raw_address: '',
    weight: 1.0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.raw_address.trim()) {
      setError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createOrder({
        customer_name: form.customer_name.trim(),
        raw_address: form.raw_address.trim(),
        weight: parseFloat(form.weight) || 1.0,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm">📦</span>
            <h3 className="text-base font-bold text-white tracking-tight">Yeni Sipariş Oluştur</h3>
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
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 font-medium">
            ⚠️ {error}
          </div>
        )}

        <label className="block mb-3.5">
          <span className="text-xs font-semibold text-slate-300">Müşteri Adı Soyadı</span>
          <input
            type="text"
            required
            value={form.customer_name}
            onChange={set('customer_name')}
            placeholder="Örn: Ahmet Yılmaz"
            className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </label>

        <label className="block mb-3.5">
          <span className="text-xs font-semibold text-slate-300">Teslimat Adresi</span>
          <textarea
            rows={3}
            required
            value={form.raw_address}
            onChange={set('raw_address')}
            placeholder="Örn: Çamlaraltı Mah. Üniversite Cad. No:15 Pamukkale Denizli"
            className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">Adres otomatik olarak arka planda Nominatim ile coğrafi konuma dönüştürülecektir.</span>
        </label>

        <label className="block mb-6">
          <span className="text-xs font-semibold text-slate-300">Paket Ağırlığı (kg)</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            required
            value={form.weight}
            onChange={set('weight')}
            className="mt-1 block w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm font-mono-num text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-5 py-2 text-xs font-bold transition cursor-pointer shadow-lg shadow-indigo-500/25 disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Siparişi Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
