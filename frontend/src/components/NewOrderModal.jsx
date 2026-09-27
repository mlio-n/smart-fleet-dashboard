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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-gray-200"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">📦 Yeni Sipariş Ekle</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
            {error}
          </div>
        )}

        <label className="block mb-3">
          <span className="text-xs font-semibold text-gray-700">Müşteri Adı Soyadı</span>
          <input
            type="text"
            required
            value={form.customer_name}
            onChange={set('customer_name')}
            placeholder="Örn: Ahmet Yılmaz"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs font-semibold text-gray-700">Teslimat Adresi</span>
          <textarea
            rows={3}
            required
            value={form.raw_address}
            onChange={set('raw_address')}
            placeholder="Örn: Çamlaraltı Mah. Üniversite Cad. No:15 Pamukkale Denizli"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <span className="text-[11px] text-gray-500 mt-1 block">Adres otomatik olarak arka planda Nominatim ile coğrafi konuma dönüştürülecektir.</span>
        </label>

        <label className="block mb-5">
          <span className="text-xs font-semibold text-gray-700">Paket Ağırlığı (kg)</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            required
            value={form.weight}
            onChange={set('weight')}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </label>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? 'Kaydediliyor...' : 'Siparişi Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
