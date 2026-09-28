import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // ─── Resizable Sidebar State (Default 25%) ─────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.round(window.innerWidth * 0.25);
    }
    return 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const animationFrameRef = useRef(null);

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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const resize = useCallback(
    (e) => {
      if (isResizing) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(() => {
          // Precise cursor tracking: subtract sidebar left offset (16px)
          const newWidth = Math.min(Math.max(e.clientX - 16, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
          setSidebarWidth(newWidth);
        });
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
      setShowRoutePreview(false);
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
    if (routeData) setRoutes(routeData);
    setShowRoutePreview(false);
    setIsNavigating(true);
    setCurrentStopIndex(0);
    setSelectedOrder(null); // Lets MapView zoom directly to courier center
  }, []);

  // Exit Navigation Mode
  const handleExitNavigation = useCallback(() => {
    setIsNavigating(false);
    setShowRoutePreview(false);
    setCurrentStopIndex(0);
    setSelectedOrder(null);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowRoutePreview(false);
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
          showRoutePreview={showRoutePreview}
          currentStopIndex={currentStopIndex}
          deliveryStops={deliveryStops}
        />
      </div>

      {/* ── Top-Right Floating Glass Island (Metrics & Filters) ── */}
      <div
        className={`absolute top-3.5 right-4 z-30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isNavigating || showRoutePreview
            ? '-translate-y-32 opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />
      </div>

      {/* ── Resizable Glassmorphic Sidebar Floating Over Map (Unified Island) ─── */}
      <aside
        style={{
          width: `${sidebarWidth}px`,
          top: '14px',
          bottom: '14px',
          left: '16px',
        }}
        className={`absolute z-20 flex flex-col glass-panel rounded-3xl overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.18)] pointer-events-auto ${
          isResizing ? 'transition-none select-none' : 'transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'
        } ${
          isNavigating || showRoutePreview ? '-translate-x-[120%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
        }`}
      >
        {/* Header: Unified Brand & Order Stream */}
        <div
          style={{ padding: `${paddingScaled}px` }}
          className="glass-panel-subtle !border-t-0 !border-x-0 !border-b rounded-t-3xl shadow-xs relative"
        >
          {/* Specular highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            {/* Precision GIS Fleet Emblem */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black shadow-md border border-white/10 shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-radial from-green-500/20 via-transparent to-transparent pointer-events-none" />
              <svg
                className="w-5 h-5 relative z-10"
                viewBox="0 0 24 24"
                fill="none"
              >
                <defs>
                  <linearGradient id="emblemGreenGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                </defs>
                {/* Orbit Waypoint Track */}
                <circle
                  cx="12"
                  cy="12"
                  r="8.5"
                  stroke="url(#emblemGreenGrad)"
                  strokeWidth="1.6"
                  strokeDasharray="3.5 2.5"
                  strokeOpacity="0.6"
                />
                {/* Navigation Fleet Vector */}
                <path
                  d="M12 4.5L17.5 17.5L12 14.5L6.5 17.5L12 4.5Z"
                  fill="url(#emblemGreenGrad)"
                />
                {/* Core Coordinate Node */}
                <circle cx="12" cy="11.5" r="1.5" fill="#ffffff" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[16px] font-bold text-zinc-950 tracking-tight leading-none">
                  Smart<span className="font-extrabold text-green-700">Fleet</span>
                </h1>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase bg-green-500/10 text-green-800 border border-green-600/20">
                  GIS
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium tracking-tight mt-1 truncate">
                Lojistik Operasyon & Rota Yönetimi
              </p>
            </div>
          </div>

          {/* Subheader: Order Stream & Actions */}
          <div className="mt-3.5 pt-3 border-t border-zinc-200/60 flex items-center justify-between">
            <div>
              <h2
                className="font-black text-black"
                style={{ fontSize: `${headerTitleSize}px` }}
              >
                Sipariş Akışı
              </h2>
              <p
                className="text-zinc-600 font-medium"
                style={{ fontSize: `${headerSubtitleSize}px`, marginTop: `${Math.round(1 * scale)}px` }}
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
                  padding: `${Math.round(5 * scale)}px ${Math.round(9 * scale)}px`,
                  borderRadius: `${Math.round(7 * scale)}px`,
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
                  borderRadius: `${Math.round(7 * scale)}px`,
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
          routes={routes}
          scale={scale}
          onRoutesGenerated={(data) => {
            setRoutes(data);
            setShowRoutePreview(true);
            refresh();
          }}
          onOpenPreview={() => setShowRoutePreview(true)}
          onStartJourney={handleStartJourney}
        />
      </aside>

      {/* ── Resizer Drag Bar (Clean Inset Pill - No Corner Overhang) ─────── */}
      <div
        onMouseDown={isNavigating || showRoutePreview ? undefined : startResizing}
        style={{
          left: `${sidebarWidth + 16}px`,
          top: '46px',
          bottom: '46px',
        }}
        className={`group absolute w-6 -ml-3 cursor-col-resize z-25 flex items-center justify-center ${
          isResizing ? 'transition-none select-none' : 'transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'
        } ${isNavigating || showRoutePreview ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="Genişliği ayarlamak için sürükleyin"
      >
        {/* Straight Edge Guide (Safely stops before rounded corners) */}
        <div
          className={`w-[2.5px] h-full rounded-full transition-all duration-200 ${
            isResizing
              ? 'bg-green-600/80 shadow-[0_0_8px_rgba(22,163,74,0.4)]'
              : 'bg-black/5 group-hover:bg-green-600/40'
          }`}
        />

        {/* Substantial Tactile Grip Capsule */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 rounded-full backdrop-blur-md shadow-md transition-all duration-200 flex items-center justify-center gap-0.5 cursor-col-resize ${
            isResizing
              ? 'h-24 w-3 bg-green-700 shadow-[0_0_20px_rgba(22,163,74,0.6)]'
              : 'h-16 w-2 bg-white/95 border border-zinc-300/90 group-hover:h-20 group-hover:w-2.5 group-hover:bg-green-600 group-hover:border-transparent group-hover:shadow-[0_0_16px_rgba(22,163,74,0.45)]'
          }`}
        >
          {/* Dual tactile vertical grip grooves */}
          <span
            className={`w-[1.5px] h-5 rounded-full transition-colors duration-150 ${
              isResizing ? 'bg-white' : 'bg-zinc-400 group-hover:bg-white'
            }`}
          />
          <span
            className={`w-[1.5px] h-5 rounded-full transition-colors duration-150 ${
              isResizing ? 'bg-white' : 'bg-zinc-400 group-hover:bg-white'
            }`}
          />
        </div>
      </div>

      {/* ── Floating Driver HUD (VisionOS / Dynamic Island Style) ─────────── */}
      <NavigationHUD
        isNavigating={isNavigating}
        showRoutePreview={showRoutePreview}
        routes={routes}
        currentStopIndex={currentStopIndex}
        deliveryStops={deliveryStops}
        currentTargetStop={currentTargetStop}
        distanceToNextStop={distanceToNextStop}
        onStartJourney={handleStartJourney}
        onExitNavigation={handleExitNavigation}
        onClosePreview={handleClosePreview}
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
