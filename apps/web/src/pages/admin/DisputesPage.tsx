import { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  FileText,
  Upload,
  ChevronDown,
  DollarSign,
  CreditCard,
  Calendar,
  User,
  Flag,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface Dispute {
  id: string;
  transactionId: string;
  cardId: string;
  cardLast4: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  reason: string;
  reasonCode: string;
  status: 'open' | 'under_review' | 'evidence_required' | 'won' | 'lost' | 'closed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  createdAt: string;
  merchantName: string;
}

export function DisputesPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'under_review' | 'evidence_required' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats] = useState({
    totalDisputes: 156,
    openDisputes: 12,
    underReview: 8,
    evidenceRequired: 5,
    won: 89,
    lost: 42,
    disputeRate: 0.34,
    avgResolutionTime: 14,
  });

  const [disputes] = useState<Dispute[]>([
    {
      id: 'dsp_001',
      transactionId: 'txn_123',
      cardId: 'card_001',
      cardLast4: '4242',
      customerId: 'cust_001',
      customerName: 'John Doe',
      amount: 1250.00,
      currency: 'USD',
      reason: 'Fraudulent Transaction',
      reasonCode: 'FRAUD',
      status: 'open',
      priority: 'high',
      dueDate: '2024-01-25',
      createdAt: '2024-01-15T10:00:00Z',
      merchantName: 'Unknown Merchant',
    },
    {
      id: 'dsp_002',
      transactionId: 'txn_456',
      cardId: 'card_002',
      cardLast4: '1234',
      customerId: 'cust_002',
      customerName: 'Acme Corp',
      amount: 5000.00,
      currency: 'USD',
      reason: 'Goods Not Received',
      reasonCode: 'GOODS_NOT_RECEIVED',
      status: 'under_review',
      priority: 'medium',
      dueDate: '2024-01-28',
      createdAt: '2024-01-12T14:00:00Z',
      merchantName: 'Office Supplies Co',
    },
    {
      id: 'dsp_003',
      transactionId: 'txn_789',
      cardId: 'card_003',
      cardLast4: '5678',
      customerId: 'cust_003',
      customerName: 'Jane Smith',
      amount: 89.99,
      currency: 'USD',
      reason: 'Duplicate Charge',
      reasonCode: 'DUPLICATE',
      status: 'evidence_required',
      priority: 'medium',
      dueDate: '2024-01-20',
      createdAt: '2024-01-10T09:00:00Z',
      merchantName: 'Streaming Service',
    },
    {
      id: 'dsp_004',
      transactionId: 'txn_012',
      cardId: 'card_004',
      cardLast4: '9012',
      customerId: 'cust_004',
      customerName: 'Bob Wilson',
      amount: 320.50,
      currency: 'USD',
      reason: 'Product Not As Described',
      reasonCode: 'NOT_AS_DESCRIBED',
      status: 'won',
      priority: 'low',
      dueDate: '2024-01-08',
      createdAt: '2024-01-05T11:00:00Z',
      merchantName: 'Online Retail',
    },
    {
      id: 'dsp_005',
      transactionId: 'txn_345',
      cardId: 'card_005',
      cardLast4: '3456',
      customerId: 'cust_005',
      customerName: 'Alice Brown',
      amount: 750.00,
      currency: 'EUR',
      reason: 'Cancelled Service',
      reasonCode: 'CANCELLED',
      status: 'lost',
      priority: 'low',
      dueDate: '2024-01-03',
      createdAt: '2023-12-20T10:00:00Z',
      merchantName: 'Travel Agency',
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Open</span>;
      case 'under_review':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Eye className="w-3 h-3" /> Under Review</span>;
      case 'evidence_required':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><FileText className="w-3 h-3" /> Evidence Required</span>;
      case 'won':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Won</span>;
      case 'lost':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Lost</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Closed</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Low</span>;
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

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredDisputes = disputes.filter(dispute => {
    if (statusFilter !== 'all' && dispute.status !== statusFilter) return false;
    if (searchQuery && !dispute.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !dispute.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !dispute.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
            <p className="text-gray-500">Manage chargebacks and dispute cases</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.totalDisputes}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Open</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.openDisputes}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Under Review</p>
            <p className="text-2xl font-bold text-blue-600">{stats.underReview}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Evidence Req.</p>
            <p className="text-2xl font-bold text-orange-600">{stats.evidenceRequired}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Won</p>
            <p className="text-2xl font-bold text-green-600">{stats.won}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Lost</p>
            <p className="text-2xl font-bold text-red-600">{stats.lost}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Dispute Rate</p>
            <p className="text-2xl font-bold">{stats.disputeRate}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Avg Resolution</p>
            <p className="text-2xl font-bold">{stats.avgResolutionTime}d</p>
          </Card>
        </div>

        {/* Urgent Disputes Alert */}
        {stats.evidenceRequired > 0 && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Action Required</p>
                <p className="text-sm text-orange-700">
                  {stats.evidenceRequired} disputes require evidence submission before their deadline.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ID, customer, or transaction..."
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="evidence_required">Evidence Required</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card>

        {/* Disputes Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Dispute</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Due</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDisputes.map((dispute) => {
                  const daysRemaining = getDaysRemaining(dispute.dueDate);
                  const isUrgent = daysRemaining <= 3 && dispute.status !== 'won' && dispute.status !== 'lost' && dispute.status !== 'closed';

                  return (
                    <tr key={dispute.id} className={`hover:bg-gray-50 ${isUrgent ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {isUrgent && <Flag className="w-4 h-4 text-red-500" />}
                            <span className="font-mono text-sm">{dispute.id}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{dispute.transactionId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{dispute.customerName}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CreditCard className="w-3 h-3" />
                              ****{dispute.cardLast4}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{formatCurrency(dispute.amount, dispute.currency)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium">{dispute.reason}</p>
                          <span className="text-xs text-gray-500">{dispute.reasonCode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{dispute.merchantName}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(dispute.priority)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(dispute.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${
                            isUrgent ? 'text-red-600 font-medium' :
                            daysRemaining < 0 ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {daysRemaining < 0 ? 'Expired' : `${daysRemaining}d left`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Messages">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {dispute.status === 'evidence_required' && (
                            <button className="p-1 bg-orange-100 text-orange-600 rounded hover:bg-orange-200" title="Upload Evidence">
                              <Upload className="w-4 h-4" />
                            </button>
                          )}
                          {(dispute.status === 'open' || dispute.status === 'under_review') && (
                            <>
                              <button className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Accept">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Challenge">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing 1 to {filteredDisputes.length} of {stats.totalDisputes} disputes
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
