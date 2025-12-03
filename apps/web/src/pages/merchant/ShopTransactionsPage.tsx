/**
 * Shop Transactions Page
 * Lists all transactions for a specific business/shop
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  ChevronDown,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { businessService, MerchantBusiness } from '@/services/business.service';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  customer_email?: string;
  customer_name?: string;
  reference?: string;
  payment_method?: string;
  created_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export function ShopTransactionsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    if (businessId) {
      fetchData();
    }
  }, [businessId]);

  const fetchData = async () => {
    if (!businessId) return;

    try {
      // Fetch business details
      const { data: businessData, error: businessError } = await supabase
        .from('merchant_businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (businessError) throw businessError;
      setBusiness(businessData);

      // Fetch transactions for this business
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);

      // Calculate stats
      const allTx = transactionData || [];
      setStats({
        total: allTx.length,
        completed: allTx.filter(t => t.status === 'completed' || t.status === 'success').length,
        pending: allTx.filter(t => t.status === 'pending').length,
        failed: allTx.filter(t => t.status === 'failed' || t.status === 'cancelled').length,
        totalAmount: allTx.reduce((sum, t) => sum + (t.amount || 0), 0),
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      completed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Completed' },
      success: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Success' },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-3.5 h-3.5" />, label: 'Processing' },
      failed: { color: 'bg-red-100 text-red-700', icon: <X className="w-3.5 h-3.5" />, label: 'Failed' },
      cancelled: { color: 'bg-gray-100 text-gray-700', icon: <X className="w-3.5 h-3.5" />, label: 'Cancelled' },
      refunded: { color: 'bg-purple-100 text-purple-700', icon: <RefreshCw className="w-3.5 h-3.5" />, label: 'Refunded' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // Using imported formatCurrency from @/lib/currency

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions = transactions.filter((tx) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        tx.id.toLowerCase().includes(query) ||
        tx.customer_email?.toLowerCase().includes(query) ||
        tx.customer_name?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && tx.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const txDate = new Date(tx.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (txDate < today) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (txDate < monthAgo) return false;
      }
    }

    return true;
  });

  const exportTransactions = () => {
    const csvData = filteredTransactions.map(tx => ({
      ID: tx.id,
      Amount: tx.amount,
      Currency: tx.currency || 'SLE',
      Status: tx.status,
      Customer: tx.customer_email || tx.customer_name || 'N/A',
      Reference: tx.reference || 'N/A',
      'Payment Method': tx.payment_method || 'N/A',
      Date: formatDate(tx.created_at),
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${business?.slug || businessId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!business) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Business not found</h2>
          <button
            onClick={() => navigate('/merchant/shops')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to My Shops
          </button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/merchant/shops/${businessId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link to="/merchant/shops" className="hover:text-green-600">My Shops</Link>
                <span>/</span>
                <Link to={`/merchant/shops/${businessId}`} className="hover:text-green-600">{business.name}</Link>
                <span>/</span>
                <span className="text-gray-900">Transactions</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            </div>
          </div>
          <button
            onClick={exportTransactions}
            disabled={filteredTransactions.length === 0}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total Transactions</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, email, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </Card>

        {/* Transactions List */}
        <Card className="p-0 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500">
                {transactions.length === 0
                  ? 'This business has no transactions yet.'
                  : 'No transactions match your filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tx.type === 'payout' ? 'bg-red-100' : 'bg-green-100'}`}>
                            {tx.type === 'payout' ? (
                              <ArrowUpRight className={`w-4 h-4 text-red-600`} />
                            ) : (
                              <ArrowDownLeft className={`w-4 h-4 text-green-600`} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 font-mono text-sm">
                              {tx.id.substring(0, 8)}...
                            </p>
                            {tx.reference && (
                              <p className="text-xs text-gray-500">Ref: {tx.reference}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{tx.customer_name || tx.customer_email || 'N/A'}</p>
                        {tx.customer_name && tx.customer_email && (
                          <p className="text-xs text-gray-500">{tx.customer_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">{formatCurrency(tx.amount, tx.currency)}</p>
                        {tx.payment_method && (
                          <p className="text-xs text-gray-500">{tx.payment_method}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(tx.status)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">{formatDate(tx.created_at)}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedTransaction(tx)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Transaction ID</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{selectedTransaction.id}</code>
                </div>
                {selectedTransaction.reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Reference</span>
                    <span className="text-gray-900">{selectedTransaction.reference}</span>
                  </div>
                )}
                {selectedTransaction.customer_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Customer Email</span>
                    <span className="text-gray-900">{selectedTransaction.customer_email}</span>
                  </div>
                )}
                {selectedTransaction.customer_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Customer Name</span>
                    <span className="text-gray-900">{selectedTransaction.customer_name}</span>
                  </div>
                )}
                {selectedTransaction.payment_method && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Payment Method</span>
                    <span className="text-gray-900">{selectedTransaction.payment_method}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">{formatDate(selectedTransaction.created_at)}</span>
                </div>
                {selectedTransaction.completed_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Completed</span>
                    <span className="text-gray-900">{formatDate(selectedTransaction.completed_at)}</span>
                  </div>
                )}
                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <span className="text-gray-500 block mb-2">Metadata</span>
                    <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}
