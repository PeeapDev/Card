import { useState, useEffect } from 'react';
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
  Bot,
  Sparkles,
  Loader2,
  X,
  ArrowRight,
  Scale,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { aiService, DisputeAnalysis } from '@/services/ai.service';
import { supabase } from '@/lib/supabase';
import { DisputeThread } from '@/components/disputes/DisputeThread';
import { disputeService, DISPUTE_REASONS, DISPUTE_STATUSES } from '@/services/dispute.service';
import type { Dispute as DisputeType } from '@/services/dispute.service';

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
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  // AI Analysis state
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  // Detail view state
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailDispute, setDetailDispute] = useState<DisputeType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<DisputeAnalysis | null>(null);
  const [analyzingDispute, setAnalyzingDispute] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);

  const [stats, setStats] = useState({
    totalDisputes: 0,
    openDisputes: 0,
    underReview: 0,
    evidenceRequired: 0,
    won: 0,
    lost: 0,
    disputeRate: 0,
    avgResolutionTime: 0,
  });

  useEffect(() => {
    fetchDisputes();
    checkAIConfiguration();
  }, []);

  const checkAIConfiguration = async () => {
    await aiService.initialize();
    setAiConfigured(aiService.isConfigured());
  };

  const handleViewDispute = async (dispute: Dispute) => {
    setLoadingDetail(true);
    setShowDetailView(true);
    const full = await disputeService.getDispute(dispute.id);
    setDetailDispute(full);
    setLoadingDetail(false);
  };

  const handleCloseDetail = () => {
    setShowDetailView(false);
    setDetailDispute(null);
    fetchDisputes();
  };

  const handleResolveDispute = async (outcome: 'full_refund' | 'partial_refund' | 'favor_merchant' | 'favor_customer' | 'no_action', notes: string) => {
    if (!detailDispute) return;
    await disputeService.resolveDispute(detailDispute.id, { outcome, notes });
    handleCloseDetail();
  };

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          merchant_businesses(name),
          profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((d: any) => ({
          id: d.id,
          transactionId: d.transaction_id || '',
          cardId: '',
          cardLast4: '',
          customerId: d.customer_id || '',
          customerName: d.profiles?.full_name || d.customer_name || 'Unknown',
          amount: d.amount || 0,
          currency: d.currency || 'SLE',
          reason: d.reason || 'general',
          reasonCode: d.reason?.toUpperCase() || 'GEN',
          status: d.status || 'open',
          priority: (d.amount > 500000 ? 'high' : d.amount > 100000 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
          dueDate: d.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: d.created_at,
          merchantName: d.merchant_businesses?.name || 'Unknown Merchant',
          description: d.description,
          merchantResponse: d.merchant_response,
        }));
        setDisputes(formatted);

        // Calculate stats
        setStats({
          totalDisputes: formatted.length,
          openDisputes: formatted.filter(d => d.status === 'open').length,
          underReview: formatted.filter(d => d.status === 'under_review').length,
          evidenceRequired: formatted.filter(d => d.status === 'evidence_required').length,
          won: formatted.filter(d => d.status === 'won').length,
          lost: formatted.filter(d => d.status === 'lost').length,
          disputeRate: 0,
          avgResolutionTime: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalyze = async (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setShowAIModal(true);
    setAnalyzingDispute(true);
    setAiAnalysis(null);

    try {
      // Check for existing analysis first
      const existing = await aiService.getDisputeAnalysis(dispute.id);
      if (existing) {
        setAiAnalysis(existing);
        setAnalyzingDispute(false);
        return;
      }

      // Run new analysis
      const analysis = await aiService.analyzeDisputeFull({
        id: dispute.id,
        transaction_id: dispute.transactionId,
        amount: dispute.amount,
        currency: dispute.currency,
        transaction_date: dispute.createdAt,
        reason: dispute.reason,
        customer_statement: (dispute as any).description || 'No description provided',
        merchant_response: (dispute as any).merchantResponse,
        merchant_name: dispute.merchantName,
        business_name: dispute.merchantName,
        customer_email: '',
      });

      setAiAnalysis(analysis);
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setAnalyzingDispute(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'favor_merchant': return 'text-green-600 bg-green-100';
      case 'favor_customer': return 'text-blue-600 bg-blue-100';
      case 'partial_refund': return 'text-yellow-600 bg-yellow-100';
      case 'needs_review': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case 'favor_merchant': return 'Favor Merchant';
      case 'favor_customer': return 'Favor Customer';
      case 'partial_refund': return 'Partial Refund';
      case 'needs_review': return 'Needs Review';
      default: return 'Insufficient Data';
    }
  };

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
                          <button
                            onClick={() => handleViewDispute(dispute)}
                            className="p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="View Details & Messages"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewDispute(dispute)}
                            className="p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Messages"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {aiConfigured && (
                            <button
                              onClick={() => handleAIAnalyze(dispute)}
                              className="p-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
                              title="AI Analysis"
                            >
                              <Bot className="w-4 h-4" />
                            </button>
                          )}
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

        {/* Dispute Detail View with Messaging */}
        {showDetailView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dispute Details</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {detailDispute?.id?.substring(0, 8)}... &bull; 3-Way Messaging
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              {loadingDetail ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : detailDispute ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Dispute Thread */}
                  <div className="flex-1 overflow-hidden">
                    <DisputeThread
                      dispute={detailDispute}
                      userRole="admin"
                      showAIAnalysis={true}
                      onStatusChange={() => {
                        disputeService.getDispute(detailDispute.id).then(setDetailDispute);
                      }}
                    />
                  </div>

                  {/* Resolution Actions */}
                  {!['resolved', 'won', 'lost', 'closed'].includes(detailDispute.status) && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleResolveDispute('favor_customer', 'Customer claim validated - full refund issued')}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Favor Customer
                        </button>
                        <button
                          onClick={() => handleResolveDispute('favor_merchant', 'Merchant evidence supports their position')}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Favor Merchant
                        </button>
                        <button
                          onClick={() => handleResolveDispute('partial_refund', 'Partial refund issued as compromise')}
                          className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center gap-2"
                        >
                          <DollarSign className="w-4 h-4" />
                          Partial Refund
                        </button>
                        <button
                          onClick={() => disputeService.escalate(detailDispute.id, 'Escalated for senior review')}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2"
                        >
                          <Flag className="w-4 h-4" />
                          Escalate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p className="text-gray-500">Dispute not found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis Modal */}
        {showAIModal && selectedDispute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">AI Dispute Analysis</h2>
                    <p className="text-sm text-white/70 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Powered by Groq
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {analyzingDispute ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
                      <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Analyzing dispute...</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Evaluating evidence, history, and patterns</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-6">
                    {/* Dispute Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Dispute ID</p>
                          <p className="font-mono text-sm">{selectedDispute.id.substring(0, 8)}...</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                          <p className="font-semibold text-lg">{formatCurrency(selectedDispute.amount, selectedDispute.currency)}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between text-sm">
                        <span className="text-gray-500">Reason: <span className="text-gray-900 dark:text-white font-medium">{selectedDispute.reason}</span></span>
                        <span className="text-gray-500">Merchant: <span className="text-gray-900 dark:text-white font-medium">{selectedDispute.merchantName}</span></span>
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-2">AI RECOMMENDATION</p>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${getRecommendationColor(aiAnalysis.recommendation)}`}>
                        <Scale className="w-5 h-5" />
                        {getRecommendationLabel(aiAnalysis.recommendation)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                        Confidence: <span className="font-semibold">{aiAnalysis.confidence_score}%</span>
                      </p>
                    </div>

                    {/* Likelihood Bars */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-800 dark:text-green-300">Merchant Wins</span>
                          <span className="text-lg font-bold text-green-600">{aiAnalysis.merchant_likelihood}%</span>
                        </div>
                        <div className="w-full bg-green-200 dark:bg-green-900/50 rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full transition-all"
                            style={{ width: `${aiAnalysis.merchant_likelihood}%` }}
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Customer Wins</span>
                          <span className="text-lg font-bold text-blue-600">{aiAnalysis.customer_likelihood}%</span>
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${aiAnalysis.customer_likelihood}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Risk & Evidence */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                          <span className="font-medium">Fraud Risk Score</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${
                            aiAnalysis.fraud_risk_score > 70 ? 'text-red-600' :
                            aiAnalysis.fraud_risk_score > 40 ? 'text-yellow-600' : 'text-green-600'
                          }`}>{aiAnalysis.fraud_risk_score}%</span>
                          <span className="text-sm text-gray-500">
                            {aiAnalysis.fraud_risk_score > 70 ? 'High fraud risk' :
                             aiAnalysis.fraud_risk_score > 40 ? 'Moderate risk' : 'Low fraud risk'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <span className="font-medium">Evidence Strength</span>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          aiAnalysis.evidence_strength === 'strong' ? 'bg-green-100 text-green-700' :
                          aiAnalysis.evidence_strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                          aiAnalysis.evidence_strength === 'weak' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {aiAnalysis.evidence_strength.charAt(0).toUpperCase() + aiAnalysis.evidence_strength.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        AI Analysis
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{aiAnalysis.reasoning}</p>
                    </div>

                    {/* Suggested Resolution */}
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                        <ArrowRight className="w-4 h-4" />
                        Suggested Resolution
                      </h4>
                      <p className="text-indigo-700 dark:text-indigo-300 text-sm">{aiAnalysis.suggested_resolution}</p>
                      {aiAnalysis.suggested_compensation && (
                        <p className="mt-2 text-sm font-medium text-indigo-800 dark:text-indigo-200">
                          Suggested Compensation: {formatCurrency(aiAnalysis.suggested_compensation, selectedDispute.currency)}
                        </p>
                      )}
                    </div>

                    {/* Missing Evidence */}
                    {aiAnalysis.missing_evidence && aiAnalysis.missing_evidence.length > 0 && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                          <AlertTriangle className="w-4 h-4" />
                          Missing Evidence (Would Strengthen Case)
                        </h4>
                        <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                          {aiAnalysis.missing_evidence.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Factors */}
                    {aiAnalysis.key_factors && aiAnalysis.key_factors.length > 0 && (
                      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="font-medium mb-3">Key Decision Factors</h4>
                        <div className="space-y-2">
                          {aiAnalysis.key_factors.map((factor, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                              <div className="flex items-center gap-2">
                                {factor.favors === 'merchant' ? (
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                ) : factor.favors === 'customer' ? (
                                  <TrendingDown className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <Minus className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-sm font-medium">{factor.factor}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                factor.favors === 'merchant' ? 'bg-green-100 text-green-700' :
                                factor.favors === 'customer' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {factor.favors === 'merchant' ? 'Favors Merchant' :
                                 factor.favors === 'customer' ? 'Favors Customer' : 'Neutral'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setAiAnalysis(null);
                          handleAIAnalyze(selectedDispute);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Re-analyze
                      </button>
                      <button
                        onClick={() => setShowAIModal(false)}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Use Recommendation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Analysis Failed</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please try again or contact support</p>
                    <button
                      onClick={() => handleAIAnalyze(selectedDispute)}
                      className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Retry Analysis
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
