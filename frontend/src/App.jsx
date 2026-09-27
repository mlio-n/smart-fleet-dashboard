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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Top Stats Bar */}
      <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="w-[380px] flex-shrink-0 flex flex-col bg-slate-50 border-r border-slate-200/80">
          {/* Header & New Order button */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[15px] font-bold text-slate-800 tracking-tight">
                  Smart Fleet
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  {loading ? 'Yükleniyor...' : `${filteredOrders.length} sipariş listelendi`}
                  {statusFilter && <> · Filtre: {statusFilter.replace('_', ' ')}</>}
                </p>
              </div>

              <button
                onClick={() => setIsNewOrderOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700 transition-all duration-150 cursor-pointer shadow-sm shadow-indigo-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Yeni Sipariş
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-3 relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri veya adres ara..."
                className="w-full rounded-lg ring-1 ring-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all duration-150"
              />
            </div>
          </div>

          {/* Order list */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-3">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            {!loading && !error && filteredOrders.length === 0 && (
              <div className="rounded-xl bg-white border border-slate-200 p-8 text-center my-4 shadow-sm">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm font-semibold text-slate-600">Sipariş bulunamadı.</p>
                <p className="text-xs text-slate-400 mt-1">Arama kriterlerinizi değiştirebilir veya yeni bir sipariş ekleyebilirsiniz.</p>
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
        <main className="flex-1 relative">
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
