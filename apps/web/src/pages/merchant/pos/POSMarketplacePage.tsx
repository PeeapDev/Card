/**
 * POS Marketplace Settings Page
 *
 * Allows merchants to:
 * - Enable/configure their marketplace storefront
 * - Toggle which products appear on the marketplace
 * - Set delivery options, operating hours, etc.
 * - View and manage online orders
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import posService, { POSProduct } from '@/services/pos.service';
import marketplaceService, { MarketplaceStore, MarketplaceListing, StoreCategory, MarketplaceOrder } from '@/services/marketplace.service';
import {
  ArrowLeft,
  Loader2,
  Save,
  Store,
  Package,
  ShoppingBag,
  Globe,
  Clock,
  Truck,
  MapPin,
  Phone,
  Mail,
  Check,
  X,
  Eye,
  EyeOff,
  Image,
  AlertCircle,
  ExternalLink,
  Settings,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  Star,
  BadgeCheck,
  Receipt,
  User,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Timer,
  Utensils,
} from 'lucide-react';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Days of the week
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Tabs
const tabs = [
  { id: 'orders', label: 'Orders', icon: Receipt },
  { id: 'store', label: 'Store Settings', icon: Store },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'hours', label: 'Hours', icon: Clock },
];

// Order status colors and labels
const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Timer },
  confirmed: { label: 'Confirmed', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Check },
  preparing: { label: 'Preparing', color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Utensils },
  ready: { label: 'Ready', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: Package },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-cyan-700', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle },
  completed: { label: 'Completed', color: 'text-gray-700', bgColor: 'bg-gray-100 dark:bg-gray-900/30', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
};

// Format time ago
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return then.toLocaleDateString();
};

export function POSMarketplacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  // State
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Store state
  const [store, setStore] = useState<MarketplaceStore | null>(null);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);

  // Products state
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [togglingProducts, setTogglingProducts] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('active');
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // Form state for store
  const [storeForm, setStoreForm] = useState({
    store_name: '',
    store_slug: '',
    description: '',
    logo_url: '',
    banner_url: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    is_listed: false,
    offers_pickup: true,
    offers_delivery: false,
    delivery_fee: 0,
    free_delivery_minimum: 0,
    delivery_radius_km: 5,
    minimum_order: 0,
    preparation_time_minutes: 30,
    store_categories: [] as string[],
    operating_hours: {} as Record<string, { open: string; close: string; closed?: boolean }>,
  });

  // Load data
  useEffect(() => {
    if (merchantId) {
      loadData();
    }
  }, [merchantId]);

  const loadData = async () => {
    if (!merchantId) return;

    try {
      setLoading(true);

      // Load store categories
      const categories = await marketplaceService.getStoreCategories();
      setStoreCategories(categories);

      // Load merchant's store
      const existingStore = await marketplaceService.getMyStore(merchantId);
      if (existingStore) {
        setStore(existingStore);
        setStoreForm({
          store_name: existingStore.store_name || '',
          store_slug: existingStore.store_slug || '',
          description: existingStore.description || '',
          logo_url: existingStore.logo_url || '',
          banner_url: existingStore.banner_url || '',
          phone: existingStore.phone || '',
          email: existingStore.email || '',
          address: existingStore.address || '',
          city: existingStore.city || '',
          is_listed: existingStore.is_listed,
          offers_pickup: existingStore.offers_pickup,
          offers_delivery: existingStore.offers_delivery,
          delivery_fee: existingStore.delivery_fee,
          free_delivery_minimum: existingStore.free_delivery_minimum || 0,
          delivery_radius_km: existingStore.delivery_radius_km || 5,
          minimum_order: existingStore.minimum_order,
          preparation_time_minutes: existingStore.preparation_time_minutes,
          store_categories: existingStore.store_categories || [],
          operating_hours: existingStore.operating_hours || {},
        });

        // Load listings
        const myListings = await marketplaceService.getMyListings(merchantId);
        setListings(myListings);

        // Load orders
        const merchantOrders = await marketplaceService.getOrdersByMerchant(merchantId);
        setOrders(merchantOrders);
      }

      // Load all POS products
      const posProducts = await posService.getProducts(merchantId);
      setProducts(posProducts);

    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load orders
  const loadOrders = async () => {
    if (!merchantId) return;
    try {
      const merchantOrders = await marketplaceService.getOrdersByMerchant(merchantId);
      setOrders(merchantOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: MarketplaceOrder['status']) => {
    setUpdatingOrder(orderId);
    try {
      await marketplaceService.updateOrderStatus(orderId, newStatus);
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        const updated = orders.find(o => o.id === orderId);
        if (updated) setSelectedOrder({ ...updated, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Get next status in workflow
  const getNextStatus = (currentStatus: string, orderType: string): MarketplaceOrder['status'] | null => {
    const workflow: Record<string, Record<string, MarketplaceOrder['status']>> = {
      delivery: {
        pending: 'confirmed',
        confirmed: 'preparing',
        preparing: 'ready',
        ready: 'out_for_delivery',
        out_for_delivery: 'delivered',
        delivered: 'completed',
      },
      pickup: {
        pending: 'confirmed',
        confirmed: 'preparing',
        preparing: 'ready',
        ready: 'completed',
      },
    };
    return workflow[orderType]?.[currentStatus] || null;
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'active') {
      return !['completed', 'cancelled'].includes(order.status);
    }
    if (orderFilter === 'completed') {
      return order.status === 'completed';
    }
    if (orderFilter === 'cancelled') {
      return order.status === 'cancelled';
    }
    return true;
  });

  // Save store settings
  const saveStore = async () => {
    if (!merchantId) return;

    setSaving(true);
    try {
      // Generate slug if not provided
      let slug = storeForm.store_slug;
      if (!slug && storeForm.store_name) {
        slug = storeForm.store_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      const storeData: Partial<MarketplaceStore> = {
        store_name: storeForm.store_name,
        store_slug: slug,
        description: storeForm.description,
        logo_url: storeForm.logo_url || undefined,
        banner_url: storeForm.banner_url || undefined,
        phone: storeForm.phone,
        email: storeForm.email,
        address: storeForm.address,
        city: storeForm.city,
        is_listed: storeForm.is_listed,
        offers_pickup: storeForm.offers_pickup,
        offers_delivery: storeForm.offers_delivery,
        delivery_fee: storeForm.delivery_fee,
        free_delivery_minimum: storeForm.free_delivery_minimum || undefined,
        delivery_radius_km: storeForm.delivery_radius_km || undefined,
        minimum_order: storeForm.minimum_order,
        preparation_time_minutes: storeForm.preparation_time_minutes,
        store_categories: storeForm.store_categories,
        operating_hours: storeForm.operating_hours,
      };

      let savedStore: MarketplaceStore;
      if (store) {
        savedStore = await marketplaceService.updateStore(store.id, storeData);
      } else {
        savedStore = await marketplaceService.createStore(merchantId, storeData);
      }

      setStore(savedStore);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle product listing
  const toggleProductListing = async (productId: string, isListed: boolean) => {
    if (!merchantId || !store) return;

    try {
      const existingListing = listings.find(l => l.product_id === productId);

      if (existingListing) {
        await marketplaceService.updateListing(existingListing.id, { is_listed: isListed });
      } else if (isListed) {
        await marketplaceService.createListing(merchantId, store.id, productId);
      }

      // Reload listings
      const updatedListings = await marketplaceService.getMyListings(merchantId);
      setListings(updatedListings);
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  // Bulk toggle products
  const bulkToggleProducts = async (isListed: boolean) => {
    if (!merchantId || !store || selectedProductIds.size === 0) return;

    setTogglingProducts(true);
    try {
      await marketplaceService.bulkToggleListings(
        Array.from(selectedProductIds),
        isListed,
        merchantId,
        store.id
      );

      // Reload listings
      const updatedListings = await marketplaceService.getMyListings(merchantId);
      setListings(updatedListings);
      setSelectedProductIds(new Set());
    } catch (error) {
      console.error('Error bulk toggling products:', error);
    } finally {
      setTogglingProducts(false);
    }
  };

  // Check if product is listed
  const isProductListed = (productId: string) => {
    const listing = listings.find(l => l.product_id === productId);
    return listing?.is_listed || false;
  };

  // Filter products by search
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle operating hours for a day
  const toggleDayHours = (day: string, closed: boolean) => {
    setStoreForm(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: closed ? { open: '', close: '', closed: true } : { open: '09:00', close: '17:00' },
      },
    }));
  };

  // Update operating hours
  const updateDayHours = (day: string, field: 'open' | 'close', value: string) => {
    setStoreForm(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...(prev.operating_hours[day] || { open: '09:00', close: '17:00' }),
          [field]: value,
        },
      },
    }));
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-primary-600" />
                Marketplace
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sell your products online through the Peeap marketplace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Store status indicator */}
            {store && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                storeForm.is_listed
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {storeForm.is_listed ? (
                  <>
                    <Globe className="w-4 h-4" />
                    Live on Marketplace
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Not Listed
                  </>
                )}
              </div>
            )}

            {(activeTab === 'store' || activeTab === 'delivery' || activeTab === 'hours') && (
              <Button onClick={saveStore} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saveSuccess ? 'Saved!' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>

        {/* No store warning */}
        {!store && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Set up your store to start selling
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Fill in your store details below and save to create your marketplace storefront.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Order filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-2">
                {['active', 'completed', 'cancelled', 'all'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      orderFilter === filter
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    {filter === 'active' && orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={loadOrders}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Orders list */}
            {filteredOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No {orderFilter === 'all' ? '' : orderFilter} orders
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {!store
                    ? 'Set up your store to start receiving orders'
                    : 'Orders from the marketplace will appear here'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Orders List */}
                <div className="space-y-3">
                  {filteredOrders.map(order => {
                    const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`w-full text-left bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all hover:shadow-md ${
                          selectedOrder?.id === order.id
                            ? 'border-primary-500 ring-2 ring-primary-200'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              Order #{order.order_number}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatTimeAgo(order.created_at)}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {order.customer_name}
                          </span>
                          <span className="flex items-center gap-1">
                            {order.order_type === 'delivery' ? (
                              <Truck className="w-4 h-4" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                            {order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-sm text-gray-500">
                            {order.items?.length || 0} items
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Order Detail */}
                <div className="lg:sticky lg:top-6">
                  {selectedOrder ? (
                    <Card className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Order #{selectedOrder.order_number}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(selectedOrder.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded lg:hidden"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Status */}
                      <div className="mb-4">
                        {(() => {
                          const statusConfig = ORDER_STATUS_CONFIG[selectedOrder.status] || ORDER_STATUS_CONFIG.pending;
                          const StatusIcon = statusConfig.icon;
                          return (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                              <StatusIcon className="w-4 h-4" />
                              {statusConfig.label}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Customer Info */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Customer</h4>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {selectedOrder.customer_name}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {selectedOrder.customer_phone}
                          </p>
                          {selectedOrder.order_type === 'delivery' && selectedOrder.delivery_address && (
                            <p className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                              {selectedOrder.delivery_address}
                            </p>
                          )}
                          {selectedOrder.delivery_instructions && (
                            <p className="text-gray-500 italic mt-2">
                              Note: {selectedOrder.delivery_instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Items</h4>
                        <div className="space-y-2">
                          {selectedOrder.items?.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                {item.quantity}x {item.product_name}
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                {formatCurrency(item.unit_price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span>{formatCurrency(selectedOrder.subtotal)}</span>
                          </div>
                          {selectedOrder.delivery_fee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Delivery Fee</span>
                              <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>{formatCurrency(selectedOrder.total_amount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {!['completed', 'cancelled'].includes(selectedOrder.status) && (
                        <div className="flex gap-2">
                          {(() => {
                            const nextStatus = getNextStatus(selectedOrder.status, selectedOrder.order_type);
                            if (!nextStatus) return null;
                            const nextConfig = ORDER_STATUS_CONFIG[nextStatus];
                            const NextIcon = nextConfig?.icon || Check;
                            return (
                              <Button
                                onClick={() => updateOrderStatus(selectedOrder.id, nextStatus)}
                                disabled={updatingOrder === selectedOrder.id}
                                className="flex-1"
                              >
                                {updatingOrder === selectedOrder.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <NextIcon className="w-4 h-4 mr-2" />
                                )}
                                Mark as {nextConfig?.label}
                              </Button>
                            );
                          })()}
                          {selectedOrder.status === 'pending' && (
                            <Button
                              variant="outline"
                              onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                              disabled={updatingOrder === selectedOrder.id}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </Card>
                  ) : (
                    <Card className="p-12 text-center">
                      <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Select an order to view details</p>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Store Settings Tab */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Store Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    value={storeForm.store_name}
                    onChange={e => setStoreForm({ ...storeForm, store_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                    placeholder="Your Store Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Store URL (Slug)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm">
                      peeap.com/store/
                    </span>
                    <input
                      type="text"
                      value={storeForm.store_slug}
                      onChange={e => setStoreForm({ ...storeForm, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      placeholder="my-store"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={storeForm.description}
                    onChange={e => setStoreForm({ ...storeForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                    placeholder="Tell customers about your store..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={storeForm.phone}
                      onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      placeholder="+232 XX XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={storeForm.email}
                      onChange={e => setStoreForm({ ...storeForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      placeholder="store@example.com"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      value={storeForm.address}
                      onChange={e => setStoreForm({ ...storeForm, address: e.target.value })}
                      rows={2}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      placeholder="Store address"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={e => setStoreForm({ ...storeForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                    placeholder="Freetown"
                  />
                </div>
              </div>
            </Card>

            {/* Store Categories */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Store Categories</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Select categories that best describe your store
              </p>

              <div className="flex flex-wrap gap-2">
                {storeCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      const selected = storeForm.store_categories.includes(category.slug);
                      setStoreForm({
                        ...storeForm,
                        store_categories: selected
                          ? storeForm.store_categories.filter(c => c !== category.slug)
                          : [...storeForm.store_categories, category.slug],
                      });
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      storeForm.store_categories.includes(category.slug)
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: storeForm.store_categories.includes(category.slug) ? category.color : undefined,
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </Card>

            {/* Visibility Toggle */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">List on Marketplace</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    When enabled, your store will be visible to all customers on the Peeap marketplace
                  </p>
                </div>
                <button
                  onClick={() => setStoreForm({ ...storeForm, is_listed: !storeForm.is_listed })}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    storeForm.is_listed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                      storeForm.is_listed ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Warning if no store */}
            {!store && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Please save your store settings first before managing products.
                  </p>
                </div>
              </div>
            )}

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                />
              </div>

              {selectedProductIds.size > 0 && store && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bulkToggleProducts(true)}
                    disabled={togglingProducts}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    List Selected ({selectedProductIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bulkToggleProducts(false)}
                    disabled={togglingProducts}
                  >
                    <EyeOff className="w-4 h-4 mr-1" />
                    Unlist Selected
                  </Button>
                </div>
              )}
            </div>

            {/* Products list */}
            <Card className="overflow-hidden">
              {products.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Add products in your POS to list them on the marketplace
                  </p>
                  <Button onClick={() => navigate('/merchant/pos/products')}>
                    Go to Products
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <div className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
                          } else {
                            setSelectedProductIds(new Set());
                          }
                        }}
                        className="w-4 h-4 text-primary-600 rounded"
                        disabled={!store}
                      />
                    </div>
                    <div className="w-16"></div>
                    <div className="flex-1">Product</div>
                    <div className="w-24 text-right">Price</div>
                    <div className="w-24 text-center">Stock</div>
                    <div className="w-32 text-center">Marketplace</div>
                  </div>

                  {/* Product rows */}
                  {filteredProducts.map(product => {
                    const isListed = isProductListed(product.id);
                    const isSelected = selectedProductIds.has(product.id);

                    return (
                      <div
                        key={product.id}
                        className={`px-4 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                        }`}
                      >
                        <div className="w-8">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const newSelected = new Set(selectedProductIds);
                              if (e.target.checked) {
                                newSelected.add(product.id);
                              } else {
                                newSelected.delete(product.id);
                              }
                              setSelectedProductIds(newSelected);
                            }}
                            className="w-4 h-4 text-primary-600 rounded"
                            disabled={!store}
                          />
                        </div>
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {product.name}
                          </p>
                          {product.sku && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              SKU: {product.sku}
                            </p>
                          )}
                          {product.category && (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs text-white"
                              style={{ backgroundColor: product.category.color }}
                            >
                              {product.category.name}
                            </span>
                          )}
                        </div>
                        <div className="w-24 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(product.price)}
                        </div>
                        <div className="w-24 text-center">
                          {product.track_inventory ? (
                            <span className={`font-medium ${
                              product.stock_quantity <= product.low_stock_threshold
                                ? 'text-red-600'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {product.stock_quantity}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                        <div className="w-32 text-center">
                          <button
                            onClick={() => toggleProductListing(product.id, !isListed)}
                            disabled={!store}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              !store
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isListed
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {isListed ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                Listed
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                Hidden
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Listed</p>
                <p className="text-2xl font-bold text-green-600">{listings.filter(l => l.is_listed).length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Hidden</p>
                <p className="text-2xl font-bold text-gray-600">{products.length - listings.filter(l => l.is_listed).length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => p.track_inventory && p.stock_quantity === 0).length}
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            {/* Fulfillment Options */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fulfillment Options</h2>

              <div className="space-y-4">
                {/* Pickup */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">In-Store Pickup</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customers can pick up orders from your location
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStoreForm({ ...storeForm, offers_pickup: !storeForm.offers_pickup })}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      storeForm.offers_pickup ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                        storeForm.offers_pickup ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Delivery */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Truck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Delivery</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Deliver orders to customers
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStoreForm({ ...storeForm, offers_delivery: !storeForm.offers_delivery })}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      storeForm.offers_delivery ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                        storeForm.offers_delivery ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>

            {/* Delivery Settings */}
            {storeForm.offers_delivery && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Settings</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Delivery Fee (Le)
                    </label>
                    <input
                      type="number"
                      value={storeForm.delivery_fee}
                      onChange={e => setStoreForm({ ...storeForm, delivery_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Free Delivery Above (Le)
                    </label>
                    <input
                      type="number"
                      value={storeForm.free_delivery_minimum}
                      onChange={e => setStoreForm({ ...storeForm, free_delivery_minimum: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      placeholder="0 = no free delivery"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set to 0 to disable free delivery</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Delivery Radius (km)
                    </label>
                    <input
                      type="number"
                      value={storeForm.delivery_radius_km}
                      onChange={e => setStoreForm({ ...storeForm, delivery_radius_km: parseFloat(e.target.value) || 5 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                      min="1"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Order Settings */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Order (Le)
                  </label>
                  <input
                    type="number"
                    value={storeForm.minimum_order}
                    onChange={e => setStoreForm({ ...storeForm, minimum_order: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for no minimum</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preparation Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={storeForm.preparation_time_minutes}
                    onChange={e => setStoreForm({ ...storeForm, preparation_time_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Average time to prepare an order</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Operating Hours Tab */}
        {activeTab === 'hours' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Operating Hours</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Set your store's opening and closing times for each day
            </p>

            <div className="space-y-3">
              {DAYS.map(day => {
                const hours = storeForm.operating_hours[day] || { open: '09:00', close: '17:00' };
                const isClosed = hours.closed;

                return (
                  <div
                    key={day}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="w-28">
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{day}</p>
                    </div>

                    <button
                      onClick={() => toggleDayHours(day, !isClosed)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isClosed
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {isClosed ? 'Closed' : 'Open'}
                    </button>

                    {!isClosed && (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={e => updateDayHours(day, 'open', e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={e => updateDayHours(day, 'close', e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> Customers can only place orders during your operating hours.
                Outside of these hours, they can still browse your store but cannot checkout.
              </p>
            </div>
          </Card>
        )}
      </div>
    </MerchantLayout>
  );
}

export default POSMarketplacePage;
