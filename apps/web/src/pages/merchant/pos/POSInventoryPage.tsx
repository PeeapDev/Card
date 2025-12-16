/**
 * POS Inventory & Alerts Page
 * Manage stock levels, view low stock alerts, and track inventory
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  ArrowLeft,
  Loader2,
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  Bell,
  BellOff,
  Plus,
  Minus,
  Edit2,
  TrendingDown,
  BarChart2,
  X,
  Save,
  Wifi,
  WifiOff,
} from 'lucide-react';
import posService, { POSProduct, POSInventoryAlert } from '@/services/pos.service';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Stock level indicator
const StockIndicator = ({ current, threshold }: { current: number; threshold: number }) => {
  if (current <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
        <AlertCircle className="w-3 h-3" />
        Out of Stock
      </span>
    );
  }
  if (current <= threshold) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
      <CheckCircle className="w-3 h-3" />
      In Stock
    </span>
  );
};

export function POSInventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  // Use offline sync hook for offline-first data access
  const offlineSync = useOfflineSync(merchantId);

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [alerts, setAlerts] = useState<POSInventoryAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ quantity: 0, reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (merchantId) {
      loadData();
    }
  }, [merchantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Use offline sync - works offline with IndexedDB
      const [productsData, alertsData] = await Promise.all([
        offlineSync.getProducts(),
        offlineSync.getInventoryAlerts(),
      ]);
      setProducts(productsData);
      // Cast alerts as POSInventoryAlert[] - offline alerts have slightly different structure
      setAlerts(alertsData as POSInventoryAlert[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStockModal = (product: POSProduct) => {
    setSelectedProduct(product);
    setStockAdjustment({ quantity: 0, reason: '' });
    setShowStockModal(true);
  };

  const adjustStock = async (type: 'add' | 'remove') => {
    if (!selectedProduct || stockAdjustment.quantity <= 0) return;

    try {
      setSaving(true);
      const adjustment = type === 'add' ? stockAdjustment.quantity : -stockAdjustment.quantity;

      // Use offline sync - works offline with IndexedDB
      await offlineSync.adjustInventory(
        selectedProduct.id!,
        adjustment,
        stockAdjustment.reason || `Stock ${type === 'add' ? 'added' : 'removed'}`
      );

      await loadData();
      setShowStockModal(false);
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      // This would update the alert as acknowledged
      // For now we'll just refresh
      await loadData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  // Filter and search products
  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!product.name.toLowerCase().includes(query) &&
          !product.sku?.toLowerCase().includes(query) &&
          !product.barcode?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Stock filter
    const threshold = product.low_stock_threshold || 10;
    if (filter === 'out' && (product.stock_quantity || 0) > 0) return false;
    if (filter === 'low' && ((product.stock_quantity || 0) > threshold || (product.stock_quantity || 0) <= 0)) return false;

    return true;
  });

  // Stats
  const stats = {
    total: products.length,
    inStock: products.filter(p => (p.stock_quantity || 0) > (p.low_stock_threshold || 10)).length,
    lowStock: products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)).length,
    outOfStock: products.filter(p => (p.stock_quantity || 0) <= 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.stock_quantity || 0) * Number(p.price)), 0),
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage stock levels and alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Offline Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              offlineSync.isOnline
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {offlineSync.isOnline ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Offline Mode
                </>
              )}
            </div>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-orange-800">
                  {alerts.length} Inventory Alert{alerts.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-orange-600">
                  {alerts.filter(a => a.alert_type === 'out_of_stock').length} out of stock,
                  {' '}{alerts.filter(a => a.alert_type === 'low_stock').length} low stock
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('low')}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                View Alerts
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Products</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Stock</p>
                <p className="text-xl font-bold text-green-600">{stats.inStock}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Low Stock</p>
                <p className="text-xl font-bold text-orange-600">{stats.lowStock}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Out of Stock</p>
                <p className="text-xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stock Value</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, barcode..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'low', label: 'Low Stock', count: stats.lowStock },
              { key: 'out', label: 'Out of Stock', count: stats.outOfStock },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Threshold</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p>No products found</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => {
                    const threshold = product.low_stock_threshold || 10;
                    const stockValue = (product.stock_quantity || 0) * Number(product.price);

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 dark:bg-gray-700">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(Number(product.price))}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {product.sku || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-lg font-bold ${
                            (product.stock_quantity || 0) <= 0 ? 'text-red-600' :
                            (product.stock_quantity || 0) <= threshold ? 'text-orange-600' :
                            'text-gray-900 dark:text-white'
                          }`}>
                            {product.stock_quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                          {threshold}
                        </td>
                        <td className="px-4 py-3">
                          <StockIndicator
                            current={product.stock_quantity || 0}
                            threshold={threshold}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatCurrency(stockValue)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openStockModal(product)}
                              className="p-1.5 bg-primary-50 text-primary-600 rounded hover:bg-primary-100"
                              title="Adjust Stock"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Adjust Stock</h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Current stock: <span className="font-bold">{selectedProduct.stock_quantity || 0}</span>
                  </p>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantity to Adjust
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStockAdjustment(s => ({ ...s, quantity: Math.max(0, s.quantity - 1) }))}
                    className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={stockAdjustment.quantity}
                    onChange={e => setStockAdjustment(s => ({ ...s, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => setStockAdjustment(s => ({ ...s, quantity: s.quantity + 1 }))}
                    className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-200"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={stockAdjustment.reason}
                  onChange={e => setStockAdjustment(s => ({ ...s, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., New shipment, Damaged goods..."
                />
              </div>

              {/* Preview */}
              {stockAdjustment.quantity > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Preview:</strong>
                  </p>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Add stock:</span>
                    <span>{selectedProduct.stock_quantity || 0} + {stockAdjustment.quantity} = <strong>{(selectedProduct.stock_quantity || 0) + stockAdjustment.quantity}</strong></span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Remove stock:</span>
                    <span>{selectedProduct.stock_quantity || 0} - {stockAdjustment.quantity} = <strong>{Math.max(0, (selectedProduct.stock_quantity || 0) - stockAdjustment.quantity)}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:bg-red-50"
                onClick={() => adjustStock('remove')}
                disabled={saving || stockAdjustment.quantity <= 0}
              >
                <Minus className="w-4 h-4 mr-2" />
                Remove Stock
              </Button>
              <Button
                className="flex-1"
                onClick={() => adjustStock('add')}
                disabled={saving || stockAdjustment.quantity <= 0}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Stock
              </Button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

export default POSInventoryPage;
