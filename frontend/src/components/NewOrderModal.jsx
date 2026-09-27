import { useState, useRef } from 'react';
import { createOrder } from '../api';

const REAL_ORDERS_POOL = [
  { customer_name: 'Burak Şen', raw_address: 'Çamlık Bulvarı, Pamukkale, Denizli', weight: 4.5 },
  { customer_name: 'Selin Aksoy', raw_address: 'Fatih Sultan Mehmet Caddesi, Merkezefendi, Denizli', weight: 5.2 },
  { customer_name: 'Hakan Öztürk', raw_address: 'Hüseyin Yılmaz Caddesi, Pamukkale, Denizli', weight: 8.0 },
  { customer_name: 'Zeynep Korkmaz', raw_address: 'Gazi Mustafa Kemal Bulvarı, Denizli', weight: 3.0 },
  { customer_name: 'Murat Çelik', raw_address: 'Lise Caddesi, Pamukkale, Denizli', weight: 12.0 },
  { customer_name: 'Ece Yıldırım', raw_address: 'Hasan Gönüllü Bulvarı, Merkezefendi, Denizli', weight: 6.5 },
  { customer_name: 'Onur Demirtaş', raw_address: 'İstiklal Caddesi, Pamukkale, Denizli', weight: 7.0 },
  { customer_name: 'Gizem Koç', raw_address: 'Kıbrıs Şehitleri Caddesi, Denizli', weight: 9.3 },
  { customer_name: 'Tolga Arslan', raw_address: 'İnönü Caddesi, Pamukkale, Denizli', weight: 4.0 },
  { customer_name: 'Aslıhan Kara', raw_address: 'Atatürk Caddesi, Pamukkale, Denizli', weight: 5.8 },
  { customer_name: 'Cem Kaya', raw_address: 'Zübeyde Hanım Caddesi, Denizli', weight: 6.2 },
  { customer_name: 'Duygu Demir', raw_address: 'Çamlık Caddesi, Pamukkale, Denizli', weight: 3.8 },
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
  const [notification, setNotification] = useState(null);
  const notifTimerRef = useRef(null);

  const showNotification = (notif) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification(notif);
    notifTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

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
      onCreated(false); // Manual submit closes modal
    } catch (err) {
      setError(err.response?.data?.detail || 'Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Directly create a distinct real order automatically without closing modal
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
      showNotification({
        type: 'success',
        text: `Gerçek sipariş oluşturuldu: ${item.customer_name} (${item.raw_address})`,
      });
      onCreated(true); // Keep modal open!
    } catch (err) {
      setError(err.response?.data?.detail || 'Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Directly create a distinct anomaly order automatically without closing modal
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
      showNotification({
        type: 'warning',
        text: `Anomali siparişi oluşturuldu: ${item.customer_name} (${item.raw_address})`,
      });
      onCreated(true); // Keep modal open!
    } catch (err) {
      setError(err.response?.data?.detail || 'Anomali siparişi oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-2xl border-2 border-zinc-200 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-black text-black">Yeni Sipariş Ekle</h3>
            <p className="text-xs text-zinc-500 font-semibold mt-0.5">
              Hızlı rastgele sipariş ekleyebilir veya özel adres girebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-black text-xl font-bold cursor-pointer transition p-1 hover:bg-zinc-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* 2 Quick Automatic Order Creation Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            disabled={loading}
            onClick={handleAutoCreateReal}
            className="py-2.5 px-4 rounded-xl border-2 border-green-500 bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-950 text-xs font-black transition cursor-pointer text-center shadow-xs active:scale-98"
          >
            {loading ? 'Oluşturuluyor...' : '+ Gerçek Sipariş Oluştur'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleAutoCreateAnomaly}
            className="py-2.5 px-4 rounded-xl border-2 border-rose-400 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-950 text-xs font-black transition cursor-pointer text-center shadow-xs active:scale-98"
          >
            {loading ? 'Oluşturuluyor...' : '+ Anomali Sipariş Oluştur'}
          </button>
        </div>

        {/* Fixed-Height Feedback Slot (Prevents layout shift & button jump) */}
        <div className="h-12 mb-4 flex items-center">
          {error ? (
            <div className="w-full h-full flex items-center px-3.5 rounded-xl text-xs font-bold border-2 bg-red-50 border-red-200 text-red-700 truncate animate-in fade-in duration-150">
              <span className="truncate">{error}</span>
            </div>
          ) : notification ? (
            <div
              className={`w-full h-full flex items-center px-3.5 rounded-xl text-xs font-bold border-2 transition-all duration-200 truncate animate-in fade-in duration-150 ${
                notification.type === 'success'
                  ? 'bg-green-100 border-green-300 text-green-900'
                  : 'bg-amber-100 border-amber-300 text-amber-900'
              }`}
            >
              <span className="truncate">{notification.text}</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center px-3.5 rounded-xl text-xs font-medium text-zinc-400 border border-dashed border-zinc-200 bg-zinc-50/60">
              <span>Hızlı sipariş eklemek için yukarıdaki butonları kullanabilirsiniz.</span>
            </div>
          )}
        </div>

        <label className="block mb-3.5">
          <span className="text-xs font-black text-black">Müşteri Adı Soyadı</span>
          <input
            type="text"
            required
            value={form.customer_name}
            onChange={set('customer_name')}
            placeholder="Örn: Ahmet Yılmaz"
            className="mt-1.5 block w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-black focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </label>

        <label className="block mb-3.5">
          <span className="text-xs font-black text-black">Teslimat Adresi</span>
          <textarea
            rows={3}
            required
            value={form.raw_address}
            onChange={set('raw_address')}
            placeholder="Örn: Çamlaraltı Mahallesi, Çamlık Caddesi Pamukkale Denizli"
            className="mt-1.5 block w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-black focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
          <span className="text-[11px] text-zinc-500 mt-1 block font-medium">
            Adres arka planda Nominatim ile coğrafi koordinatlara dönüştürülecektir.
          </span>
        </label>

        <label className="block mb-5">
          <span className="text-xs font-black text-black">Paket Ağırlığı (kg)</span>
          <input
            type="number"
            step="0.1"
            min="0.1"
            required
            value={form.weight}
            onChange={set('weight')}
            className="mt-1.5 block w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-black focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
          />
        </label>

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 bg-white px-5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            Kapat
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-green-700 px-5 py-2 text-xs font-black text-white hover:bg-green-800 disabled:opacity-50 transition cursor-pointer shadow-xs active:scale-98"
          >
            {loading ? 'Kaydediliyor...' : 'Manuel Siparişi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
