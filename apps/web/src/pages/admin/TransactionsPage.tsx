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
  TrendingUp,
  Activity,
  FileSearch,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { currencyService, Currency } from '@/services/currency.service';
import { AdminPageHeader, QuickStatsBar, StatItem } from '@/components/admin/AdminPageHeader';
import { DataTableToolbar, FilterConfig, EmptyState } from '@/components/admin/DataTableToolbar';

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

  // Export transactions to CSV
  const exportTransactions = () => {
    const headers = ['ID', 'Customer', 'Amount', 'Currency', 'Type', 'Status', 'Merchant', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(txn => [
        txn.id,
        `"${txn.customerName}"`,
        txn.amount,
        txn.currency,
        txn.type,
        txn.status,
        `"${txn.merchantName}"`,
        new Date(txn.createdAt).toISOString(),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Header stats
  const headerStats: StatItem[] = [
    {
      label: 'Total Transactions',
      value: stats.totalTransactions.toLocaleString(),
      icon: <ArrowLeftRight className="w-4 h-4" />,
      color: 'primary',
    },
    {
      label: 'Volume',
      value: `${currencySymbol}${(stats.volume / 1000000).toFixed(2)}M`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'green',
    },
    {
      label: 'Success Rate',
      value: `${stats.successRate.toFixed(1)}%`,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'green',
    },
    {
      label: 'Pending',
      value: stats.pending.toString(),
      icon: <Clock className="w-4 h-4" />,
      color: 'yellow',
    },
    {
      label: 'Failed',
      value: stats.failed.toString(),
      icon: <XCircle className="w-4 h-4" />,
      color: 'red',
    },
  ];

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'authorization', label: 'Authorization' },
        { value: 'clearing', label: 'Clearing' },
        { value: 'refund', label: 'Refund' },
        { value: 'transfer', label: 'Transfer' },
      ],
      value: filter,
      onChange: (value: string) => setFilter(value as typeof filter),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'completed', label: 'Completed' },
        { value: 'pending', label: 'Pending' },
        { value: 'failed', label: 'Failed' },
      ],
      value: statusFilter,
      onChange: (value: string) => setStatusFilter(value as typeof statusFilter),
    },
  ];

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
        {/* Header with Stats */}
        <AdminPageHeader
          title="Transactions"
          description="View and manage all payment transactions across the platform"
          icon={<ArrowLeftRight className="w-6 h-6" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Transactions' },
          ]}
          onRefresh={fetchTransactions}
          refreshing={loading}
          onExport={exportTransactions}
          stats={<QuickStatsBar stats={headerStats} />}
        />

        {/* Filters */}
        <Card className="p-4">
          <DataTableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by ID, customer, or merchant..."
            filters={filterConfigs}
            totalCount={stats.totalTransactions}
            onExport={exportTransactions}
          />
        </Card>

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={<FileSearch className="w-12 h-12" />}
              title="No transactions found"
              description={searchQuery ? "Try adjusting your search or filters" : "Transactions will appear here once customers start making payments"}
            />
          ) : (
          <>
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
          </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
