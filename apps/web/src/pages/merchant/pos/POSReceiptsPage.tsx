/**
 * POS Receipts Page
 * View, print, and manage sales receipts
 * Supports printing to receipt printers and sending receipts to customers
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Receipt,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  Download,
  Send,
  Eye,
  X,
  CheckCircle,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
  User,
  Store,
  Phone,
  Mail,
  MessageSquare,
} from 'lucide-react';

interface POSSale {
  id: string;
  merchant_id: string;
  sale_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  payment_method: string;
  payment_reference?: string;
  status: 'pending' | 'completed' | 'refunded' | 'cancelled';
  notes?: string;
  created_at: string;
  completed_at?: string;
  staff_id?: string;
  staff_name?: string;
  items: POSSaleItem[];
}

interface POSSaleItem {
  id: string;
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
}

interface BusinessSettings {
  business_name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  receipt_footer?: string;
  logo_url?: string;
}

export function POSReceiptsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const selectedSaleId = searchParams.get('id');

  // State
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<POSSale[]>([]);
  const [filteredSales, setFilteredSales] = useState<POSSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<POSSale | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const merchantId = user?.id;

  useEffect(() => {
    if (merchantId) {
      loadData();
    }
  }, [merchantId]);

  useEffect(() => {
    if (selectedSaleId && sales.length > 0) {
      const sale = sales.find(s => s.id === selectedSaleId);
      if (sale) {
        setSelectedSale(sale);
        setShowReceiptModal(true);
      }
    }
  }, [selectedSaleId, sales]);

  useEffect(() => {
    filterSales();
  }, [sales, searchQuery, dateRange, paymentFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load business settings
      const { data: settings } = await supabaseAdmin
        .from('pos_settings')
        .select('*')
        .eq('merchant_id', merchantId)
        .single();

      if (settings) {
        setBusinessSettings({
          business_name: settings.business_name || 'My Business',
          address: settings.address,
          city: settings.city,
          phone: settings.phone,
          email: settings.email,
          tax_id: settings.tax_id,
          receipt_footer: settings.receipt_footer,
          logo_url: settings.logo_url,
        });
      }

      // Load sales with items
      const { data: salesData, error } = await supabaseAdmin
        .from('pos_sales')
        .select(`
          *,
          items:pos_sale_items(*)
        `)
        .eq('merchant_id', merchantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSales(salesData || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = [...sales];

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (dateRange === 'today') {
      filtered = filtered.filter(s => new Date(s.created_at) >= today);
    } else if (dateRange === 'week') {
      filtered = filtered.filter(s => new Date(s.created_at) >= weekAgo);
    } else if (dateRange === 'month') {
      filtered = filtered.filter(s => new Date(s.created_at) >= monthAgo);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(s => s.payment_method === paymentFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.sale_number.toLowerCase().includes(query) ||
        s.customer_name?.toLowerCase().includes(query) ||
        s.customer_phone?.includes(query)
      );
    }

    setFilteredSales(filtered);
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'mobile_money': return <Smartphone className="w-4 h-4" />;
      case 'qr': return <QrCode className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'mobile_money': return 'Mobile Money';
      case 'qr': return 'QR Payment';
      default: return method;
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedSale || !printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${selectedSale.sale_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              padding: 10mm 5mm;
            }
            .receipt-header { text-align: center; margin-bottom: 10px; }
            .receipt-header h1 { font-size: 16px; font-weight: bold; }
            .receipt-header p { font-size: 10px; color: #666; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .receipt-info { margin-bottom: 10px; }
            .receipt-info p { display: flex; justify-content: space-between; }
            .items-table { width: 100%; margin-bottom: 10px; }
            .items-table th, .items-table td { text-align: left; padding: 2px 0; }
            .items-table th:last-child, .items-table td:last-child { text-align: right; }
            .totals { margin-top: 10px; }
            .totals p { display: flex; justify-content: space-between; margin: 2px 0; }
            .totals .total { font-weight: bold; font-size: 14px; margin-top: 5px; }
            .payment-info { margin-top: 10px; text-align: center; }
            .receipt-footer { text-align: center; margin-top: 15px; font-size: 10px; }
            .barcode { text-align: center; margin: 10px 0; font-family: 'Libre Barcode 39', monospace; font-size: 32px; }
            @media print {
              body { width: 80mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSendReceipt = async (method: 'sms' | 'email' | 'chat') => {
    if (!selectedSale) return;

    try {
      setSendingReceipt(true);

      // Create notification for customer
      if (selectedSale.customer_id) {
        const receiptMessage = `Receipt from ${businessSettings?.business_name || 'Business'}\n` +
          `Sale #${selectedSale.sale_number}\n` +
          `Date: ${formatDate(selectedSale.created_at)}\n` +
          `Total: ${formatCurrency(selectedSale.total_amount)}\n` +
          `Payment: ${getPaymentLabel(selectedSale.payment_method)}\n\n` +
          `Thank you for your purchase!`;

        // Create notification
        await supabaseAdmin.from('notifications').insert({
          user_id: selectedSale.customer_id,
          title: `Receipt from ${businessSettings?.business_name || 'Business'}`,
          message: receiptMessage,
          type: 'receipt',
          data: {
            sale_id: selectedSale.id,
            sale_number: selectedSale.sale_number,
            total: selectedSale.total_amount,
            merchant_id: merchantId,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        });

        // If chat method, create/update conversation
        if (method === 'chat') {
          // Check if conversation exists
          const { data: existingConvo } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .or(`and(participant_one.eq.${merchantId},participant_two.eq.${selectedSale.customer_id}),and(participant_one.eq.${selectedSale.customer_id},participant_two.eq.${merchantId})`)
            .single();

          let conversationId = existingConvo?.id;

          if (!conversationId) {
            // Create new conversation
            const { data: newConvo } = await supabaseAdmin
              .from('conversations')
              .insert({
                participant_one: merchantId,
                participant_two: selectedSale.customer_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            conversationId = newConvo?.id;
          }

          if (conversationId) {
            // Send receipt as message
            await supabaseAdmin.from('messages').insert({
              conversation_id: conversationId,
              sender_id: merchantId,
              content: receiptMessage,
              message_type: 'receipt',
              metadata: {
                sale_id: selectedSale.id,
                sale_number: selectedSale.sale_number,
                total: selectedSale.total_amount,
              },
              created_at: new Date().toISOString(),
            });

            // Update conversation last message
            await supabaseAdmin
              .from('conversations')
              .update({
                last_message: `Receipt #${selectedSale.sale_number}`,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversationId);
          }
        }

        alert('Receipt sent successfully!');
      } else {
        alert('No customer linked to this sale. Cannot send receipt.');
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      alert('Failed to send receipt. Please try again.');
    } finally {
      setSendingReceipt(false);
    }
  };

  const viewReceipt = (sale: POSSale) => {
    setSelectedSale(sale);
    setShowReceiptModal(true);
    navigate(`/merchant/pos/receipts?id=${sale.id}`, { replace: true });
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
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receipts</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View and print sales receipts
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by receipt #, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Payments</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="qr">QR Payment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredSales.length}
                </p>
                <p className="text-sm text-gray-500">Receipts</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(filteredSales.reduce((sum, s) => sum + s.total_amount, 0))}
                </p>
                <p className="text-sm text-gray-500">Total Sales</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredSales.filter(s => s.customer_id).length}
                </p>
                <p className="text-sm text-gray-500">With Customers</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Banknote className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(filteredSales.length > 0 ? filteredSales.reduce((sum, s) => sum + s.total_amount, 0) / filteredSales.length : 0)}
                </p>
                <p className="text-sm text-gray-500">Avg Sale</p>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts List */}
        {filteredSales.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No receipts found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || dateRange !== 'all' || paymentFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Complete a sale to see receipts here'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => viewReceipt(sale)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                        <Receipt className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            #{sale.sale_number}
                          </p>
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                            {getPaymentIcon(sale.payment_method)}
                            {getPaymentLabel(sale.payment_method)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(sale.created_at)} at {formatTime(sale.created_at)}
                          </span>
                          {sale.customer_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {sale.customer_name}
                            </span>
                          )}
                          <span>{sale.items.length} items</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(sale.total_amount)}
                        </p>
                        {sale.discount_amount > 0 && (
                          <p className="text-xs text-gray-500">
                            Discount: {formatCurrency(sale.discount_amount)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Receipt #{selectedSale.sale_number}
              </h2>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedSale(null);
                  navigate('/merchant/pos/receipts', { replace: true });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div ref={printRef} className="receipt-content">
                {/* Business Header */}
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {businessSettings?.business_name || 'My Business'}
                  </h1>
                  {businessSettings?.address && (
                    <p className="text-sm text-gray-500">{businessSettings.address}</p>
                  )}
                  {businessSettings?.phone && (
                    <p className="text-sm text-gray-500">{businessSettings.phone}</p>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4" />

                {/* Receipt Info */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Receipt #:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedSale.sale_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-900 dark:text-white">{formatDate(selectedSale.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time:</span>
                    <span className="text-gray-900 dark:text-white">{formatTime(selectedSale.created_at)}</span>
                  </div>
                  {selectedSale.customer_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer:</span>
                      <span className="text-gray-900 dark:text-white">{selectedSale.customer_name}</span>
                    </div>
                  )}
                  {selectedSale.staff_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Served by:</span>
                      <span className="text-gray-900 dark:text-white">{selectedSale.staff_name}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4" />

                {/* Items */}
                <div className="space-y-3 mb-4">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white">{item.product_name}</p>
                        <p className="text-gray-500">
                          {item.quantity} x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.total_price)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4" />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                    </div>
                  )}
                  {selectedSale.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(selectedSale.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">Total:</span>
                    <span className="text-green-600">{formatCurrency(selectedSale.total_amount)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4" />

                {/* Payment Info */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Method:</span>
                    <span className="flex items-center gap-1 text-gray-900 dark:text-white">
                      {getPaymentIcon(selectedSale.payment_method)}
                      {getPaymentLabel(selectedSale.payment_method)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Paid:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(selectedSale.amount_paid)}</span>
                  </div>
                  {selectedSale.change_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Change:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(selectedSale.change_amount)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 mt-6">
                  <p>{businessSettings?.receipt_footer || 'Thank you for your purchase!'}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* Print Button */}
              <Button
                onClick={handlePrintReceipt}
                className="w-full"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>

              {/* Send Options */}
              {selectedSale.customer_id && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSendReceipt('sms')}
                    disabled={sendingReceipt}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Phone className="w-4 h-4" />
                    SMS
                  </button>
                  <button
                    onClick={() => handleSendReceipt('email')}
                    disabled={sendingReceipt}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </button>
                  <button
                    onClick={() => handleSendReceipt('chat')}
                    disabled={sendingReceipt}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

export default POSReceiptsPage;
