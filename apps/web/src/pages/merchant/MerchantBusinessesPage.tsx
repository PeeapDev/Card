/**
 * Merchant Businesses Page
 * Lists all businesses created by the merchant
 * Allows access to each business's transactions, disputes, and settings
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Plus,
  ChevronRight,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Settings,
  BarChart3,
  Loader2,
  Building2,
  ExternalLink,
  TrendingUp,
  Users,
  DollarSign,
  Crown,
  Lock,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { businessService, MerchantBusiness } from '@/services/business.service';
import { useDeveloperMode } from '@/context/DeveloperModeContext';

export function MerchantBusinessesPage() {
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    activeBusinesses: 0,
    pendingApprovals: 0,
  });

  const navigate = useNavigate();
  const { isDeveloperMode, businessCount } = useDeveloperMode();

  // Business limits based on subscription
  const FREE_LIMIT = 1;
  const MERCHANT_PLUS_LIMIT = 3;
  const currentLimit = FREE_LIMIT; // TODO: Get from user subscription
  const canCreateMore = businesses.length < currentLimit;

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const data = await businessService.getMyBusinesses();
      setBusinesses(data);

      // Calculate stats
      const activeCount = data.filter(b => b.approval_status === 'APPROVED').length;
      const pendingCount = data.filter(b => b.approval_status === 'PENDING').length;

      setStats({
        totalRevenue: 0, // TODO: Fetch from transactions
        totalTransactions: 0, // TODO: Fetch from transactions
        activeBusinesses: activeCount,
        pendingApprovals: pendingCount,
      });
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: <X className="w-3.5 h-3.5" />, label: 'Rejected' },
      SUSPENDED: { color: 'bg-gray-100 text-gray-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Suspended' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const handleCreateBusiness = () => {
    if (!canCreateMore) {
      navigate('/merchant/upgrade');
    } else if (isDeveloperMode) {
      navigate('/merchant/developer/create-business');
    } else {
      navigate('/merchant/create-business');
    }
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Businesses</h1>
            <p className="text-gray-500">Manage your businesses and view their performance</p>
          </div>
          <div className="flex items-center gap-3">
            {!canCreateMore && (
              <button
                onClick={() => navigate('/merchant/upgrade')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 flex items-center gap-2 text-sm font-medium"
              >
                <Crown className="w-4 h-4" />
                Upgrade for More
              </button>
            )}
            <button
              onClick={handleCreateBusiness}
              disabled={!canCreateMore && !isDeveloperMode}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                canCreateMore
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canCreateMore ? (
                <>
                  <Plus className="w-4 h-4" />
                  Create Business
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Limit Reached
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upgrade Banner */}
        {!canCreateMore && (
          <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-amber-900">Upgrade to Merchant+</h3>
                  <p className="text-sm text-amber-700">Create up to {MERCHANT_PLUS_LIMIT} businesses and unlock premium features</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/merchant/upgrade')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
              >
                Upgrade Now
              </button>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Businesses</p>
                <p className="text-xl font-bold text-gray-900">{businesses.length}/{currentLimit}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Businesses</p>
                <p className="text-xl font-bold text-gray-900">{stats.activeBusinesses}</p>
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
                <p className="text-xl font-bold text-gray-900">{stats.pendingApprovals}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">Le 0</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Businesses List */}
        {businesses.length === 0 ? (
          <Card className="p-8 text-center">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses yet</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Create your first business to start accepting payments and managing your operations.
            </p>
            <button
              onClick={handleCreateBusiness}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Your First Business
            </button>
          </Card>
        ) : (
          <div className="space-y-4">
            {businesses.map((business) => (
              <Card key={business.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row">
                  {/* Business Info */}
                  <div
                    className="flex-1 p-5 cursor-pointer"
                    onClick={() => navigate(`/merchant/businesses/${business.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt={business.name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                          <Store className="w-7 h-7 text-green-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{business.name}</h3>
                          {getStatusBadge(business.approval_status)}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{business.slug}</p>
                        {business.description && (
                          <p className="text-sm text-gray-600 line-clamp-1">{business.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            0 transactions
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            Le 0 revenue
                          </span>
                          <span className={`flex items-center gap-1 ${business.is_live_mode ? 'text-green-600' : 'text-orange-600'}`}>
                            {business.is_live_mode ? 'Live' : 'Test Mode'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 hidden sm:block" />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l border-gray-100 bg-gray-50">
                    <button
                      onClick={() => navigate(`/merchant/businesses/${business.id}`)}
                      className="flex-1 sm:flex-none px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </button>
                    <button
                      onClick={() => navigate(`/merchant/businesses/${business.id}/transactions`)}
                      className="flex-1 sm:flex-none px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 border-l sm:border-l-0 sm:border-t border-gray-100"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span className="hidden sm:inline">Transactions</span>
                    </button>
                    <button
                      onClick={() => navigate(`/merchant/businesses/${business.id}/disputes`)}
                      className="flex-1 sm:flex-none px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 border-l sm:border-l-0 sm:border-t border-gray-100"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span className="hidden sm:inline">Disputes</span>
                    </button>
                    <button
                      onClick={() => navigate(`/merchant/businesses/${business.id}/settings`)}
                      className="flex-1 sm:flex-none px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 border-l sm:border-l-0 sm:border-t border-gray-100"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Settings</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Developer Mode Notice */}
        {isDeveloperMode && (
          <Card className="p-4 bg-indigo-50 border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ExternalLink className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-indigo-900">Developer Mode Active</h3>
                <p className="text-sm text-indigo-700">
                  Access the full Developer Portal for API keys, webhooks, and integration tools.
                </p>
              </div>
              <button
                onClick={() => navigate('/merchant/developer')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                Open Developer Portal
              </button>
            </div>
          </Card>
        )}
      </div>
    </MerchantLayout>
  );
}
