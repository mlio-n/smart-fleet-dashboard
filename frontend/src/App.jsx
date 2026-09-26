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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      {/* Top Stats Bar */}
      <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="w-[360px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white shadow-xs">
          {/* Header & New Order button */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                  <span>🛰️</span> Smart Fleet
                </h1>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {loading ? 'Yükleniyor...' : `${filteredOrders.length} sipariş listelendi`}
                  {statusFilter && <> · Filtre: {statusFilter.replace('_', ' ')}</>}
                </p>
              </div>

              <button
                onClick={() => setIsNewOrderOpen(true)}
                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer shadow-2xs"
              >
                <span>+</span> Yeni Sipariş
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-2.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri veya adres ara..."
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Order list */}
          <div className="flex-1 overflow-y-auto p-2">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-2">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {!loading && !error && filteredOrders.length === 0 && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-6 text-center my-4">
                <p className="text-sm font-medium text-gray-600">Sipariş bulunamadı.</p>
                <p className="text-xs text-gray-400 mt-1">Arama kriterlerinizi değiştirebilir veya yeni bir sipariş ekleyebilirsiniz.</p>
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
