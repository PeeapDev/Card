import { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { currencyService, Currency } from '@/services/currency.service';
import { merchantService, MerchantTransaction } from '@/services/merchant.service';
import { useAuth } from '@/context/AuthContext';

export function MerchantTransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<MerchantTransaction | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalVolume: 0,
  });

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    if (user?.id) {
      fetchTransactions();
      fetchStats();
    }
  }, [user?.id]);

  const fetchTransactions = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const { transactions: data } = await merchantService.getTransactions(user.id, {
        limit: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTransactions(data);
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      const data = await merchantService.getStats(user.id);
      setStats({
        total: data.totalTransactions,
        completed: data.completedTransactions,
        pending: data.pendingTransactions,
        failed: data.failedTransactions,
        totalVolume: data.totalVolume,
      });
    } catch {
      // Stats are optional
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [statusFilter]);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3" /> Pending</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'refunded':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><ArrowDownLeft className="w-3 h-3" /> Refunded</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-500 dark:text-gray-400">View and manage your payment transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTransactions}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Volume</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalVolume)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, reference, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <button onClick={fetchTransactions} className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Transactions will appear here when you receive payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${txn.type === 'credit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            {txn.type === 'credit' ? (
                              <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">{txn.id.slice(0, 8)}...</p>
                            {txn.reference && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{txn.reference}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${txn.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                          {txn.type === 'credit' ? '+' : ''}{formatCurrency(txn.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(txn.status)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{txn.customer_name || '-'}</p>
                          {txn.customer_email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{txn.customer_email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(txn.created_at).toLocaleDateString()}
                        <p className="text-xs">{new Date(txn.created_at).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedTransaction(txn)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTransaction(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">ID</span>
                  <span className="text-gray-900 dark:text-white font-mono text-sm">{selectedTransaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Amount</span>
                  <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(selectedTransaction.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Type</span>
                  <span className="text-gray-900 dark:text-white capitalize">{selectedTransaction.type}</span>
                </div>
                {selectedTransaction.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
                    <span className="text-gray-900 dark:text-white">{selectedTransaction.payment_method}</span>
                  </div>
                )}
                {selectedTransaction.reference && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Reference</span>
                    <span className="text-gray-900 dark:text-white">{selectedTransaction.reference}</span>
                  </div>
                )}
                {selectedTransaction.customer_email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Customer Email</span>
                    <span className="text-gray-900 dark:text-white">{selectedTransaction.customer_email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Created</span>
                  <span className="text-gray-900 dark:text-white">{new Date(selectedTransaction.created_at).toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="mt-6 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}
