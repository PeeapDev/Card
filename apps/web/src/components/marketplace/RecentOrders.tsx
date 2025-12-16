/**
 * Recent Orders Component
 *
 * Displays user's recent marketplace orders with status tracking
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ChefHat,
  Store,
  MapPin,
  ShoppingBag,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { MotionCard, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import marketplaceService, { MarketplaceOrder } from '@/services/marketplace.service';

// Format currency for Sierra Leone
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Order status configuration
const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: CheckCircle2,
  },
  preparing: {
    label: 'Preparing',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: ChefHat,
  },
  ready: {
    label: 'Ready',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: Package,
  },
  out_for_delivery: {
    label: 'On the Way',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle2,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: XCircle,
  },
};

// Progress bar for order status
function OrderProgress({ status, orderType }: { status: string; orderType: string }) {
  const deliverySteps = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
  const pickupSteps = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

  const steps = orderType === 'delivery' ? deliverySteps : pickupSteps;
  const currentIndex = steps.indexOf(status);
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
        <XCircle className="w-4 h-4" />
        <span>Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {steps.slice(0, 4).map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-2 h-2 rounded-full ${
              index <= currentIndex
                ? 'bg-primary-600 dark:bg-primary-400'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
          {index < 3 && (
            <div
              className={`w-4 h-0.5 ${
                index < currentIndex
                  ? 'bg-primary-600 dark:bg-primary-400'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function RecentOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [user?.id]);

  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await marketplaceService.getOrdersByCustomer(user.id);
      setOrders(data.slice(0, 5)); // Only show recent 5
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter active orders (not completed or cancelled)
  const activeOrders = orders.filter(o => !['completed', 'cancelled', 'delivered'].includes(o.status));
  const hasActiveOrders = activeOrders.length > 0;

  if (loading) {
    return (
      <MotionCard delay={0.4}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Order Status
          </CardTitle>
          <CardDescription>Track your marketplace orders</CardDescription>
        </CardHeader>
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </MotionCard>
    );
  }

  if (orders.length === 0) {
    return (
      <MotionCard delay={0.4}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Order Status
          </CardTitle>
          <CardDescription>Track your marketplace orders</CardDescription>
        </CardHeader>
        <div className="py-8 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
          <Link
            to="/marketplace"
            className="mt-2 inline-block text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Browse marketplace
          </Link>
        </div>
      </MotionCard>
    );
  }

  return (
    <MotionCard delay={0.4}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Order Status
              {hasActiveOrders && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
                  {activeOrders.length} Active
                </span>
              )}
            </CardTitle>
            <CardDescription>Track your marketplace orders</CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="space-y-3">
        {orders.map((order, index) => {
          const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;
          const isActive = !['completed', 'cancelled', 'delivered'].includes(order.status);

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <Link
                to={`/marketplace/order/${order.id}`}
                className={`block p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Store Logo */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {order.store?.logo_url ? (
                      <img src={order.store.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {order.store?.store_name || 'Store'}
                      </p>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        #{order.order_number} • {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.total_amount)}
                      </p>
                    </div>

                    {/* Progress bar for active orders */}
                    {isActive && (
                      <div className="mt-2">
                        <OrderProgress status={order.status} orderType={order.order_type} />
                      </div>
                    )}

                    {/* Delivery/Pickup info */}
                    {isActive && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {order.order_type === 'delivery' ? (
                          <>
                            <Truck className="w-3 h-3" />
                            <span>Delivery</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3 h-3" />
                            <span>Pickup</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {orders.length > 0 && (
        <Link
          to="/marketplace/orders"
          className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          View all orders
        </Link>
      )}
    </MotionCard>
  );
}

// Compact version for dashboard
export function RecentOrdersCompact() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [user?.id]);

  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await marketplaceService.getOrdersByCustomer(user.id);
      // Only show active orders in compact view
      const activeOrders = data.filter(o => !['completed', 'cancelled', 'delivered'].includes(o.status));
      setOrders(activeOrders.slice(0, 3));
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || orders.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          Active Orders
          <span className="px-2 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full">
            {orders.length}
          </span>
        </h3>
        <Link
          to="/marketplace/orders"
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="space-y-2">
        {orders.map((order) => {
          const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;

          return (
            <Link
              key={order.id}
              to={`/marketplace/order/${order.id}`}
              className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}>
                <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {order.store?.store_name || 'Order'} #{order.order_number}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {statusConfig.label} • {formatCurrency(order.total_amount)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
