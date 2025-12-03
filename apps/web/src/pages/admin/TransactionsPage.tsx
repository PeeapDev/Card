import { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ChevronDown,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { currencyService, Currency } from '@/services/currency.service';

interface Transaction {
  id: string;
  type: 'authorization' | 'clearing' | 'refund' | 'reversal' | 'transfer' | 'deposit' | 'withdrawal';
  cardId: string;
  cardLast4: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantCategory: string;
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  direction: 'debit' | 'credit';
  createdAt: string;
  settledAt: string | null;
}

export function TransactionsPage() {
  const [filter, setFilter] = useState<'all' | 'authorization' | 'clearing' | 'refund' | 'transfer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalTransactions: 0,
    volume: 0,
    pending: 0,
    failed: 0,
    avgValue: 0,
    successRate: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    fetchTransactions();
  }, []);

  const currencySymbol = defaultCurrency?.symbol || '';

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch transactions from database
      const { data: txnData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Get wallet IDs from transactions
      const walletIds = [...new Set(txnData?.map(t => t.wallet_id).filter(Boolean) || [])];

      // Fetch wallets with user info
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id, user_id')
        .in('id', walletIds);

      const walletMap = new Map(wallets?.map(w => [w.id, w.user_id]) || []);

      // Get user IDs from wallets
      const userIds = [...new Set(wallets?.map(w => w.user_id).filter(Boolean) || [])];

      // Fetch users
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Transform transactions to display format
      const formattedTxns: Transaction[] = (txnData || []).map(txn => {
        // Get user from wallet
        const userId = walletMap.get(txn.wallet_id);
        const user = userId ? userMap.get(userId) : null;

        // Try to get name from metadata if user lookup fails
        const metadata = txn.metadata || {};
        let customerName = 'Unknown';

        if (user) {
          customerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
        } else if (metadata.sender_name) {
          customerName = metadata.sender_name;
        } else if (metadata.recipient_name) {
          customerName = metadata.recipient_name;
        }

        return {
          id: txn.id,
          type: (txn.type || 'transfer').toLowerCase(),
          cardId: txn.card_id || '',
          cardLast4: '****',
          customerId: userId || txn.wallet_id || '',
          customerName,
          amount: Math.abs(txn.amount),
          currency: txn.currency || 'SLE',
          merchantName: txn.description || txn.type,
          merchantCategory: txn.type,
          status: (txn.status || 'completed').toLowerCase(),
          direction: txn.amount >= 0 ? 'credit' : 'debit',
          createdAt: txn.created_at,
          settledAt: txn.status?.toLowerCase() === 'completed' ? txn.created_at : null,
        };
      });

      setTransactions(formattedTxns);

      // Calculate stats
      const completed = formattedTxns.filter(t => t.status === 'completed').length;
      const pending = formattedTxns.filter(t => t.status === 'pending').length;
      const failed = formattedTxns.filter(t => t.status === 'failed').length;
      const totalVolume = formattedTxns.reduce((sum, t) => sum + t.amount, 0);

      setStats({
        totalTransactions: formattedTxns.length,
        volume: totalVolume,
        pending,
        failed,
        avgValue: formattedTxns.length > 0 ? totalVolume / formattedTxns.length : 0,
        successRate: formattedTxns.length > 0 ? (completed / formattedTxns.length) * 100 : 0,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'authorization':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Auth</span>;
      case 'clearing':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Clearing</span>;
      case 'refund':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Refund</span>;
      case 'reversal':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Reversal</span>;
      case 'transfer':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">Transfer</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"><Clock className="w-3 h-3" /> Pending</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'reversed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"><RefreshCw className="w-3 h-3" /> Reversed</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const filteredTransactions = transactions.filter(txn => {
    if (filter !== 'all' && txn.type !== filter) return false;
    if (statusFilter !== 'all' && txn.status !== statusFilter) return false;
    if (searchQuery && !txn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !txn.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !txn.merchantName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-500 dark:text-gray-400">View and manage all transactions</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <MotionCard className="p-4" delay={0}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTransactions.toLocaleString()}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.1}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{currencySymbol}{(stats.volume / 1000000).toFixed(2)}M</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.2}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.3}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.4}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Transaction</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{currencySymbol}{stats.avgValue.toFixed(2)}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.5}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.successRate}%</p>
          </MotionCard>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ID, customer, or merchant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="appearance-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="authorization">Authorization</option>
                  <option value="clearing">Clearing</option>
                  <option value="refund">Refund</option>
                  <option value="transfer">Transfer</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="appearance-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transaction</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Card</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Merchant</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${
                          txn.direction === 'debit' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                        }`}>
                          {txn.direction === 'debit' ? (
                            <ArrowUpRight className={`w-4 h-4 text-red-600 dark:text-red-400`} />
                          ) : (
                            <ArrowDownLeft className={`w-4 h-4 text-green-600 dark:text-green-400`} />
                          )}
                        </div>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{txn.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{txn.customerName}</p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{txn.customerId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">****{txn.cardLast4}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`font-medium ${
                          txn.direction === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {txn.direction === 'credit' ? '+' : '-'}{formatCurrency(txn.amount, txn.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.merchantName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{txn.merchantCategory}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(txn.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(txn.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(txn.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {txn.status === 'completed' && txn.type !== 'refund' && (
                          <button className="p-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50" title="Refund">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {txn.status === 'failed' && (
                          <button className="p-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50" title="Review">
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing 1 to {filteredTransactions.length} of {stats.totalTransactions} transactions
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded">1</button>
              <button className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">2</button>
              <button className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">3</button>
              <button className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
