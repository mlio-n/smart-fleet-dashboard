import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchOrders, fetchStats, deleteOrder, clearAllOrders, regeocodeOrder, updateOrder } from './api';
import StatsBar from './components/StatsBar';
import OrderCard from './components/OrderCard';
import ResolveModal from './components/ResolveModal';
import NewOrderModal from './components/NewOrderModal';
import RoutePanel from './components/RoutePanel';
import MapView from './components/MapView';

const REFRESH_MS = 10_000;
const MIN_SIDEBAR_WIDTH = 250;
const MAX_SIDEBAR_WIDTH = 850;

// Straight-line distance calculation helper (Haversine formula in km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

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

  // Handle clear all orders
  const handleClearAllOrders = async () => {
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
  const handleStartJourney = (routeData) => {
    setRoutes(routeData);
    setIsNavigating(true);
    setCurrentStopIndex(0);
    setSelectedOrder(null); // Lets MapView zoom directly to courier center
  };

  // Exit Navigation Mode
  const handleExitNavigation = () => {
    setIsNavigating(false);
    setCurrentStopIndex(0);
    setSelectedOrder(null);
  };

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
      className={`flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-100 via-slate-50 to-zinc-200/80 ${
        isResizing ? 'select-none cursor-col-resize' : ''
      }`}
    >
      {/* Top Clean Header & Stats (Slides smoothly on Navigation Mode) */}
      <div
        className={`transition-all duration-500 ease-in-out transform ${
          isNavigating
            ? '-translate-y-full max-h-0 opacity-0 pointer-events-none'
            : 'translate-y-0 max-h-28 opacity-100'
        }`}
      >
        <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Resizable Sidebar (Smooth Slide-out Animation) ─────── */}
        <aside
          style={{ width: isNavigating ? '0px' : `${sidebarWidth}px` }}
          className={`flex-shrink-0 flex flex-col glass-panel !border-y-0 !border-l-0 !border-r !rounded-none relative transition-all duration-500 ease-in-out overflow-hidden ${
            isNavigating ? '-translate-x-12 opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
          }`}
        >
            {/* Header */}
            <div
              style={{ padding: `${paddingScaled}px` }}
              className="glass-panel-subtle !border-t-0 !border-x-0 !border-b !rounded-none shadow-xs relative"
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
          className={`w-1.5 hover:w-2 bg-zinc-200 hover:bg-green-600 cursor-col-resize select-none transition-all duration-500 flex-shrink-0 z-30 ${
            isResizing ? 'bg-green-700 w-2' : ''
          } ${isNavigating ? 'w-0 opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Paneli genişletmek/daraltmak için sürükleyin"
        />

        {/* ── Map Area (Full Screen in Navigation Mode) ────────── */}
        <main className="flex-1 relative bg-gray-100 h-full w-full">
          <MapView
            orders={orders}
            selectedOrder={selectedOrder}
            routes={routes}
            isNavigating={isNavigating}
            currentStopIndex={currentStopIndex}
            deliveryStops={deliveryStops}
          />

          {/* ── Floating Driver HUD (Ultra-Glassmorphic Display) ─────────── */}
          {isNavigating && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] glass-panel rounded-3xl p-7 w-11/12 max-w-xl animate-in fade-in slide-in-from-top-10 zoom-in-95 duration-500 ease-out relative overflow-hidden">
              {/* Glass specular top reflection highlight */}
              <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
              {/* Subtle glass sheen overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/5 pointer-events-none rounded-3xl" />

              {/* Total Route Mini Banner */}
              {routes?.total_distance_m && (
                <div className="relative flex items-center justify-between text-[11px] font-bold text-zinc-700 glass-panel-subtle rounded-xl px-3.5 py-2 mb-3.5">
                  <span className="flex items-center gap-1.5 text-green-900 font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-green-600 inline-block animate-pulse"></span>
                    Optimum Dağıtım Rotası
                  </span>
                  <span className="font-black text-black">
                    {(routes.total_distance_m / 1000).toFixed(1)} km · ~{Math.round(((routes.total_distance_m) / 1000) * 2.2)} dk · {deliveryStops.length} Durak
                  </span>
                </div>
              )}
              {currentStopIndex >= deliveryStops.length ? (
                /* Route Completed Screen */
                <div className="relative text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4 border-2 border-green-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-black mb-2">
                    Rota Tamamlandı!
                  </h3>
                  <p className="text-sm text-zinc-600 mb-6 leading-relaxed font-medium">
                    Tüm paketler teslim edildi. Depoya dönüş rotasını tamamlayabilir veya ana panele dönebilirsiniz.
                  </p>
                  <button
                    onClick={handleExitNavigation}
                    className="w-full rounded-2xl bg-black hover:bg-zinc-900 text-green-400 border border-green-600 font-black py-4 text-base shadow-lg transition cursor-pointer active:scale-98"
                  >
                    Normal Görünüme Dön
                  </button>
                </div>
              ) : (
                /* Active Driver Navigation HUD */
                <div className="relative">
                  {/* Top Status & Exit Header */}
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3.5 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span>
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-green-950 bg-green-100/90 border border-green-300/80 px-3 py-1.5 rounded-lg shadow-2xs backdrop-blur-xs">
                        Durak {currentStopIndex + 1} / {deliveryStops.length}
                      </span>
                    </div>

                    <button
                      onClick={handleExitNavigation}
                      className="text-xs font-bold text-zinc-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50/80 transition cursor-pointer"
                    >
                      Sürüşten Çık
                    </button>
                  </div>

                  {/* Target Customer Info */}
                  <div className="mb-5">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-wider">
                      Hedef Müşteri
                    </span>
                    <h3 className="text-2xl font-black text-black truncate mt-1">
                      {currentTargetStop?.customer_name}
                    </h3>
                    <p className="text-sm text-zinc-600 font-medium leading-relaxed mt-1.5 line-clamp-2">
                      {currentTargetStop?.raw_address}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm font-medium text-zinc-700 glass-panel-subtle rounded-2xl p-4">
                      <div>
                        <span className="text-zinc-500 text-[11px] block font-bold uppercase">Mesafe</span>
                        <strong className="text-black font-black text-lg">
                          {distanceToNextStop} km
                        </strong>
                      </div>
                      <div className="border-x border-zinc-300/60 px-1">
                        <span className="text-zinc-500 text-[11px] block font-bold uppercase">Tahmini Varış</span>
                        <strong className="text-blue-600 font-black text-lg">
                          ~{Math.max(1, Math.round(distanceToNextStop * 2.2))} dk
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[11px] block font-bold uppercase">Ağırlık</span>
                        <strong className="text-black font-black text-lg">
                          {currentTargetStop?.weight_kg ?? 1} kg
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Mark Delivered Button */}
                  <button
                    onClick={handleMarkDelivered}
                    className="w-full rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black py-4 text-base shadow-xl shadow-green-900/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>Teslim Edildi</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

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
