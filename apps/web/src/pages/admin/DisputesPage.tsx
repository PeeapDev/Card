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
import { Card, MotionCard } from '@/components/ui/Card';
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
    totalDisputes: 0,
    openDisputes: 0,
    underReview: 0,
    evidenceRequired: 0,
    won: 0,
    lost: 0,
    disputeRate: 0,
    avgResolutionTime: 0,
  });

  const [disputes] = useState<Dispute[]>([]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"><Clock className="w-3 h-3" /> Open</span>;
      case 'under_review':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"><Eye className="w-3 h-3" /> Under Review</span>;
      case 'evidence_required':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"><FileText className="w-3 h-3" /> Evidence Required</span>;
      case 'won':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Won</span>;
      case 'lost':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" /> Lost</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Closed</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Low</span>;
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Disputes</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage chargebacks and dispute cases</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <MotionCard className="p-4" delay={0}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDisputes}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.05}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Open</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.openDisputes}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.1}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.underReview}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.15}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Evidence Req.</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.evidenceRequired}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.2}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Won</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.won}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.25}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Lost</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.lost}</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.3}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dispute Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.disputeRate}%</p>
          </MotionCard>
          <MotionCard className="p-4" delay={0.35}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Resolution</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgResolutionTime}d</p>
          </MotionCard>
        </div>

        {/* Urgent Disputes Alert */}
        {stats.evidenceRequired > 0 && (
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-300">Action Required</p>
                <p className="text-sm text-orange-700 dark:text-orange-400">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="appearance-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dispute</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Merchant</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDisputes.map((dispute) => {
                  const daysRemaining = getDaysRemaining(dispute.dueDate);
                  const isUrgent = daysRemaining <= 3 && dispute.status !== 'won' && dispute.status !== 'lost' && dispute.status !== 'closed';

                  return (
                    <tr key={dispute.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isUrgent ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {isUrgent && <Flag className="w-4 h-4 text-red-500 dark:text-red-400" />}
                            <span className="font-mono text-sm text-gray-900 dark:text-white">{dispute.id}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{dispute.transactionId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{dispute.customerName}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <CreditCard className="w-3 h-3" />
                              ****{dispute.cardLast4}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(dispute.amount, dispute.currency)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{dispute.reason}</p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{dispute.reasonCode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{dispute.merchantName}</span>
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
                            isUrgent ? 'text-red-600 dark:text-red-400 font-medium' :
                            daysRemaining < 0 ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'
                          }`}>
                            {daysRemaining < 0 ? 'Expired' : `${daysRemaining}d left`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Messages">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {dispute.status === 'evidence_required' && (
                            <button className="p-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50" title="Upload Evidence">
                              <Upload className="w-4 h-4" />
                            </button>
                          )}
                          {(dispute.status === 'open' || dispute.status === 'under_review') && (
                            <>
                              <button className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50" title="Accept">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button className="p-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50" title="Challenge">
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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing 1 to {filteredDisputes.length} of {stats.totalDisputes} disputes
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
