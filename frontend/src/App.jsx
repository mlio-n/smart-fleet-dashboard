import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchOrders, fetchStats, deleteOrder, regeocodeOrder } from './api';
import StatsBar from './components/StatsBar';
import OrderCard from './components/OrderCard';
import ResolveModal from './components/ResolveModal';
import NewOrderModal from './components/NewOrderModal';
import RoutePanel from './components/RoutePanel';
import MapView from './components/MapView';

const REFRESH_MS = 10_000;

export default function App() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [routes, setRoutes] = useState(null);

  // ─── Data fetching ───────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([
        fetchOrders(statusFilter),
        fetchStats(),
      ]);
      setOrders(ordersData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error('Fetch failed:', err);
      setError('Backend API servisine ulaşılamadı.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Handle delete order
  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteOrder(orderId);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Sipariş silinirken hata oluştu.');
    }
  };

  // Handle re-geocode order
  const handleRegeocode = async (orderId) => {
    try {
      await regeocodeOrder(orderId);
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Yeniden geocoding başlatılamadı.');
    }
  };

  // Filter orders by text search
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.customer_name?.toLowerCase().includes(q) ||
        o.raw_address?.toLowerCase().includes(q) ||
        o.id.toString().includes(q)
    );
  }, [orders, searchQuery]);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Enterprise Header & Stats */}
      <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="w-[380px] flex-shrink-0 flex flex-col bg-slate-950 border-r border-slate-800">
          {/* Header & Search */}
          <div className="px-5 pt-4 pb-3 bg-slate-950 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lojistik Akışı
                </h2>
                <p className="text-[11px] font-mono-num text-slate-500 mt-0.5">
                  {loading ? 'Yükleniyor...' : `${filteredOrders.length} sipariş listelendi`}
                  {statusFilter && <span className="text-indigo-400"> · {statusFilter}</span>}
                </p>
              </div>

              <button
                onClick={() => setIsNewOrderOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-3 py-1.5 text-xs font-bold transition shadow-lg shadow-indigo-500/25 cursor-pointer active:scale-95"
              >
                <span>+</span> Yeni Sipariş
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-3 relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri adı veya adres ara..."
                className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Order list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 font-medium">
                ⚠️ {error}
              </div>
            )}

            {!loading && !error && filteredOrders.length === 0 && (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center my-4">
                <div className="text-3xl mb-2">📦</div>
                <p className="text-xs font-bold text-slate-300">Sipariş bulunamadı.</p>
                <p className="text-[11px] text-slate-500 mt-1">Arama kriterlerinizi değiştirebilir veya yeni bir sipariş ekleyebilirsiniz.</p>
              </div>
            )}

            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onSelect={setSelectedOrder}
                onResolve={setResolveTarget}
                onRetry={handleRegeocode}
                onDelete={handleDeleteOrder}
              />
            ))}
          </div>

          {/* Route generation panel */}
          <RoutePanel onRoutesGenerated={(data) => { setRoutes(data); refresh(); }} />
        </aside>

        {/* ── Interactive Map ──────────────────────────────────── */}
        <main className="flex-1 relative bg-slate-950">
          <MapView orders={filteredOrders} selectedOrder={selectedOrder} routes={routes} />
        </main>
      </div>

      {/* New Order Modal */}
      {isNewOrderOpen && (
        <NewOrderModal
          onClose={() => setIsNewOrderOpen(false)}
          onCreated={() => {
            setIsNewOrderOpen(false);
            refresh();
          }}
        />
      )}

      {/* Resolve Anomaly Modal */}
      {resolveTarget && (
        <ResolveModal
          order={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={() => {
            setResolveTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
