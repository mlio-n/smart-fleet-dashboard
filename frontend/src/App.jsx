import { useState, useEffect, useCallback } from 'react';
import { fetchOrders, fetchStats } from './api';
import StatsBar from './components/StatsBar';
import OrderCard from './components/OrderCard';
import ResolveModal from './components/ResolveModal';
import RoutePanel from './components/RoutePanel';
import MapView from './components/MapView';

const REFRESH_MS = 10_000;

export default function App() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
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
      setError('Could not reach the backend API.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
      {/* Stats bar */}
      <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="w-[340px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
          <div className="p-3 border-b border-gray-100">
            <h1 className="text-base font-bold text-gray-800">Smart Fleet Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Loading...' : `${orders.length} order(s)`}
              {statusFilter && <> · Filtered: {statusFilter.replace('_', ' ')}</>}
            </p>
          </div>

          {/* Order list */}
          <div className="flex-1 overflow-y-auto p-2">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-2">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {!loading && !error && orders.length === 0 && (
              <div className="rounded-md bg-gray-50 border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">No orders found.</p>
              </div>
            )}

            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onSelect={setSelectedOrder}
                onResolve={setResolveTarget}
              />
            ))}
          </div>

          {/* Route generation panel */}
          <RoutePanel onRoutesGenerated={(data) => { setRoutes(data); refresh(); }} />
        </aside>

        {/* ── Map ──────────────────────────────────────────────── */}
        <main className="flex-1">
          <MapView orders={orders} selectedOrder={selectedOrder} routes={routes} />
        </main>
      </div>

      {/* Resolve modal */}
      {resolveTarget && (
        <ResolveModal
          order={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={() => { setResolveTarget(null); refresh(); }}
        />
      )}
    </div>
  );
}
