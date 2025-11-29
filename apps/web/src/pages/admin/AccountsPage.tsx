import { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ChevronDown,
  MoreVertical,
  TrendingUp,
  Pause,
  Play,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface Account {
  id: string;
  customerId: string;
  customerName: string;
  type: 'wallet' | 'card_funding' | 'merchant' | 'agent';
  currency: string;
  balance: number;
  availableBalance: number;
  status: 'active' | 'frozen' | 'closed';
  createdAt: string;
  lastTransaction: string | null;
}

export function AccountsPage() {
  const [filter, setFilter] = useState<'all' | 'wallet' | 'card_funding' | 'merchant' | 'agent'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats] = useState({
    totalAccounts: 1456,
    activeAccounts: 1389,
    totalBalance: 2456780.50,
    frozenAccounts: 45,
    closedAccounts: 22,
    newThisMonth: 89,
  });

  const [accounts] = useState<Account[]>([
    {
      id: 'acc_001',
      customerId: 'cust_001',
      customerName: 'John Doe',
      type: 'wallet',
      currency: 'USD',
      balance: 5250.00,
      availableBalance: 5250.00,
      status: 'active',
      createdAt: '2024-01-10T10:00:00Z',
      lastTransaction: '2024-01-15T10:30:00Z',
    },
    {
      id: 'acc_002',
      customerId: 'cust_002',
      customerName: 'Acme Corporation',
      type: 'card_funding',
      currency: 'USD',
      balance: 125000.00,
      availableBalance: 118500.00,
      status: 'active',
      createdAt: '2024-01-08T09:00:00Z',
      lastTransaction: '2024-01-15T11:00:00Z',
    },
    {
      id: 'acc_003',
      customerId: 'cust_003',
      customerName: 'Quick Mart Store',
      type: 'merchant',
      currency: 'USD',
      balance: 45780.50,
      availableBalance: 45780.50,
      status: 'active',
      createdAt: '2024-01-05T14:00:00Z',
      lastTransaction: '2024-01-15T12:00:00Z',
    },
    {
      id: 'acc_004',
      customerId: 'cust_004',
      customerName: 'Mobile Money Agent',
      type: 'agent',
      currency: 'NGN',
      balance: 2500000.00,
      availableBalance: 2350000.00,
      status: 'active',
      createdAt: '2024-01-02T11:00:00Z',
      lastTransaction: '2024-01-15T09:00:00Z',
    },
    {
      id: 'acc_005',
      customerId: 'cust_005',
      customerName: 'Jane Smith',
      type: 'wallet',
      currency: 'EUR',
      balance: 3200.00,
      availableBalance: 0.00,
      status: 'frozen',
      createdAt: '2024-01-01T10:00:00Z',
      lastTransaction: '2024-01-10T15:00:00Z',
    },
    {
      id: 'acc_006',
      customerId: 'cust_006',
      customerName: 'Old User Account',
      type: 'wallet',
      currency: 'USD',
      balance: 0.00,
      availableBalance: 0.00,
      status: 'closed',
      createdAt: '2023-06-15T10:00:00Z',
      lastTransaction: '2023-12-01T10:00:00Z',
    },
  ]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'wallet':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Wallet</span>;
      case 'card_funding':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Card Funding</span>;
      case 'merchant':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Merchant</span>;
      case 'agent':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Agent</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Active</span>;
      case 'frozen':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Frozen</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Closed</span>;
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

  const filteredAccounts = accounts.filter(account => {
    if (filter !== 'all' && account.type !== filter) return false;
    if (statusFilter !== 'all' && account.status !== statusFilter) return false;
    if (searchQuery && !account.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !account.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-500">Manage customer accounts and balances</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Account
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Accounts</p>
            <p className="text-2xl font-bold">{stats.totalAccounts.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeAccounts.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Balance</p>
            <p className="text-2xl font-bold">${(stats.totalBalance / 1000000).toFixed(2)}M</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Frozen</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.frozenAccounts}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Closed</p>
            <p className="text-2xl font-bold text-red-600">{stats.closedAccounts}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">New This Month</p>
            <p className="text-2xl font-bold text-blue-600">+{stats.newThisMonth}</p>
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
                  placeholder="Search by customer name or account ID..."
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
                  <option value="wallet">Wallet</option>
                  <option value="card_funding">Card Funding</option>
                  <option value="merchant">Merchant</option>
                  <option value="agent">Agent</option>
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
                  <option value="active">Active</option>
                  <option value="frozen">Frozen</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card>

        {/* Accounts Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Transaction</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-gray-400" />
                        <div>
                          <span className="font-mono text-sm">{account.id}</span>
                          <p className="text-xs text-gray-500">{account.currency}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm">{account.customerName}</p>
                        <span className="text-xs text-gray-500 font-mono">{account.customerId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(account.type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{formatCurrency(account.balance, account.currency)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${account.availableBalance < account.balance ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {formatCurrency(account.availableBalance, account.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(account.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {account.lastTransaction
                          ? new Date(account.lastTransaction).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Credit">
                          <ArrowDownLeft className="w-4 h-4" />
                        </button>
                        <button className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Debit">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        {account.status === 'active' ? (
                          <button className="p-1 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200" title="Freeze">
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : account.status === 'frozen' ? (
                          <button className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Unfreeze">
                            <Play className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
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
              Showing 1 to {filteredAccounts.length} of {stats.totalAccounts} accounts
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
