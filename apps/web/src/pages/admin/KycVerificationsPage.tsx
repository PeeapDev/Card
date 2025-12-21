import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Camera,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface KycApplication {
  id: string;
  user_id: string;
  status: 'NOT_STARTED' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  type: string;
  first_name?: string;
  last_name?: string;
  id_number?: string;
  verification_result?: {
    selfieImage?: string;
    idCardImage?: string;
    slVerification?: {
      nin?: string;
      phoneNumber?: string;
      simRegisteredName?: string;
      idCardName?: string;
      phoneVerified?: boolean;
      nameMatchScore?: number;
    };
    issues?: string[];
  };
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export function KycVerificationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<KycApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplications = async () => {
    try {
      let query = supabase
        .from('kyc_applications')
        .select(`
          *,
          user:users!user_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching KYC applications:', error);
        return;
      }

      setApplications(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" /> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Eye className="w-3 h-3" /> Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const userName = `${app.user?.first_name || ''} ${app.user?.last_name || ''}`.toLowerCase();
    const email = (app.user?.email || '').toLowerCase();
    const phone = (app.user?.phone || '').toLowerCase();
    const nin = (app.verification_result?.slVerification?.nin || '').toLowerCase();
    return userName.includes(query) || email.includes(query) || phone.includes(query) || nin.includes(query);
  });

  const pendingCount = applications.filter(a => a.status === 'PENDING').length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-primary-600" />
              KYC Verifications
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Review and approve user identity verifications
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {pendingCount} pending review
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or NIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ALL">All Statuses</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <Card className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No KYC applications found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {statusFilter !== 'ALL'
                  ? `No ${statusFilter.toLowerCase().replace('_', ' ')} applications`
                  : 'No applications match your search'}
              </p>
            </Card>
          ) : (
            filteredApplications.map((app) => (
              <Card
                key={app.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/admin/users/${app.user_id}?tab=kyc`)}
              >
                <div className="flex items-start gap-4">
                  {/* Selfie Preview */}
                  <div className="flex-shrink-0">
                    {app.verification_result?.selfieImage ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={`data:image/jpeg;base64,${app.verification_result.selfieImage}`}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {app.user?.first_name} {app.user?.last_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {app.user?.email}
                        </p>
                        {app.user?.phone && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {app.user.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(app.status)}
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Verification Details */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {app.verification_result?.slVerification?.nin && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                          <FileText className="w-3 h-3" />
                          NIN: {app.verification_result.slVerification.nin}
                        </span>
                      )}
                      {app.verification_result?.slVerification?.phoneVerified !== undefined && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          app.verification_result.slVerification.phoneVerified
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          <Phone className="w-3 h-3" />
                          Phone {app.verification_result.slVerification.phoneVerified ? 'Verified' : 'Unverified'}
                        </span>
                      )}
                      {app.verification_result?.slVerification?.nameMatchScore !== undefined && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          app.verification_result.slVerification.nameMatchScore >= 70
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          Name Match: {app.verification_result.slVerification.nameMatchScore}%
                        </span>
                      )}
                      {app.verification_result?.idCardImage && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">
                          <FileText className="w-3 h-3" />
                          ID Uploaded
                        </span>
                      )}
                      {app.verification_result?.selfieImage && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs">
                          <Camera className="w-3 h-3" />
                          Selfie Uploaded
                        </span>
                      )}
                    </div>

                    {/* Issues */}
                    {app.verification_result?.issues && app.verification_result.issues.length > 0 && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{app.verification_result.issues.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* View Button */}
                  <button
                    className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/users/${app.user_id}?tab=kyc`);
                    }}
                  >
                    <Eye className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
