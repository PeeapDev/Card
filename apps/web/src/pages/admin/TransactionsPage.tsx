import { useState } from 'react';
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
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface Transaction {
  id: string;
  type: 'authorization' | 'clearing' | 'refund' | 'reversal' | 'transfer';
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

  const [stats] = useState({
    totalTransactions: 45672,
    volume: 2456780.50,
    pending: 156,
    failed: 89,
    avgValue: 125.50,
    successRate: 98.5,
  });

  const [transactions] = useState<Transaction[]>([
    {
      id: 'txn_001',
      type: 'authorization',
      cardId: 'card_001',
      cardLast4: '4242',
      customerId: 'cust_001',
      customerName: 'John Doe',
      amount: 125.00,
      currency: 'USD',
      merchantName: 'Amazon',
      merchantCategory: 'Online Retail',
      status: 'completed',
      direction: 'debit',
      createdAt: '2024-01-15T10:30:00Z',
      settledAt: '2024-01-15T10:30:05Z',
    },
    {
      id: 'txn_002',
      type: 'clearing',
      cardId: 'card_002',
      cardLast4: '1234',
      customerId: 'cust_002',
      customerName: 'Acme Corp',
      amount: 5000.00,
      currency: 'USD',
      merchantName: 'Office Depot',
      merchantCategory: 'Office Supplies',
      status: 'pending',
      direction: 'debit',
      createdAt: '2024-01-15T10:28:00Z',
      settledAt: null,
    },
    {
      id: 'txn_003',
      type: 'refund',
      cardId: 'card_003',
      cardLast4: '5678',
      customerId: 'cust_003',
      customerName: 'Jane Smith',
      amount: 89.99,
      currency: 'USD',
      merchantName: 'Netflix',
      merchantCategory: 'Streaming',
      status: 'completed',
      direction: 'credit',
      createdAt: '2024-01-15T10:25:00Z',
      settledAt: '2024-01-15T10:25:30Z',
    },
    {
      id: 'txn_004',
      type: 'authorization',
      cardId: 'card_004',
      cardLast4: '9012',
      customerId: 'cust_004',
      customerName: 'Bob Wilson',
      amount: 15000.00,
      currency: 'USD',
      merchantName: 'Crypto Exchange',
      merchantCategory: 'Financial Services',
      status: 'failed',
      direction: 'debit',
      createdAt: '2024-01-15T10:20:00Z',
      settledAt: null,
    },
    {
      id: 'txn_005',
      type: 'transfer',
      cardId: 'card_001',
      cardLast4: '4242',
      customerId: 'cust_001',
      customerName: 'John Doe',
      amount: 500.00,
      currency: 'USD',
      merchantName: 'P2P Transfer',
      merchantCategory: 'Transfer',
      status: 'completed',
      direction: 'debit',
      createdAt: '2024-01-15T10:15:00Z',
      settledAt: '2024-01-15T10:15:02Z',
    },
    {
      id: 'txn_006',
      type: 'reversal',
      cardId: 'card_005',
      cardLast4: '3456',
      customerId: 'cust_005',
      customerName: 'Alice Brown',
      amount: 250.00,
      currency: 'EUR',
      merchantName: 'Travel Agency',
      merchantCategory: 'Travel',
      status: 'completed',
      direction: 'credit',
      createdAt: '2024-01-15T10:10:00Z',
      settledAt: '2024-01-15T10:10:15Z',
    },
  ]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'authorization':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Auth</span>;
      case 'clearing':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Clearing</span>;
      case 'refund':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Refund</span>;
      case 'reversal':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Reversal</span>;
      case 'transfer':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-700">Transfer</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'reversed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><RefreshCw className="w-3 h-3" /> Reversed</span>;
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
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500">View and manage all transactions</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Volume</p>
            <p className="text-2xl font-bold">${(stats.volume / 1000000).toFixed(2)}M</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Avg Transaction</p>
            <p className="text-2xl font-bold">${stats.avgValue}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
          </Card>
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500"
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
                  className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500"
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
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Transaction</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Card</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${
                          txn.direction === 'debit' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          {txn.direction === 'debit' ? (
                            <ArrowUpRight className={`w-4 h-4 text-red-600`} />
                          ) : (
                            <ArrowDownLeft className={`w-4 h-4 text-green-600`} />
                          )}
                        </div>
                        <span className="font-mono text-sm">{txn.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm">{txn.customerName}</p>
                        <span className="text-xs text-gray-500 font-mono">{txn.customerId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">****{txn.cardLast4}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`font-medium ${
                          txn.direction === 'credit' ? 'text-green-600' : ''
                        }`}>
                          {txn.direction === 'credit' ? '+' : '-'}{formatCurrency(txn.amount, txn.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">{txn.merchantName}</p>
                        <p className="text-xs text-gray-500">{txn.merchantCategory}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(txn.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(txn.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(txn.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {txn.status === 'completed' && txn.type !== 'refund' && (
                          <button className="p-1 bg-orange-100 text-orange-600 rounded hover:bg-orange-200" title="Refund">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {txn.status === 'failed' && (
                          <button className="p-1 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200" title="Review">
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
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing 1 to {filteredTransactions.length} of {stats.totalTransactions} transactions
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded">1</button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">2</button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">3</button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
