import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchOrders, fetchStats, deleteOrder, clearAllOrders, regeocodeOrder, updateOrder } from './api';
import StatsBar from './components/StatsBar';
import OrderCard from './components/OrderCard';
import ResolveModal from './components/ResolveModal';
import NewOrderModal from './components/NewOrderModal';
import RoutePanel from './components/RoutePanel';
import MapView from './components/MapView';
import NavigationHUD from './components/NavigationHUD';
import { calculateDistanceKm } from './utils/geo';
import { REFRESH_MS, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } from './constants';

export default function App() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [routes, setRoutes] = useState(null);

  // ─── Navigation Mode State ─────────────────────────────────────────
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // ─── Resizable Sidebar State (Default 25%) ─────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.round(window.innerWidth * 0.25);
    }
    return 380;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Proportional scaling factor relative to default width (380px)
  const scale = useMemo(() => {
    return Math.max(0.75, Math.min(2.2, sidebarWidth / 380));
  }, [sidebarWidth]);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e) => {
      if (isResizing) {
        const newWidth = Math.min(Math.max(e.clientX, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

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
  const handleDeleteOrder = useCallback(async (orderId) => {
    try {
      await deleteOrder(orderId);
      setSelectedOrder((current) => (current?.id === orderId ? null : current));
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Sipariş silinirken hata oluştu.');
    }
  }, [refresh]);

  // Handle clear all orders
  const handleClearAllOrders = useCallback(async () => {
    if (!window.confirm('Tüm siparişleri ve mevcut rotayı silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await clearAllOrders();
      setSelectedOrder(null);
      setRoutes(null);
      refresh();
    } catch (err) {
      alert('Siparişler temizlenirken hata oluştu.');
    }
  }, [refresh]);

  // Handle re-geocode order
  const handleRegeocode = useCallback(async (orderId) => {
    try {
      await regeocodeOrder(orderId);
      refresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Yeniden geocoding başlatılamadı.');
    }
  }, [refresh]);

  // ─── Navigation Stops & Distance ─────────────────────────────────
  const activeRoute = routes?.routes?.[0];
  const allStops = useMemo(() => activeRoute?.stops || [], [activeRoute]);

  // Filter only customer delivery stops (ignoring starting depot)
  const deliveryStops = useMemo(() => {
    return allStops.filter((s) => s.node !== 'DEPOT');
  }, [allStops]);

  // Current target customer stop
  const currentTargetStop = deliveryStops[currentStopIndex] || null;

  // Previous stop location for distance calculation
  const prevStop = useMemo(() => {
    if (currentStopIndex === 0) {
      // First stop: origin is depot (courier starting point)
      return allStops[0] || { lat: 37.7765, lon: 29.0864 };
    }
    return deliveryStops[currentStopIndex - 1] || allStops[0];
  }, [currentStopIndex, deliveryStops, allStops]);

  // Distance from previous stop to current stop
  const distanceToNextStop = useMemo(() => {
    if (!currentTargetStop || !prevStop) return 0;
    return calculateDistanceKm(
      prevStop.lat,
      prevStop.lon,
      currentTargetStop.lat,
      currentTargetStop.lon
    );
  }, [prevStop, currentTargetStop]);

  // Start Navigation Journey (Zooms directly to courier's center location)
  const handleStartJourney = useCallback((routeData) => {
    setRoutes(routeData);
    setIsNavigating(true);
    setCurrentStopIndex(0);
    setSelectedOrder(null); // Lets MapView zoom directly to courier center
  }, []);

  // Exit Navigation Mode
  const handleExitNavigation = useCallback(() => {
    setIsNavigating(false);
    setCurrentStopIndex(0);
    setSelectedOrder(null);
  }, []);

  // Mark Delivered & Advance to Next Stop
  const handleMarkDelivered = async () => {
    if (!currentTargetStop) return;

    try {
      if (currentTargetStop.order_id) {
        await updateOrder(currentTargetStop.order_id, { status: 'DELIVERED' });
      }
    } catch (err) {
      console.error('Could not update order status to DELIVERED:', err);
    }

    const nextIndex = currentStopIndex + 1;
    setCurrentStopIndex(nextIndex);
    refresh();
  };

  // Dynamic layout values based on scale
  const headerTitleSize = Math.round(14 * scale);
  const headerSubtitleSize = Math.round(11.5 * scale);
  const newOrderBtnSize = Math.round(12 * scale);
  const paddingScaled = Math.round(12 * scale);
  const listGap = Math.round(10 * scale);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-slate-900 ${
        isResizing ? 'select-none cursor-col-resize' : ''
      }`}
    >
      {/* ── Background Live Map (Full Viewport Underlay) ──────── */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapView
          orders={orders}
          selectedOrder={selectedOrder}
          routes={routes}
          isNavigating={isNavigating}
          currentStopIndex={currentStopIndex}
          deliveryStops={deliveryStops}
        />
      </div>

      {/* ── Top Floating Glass Island (iOS Style) ── */}
      <div
        className={`absolute top-3.5 inset-x-4 z-30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isNavigating
            ? '-translate-y-32 opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />
      </div>

      {/* ── Resizable Glassmorphic Sidebar Floating Over Map (iOS Island Sheet) ─── */}
      <aside
        style={{
          width: `${sidebarWidth}px`,
          top: '86px',
          bottom: '14px',
          left: '16px',
        }}
        className={`absolute z-20 flex flex-col glass-panel rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.18)] pointer-events-auto ${
          isNavigating ? '-translate-x-[120%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
        }`}
      >
        {/* Header */}
        <div
          style={{ padding: `${paddingScaled}px` }}
          className="glass-panel-subtle !border-t-0 !border-x-0 !border-b rounded-t-3xl shadow-xs relative"
        >
          {/* Specular highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="font-bold text-black"
                style={{ fontSize: `${headerTitleSize}px` }}
              >
                Sipariş Akışı
              </h2>
              <p
                className="text-zinc-600 font-medium"
                style={{ fontSize: `${headerSubtitleSize}px`, marginTop: `${Math.round(2 * scale)}px` }}
              >
                {loading ? 'Yükleniyor...' : `${orders.length} sipariş gösteriliyor`}
                {statusFilter && <span className="font-semibold text-green-700"> · {statusFilter}</span>}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsNewOrderOpen(true)}
                style={{
                  fontSize: `${newOrderBtnSize}px`,
                  padding: `${Math.round(5 * scale)}px ${Math.round(10 * scale)}px`,
                  borderRadius: `${Math.round(6 * scale)}px`,
                }}
                className="flex items-center gap-1 bg-green-700 hover:bg-green-800 font-bold text-white transition cursor-pointer shadow-xs active:scale-98"
              >
                <span>+</span> Yeni Sipariş
              </button>

              <button
                onClick={handleClearAllOrders}
                disabled={orders.length === 0}
                title="Tüm siparişleri ve mevcut rotayı temizle"
                style={{
                  fontSize: `${newOrderBtnSize}px`,
                  padding: `${Math.round(5 * scale)}px ${Math.round(8 * scale)}px`,
                  borderRadius: `${Math.round(6 * scale)}px`,
                }}
                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold transition cursor-pointer shadow-xs active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Order list (Single-column expanding package cards) */}
        <div
          style={{
            padding: `${paddingScaled}px`,
            gap: `${listGap}px`,
          }}
          className="flex-1 overflow-y-auto flex flex-col"
        >
          {error && (
            <div
              style={{
                fontSize: `${headerSubtitleSize}px`,
                padding: `${Math.round(10 * scale)}px`,
                borderRadius: `${Math.round(6 * scale)}px`,
              }}
              className="bg-red-50 border border-red-200 text-red-700 shadow-xs"
            >
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div
              style={{
                padding: `${Math.round(24 * scale)}px`,
                borderRadius: `${Math.round(8 * scale)}px`,
              }}
              className="border border-gray-200 bg-white text-center my-4 shadow-sm"
            >
              <p
                className="font-medium text-gray-700"
                style={{ fontSize: `${headerTitleSize}px` }}
              >
                Sipariş bulunamadı.
              </p>
              <p
                className="text-gray-400"
                style={{ fontSize: `${headerSubtitleSize}px`, marginTop: `${Math.round(4 * scale)}px` }}
              >
                Yeni bir sipariş ekleyebilirsiniz.
              </p>
            </div>
          )}

          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={selectedOrder?.id === order.id}
              onSelect={setSelectedOrder}
              onResolve={setResolveTarget}
              onRetry={handleRegeocode}
              onDelete={handleDeleteOrder}
              scale={scale}
            />
          ))}
        </div>

        {/* Route generation panel with Start Journey trigger */}
        <RoutePanel
          scale={scale}
          onRoutesGenerated={(data) => {
            setRoutes(data);
            refresh();
          }}
          onStartJourney={handleStartJourney}
        />
      </aside>

      {/* ── Resizer Drag Bar with Smooth Collapse ─────── */}
      <div
        onMouseDown={isNavigating ? undefined : startResizing}
        style={{
          left: `${sidebarWidth + 20}px`,
          top: '86px',
          bottom: '14px',
        }}
        className={`absolute w-2 cursor-col-resize z-25 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-green-600/70 rounded-full flex items-center justify-center ${
          isResizing ? 'bg-green-700/80 w-2.5' : 'bg-transparent'
        } ${isNavigating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="Paneli genişletmek/daraltmak için sürükleyin"
      />

      {/* ── Floating Driver HUD (VisionOS / Dynamic Island Style) ─────────── */}
      <NavigationHUD
        isNavigating={isNavigating}
        routes={routes}
        currentStopIndex={currentStopIndex}
        deliveryStops={deliveryStops}
        currentTargetStop={currentTargetStop}
        distanceToNextStop={distanceToNextStop}
        onExitNavigation={handleExitNavigation}
        onMarkDelivered={handleMarkDelivered}
      />

      {/* New Order Modal */}
      {isNewOrderOpen && (
        <NewOrderModal
          onClose={() => setIsNewOrderOpen(false)}
          onCreated={(keepOpen) => {
            if (!keepOpen) {
              setIsNewOrderOpen(false);
            }
            refresh();
            // Automatically poll again once background geocoding completes
            setTimeout(() => refresh(), 1800);
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
