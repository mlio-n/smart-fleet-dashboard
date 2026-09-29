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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl glass-panel p-6 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.25)]"
      >
        {/* Glass specular top reflection highlight */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {/* Top Status & Close Header (Exact NavigationHUD Style) */}
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full px-3 py-1 text-xs font-medium">
              Sipariş Girişi · Yeni Kayıt
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-white/60 transition cursor-pointer"
          >
            ✕ Kapat
          </button>
        </div>

        {/* Mini Info Banner */}
        <div className="relative flex items-center justify-between text-xs font-medium text-slate-700 glass-card rounded-xl px-4 py-2 mb-3.5 border border-white/60">
          <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
            Akıllı Adres Çözümleme
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Otomatik Koordinat & Anomali Kontrolü
          </span>
        </div>

        {/* 2 Quick Automatic Order Creation Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleAutoCreateReal}
            className="py-2.5 px-3.5 rounded-xl border border-emerald-200/60 glass-card hover:!bg-emerald-50/70 disabled:opacity-50 text-emerald-900 text-xs font-semibold transition active:scale-98 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            + Hızlı Gerçek Sipariş
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleAutoCreateAnomaly}
            className="py-2.5 px-3.5 rounded-xl border border-rose-200/60 glass-card hover:!bg-rose-50/70 disabled:opacity-50 text-rose-900 text-xs font-semibold transition active:scale-98 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            + Anomali Sipariş Ekle
          </button>
        </div>

        {/* Fixed-Height Feedback Slot */}
        <div className="h-10 mb-3.5 flex items-center">
          {error ? (
            <div className="w-full h-full flex items-center px-3.5 rounded-xl text-xs font-medium border border-rose-200 bg-rose-50/80 text-rose-700 truncate animate-in fade-in duration-150">
              <span className="truncate">{error}</span>
            </div>
          ) : notification ? (
            <div
              className={`w-full h-full flex items-center px-3.5 rounded-xl text-xs font-medium border transition-all duration-200 truncate animate-in fade-in duration-150 ${
                notification.type === 'success'
                  ? 'bg-emerald-50/80 border-emerald-300/80 text-emerald-800'
                  : 'bg-amber-50/80 border-amber-300/80 text-amber-800'
              }`}
            >
              <span className="truncate">{notification.text}</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center px-3.5 rounded-xl text-[11px] font-normal text-slate-400 border border-dashed border-slate-200/70 glass-card">
              <span>Rastgele örnek veri için yukarıdaki hızlı butonları kullanabilirsiniz.</span>
            </div>
          )}
        </div>

        {/* Manual Inputs Section (Glass Card Enclosure) */}
        <div className="glass-card rounded-2xl p-4 border border-white/60 mb-4 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Müşteri Adı Soyadı
            </label>
            <input
              type="text"
              required
              value={form.customer_name}
              onChange={set('customer_name')}
              placeholder="Örn: Ahmet Yılmaz"
              className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none shadow-2xs transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Teslimat Adresi
            </label>
            <textarea
              rows={2}
              required
              value={form.raw_address}
              onChange={set('raw_address')}
              placeholder="Örn: Çamlaraltı Mahallesi, Çamlık Caddesi Pamukkale Denizli"
              className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none shadow-2xs transition resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Paket Ağırlığı (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              required
              value={form.weight}
              onChange={set('weight')}
              className="w-full rounded-xl border border-slate-200/60 bg-white/70 px-3.5 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none shadow-2xs transition"
            />
          </div>
        </div>

        {/* Action Button (Exact NavigationHUD Style) */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 text-sm shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>{loading ? 'Kaydediliyor...' : 'Siparişi Sisteme Ekle'}</span>
        </button>
      </form>
    </div>
  );
}
