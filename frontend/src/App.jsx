import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchOrders, fetchStats, deleteOrder, regeocodeOrder, updateOrder } from './api';
import StatsBar from './components/StatsBar';
import OrderCard from './components/OrderCard';
import ResolveModal from './components/ResolveModal';
import NewOrderModal from './components/NewOrderModal';
import RoutePanel from './components/RoutePanel';
import MapView from './components/MapView';

const REFRESH_MS = 10_000;
const MIN_SIDEBAR_WIDTH = 280;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [routes, setRoutes] = useState(null);

  // ─── Navigation Mode State ─────────────────────────────────────────
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // ─── Resizable Sidebar State ─────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(380);
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
      // First stop: origin is depot
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

  // Start Navigation Journey
  const handleStartJourney = (routeData) => {
    setRoutes(routeData);
    setIsNavigating(true);
    setCurrentStopIndex(0);
    // Focus map on first customer
    const firstStop = routeData?.routes?.[0]?.stops?.find((s) => s.node !== 'DEPOT');
    if (firstStop) {
      setSelectedOrder({
        id: firstStop.order_id,
        latitude: firstStop.lat,
        longitude: firstStop.lon,
        customer_name: firstStop.customer_name,
      });
    }
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

    // Auto-focus map on next stop if available
    const nextStop = deliveryStops[nextIndex];
    if (nextStop) {
      setSelectedOrder({
        id: nextStop.order_id,
        latitude: nextStop.lat,
        longitude: nextStop.lon,
        customer_name: nextStop.customer_name,
      });
    } else {
      setSelectedOrder(null);
    }

    refresh();
  };

  // Dynamic layout values based on scale
  const headerTitleSize = Math.round(14 * scale);
  const headerSubtitleSize = Math.round(11.5 * scale);
  const searchInputSize = Math.round(12.5 * scale);
  const newOrderBtnSize = Math.round(12 * scale);
  const paddingScaled = Math.round(12 * scale);
  const listGap = Math.round(10 * scale);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden bg-gray-50/50 ${
        isResizing ? 'select-none cursor-col-resize' : ''
      }`}
    >
      {/* Top Clean Header & Stats (Hidden in Navigation Mode) */}
      {!isNavigating && (
        <StatsBar stats={stats} activeFilter={statusFilter} onFilter={setStatusFilter} />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Resizable Sidebar (Hidden in Navigation Mode) ─────── */}
        {!isNavigating && (
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className="flex-shrink-0 flex flex-col bg-gray-50/50 border-r border-gray-200/80 relative transition-none backdrop-blur-xs"
          >
            {/* Header & Search */}
            <div
              style={{ padding: `${paddingScaled}px` }}
              className="bg-white border-b border-gray-200/80 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="font-bold text-gray-800"
                    style={{ fontSize: `${headerTitleSize}px` }}
                  >
                    Sipariş Akışı
                  </h2>
                  <p
                    className="text-gray-500"
                    style={{ fontSize: `${headerSubtitleSize}px`, marginTop: `${Math.round(2 * scale)}px` }}
                  >
                    {loading ? 'Yükleniyor...' : `${filteredOrders.length} sipariş gösteriliyor`}
                    {statusFilter && <span className="font-semibold text-indigo-600"> · {statusFilter}</span>}
                  </p>
                </div>

                <button
                  onClick={() => setIsNewOrderOpen(true)}
                  style={{
                    fontSize: `${newOrderBtnSize}px`,
                    padding: `${Math.round(5 * scale)}px ${Math.round(10 * scale)}px`,
                    borderRadius: `${Math.round(6 * scale)}px`,
                  }}
                  className="flex items-center gap-1 bg-indigo-600 font-semibold text-white hover:bg-indigo-700 transition cursor-pointer shadow-xs"
                >
                  <span>+</span> Yeni Sipariş
                </button>
              </div>

              {/* Search Input */}
              <div style={{ marginTop: `${Math.round(10 * scale)}px` }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Müşteri adı veya adres ara..."
                  style={{
                    fontSize: `${searchInputSize}px`,
                    padding: `${Math.round(6 * scale)}px ${Math.round(10 * scale)}px`,
                    borderRadius: `${Math.round(6 * scale)}px`,
                  }}
                  className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-xs"
                />
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

              {!loading && !error && filteredOrders.length === 0 && (
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
                    Arama kriterlerinizi değiştirebilir veya yeni bir sipariş ekleyebilirsiniz.
                  </p>
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
        )}

        {/* ── Resizer Drag Bar (Hidden in Navigation Mode) ─────── */}
        {!isNavigating && (
          <div
            onMouseDown={startResizing}
            className={`w-1.5 hover:w-2 bg-gray-200 hover:bg-indigo-500 cursor-col-resize select-none transition-all flex-shrink-0 z-30 ${
              isResizing ? 'bg-indigo-600 w-2' : ''
            }`}
            title="Paneli genişletmek/daraltmak için sürükleyin"
          />
        )}

        {/* ── Map Area (Full Screen in Navigation Mode) ────────── */}
        <main className="flex-1 relative bg-gray-100 h-full w-full">
          <MapView orders={filteredOrders} selectedOrder={selectedOrder} routes={routes} />

          {/* ── Floating Driver HUD (Heads-Up Display) ─────────── */}
          {isNavigating && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 w-11/12 max-w-md border border-gray-100 animate-in fade-in duration-300">
              {currentStopIndex >= deliveryStops.length ? (
                /* Route Completed Screen */
                <div className="text-center py-2">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-1">
                    Rota Tamamlandı!
                  </h3>
                  <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                    Tüm paketler teslim edildi. Depoya dönüş rotasını tamamlayabilir veya ana panele dönebilirsiniz.
                  </p>
                  <button
                    onClick={handleExitNavigation}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm shadow-md transition cursor-pointer"
                  >
                    🏁 Normal Görünüme Dön
                  </button>
                </div>
              ) : (
                /* Active Driver Navigation HUD */
                <div>
                  {/* Top Status & Exit Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                        Durak {currentStopIndex + 1} / {deliveryStops.length}
                      </span>
                    </div>

                    <button
                      onClick={handleExitNavigation}
                      className="text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                    >
                      ✖ Sürüşten Çık
                    </button>
                  </div>

                  {/* Target Customer Info */}
                  <div className="mb-4">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Hedef Müşteri
                    </span>
                    <h3 className="text-base font-extrabold text-gray-900 truncate mt-0.5">
                      {currentTargetStop?.customer_name}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed mt-1 line-clamp-2">
                      📍 {currentTargetStop?.raw_address}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div>
                        <span className="text-gray-400 text-[11px] block">Kalan Mesafe</span>
                        <strong className="text-gray-900 font-bold text-sm">
                          {distanceToNextStop} km
                        </strong>
                      </div>
                      <div className="w-px h-6 bg-gray-200"></div>
                      <div>
                        <span className="text-gray-400 text-[11px] block">Paket Ağırlığı</span>
                        <strong className="text-gray-900 font-bold text-sm">
                          {currentTargetStop?.weight_kg ?? 1} kg
                        </strong>
                      </div>
                      <div className="w-px h-6 bg-gray-200"></div>
                      <div>
                        <span className="text-gray-400 text-[11px] block">Sipariş No</span>
                        <strong className="text-indigo-600 font-bold text-sm">
                          #{currentTargetStop?.order_id}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Mark Delivered Button */}
                  <button
                    onClick={handleMarkDelivered}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>📍 Teslim Edildi</span>
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
