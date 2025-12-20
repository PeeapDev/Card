import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  RefreshCw,
  ExternalLink,
  X,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Key,
  Calendar,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { businessService, MerchantBusiness } from '@/services/business.service';
import { useAuth } from '@/context/AuthContext';

export function BusinessesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState<MerchantBusiness | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  const handleAvatarError = useCallback((merchantId: string) => {
    setFailedAvatars(prev => new Set(prev).add(merchantId));
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [statusFilter, approvalFilter]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const data = await businessService.getAllBusinesses({
        status: statusFilter,
        approval_status: approvalFilter,
        search: searchTerm,
      });
      setBusinesses(data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchBusinesses();
  };

  const handleApprove = async (business: MerchantBusiness) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await businessService.approveBusiness(business.id, user.id, 'Approved by admin');
      fetchBusinesses();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !selectedBusiness || !actionNotes) return;
    setActionLoading(true);
    try {
      await businessService.rejectBusiness(selectedBusiness.id, user.id, actionNotes);
      fetchBusinesses();
      setShowRejectModal(false);
      setShowDetailModal(false);
      setActionNotes('');
    } catch (error) {
      console.error('Error rejecting business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (business: MerchantBusiness) => {
    if (!user) return;
    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;

    setActionLoading(true);
    try {
      await businessService.suspendBusiness(business.id, user.id, reason);
      fetchBusinesses();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error suspending business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (business: MerchantBusiness) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await businessService.reactivateBusiness(business.id, user.id);
      fetchBusinesses();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error reactivating business:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getApprovalBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
      SUSPENDED: { color: 'bg-gray-100 text-gray-700', icon: <Ban className="w-3 h-3" />, label: 'Suspended' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const isActive = status === 'ACTIVE';
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const filteredBusinesses = searchTerm
    ? businesses.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.merchant?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : businesses;

  const stats = {
    total: businesses.length,
    pending: businesses.filter(b => b.approval_status === 'PENDING').length,
    approved: businesses.filter(b => b.approval_status === 'APPROVED').length,
    live: businesses.filter(b => b.is_live_mode).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Management</h1>
            <p className="text-gray-500">Review and manage merchant businesses</p>
          </div>
          <button
            onClick={fetchBusinesses}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Businesses</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-xl font-semibold">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-xl font-semibold">{stats.approved}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Key className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Live Mode</p>
                <p className="text-xl font-semibold">{stats.live}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by business name or merchant email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Approval Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </Card>

        {/* Businesses Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
              <p className="mt-2 text-gray-500">Loading businesses...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBusinesses.map((business) => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{business.name}</p>
                          <p className="text-sm text-gray-500">{business.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {business.merchant && (
                        <div className="flex items-center gap-3">
                          {business.merchant.profile_picture && !failedAvatars.has(business.merchant.id) ? (
                            <img
                              src={business.merchant.profile_picture}
                              alt={`${business.merchant.first_name} ${business.merchant.last_name}`}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              onError={() => handleAvatarError(business.merchant!.id)}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {business.merchant.first_name} {business.merchant.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{business.merchant.email}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getApprovalBadge(business.approval_status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        business.is_live_mode
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {business.is_live_mode ? 'Live' : 'Test'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${((business.sandbox_transactions_used || 0) / (business.sandbox_transaction_limit || 1)) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {business.sandbox_transactions_used || 0}/{business.sandbox_transaction_limit || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {new Date(business.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/businesses/${business.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        {business.approval_status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(business)}
                              disabled={actionLoading}
                              className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBusiness(business);
                                setShowRejectModal(true);
                              }}
                              disabled={actionLoading}
                              className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {business.approval_status === 'APPROVED' && (
                          <button
                            onClick={() => handleSuspend(business)}
                            disabled={actionLoading}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                            title="Suspend"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {business.approval_status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReactivate(business)}
                            disabled={actionLoading}
                            className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                            title="Reactivate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredBusinesses.length === 0 && (
            <div className="p-8 text-center">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No businesses found</p>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Business Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Store className="w-8 h-8 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{selectedBusiness.name}</h3>
                  <p className="text-gray-500">{selectedBusiness.slug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getApprovalBadge(selectedBusiness.approval_status)}
                    {getStatusBadge(selectedBusiness.status)}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedBusiness.is_live_mode
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedBusiness.is_live_mode ? 'Live Mode' : 'Test Mode'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Merchant Info */}
              {selectedBusiness.merchant && (
                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Merchant Owner
                  </h4>
                  <div className="flex items-center gap-4">
                    {selectedBusiness.merchant.profile_picture && !failedAvatars.has(selectedBusiness.merchant.id) ? (
                      <img
                        src={selectedBusiness.merchant.profile_picture}
                        alt={`${selectedBusiness.merchant.first_name} ${selectedBusiness.merchant.last_name}`}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        onError={() => handleAvatarError(selectedBusiness.merchant!.id)}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">
                          {selectedBusiness.merchant.first_name} {selectedBusiness.merchant.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedBusiness.merchant.email}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Business Details */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Business Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedBusiness.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{selectedBusiness.email}</span>
                    </div>
                  )}
                  {selectedBusiness.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedBusiness.phone}</span>
                    </div>
                  )}
                  {selectedBusiness.website_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a
                        href={selectedBusiness.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline flex items-center gap-1"
                      >
                        {selectedBusiness.website_url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {(selectedBusiness.address || selectedBusiness.city) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>
                        {[selectedBusiness.address, selectedBusiness.city, selectedBusiness.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {selectedBusiness.business_category && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{selectedBusiness.business_category.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Created {new Date(selectedBusiness.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {selectedBusiness.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">{selectedBusiness.description}</p>
                  </div>
                )}
              </Card>

              {/* Sandbox Progress */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Sandbox Progress</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-primary-600 h-3 rounded-full transition-all"
                        style={{
                          width: `${((selectedBusiness.sandbox_transactions_used || 0) / (selectedBusiness.sandbox_transaction_limit || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedBusiness.sandbox_transactions_used || 0} / {selectedBusiness.sandbox_transaction_limit || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Test transactions completed before live mode eligibility
                </p>
              </Card>

              {/* API Keys Preview */}
              <Card className="p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  API Keys
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Test Public Key</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {selectedBusiness.test_public_key?.substring(0, 20)}...
                    </code>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Live Public Key</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {selectedBusiness.live_public_key?.substring(0, 20)}...
                    </code>
                  </div>
                </div>
              </Card>

              {/* Approval Notes */}
              {selectedBusiness.approval_notes && (
                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Approval Notes</h4>
                  <p className="text-sm text-gray-600">{selectedBusiness.approval_notes}</p>
                  {selectedBusiness.approved_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      {selectedBusiness.approval_status === 'APPROVED' ? 'Approved' : 'Reviewed'} on{' '}
                      {new Date(selectedBusiness.approved_at).toLocaleString()}
                    </p>
                  )}
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedBusiness.approval_status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedBusiness)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve Business
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                {selectedBusiness.approval_status === 'APPROVED' && (
                  <button
                    onClick={() => handleSuspend(selectedBusiness)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend Business
                  </button>
                )}
                {selectedBusiness.approval_status === 'SUSPENDED' && (
                  <button
                    onClick={() => handleReactivate(selectedBusiness)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reactivate Business
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Reject Business</h2>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-gray-600">
                Please provide a reason for rejecting <strong>{selectedBusiness.name}</strong>.
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
