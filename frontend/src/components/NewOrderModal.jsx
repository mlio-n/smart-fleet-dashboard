import { useState } from 'react';
import { createOrder } from '../api';

const REAL_ORDERS_POOL = [
  { customer_name: 'Burak Şen', raw_address: 'Çamlaraltı Mahallesi, Çamlık Caddesi No:42 Pamukkale Denizli', weight: 4.5 },
  { customer_name: 'Selin Aksoy', raw_address: 'Sırakapılar Mahallesi, Şehit Albay Karaoğlanoğlu Caddesi No:18 Merkezefendi Denizli', weight: 5.2 },
  { customer_name: 'Hakan Öztürk', raw_address: 'Kınıklı Mahallesi, Hüseyin Yılmaz Caddesi No:8 Pamukkale Denizli', weight: 8.0 },
  { customer_name: 'Zeynep Korkmaz', raw_address: 'Altıntop Mahallesi, Gazi Mustafa Kemal Bulvarı No:65 Merkezefendi Denizli', weight: 3.0 },
  { customer_name: 'Murat Çelik', raw_address: 'Değirmenönü Mahallesi, Lise Caddesi No:24 Pamukkale Denizli', weight: 12.0 },
  { customer_name: 'Ece Yıldırım', raw_address: 'Adalet Mahallesi, Hasan Gönüllü Bulvarı No:31 Merkezefendi Denizli', weight: 6.5 },
  { customer_name: 'Onur Demirtaş', raw_address: 'İstiklal Mahallesi, İstiklal Caddesi No:53 Pamukkale Denizli', weight: 7.0 },
  { customer_name: 'Gizem Koç', raw_address: 'Servergazi Mahallesi, Fatih Sultan Mehmet Caddesi No:14 Merkezefendi Denizli', weight: 9.3 },
  { customer_name: 'Tolga Arslan', raw_address: 'Mehmetçik Mahallesi, Çamlık Bulvarı No:27 Pamukkale Denizli', weight: 4.0 },
  { customer_name: 'Aslıhan Kara', raw_address: 'Kuşpınar Mahallesi, Emek Caddesi No:15 Pamukkale Denizli', weight: 5.8 },
];

const ANOMALY_ORDERS_POOL = [
  { customer_name: 'Ahmet Karabulut', raw_address: 'Denizli Türkiye', weight: 3.0 },
  { customer_name: 'Kemal Vural', raw_address: 'Ege Bölgesi Dağıtım', weight: 4.0 },
  { customer_name: 'Derya Güneş', raw_address: 'Merkezefendi Denizli', weight: 7.5 },
  { customer_name: 'Barış Aslan', raw_address: 'Pamukkale Türkiye', weight: 2.5 },
  { customer_name: 'Fatma Erdem', raw_address: 'Denizli Otogar Arkası', weight: 5.0 },
  { customer_name: 'Volkan Şimşek', raw_address: 'Honaz Denizli', weight: 6.0 },
  { customer_name: 'Seda Yücel', raw_address: 'Denizli Sanayi Sitesi', weight: 11.0 },
  { customer_name: 'Ali Çetin', raw_address: 'Güney Ege Dağıtım', weight: 3.5 },
];

let lastRealIndex = -1;
let lastAnomalyIndex = -1;

function pickRandomDistinct(pool, lastIndex) {
  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * pool.length);
  } while (pool.length > 1 && nextIndex === lastIndex);
  return { item: pool[nextIndex], index: nextIndex };
}

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

  // Directly create a distinct real order automatically
  const handleAutoCreateReal = async () => {
    setLoading(true);
    setError(null);
    const { item, index } = pickRandomDistinct(REAL_ORDERS_POOL, lastRealIndex);
    lastRealIndex = index;
    try {
      await createOrder({
        customer_name: item.customer_name,
        raw_address: item.raw_address,
        weight: item.weight,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Sipariş oluşturulamadı.');
      setLoading(false);
    }
  };

  // Directly create a distinct anomaly order automatically
  const handleAutoCreateAnomaly = async () => {
    setLoading(true);
    setError(null);
    const { item, index } = pickRandomDistinct(ANOMALY_ORDERS_POOL, lastAnomalyIndex);
    lastAnomalyIndex = index;
    try {
      await createOrder({
        customer_name: item.customer_name,
        raw_address: item.raw_address,
        weight: item.weight,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || 'Anomali siparişi oluşturulamadı.');
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border-2 border-zinc-200"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-black">Yeni Sipariş Ekle</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-black text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 2 Quick Automatic Order Creation Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            disabled={loading}
            onClick={handleAutoCreateReal}
            className="py-2 px-3 rounded-lg border border-green-300 bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-900 text-xs font-black transition cursor-pointer text-center shadow-xs"
          >
            {loading ? 'Oluşturuluyor...' : '+ Gerçek Sipariş Oluştur'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleAutoCreateAnomaly}
            className="py-2 px-3 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-900 text-xs font-black transition cursor-pointer text-center shadow-xs"
          >
            {loading ? 'Oluşturuluyor...' : '+ Anomali Sipariş Oluştur'}
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-bold">
            {error}
          </div>
        )}

        <label className="block mb-3">
          <span className="text-xs font-bold text-black">Müşteri Adı Soyadı</span>
          <input
            type="text"
            required
            value={form.customer_name}
            onChange={set('customer_name')}
            placeholder="Örn: Ahmet Yılmaz"
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs font-bold text-black">Teslimat Adresi</span>
          <textarea
            rows={3}
            required
            value={form.raw_address}
            onChange={set('raw_address')}
            placeholder="Örn: Çamlaraltı Mah. Üniversite Cad. No:15 Pamukkale Denizli"
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
          <span className="text-[11px] text-zinc-500 mt-1 block font-medium">Adres otomatik olarak arka planda Nominatim ile coğrafi konuma dönüştürülecektir.</span>
        </label>

        <label className="block mb-5">
          <span className="text-xs font-bold text-black">Paket Ağırlığı (kg)</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            required
            value={form.weight}
            onChange={set('weight')}
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </label>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-green-700 px-4 py-1.5 text-xs font-black text-white hover:bg-green-800 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? 'Kaydediliyor...' : 'Siparişi Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
