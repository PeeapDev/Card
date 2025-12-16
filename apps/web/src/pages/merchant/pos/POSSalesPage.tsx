/**
 * POS Sales History Page
 * Uses merchant's user profile directly - no separate business needed
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Loader2,
  Receipt,
  Calendar,
  Search,
  Download,
  Eye,
  X,
  Banknote,
  Smartphone,
  CreditCard,
  QrCode,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Clock,
  XCircle,
} from 'lucide-react';
import posService, { POSSale } from '@/services/pos.service';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Payment method icon
const PaymentMethodIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'cash':
      return <Banknote className="w-4 h-4" />;
    case 'mobile_money':
      return <Smartphone className="w-4 h-4" />;
    case 'card':
      return <CreditCard className="w-4 h-4" />;
    case 'qr':
      return <QrCode className="w-4 h-4" />;
    default:
      return <DollarSign className="w-4 h-4" />;
  }
};

export function POSSalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use user.id as the merchant ID (no separate business needed)
  const merchantId = user?.id;

  // State
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<POSSale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [business, setBusiness] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedSale, setSelectedSale] = useState<POSSale | null>(null);

  // Summary stats
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalAmount: 0,
    averageTicket: 0,
    topProducts: [] as any[],
    paymentBreakdown: [] as any[],
  });

  // Load data
  useEffect(() => {
    if (merchantId) {
      loadData();
    }
  }, [merchantId, dateFilter]);

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'today':
        return {
          startDate: today.toISOString(),
          endDate: new Date().toISOString(),
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday.toISOString(),
          endDate: today.toISOString(),
        };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          startDate: weekAgo.toISOString(),
          endDate: new Date().toISOString(),
        };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          startDate: monthAgo.toISOString(),
          endDate: new Date().toISOString(),
        };
      default:
        return {};
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Use user profile as business info
      setBusiness({
        id: merchantId,
        name: user ? `${user.firstName} ${user.lastName}` : 'My Store',
      });

      // Load sales with date filter
      const dateRange = getDateRange();
      const { sales: salesData, total } = await posService.getSales(merchantId!, {
        ...dateRange,
        limit: 100,
      });
      setSales(salesData);
      setTotalCount(total);

      // Calculate summary
      const completedSales = salesData.filter(s => s.status === 'completed');
      const totalAmount = completedSales.reduce((sum, s) => sum + Number(s.total_amount), 0);

      // Payment breakdown
      const paymentMap = new Map<string, { method: string; count: number; amount: number }>();
      for (const sale of completedSales) {
        const existing = paymentMap.get(sale.payment_method) || { method: sale.payment_method, count: 0, amount: 0 };
        existing.count += 1;
        existing.amount += Number(sale.total_amount);
        paymentMap.set(sale.payment_method, existing);
      }

      // Top products
      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const sale of completedSales) {
        for (const item of (sale as any).items || []) {
          const existing = productMap.get(item.product_name) || { name: item.product_name, quantity: 0, revenue: 0 };
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total_price);
          productMap.set(item.product_name, existing);
        }
      }

      setSummary({
        totalSales: completedSales.length,
        totalAmount,
        averageTicket: completedSales.length > 0 ? totalAmount / completedSales.length : 0,
        topProducts: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        paymentBreakdown: Array.from(paymentMap.values()),
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sales by search
  const filteredSales = sales.filter(sale => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sale.sale_number?.toLowerCase().includes(query) ||
      sale.customer_name?.toLowerCase().includes(query) ||
      sale.customer_phone?.toLowerCase().includes(query)
    );
  });

  const voidSale = async (sale: POSSale) => {
    const reason = prompt('Enter reason for voiding this sale:');
    if (!reason) return;

    try {
      await posService.voidSale(sale.id!, reason, 'current-user-id');
      loadData();
      setSelectedSale(null);
    } catch (error) {
      console.error('Error voiding sale:', error);
      alert('Failed to void sale');
    }
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales History</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{business?.name}</p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalSales}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Ticket</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.averageTicket)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Period</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{dateFilter}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Breakdown & Top Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
            {summary.paymentBreakdown.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {summary.paymentBreakdown.map(pm => (
                  <div key={pm.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PaymentMethodIcon method={pm.method} />
                      <span className="capitalize">{pm.method.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(pm.amount)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pm.count} sales</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Products</h3>
            {summary.topProducts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {summary.topProducts.map((prod, idx) => (
                  <div key={prod.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[150px]">{prod.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(prod.revenue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{prod.quantity} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Filter */}
          <div className="flex gap-2">
            {['today', 'yesterday', 'week', 'month'].map(period => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === period
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by sale number, customer..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sale #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p>No sales found</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:bg-gray-700">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{sale.sale_number}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(sale.created_at!)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(sale as any).items?.length || 0} items
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <PaymentMethodIcon method={sale.payment_method} />
                          <span className="capitalize">{sale.payment_method.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : sale.status === 'voided'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(Number(sale.total_amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="p-1 hover:bg-gray-100 dark:bg-gray-900 rounded"
                        >
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold">Sale Details</h2>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Sale Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-lg font-semibold">{selectedSale.sale_number}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(selectedSale.created_at!)}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedSale.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : selectedSale.status === 'voided'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedSale.status}
                </span>
              </div>

              {/* Items */}
              <div className="border rounded-lg divide-y">
                {((selectedSale as any).items || []).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.quantity} x {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(Number(item.total_price))}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span>{formatCurrency(Number(selectedSale.subtotal))}</span>
                </div>
                {Number(selectedSale.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(Number(selectedSale.discount_amount))}</span>
                  </div>
                )}
                {Number(selectedSale.tax_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span>{formatCurrency(Number(selectedSale.tax_amount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(Number(selectedSale.total_amount))}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <PaymentMethodIcon method={selectedSale.payment_method} />
                  <span className="font-medium capitalize">
                    {selectedSale.payment_method.replace('_', ' ')}
                  </span>
                </div>
                {selectedSale.payment_method === 'cash' && selectedSale.payment_details && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Received: {formatCurrency(selectedSale.payment_details.received || 0)}</p>
                    <p>Change: {formatCurrency(selectedSale.payment_details.change || 0)}</p>
                  </div>
                )}
              </div>

              {/* Cashier */}
              {selectedSale.cashier_name && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span>Cashier: </span>
                  <span className="font-medium">{selectedSale.cashier_name}</span>
                </div>
              )}

              {/* Void reason */}
              {selectedSale.status === 'voided' && (selectedSale as any).void_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    <strong>Void Reason:</strong> {(selectedSale as any).void_reason}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedSale(null)}>
                Close
              </Button>
              {selectedSale.status === 'completed' && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => voidSale(selectedSale)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Void Sale
                </Button>
              )}
              <Button>
                <Receipt className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

export default POSSalesPage;
