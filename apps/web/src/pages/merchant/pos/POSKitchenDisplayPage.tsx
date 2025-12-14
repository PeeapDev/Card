/**
 * POS Kitchen Display System (KDS) Page
 * Real-time order display for kitchen staff
 * Business Plus tier feature
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  BellOff,
  RefreshCw,
  ChefHat,
  Flame,
  Timer,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Filter,
  LayoutGrid,
  LayoutList,
  X,
  Check,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import posService, { POSSale } from '@/services/pos.service';

// Format time elapsed
const formatTimeElapsed = (startTime: string) => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);

  if (diffMins >= 60) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }
  if (diffMins > 0) {
    return `${diffMins}m ${diffSecs}s`;
  }
  return `${diffSecs}s`;
};

// Order status type
type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// Kitchen order interface
interface KitchenOrder {
  id: string;
  sale_number: string;
  order_type?: 'dine_in' | 'takeaway' | 'delivery';
  table_number?: string;
  customer_name?: string;
  items: Array<{
    product_name: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
  }>;
  status: OrderStatus;
  priority: 'normal' | 'rush';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_time?: number; // in minutes
}

// Status colors
const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  preparing: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  completed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

// Time thresholds (in minutes)
const TIME_THRESHOLDS = {
  warning: 10, // Yellow after 10 minutes
  critical: 20, // Red after 20 minutes
};

export function POSKitchenDisplayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  // State
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<KitchenOrder[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    warningTime: 10,
    criticalTime: 20,
    defaultEstimatedTime: 15,
    autoCompleteReady: false,
    showCompletedOrders: false,
    soundNewOrder: true,
    soundOrderReady: true,
  });

  // Audio refs for notifications
  const newOrderSound = typeof Audio !== 'undefined' ? new Audio('/sounds/new-order.mp3') : null;
  const orderReadySound = typeof Audio !== 'undefined' ? new Audio('/sounds/order-ready.mp3') : null;

  // Toggle fullscreen
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!merchantId) return;

    try {
      // Fetch recent sales that need kitchen attention
      const { sales } = await posService.getSales(merchantId, {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        limit: 100,
      });

      // Convert sales to kitchen orders
      const kitchenOrders: KitchenOrder[] = sales
        .filter(sale => sale.status === 'completed') // Only completed sales need kitchen prep
        .map(sale => ({
          id: sale.id!,
          sale_number: sale.sale_number || '',
          order_type: (sale as any).order_type || 'dine_in',
          table_number: (sale as any).table_number,
          customer_name: sale.customer_name,
          items: ((sale as any).items || []).map((item: any) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            notes: item.notes,
            modifiers: item.modifiers,
          })),
          status: (sale as any).kitchen_status || 'new',
          priority: (sale as any).priority || 'normal',
          created_at: sale.created_at!,
          started_at: (sale as any).kitchen_started_at,
          completed_at: (sale as any).kitchen_completed_at,
          estimated_time: (sale as any).estimated_time || settings.defaultEstimatedTime,
        }));

      setOrders(kitchenOrders);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  }, [merchantId, settings.defaultEstimatedTime]);

  // Filter orders
  useEffect(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (!settings.showCompletedOrders) {
      filtered = filtered.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    }

    // Sort: new orders first, then by time
    filtered.sort((a, b) => {
      const statusOrder = { new: 0, preparing: 1, ready: 2, completed: 3, cancelled: 4 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    setFilteredOrders(filtered);
  }, [orders, statusFilter, settings.showCompletedOrders]);

  // Initial load
  useEffect(() => {
    if (merchantId) {
      loadOrders();
    }
  }, [merchantId, loadOrders]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadOrders, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, loadOrders]);

  // Real-time updates
  useEffect(() => {
    if (!merchantId) return;

    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_sales',
          filter: `business_id=eq.${merchantId}`,
        },
        (payload) => {
          // Play sound for new orders
          if (payload.eventType === 'INSERT' && soundEnabled && settings.soundNewOrder && newOrderSound) {
            newOrderSound.play().catch(() => {});
          }
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId, soundEnabled, settings.soundNewOrder, loadOrders]);

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updateData: any = {
        kitchen_status: newStatus,
      };

      if (newStatus === 'preparing') {
        updateData.kitchen_started_at = new Date().toISOString();
      } else if (newStatus === 'ready' || newStatus === 'completed') {
        updateData.kitchen_completed_at = new Date().toISOString();

        // Play ready sound
        if (newStatus === 'ready' && soundEnabled && settings.soundOrderReady && orderReadySound) {
          orderReadySound.play().catch(() => {});
        }
      }

      await supabase
        .from('pos_sales')
        .update(updateData)
        .eq('id', orderId);

      // Update local state
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? {
                ...o,
                status: newStatus,
                started_at: newStatus === 'preparing' ? new Date().toISOString() : o.started_at,
                completed_at: newStatus === 'ready' || newStatus === 'completed' ? new Date().toISOString() : o.completed_at,
              }
            : o
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Bump order (move to next status)
  const bumpOrder = (order: KitchenOrder) => {
    const nextStatus: Record<OrderStatus, OrderStatus> = {
      new: 'preparing',
      preparing: 'ready',
      ready: 'completed',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    updateOrderStatus(order.id, nextStatus[order.status]);
  };

  // Recall order (move back to preparing)
  const recallOrder = (order: KitchenOrder) => {
    if (order.status === 'ready') {
      updateOrderStatus(order.id, 'preparing');
    }
  };

  // Get time color based on elapsed time
  const getTimeColor = (createdAt: string) => {
    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 60000; // minutes
    if (elapsed >= settings.criticalTime) return 'text-red-600 bg-red-100';
    if (elapsed >= settings.warningTime) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  // Stats
  const stats = {
    new: orders.filter(o => o.status === 'new').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    avgTime: orders.filter(o => o.completed_at && o.created_at).length > 0
      ? Math.round(
          orders
            .filter(o => o.completed_at && o.created_at)
            .reduce((sum, o) => {
              const time = (new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()) / 60000;
              return sum + time;
            }, 0) /
            orders.filter(o => o.completed_at && o.created_at).length
        )
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isFullScreen ? 'bg-gray-900' : 'bg-gray-100 dark:bg-gray-900'}`}>
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isFullScreen && (
            <button
              onClick={() => navigate('/merchant/pos/terminal')}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-bold">Kitchen Display</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-600 rounded-lg">
            <Bell className="w-4 h-4" />
            <span className="font-medium">{stats.new} New</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-600 rounded-lg">
            <Flame className="w-4 h-4" />
            <span className="font-medium">{stats.preparing} Cooking</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-600 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">{stats.ready} Ready</span>
          </div>
          {stats.avgTime > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg">
              <Timer className="w-4 h-4" />
              <span className="font-medium">Avg: {stats.avgTime}m</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg ${autoRefresh ? 'bg-green-600' : 'bg-gray-700'}`}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            {autoRefresh ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            onClick={loadOrders}
            className="p-2 hover:bg-gray-700 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg ${soundEnabled ? 'bg-gray-700' : 'bg-red-600'}`}
            title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-700 rounded-lg"
            title={viewMode === 'grid' ? 'List View' : 'Grid View'}
          >
            {viewMode === 'grid' ? <LayoutList className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-700 rounded-lg"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2 hover:bg-gray-700 rounded-lg"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-t border-gray-700">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400 mr-2">Filter:</span>
        {(['all', 'new', 'preparing', 'ready'] as const).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="p-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <ChefHat className="w-16 h-16 mb-4 text-gray-600" />
            <p className="text-xl font-medium">No orders to display</p>
            <p className="text-sm mt-2">New orders will appear here automatically</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onBump={() => bumpOrder(order)}
                onRecall={() => recallOrder(order)}
                onCancel={() => updateOrderStatus(order.id, 'cancelled')}
                getTimeColor={getTimeColor}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onBump={() => bumpOrder(order)}
                onRecall={() => recallOrder(order)}
                onCancel={() => updateOrderStatus(order.id, 'cancelled')}
                getTimeColor={getTimeColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">KDS Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Time Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Warning Time (minutes)
                </label>
                <input
                  type="number"
                  value={settings.warningTime}
                  onChange={e => setSettings({ ...settings, warningTime: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Orders turn yellow after this time</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Critical Time (minutes)
                </label>
                <input
                  type="number"
                  value={settings.criticalTime}
                  onChange={e => setSettings({ ...settings, criticalTime: parseInt(e.target.value) || 20 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Orders turn red after this time</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Prep Time (minutes)
                </label>
                <input
                  type="number"
                  value={settings.defaultEstimatedTime}
                  onChange={e => setSettings({ ...settings, defaultEstimatedTime: parseInt(e.target.value) || 15 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              {/* Toggle Settings */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Show completed orders</span>
                  <button
                    onClick={() => setSettings({ ...settings, showCompletedOrders: !settings.showCompletedOrders })}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      settings.showCompletedOrders ? 'bg-orange-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transform transition-transform mx-1 ${
                      settings.showCompletedOrders ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Sound on new order</span>
                  <button
                    onClick={() => setSettings({ ...settings, soundNewOrder: !settings.soundNewOrder })}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      settings.soundNewOrder ? 'bg-orange-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transform transition-transform mx-1 ${
                      settings.soundNewOrder ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Sound when order ready</span>
                  <button
                    onClick={() => setSettings({ ...settings, soundOrderReady: !settings.soundOrderReady })}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      settings.soundOrderReady ? 'bg-orange-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transform transition-transform mx-1 ${
                      settings.soundOrderReady ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700">
              <Button onClick={() => setShowSettings(false)} className="w-full">
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({
  order,
  onBump,
  onRecall,
  onCancel,
  getTimeColor,
}: {
  order: KitchenOrder;
  onBump: () => void;
  onRecall: () => void;
  onCancel: () => void;
  getTimeColor: (createdAt: string) => string;
}) {
  const colors = STATUS_COLORS[order.status];

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden ${colors.bg} ${colors.border} ${
        order.priority === 'rush' ? 'ring-2 ring-red-500 ring-offset-2' : ''
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 ${order.status === 'new' ? 'bg-blue-100' : order.status === 'preparing' ? 'bg-yellow-100' : 'bg-green-100'}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-lg">{order.sale_number}</span>
            {order.table_number && (
              <span className="ml-2 px-2 py-0.5 bg-white rounded text-sm font-medium">
                Table {order.table_number}
              </span>
            )}
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getTimeColor(order.created_at)}`}>
            <Clock className="w-4 h-4" />
            {formatTimeElapsed(order.created_at)}
          </div>
        </div>
        {order.customer_name && (
          <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
        )}
        {order.priority === 'rush' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded mt-1">
            <Flame className="w-3 h-3" /> RUSH
          </span>
        )}
      </div>

      {/* Items */}
      <div className="p-4 bg-white">
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="font-bold text-lg text-gray-800">{item.quantity}x</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.product_name}</p>
                {item.modifiers && item.modifiers.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {item.modifiers.join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-sm text-orange-600 italic">Note: {item.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 flex gap-2">
        {order.status === 'ready' && (
          <button
            onClick={onRecall}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Recall
          </button>
        )}
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <button
            onClick={onBump}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors ${
              order.status === 'new'
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : order.status === 'preparing'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Check className="w-4 h-4" />
            {order.status === 'new' ? 'Start' : order.status === 'preparing' ? 'Ready' : 'Done'}
          </button>
        )}
      </div>
    </div>
  );
}

// Order Row Component (for list view)
function OrderRow({
  order,
  onBump,
  onRecall,
  onCancel,
  getTimeColor,
}: {
  order: KitchenOrder;
  onBump: () => void;
  onRecall: () => void;
  onCancel: () => void;
  getTimeColor: (createdAt: string) => string;
}) {
  const colors = STATUS_COLORS[order.status];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      <div className="flex items-center gap-4 p-4">
        {/* Order Info */}
        <div className="w-32">
          <span className="font-bold text-lg">{order.sale_number}</span>
          {order.table_number && (
            <p className="text-sm text-gray-600">Table {order.table_number}</p>
          )}
        </div>

        {/* Items */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            {order.items.map((item, idx) => (
              <span key={idx} className="px-2 py-1 bg-white rounded text-sm">
                <strong>{item.quantity}x</strong> {item.product_name}
              </span>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${getTimeColor(order.created_at)}`}>
          <Clock className="w-4 h-4" />
          {formatTimeElapsed(order.created_at)}
        </div>

        {/* Status */}
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${colors.text} ${colors.bg} border ${colors.border}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>

        {/* Actions */}
        <div className="flex gap-2">
          {order.status === 'ready' && (
            <button
              onClick={onRecall}
              className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              title="Recall"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <button
              onClick={onBump}
              className={`px-4 py-2 rounded-lg font-medium text-white ${
                order.status === 'new'
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : order.status === 'preparing'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {order.status === 'new' ? 'Start' : order.status === 'preparing' ? 'Ready' : 'Done'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default POSKitchenDisplayPage;
