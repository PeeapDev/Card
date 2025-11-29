import { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Snowflake,
  Trash2,
  ChevronDown,
  MoreVertical,
  Copy,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface CardData {
  id: string;
  cardProgramId: string;
  cardProgramName: string;
  customerId: string;
  customerName: string;
  last4: string;
  brand: 'visa' | 'mastercard';
  type: 'virtual' | 'physical';
  status: 'active' | 'frozen' | 'cancelled' | 'pending';
  balance: number;
  currency: string;
  expiryMonth: number;
  expiryYear: number;
  createdAt: string;
  lastUsed: string | null;
}

export function CardsPage() {
  const [filter, setFilter] = useState<'all' | 'virtual' | 'physical'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'cancelled' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats] = useState({
    totalCards: 2341,
    activeCards: 2156,
    virtualCards: 1890,
    physicalCards: 451,
    frozenCards: 85,
    issuedThisMonth: 234,
  });

  const [cards] = useState<CardData[]>([
    {
      id: 'card_001',
      cardProgramId: 'prog_001',
      cardProgramName: 'Premium Virtual',
      customerId: 'cust_001',
      customerName: 'John Doe',
      last4: '4242',
      brand: 'visa',
      type: 'virtual',
      status: 'active',
      balance: 5250.00,
      currency: 'USD',
      expiryMonth: 12,
      expiryYear: 2027,
      createdAt: '2024-01-10T10:00:00Z',
      lastUsed: '2024-01-15T10:30:00Z',
    },
    {
      id: 'card_002',
      cardProgramId: 'prog_002',
      cardProgramName: 'Business Physical',
      customerId: 'cust_002',
      customerName: 'Acme Corporation',
      last4: '1234',
      brand: 'mastercard',
      type: 'physical',
      status: 'active',
      balance: 50000.00,
      currency: 'USD',
      expiryMonth: 6,
      expiryYear: 2026,
      createdAt: '2024-01-08T09:00:00Z',
      lastUsed: '2024-01-15T11:00:00Z',
    },
    {
      id: 'card_003',
      cardProgramId: 'prog_001',
      cardProgramName: 'Premium Virtual',
      customerId: 'cust_003',
      customerName: 'Jane Smith',
      last4: '5678',
      brand: 'visa',
      type: 'virtual',
      status: 'pending',
      balance: 0.00,
      currency: 'USD',
      expiryMonth: 3,
      expiryYear: 2028,
      createdAt: '2024-01-15T14:00:00Z',
      lastUsed: null,
    },
    {
      id: 'card_004',
      cardProgramId: 'prog_003',
      cardProgramName: 'Standard Virtual',
      customerId: 'cust_004',
      customerName: 'Bob Wilson',
      last4: '9012',
      brand: 'visa',
      type: 'virtual',
      status: 'frozen',
      balance: 1500.00,
      currency: 'USD',
      expiryMonth: 9,
      expiryYear: 2025,
      createdAt: '2024-01-05T11:00:00Z',
      lastUsed: '2024-01-10T15:00:00Z',
    },
    {
      id: 'card_005',
      cardProgramId: 'prog_002',
      cardProgramName: 'Business Physical',
      customerId: 'cust_005',
      customerName: 'Alice Brown',
      last4: '3456',
      brand: 'mastercard',
      type: 'physical',
      status: 'cancelled',
      balance: 0.00,
      currency: 'EUR',
      expiryMonth: 1,
      expiryYear: 2024,
      createdAt: '2023-01-01T10:00:00Z',
      lastUsed: '2023-12-15T10:00:00Z',
    },
    {
      id: 'card_006',
      cardProgramId: 'prog_004',
      cardProgramName: 'NGN Virtual',
      customerId: 'cust_006',
      customerName: 'Tech Innovations',
      last4: '7890',
      brand: 'visa',
      type: 'virtual',
      status: 'active',
      balance: 250000.00,
      currency: 'NGN',
      expiryMonth: 8,
      expiryYear: 2027,
      createdAt: '2024-01-02T10:00:00Z',
      lastUsed: '2024-01-15T08:00:00Z',
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Active</span>;
      case 'frozen':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Snowflake className="w-3 h-3" /> Frozen</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Cancelled</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredCards = cards.filter(card => {
    if (filter !== 'all' && card.type !== filter) return false;
    if (statusFilter !== 'all' && card.status !== statusFilter) return false;
    if (searchQuery && !card.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !card.last4.includes(searchQuery) &&
        !card.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
            <p className="text-gray-500">Manage issued cards</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Issue Card
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Cards</p>
            <p className="text-2xl font-bold">{stats.totalCards.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeCards.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Virtual</p>
            <p className="text-2xl font-bold text-blue-600">{stats.virtualCards.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Physical</p>
            <p className="text-2xl font-bold text-purple-600">{stats.physicalCards}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Frozen</p>
            <p className="text-2xl font-bold text-cyan-600">{stats.frozenCards}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Issued This Month</p>
            <p className="text-2xl font-bold text-green-600">+{stats.issuedThisMonth}</p>
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
                  placeholder="Search by customer, last 4 digits, or card ID..."
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
                  <option value="virtual">Virtual</option>
                  <option value="physical">Physical</option>
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
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card>

        {/* Cards Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Card</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Program</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Used</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-8 rounded flex items-center justify-center ${
                          card.brand === 'visa' ? 'bg-blue-600' : 'bg-orange-500'
                        }`}>
                          <span className="text-white text-xs font-bold uppercase">{card.brand}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">****{card.last4}</span>
                            <button onClick={() => copyToClipboard(card.id)} className="p-0.5 hover:bg-gray-100 rounded">
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            card.type === 'virtual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {card.type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm">{card.customerName}</p>
                        <span className="text-xs text-gray-500 font-mono">{card.customerId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{card.cardProgramName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{formatCurrency(card.balance, card.currency)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(card.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {card.lastUsed
                          ? new Date(card.lastUsed).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Settings">
                          <Settings className="w-4 h-4" />
                        </button>
                        {card.status === 'active' && (
                          <button className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Freeze">
                            <Snowflake className="w-4 h-4" />
                          </button>
                        )}
                        {card.status === 'frozen' && (
                          <button className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Unfreeze">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {card.status !== 'cancelled' && (
                          <button className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Cancel">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
              Showing 1 to {filteredCards.length} of {stats.totalCards} cards
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
