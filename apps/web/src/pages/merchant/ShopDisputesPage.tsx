/**
 * Shop Disputes Page
 * Lists and manages all disputes for a specific business/shop
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  X,
  Loader2,
  Calendar,
  DollarSign,
  Eye,
  MessageSquare,
  FileText,
  Upload,
  Send,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { MerchantBusiness } from '@/services/business.service';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency';

interface Dispute {
  id: string;
  transaction_id: string;
  business_id: string;
  customer_email?: string;
  customer_name?: string;
  reason: string;
  description?: string;
  amount: number;
  currency: string;
  status: string;
  resolution?: string;
  evidence_url?: string;
  merchant_response?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export function ShopDisputesPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    lost: 0,
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

      // Fetch disputes for this business
      const { data: disputeData, error: disputeError } = await supabase
        .from('disputes')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (disputeError) {
        // Table might not exist yet, just set empty
        setDisputes([]);
      } else {
        setDisputes(disputeData || []);

        // Calculate stats
        const allDisputes = disputeData || [];
        setStats({
          total: allDisputes.length,
          open: allDisputes.filter(d => d.status === 'open').length,
          pending: allDisputes.filter(d => d.status === 'pending' || d.status === 'under_review').length,
          resolved: allDisputes.filter(d => d.status === 'resolved' || d.status === 'won').length,
          lost: allDisputes.filter(d => d.status === 'lost' || d.status === 'closed').length,
          totalAmount: allDisputes.reduce((sum, d) => sum + (d.amount || 0), 0),
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      open: { color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Open' },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
      under_review: { color: 'bg-blue-100 text-blue-700', icon: <Eye className="w-3.5 h-3.5" />, label: 'Under Review' },
      resolved: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Resolved' },
      won: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Won' },
      lost: { color: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Lost' },
      closed: { color: 'bg-gray-100 text-gray-700', icon: <X className="w-3.5 h-3.5" />, label: 'Closed' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      duplicate: 'Duplicate Charge',
      fraudulent: 'Fraudulent Transaction',
      product_not_received: 'Product Not Received',
      product_unacceptable: 'Product Unacceptable',
      subscription_canceled: 'Subscription Canceled',
      unrecognized: 'Unrecognized Charge',
      credit_not_processed: 'Credit Not Processed',
      general: 'General Dispute',
      other: 'Other',
    };
    return reasons[reason] || reason;
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

  const handleSubmitResponse = async () => {
    if (!selectedDispute || !responseText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          merchant_response: responseText,
          status: 'under_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      // Refresh data
      await fetchData();
      setShowResponseModal(false);
      setResponseText('');
      setSelectedDispute(null);
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDisputes = disputes.filter((dispute) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        dispute.id.toLowerCase().includes(query) ||
        dispute.transaction_id?.toLowerCase().includes(query) ||
        dispute.customer_email?.toLowerCase().includes(query) ||
        dispute.customer_name?.toLowerCase().includes(query) ||
        dispute.reason?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && dispute.status !== statusFilter) {
      return false;
    }

    return true;
  });

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
                <span className="text-gray-900">Disputes</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total Disputes</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Open</div>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Resolved</div>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Lost</div>
            <div className="text-2xl font-bold text-gray-600">{stats.lost}</div>
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
                placeholder="Search by ID, email, reason..."
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
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </Card>

        {/* Disputes List */}
        <Card className="p-0 overflow-hidden">
          {filteredDisputes.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {disputes.length === 0 ? 'No disputes' : 'No disputes match your filters'}
              </h3>
              <p className="text-gray-500">
                {disputes.length === 0
                  ? 'Great news! This business has no disputes.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        dispute.status === 'open' || dispute.status === 'pending'
                          ? 'bg-red-100'
                          : dispute.status === 'resolved' || dispute.status === 'won'
                          ? 'bg-green-100'
                          : 'bg-gray-100'
                      }`}>
                        <AlertTriangle className={`w-5 h-5 ${
                          dispute.status === 'open' || dispute.status === 'pending'
                            ? 'text-red-600'
                            : dispute.status === 'resolved' || dispute.status === 'won'
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{getReasonLabel(dispute.reason)}</h3>
                          {getStatusBadge(dispute.status)}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {dispute.description || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>ID: {dispute.id.substring(0, 8)}...</span>
                          {dispute.customer_email && (
                            <span>Customer: {dispute.customer_email}</span>
                          )}
                          <span>{formatDate(dispute.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(dispute.amount, dispute.currency)}</p>
                      {dispute.merchant_response && (
                        <span className="text-xs text-green-600 flex items-center gap-1 justify-end mt-1">
                          <MessageSquare className="w-3 h-3" />
                          Responded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dispute Detail Modal */}
        {selectedDispute && !showResponseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Dispute Details</h2>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  {getStatusBadge(selectedDispute.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Reason</span>
                  <span className="font-medium text-gray-900">{getReasonLabel(selectedDispute.reason)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedDispute.amount, selectedDispute.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Dispute ID</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{selectedDispute.id}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Transaction ID</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{selectedDispute.transaction_id}</code>
                </div>
                {selectedDispute.customer_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Customer Email</span>
                    <span className="text-gray-900">{selectedDispute.customer_email}</span>
                  </div>
                )}
                {selectedDispute.customer_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Customer Name</span>
                    <span className="text-gray-900">{selectedDispute.customer_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">{formatDate(selectedDispute.created_at)}</span>
                </div>
                {selectedDispute.resolved_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Resolved</span>
                    <span className="text-gray-900">{formatDate(selectedDispute.resolved_at)}</span>
                  </div>
                )}

                {selectedDispute.description && (
                  <div>
                    <span className="text-gray-500 block mb-2">Description</span>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedDispute.description}</p>
                  </div>
                )}

                {selectedDispute.merchant_response && (
                  <div>
                    <span className="text-gray-500 block mb-2">Your Response</span>
                    <p className="text-gray-900 bg-green-50 p-3 rounded-lg border border-green-200">{selectedDispute.merchant_response}</p>
                  </div>
                )}

                {selectedDispute.resolution && (
                  <div>
                    <span className="text-gray-500 block mb-2">Resolution</span>
                    <p className="text-gray-900 bg-blue-50 p-3 rounded-lg border border-blue-200">{selectedDispute.resolution}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {(selectedDispute.status === 'open' || selectedDispute.status === 'pending') && !selectedDispute.merchant_response && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowResponseModal(true)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Submit Response
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Response Modal */}
        {showResponseModal && selectedDispute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Submit Response</h2>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setResponseText('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Dispute: {getReasonLabel(selectedDispute.reason)}</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(selectedDispute.amount, selectedDispute.currency)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Explain why this dispute should be resolved in your favor. Include any relevant details about the transaction, delivery confirmation, or communication with the customer."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                  <strong>Note:</strong> Once submitted, your response will be reviewed by our team. Provide as much detail as possible to support your case.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitResponse}
                    disabled={!responseText.trim() || submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Response
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}
