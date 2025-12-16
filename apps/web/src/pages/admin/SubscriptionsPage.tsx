import { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  Users,
  Check,
  X,
  Edit,
  Save,
  Plus,
  Trash2,
  Star,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Store,
  UserCog,
  ArrowRightLeft,
  Globe,
  Briefcase,
  Crown,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  RefreshCw,
  TrendingUp,
  Calendar,
  Building2,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { currencyService, Currency } from '@/services/currency.service';
import { supabase } from '@/lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    transactions: number;
    apiCalls: number;
    teamMembers: number;
  };
  isPopular: boolean;
  isActive: boolean;
  category: 'pos' | 'business' | 'agent' | 'user';
}

interface UserSwitchRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  fromRole: string;
  toRole: string;
  businessName?: string;
  businessType?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface ActiveSubscription {
  id: string;
  userId: string;
  userName: string;
  planId: string;
  planName: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  amount: number;
}

type TabType = 'plans' | 'business' | 'agent' | 'user-switch' | 'active';

export function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // User switch requests
  const [switchRequests, setSwitchRequests] = useState<UserSwitchRequest[]>([]);
  const [loadingSwitchRequests, setLoadingSwitchRequests] = useState(false);

  // Active subscriptions
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    loadSwitchRequests();
    loadActiveSubscriptions();
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'NLe';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadSwitchRequests = async () => {
    setLoadingSwitchRequests(true);
    try {
      const { data, error } = await supabase
        .from('user_role_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSwitchRequests(data.map(r => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name || 'Unknown',
          userEmail: r.user_email || '',
          fromRole: r.from_role,
          toRole: r.to_role,
          businessName: r.business_name,
          businessType: r.business_type,
          reason: r.reason || '',
          status: r.status,
          createdAt: r.created_at,
        })));
      }
    } catch (error) {
      console.error('Error loading switch requests:', error);
    } finally {
      setLoadingSwitchRequests(false);
    }
  };

  const loadActiveSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const { data, error } = await supabase
        .from('pos_multivendor_settings')
        .select('*, users:merchant_id(first_name, last_name, email)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActiveSubscriptions(data.map(s => ({
          id: s.id,
          userId: s.merchant_id,
          userName: s.users ? `${s.users.first_name} ${s.users.last_name}` : 'Unknown',
          planId: 'pos-multivendor',
          planName: 'POS Multivendor',
          status: s.subscription_status,
          startDate: s.subscription_started_at || s.trial_started_at || s.created_at,
          endDate: s.subscription_expires_at || s.trial_ends_at || '',
          amount: s.last_payment_amount || 0,
        })));
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    // POS Plans
    {
      id: 'pos-multivendor',
      name: 'POS Multivendor',
      description: 'List products on marketplace & user dashboards',
      monthlyPrice: 50,
      yearlyPrice: 500,
      features: [
        'List all products on marketplace',
        'Appear on user dashboard carousel',
        'Access to thousands of customers',
        'Real-time order notifications',
        'Analytics dashboard',
        '7-day free trial',
      ],
      limits: {
        transactions: -1,
        apiCalls: -1,
        teamMembers: -1,
      },
      isPopular: true,
      isActive: true,
      category: 'pos',
    },
    // Business+ Plans
    {
      id: 'business-plus-starter',
      name: 'Business+ Starter',
      description: 'Essential features for growing businesses',
      monthlyPrice: 100,
      yearlyPrice: 1000,
      features: [
        'Priority support',
        'Advanced analytics',
        'Custom branding',
        'Up to 3 team members',
        'API access',
        'Webhook integrations',
      ],
      limits: {
        transactions: 1000,
        apiCalls: 10000,
        teamMembers: 3,
      },
      isPopular: false,
      isActive: true,
      category: 'business',
    },
    {
      id: 'business-plus-pro',
      name: 'Business+ Pro',
      description: 'Advanced features for established businesses',
      monthlyPrice: 250,
      yearlyPrice: 2500,
      features: [
        'All Starter features',
        '24/7 priority support',
        'White-label options',
        'Up to 10 team members',
        'Unlimited API calls',
        'Custom integrations',
        'Dedicated account manager',
      ],
      limits: {
        transactions: -1,
        apiCalls: -1,
        teamMembers: 10,
      },
      isPopular: true,
      isActive: true,
      category: 'business',
    },
    {
      id: 'business-plus-enterprise',
      name: 'Business+ Enterprise',
      description: 'Full-featured solution for large enterprises',
      monthlyPrice: 500,
      yearlyPrice: 5000,
      features: [
        'All Pro features',
        'Unlimited team members',
        'SLA guarantee',
        'Custom development',
        'On-premise options',
        'Advanced security',
        'Compliance support',
      ],
      limits: {
        transactions: -1,
        apiCalls: -1,
        teamMembers: -1,
      },
      isPopular: false,
      isActive: true,
      category: 'business',
    },
    // Agent Plans
    {
      id: 'agent-basic',
      name: 'Agent Basic',
      description: 'Start earning as a Peeap agent',
      monthlyPrice: 25,
      yearlyPrice: 250,
      features: [
        'Agent dashboard access',
        'Cash in/out services',
        'Commission on transactions',
        'Basic reporting',
        'Mobile app access',
        'Training materials',
      ],
      limits: {
        transactions: 500,
        apiCalls: 1000,
        teamMembers: 1,
      },
      isPopular: true,
      isActive: true,
      category: 'agent',
    },
    {
      id: 'agent-premium',
      name: 'Agent Premium',
      description: 'Expanded agent capabilities',
      monthlyPrice: 75,
      yearlyPrice: 750,
      features: [
        'All Basic features',
        'Higher commission rates',
        'Bill payments',
        'Float management',
        'Sub-agent management',
        'Priority support',
        'Advanced analytics',
      ],
      limits: {
        transactions: -1,
        apiCalls: -1,
        teamMembers: 5,
      },
      isPopular: false,
      isActive: true,
      category: 'agent',
    },
  ]);

  const handleSave = () => {
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const updatePlan = (id: string, field: keyof SubscriptionPlan, value: any) => {
    setPlans(plans.map(plan =>
      plan.id === id ? { ...plan, [field]: value } : plan
    ));
  };

  const togglePlanStatus = (id: string) => {
    setPlans(plans.map(plan =>
      plan.id === id ? { ...plan, isActive: !plan.isActive } : plan
    ));
  };

  const togglePopular = (id: string) => {
    setPlans(plans.map(plan =>
      plan.id === id ? { ...plan, isPopular: !plan.isPopular } : { ...plan, isPopular: false }
    ));
  };

  // Handle user switch request approval/rejection
  const handleSwitchRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const request = switchRequests.find(r => r.id === requestId);
      if (!request) return;

      if (action === 'approve') {
        // Update user role
        await supabase
          .from('users')
          .update({ roles: [request.toRole] })
          .eq('id', request.userId);
      }

      // Update request status
      await supabase
        .from('user_role_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', requestId);

      // Refresh requests
      loadSwitchRequests();
    } catch (error) {
      console.error('Error handling switch request:', error);
    }
  };

  // Stats
  const stats = {
    totalSubscribers: activeSubscriptions.length,
    monthlyRevenue: activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0),
    activeTrials: activeSubscriptions.filter(s => s.status === 'trial').length,
    pendingSwitchRequests: switchRequests.filter(r => r.status === 'pending').length,
    businessPlans: plans.filter(p => p.category === 'business' && p.isActive).length,
    agentPlans: plans.filter(p => p.category === 'agent' && p.isActive).length,
  };

  // Filter plans by active tab category
  const getFilteredPlans = () => {
    switch (activeTab) {
      case 'business':
        return plans.filter(p => p.category === 'business');
      case 'agent':
        return plans.filter(p => p.category === 'agent');
      case 'plans':
      default:
        return plans.filter(p => p.category === 'pos');
    }
  };

  const tabs = [
    { id: 'plans' as TabType, label: 'POS Plans', icon: Store, count: plans.filter(p => p.category === 'pos').length },
    { id: 'business' as TabType, label: 'Business+', icon: Crown, count: plans.filter(p => p.category === 'business').length },
    { id: 'agent' as TabType, label: 'Agent Plans', icon: UserCog, count: plans.filter(p => p.category === 'agent').length },
    { id: 'user-switch' as TabType, label: 'User Switch', icon: ArrowRightLeft, count: stats.pendingSwitchRequests },
    { id: 'active' as TabType, label: 'Active Subscriptions', icon: CheckCircle, count: stats.totalSubscribers },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage subscription plans, user upgrades, and active subscriptions</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Changes saved
              </span>
            )}
            {(activeTab === 'plans' || activeTab === 'business' || activeTab === 'agent') && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    isEditing
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  {isEditing ? 'Cancel' : 'Edit Plans'}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MotionCard className="p-4" delay={0}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Subscribers</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalSubscribers}</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4" delay={0.1}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4" delay={0.2}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Trials</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.activeTrials}</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4" delay={0.3}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Switches</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.pendingSwitchRequests}</p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Info Banner - only show for plan tabs */}
        {(activeTab === 'plans' || activeTab === 'business' || activeTab === 'agent') && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Subscription Management</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Changes to subscription plans will only affect new subscribers. Existing subscribers will
                  keep their current plan until renewal. Consider grandfathering existing customers when making price changes.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* User Switch Tab */}
        {activeTab === 'user-switch' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Requests Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">From → To</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Business Info</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loadingSwitchRequests ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading requests...
                        </td>
                      </tr>
                    ) : switchRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No switch requests found</p>
                          <p className="text-sm text-gray-400 mt-1">User switch requests will appear here</p>
                        </td>
                      </tr>
                    ) : (
                      switchRequests
                        .filter(r => statusFilter === 'all' || r.status === statusFilter)
                        .filter(r =>
                          searchQuery === '' ||
                          r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((request) => (
                          <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{request.userName}</p>
                                <p className="text-sm text-gray-500">{request.userEmail}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm capitalize">
                                  {request.fromRole}
                                </span>
                                <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                                <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-sm capitalize">
                                  {request.toRole}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {request.businessName ? (
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{request.businessName}</p>
                                  <p className="text-sm text-gray-500">{request.businessType}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                request.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {request.status === 'pending' && <Clock className="w-3 h-3" />}
                                {request.status === 'approved' && <Check className="w-3 h-3" />}
                                {request.status === 'rejected' && <X className="w-3 h-3" />}
                                {request.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {request.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleSwitchRequest(request.id, 'approve')}
                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                    title="Approve"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSwitchRequest(request.id, 'reject')}
                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                                    title="Reject"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Active Subscriptions Tab */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subscribers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={loadActiveSubscriptions}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSubscriptions ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Subscriptions Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Subscriber</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loadingSubscriptions ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading subscriptions...
                        </td>
                      </tr>
                    ) : activeSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No active subscriptions</p>
                          <p className="text-sm text-gray-400 mt-1">Subscriptions will appear here when merchants subscribe</p>
                        </td>
                      </tr>
                    ) : (
                      activeSubscriptions
                        .filter(s => statusFilter === 'all' || s.status === statusFilter)
                        .filter(s =>
                          searchQuery === '' ||
                          s.userName.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((sub) => (
                          <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                                  <span className="text-primary-600 font-medium">
                                    {sub.userName.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{sub.userName}</p>
                                  <p className="text-sm text-gray-500">ID: {sub.userId.slice(0, 8)}...</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-sm font-medium">
                                {sub.planName}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                sub.status === 'trial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                sub.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                sub.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {sub.status === 'trial' && <Clock className="w-3 h-3" />}
                                {sub.status === 'active' && <Check className="w-3 h-3" />}
                                {sub.status === 'expired' && <X className="w-3 h-3" />}
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                                {sub.endDate && (
                                  <>
                                    <span className="mx-1">-</span>
                                    {new Date(sub.endDate).toLocaleDateString()}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                              {sub.amount > 0 ? formatCurrency(sub.amount) : '-'}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="View Details">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-red-600" title="Cancel Subscription">
                                  <Ban className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Subscription Plans (POS, Business+, Agent) */}
        {(activeTab === 'plans' || activeTab === 'business' || activeTab === 'agent') && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getFilteredPlans().map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden ${!plan.isActive ? 'opacity-60' : ''} ${
                plan.isPopular ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-primary-600 text-white px-3 py-1 text-xs font-medium">
                  Most Popular
                </div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePopular(plan.id)}
                        className={`p-2 rounded-lg ${
                          plan.isPopular ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}
                        title="Set as popular"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => togglePlanStatus(plan.id)}
                        className={`p-2 rounded-lg ${
                          plan.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}
                        title={plan.isActive ? 'Disable' : 'Enable'}
                      >
                        {plan.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">{currencySymbol}</span>
                        <input
                          type="number"
                          value={plan.monthlyPrice}
                          onChange={(e) => updatePlan(plan.id, 'monthlyPrice', parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-2xl font-bold"
                        />
                        <span className="text-gray-500 dark:text-gray-400">/month</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">{currencySymbol}</span>
                        <input
                          type="number"
                          value={plan.yearlyPrice}
                          onChange={(e) => updatePlan(plan.id, 'yearlyPrice', parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-sm"
                        />
                        <span className="text-gray-500 dark:text-gray-400 text-sm">/year</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{currencySymbol}{plan.monthlyPrice}</span>
                        <span className="text-gray-500 dark:text-gray-400">/month</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">or {currencySymbol}{plan.yearlyPrice}/year (save 17%)</p>
                    </>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Limits</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plan.limits.transactions === -1 ? '∞' : plan.limits.transactions.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plan.limits.apiCalls === -1 ? '∞' : `${plan.limits.apiCalls / 1000}K`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">API Calls</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plan.limits.teamMembers === -1 ? '∞' : plan.limits.teamMembers}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Team</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          </div>

          {/* Add New Plan */}
          {isEditing && (
            <button
              onClick={() => setShowAddPlan(true)}
              className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Plan
            </button>
          )}

          {/* Subscription Settings */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Subscription Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trial Period</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={7}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <span className="text-gray-500 dark:text-gray-400">days</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Free trial period for new subscribers</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grace Period</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={3}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <span className="text-gray-500 dark:text-gray-400">days</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Days before account suspension after failed payment</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yearly Discount</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={17}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <span className="text-gray-500 dark:text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Discount for yearly subscriptions</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-Renewal</label>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" defaultChecked className="rounded text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Enable auto-renewal by default</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Subscriptions will automatically renew</p>
              </div>
            </div>
          </Card>
        </>
        )}
      </div>
    </AdminLayout>
  );
}
