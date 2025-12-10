import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  RefreshCw,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Key,
  Calendar,
  User,
  Shield,
  Copy,
  Check,
  FileText,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Edit,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { businessService, MerchantBusiness } from '@/services/business.service';
import { useAuth } from '@/context/AuthContext';

export function BusinessDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'settings'>('overview');

  useEffect(() => {
    if (businessId) {
      fetchBusiness();
    }
  }, [businessId]);

  const fetchBusiness = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await businessService.getBusiness(businessId);
      setBusiness(data);
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !business) return;
    setActionLoading(true);
    try {
      await businessService.approveBusiness(business.id, user.id, 'Approved by admin');
      fetchBusiness();
    } catch (error) {
      console.error('Error approving business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !business || !actionNotes) return;
    setActionLoading(true);
    try {
      await businessService.rejectBusiness(business.id, user.id, actionNotes);
      fetchBusiness();
      setShowRejectModal(false);
      setActionNotes('');
    } catch (error) {
      console.error('Error rejecting business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!user || !business) return;
    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;

    setActionLoading(true);
    try {
      await businessService.suspendBusiness(business.id, user.id, reason);
      fetchBusiness();
    } catch (error) {
      console.error('Error suspending business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!user || !business) return;
    setActionLoading(true);
    try {
      await businessService.reactivateBusiness(business.id, user.id);
      fetchBusiness();
    } catch (error) {
      console.error('Error reactivating business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, keyType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyType);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getApprovalBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" />, label: 'Rejected' },
      SUSPENDED: { color: 'bg-gray-100 text-gray-700', icon: <Ban className="w-4 h-4" />, label: 'Suspended' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!business) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Business not found</p>
          <button
            onClick={() => navigate('/admin/businesses')}
            className="mt-4 text-primary-600 hover:underline"
          >
            Back to Businesses
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/businesses')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
              {getApprovalBadge(business.approval_status)}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                business.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {business.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                business.is_live_mode ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {business.is_live_mode ? 'Live Mode' : 'Test Mode'}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{business.slug}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {business.approval_status === 'PENDING' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve Business
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          )}
          {business.approval_status === 'APPROVED' && (
            <button
              onClick={handleSuspend}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Suspend Business
            </button>
          )}
          {business.approval_status === 'SUSPENDED' && (
            <button
              onClick={handleReactivate}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reactivate Business
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {(['overview', 'transactions', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Business Info */}
              <Card className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Store className="w-10 h-10 text-primary-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{business.name}</h3>
                    <p className="text-gray-500">{business.slug}</p>
                    {business.business_category && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        <span>{business.business_category.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {business.description && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 leading-relaxed">{business.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {business.email && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium">{business.email}</p>
                      </div>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium">{business.phone}</p>
                      </div>
                    </div>
                  )}
                  {business.website_url && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Website</p>
                        <a
                          href={business.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1"
                        >
                          {business.website_url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  {(business.address || business.city) && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm font-medium">
                          {[business.address, business.city, business.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium">{new Date(business.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Merchant Owner */}
              {business.merchant && (
                <Card className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-600" />
                    Merchant Owner
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {business.merchant.first_name} {business.merchant.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{business.merchant.email}</p>
                    </div>
                    <Link
                      to={`/admin/users/${business.merchant.id}`}
                      className="ml-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      View Profile
                    </Link>
                  </div>
                </Card>
              )}

              {/* API Keys */}
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary-600" />
                  API Keys
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Test Public Key</span>
                      <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Test</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded font-mono">
                        {business.test_public_key || 'Not generated'}
                      </code>
                      {business.test_public_key && (
                        <button
                          onClick={() => copyToClipboard(business.test_public_key!, 'test_public')}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          {copiedKey === 'test_public' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Live Public Key</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Live</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded font-mono">
                        {business.live_public_key || 'Not generated'}
                      </code>
                      {business.live_public_key && (
                        <button
                          onClick={() => copyToClipboard(business.live_public_key!, 'live_public')}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          {copiedKey === 'live_public' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Test Secret Key</span>
                      <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Test</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded font-mono">
                        {business.test_secret_key ? `${business.test_secret_key.substring(0, 15)}...` : 'Not generated'}
                      </code>
                      {business.test_secret_key && (
                        <button
                          onClick={() => copyToClipboard(business.test_secret_key!, 'test_secret')}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          {copiedKey === 'test_secret' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Live Secret Key</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Live</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded font-mono">
                        {business.live_secret_key ? `${business.live_secret_key.substring(0, 15)}...` : 'Not generated'}
                      </code>
                      {business.live_secret_key && (
                        <button
                          onClick={() => copyToClipboard(business.live_secret_key!, 'live_secret')}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          {copiedKey === 'live_secret' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Sandbox Progress */}
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                  Sandbox Progress
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Test Transactions</span>
                    <span className="font-medium">
                      {business.sandbox_transactions_used || 0} / {business.sandbox_transaction_limit || 0}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(((business.sandbox_transactions_used || 0) / (business.sandbox_transaction_limit || 1)) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Complete sandbox transactions to unlock live mode
                  </p>
                </div>
              </Card>

              {/* Approval Notes */}
              {business.approval_notes && (
                <Card className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-600" />
                    Approval Notes
                  </h4>
                  <p className="text-sm text-gray-600">{business.approval_notes}</p>
                  {business.approved_at && (
                    <p className="text-xs text-gray-400 mt-3">
                      {business.approval_status === 'APPROVED' ? 'Approved' : 'Reviewed'} on{' '}
                      {new Date(business.approved_at).toLocaleString()}
                    </p>
                  )}
                </Card>
              )}

              {/* Quick Stats */}
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  Quick Stats
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Transactions</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Volume</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Success Rate</span>
                    <span className="font-medium">-</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <Card className="p-6">
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Transaction history coming soon</p>
            </div>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card className="p-6">
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Business settings coming soon</p>
            </div>
          </Card>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && business && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Reject Business
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-gray-600">
                Please provide a reason for rejecting <strong>{business.name}</strong>.
                This will be visible to the merchant.
              </p>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={4}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setActionNotes('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !actionNotes}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Reject Business'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
