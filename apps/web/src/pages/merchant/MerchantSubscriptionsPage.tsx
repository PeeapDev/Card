/**
 * Merchant Subscriptions Page
 *
 * Allows merchants to create and manage subscription plans
 * and view their subscribers
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Repeat,
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Clock,
  XCircle,
  AlertCircle,
  Store,
  ChevronDown,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  subscriptionService,
  SubscriptionPlan,
  Subscription,
  CreatePlanRequest,
} from '@/services/subscription.service';
import { businessService, MerchantBusiness } from '@/services/business.service';

const INTERVAL_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  trialing: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-orange-100 text-orange-800',
};

export function MerchantSubscriptionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'plans' | 'subscribers'>('plans');

  // Business selection
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<MerchantBusiness | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total_subscriptions: 0,
    active_subscriptions: 0,
    trialing_subscriptions: 0,
    canceled_subscriptions: 0,
    mrr: 0,
    currency: 'SLE',
  });

  // Form state
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: '',
    description: '',
    features: [],
    amount: 0,
    currency: 'SLE',
    interval: 'monthly',
    interval_count: 1,
    trial_days: 0,
  });
  const [featureInput, setFeatureInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses();
  }, []);

  // Load plans when business is selected
  useEffect(() => {
    if (selectedBusiness?.id) {
      loadPlans();
      loadStats();
    }
  }, [selectedBusiness?.id]);

  useEffect(() => {
    if (activeTab === 'subscribers' && selectedBusiness?.id) {
      loadSubscribers();
    }
  }, [activeTab, selectedBusiness?.id]);

  const loadBusinesses = async () => {
    try {
      setLoadingBusinesses(true);
      const data = await businessService.getMyBusinesses();
      setBusinesses(data);
      // Auto-select first business with subscriptions enabled, or just first business
      const subscriptionEnabled = data.find(b => b.enabled_features?.includes('subscriptions'));
      setSelectedBusiness(subscriptionEnabled || data[0] || null);
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const loadPlans = async () => {
    if (!selectedBusiness) return;
    try {
      setLoadingPlans(true);
      const data = await subscriptionService.getMerchantPlans(selectedBusiness.id);
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadSubscribers = async () => {
    if (!selectedBusiness) return;
    try {
      setLoadingSubscribers(true);
      const data = await subscriptionService.getMerchantSubscriptions(selectedBusiness.id);
      setSubscribers(data);
    } catch (err) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const loadStats = async () => {
    if (!selectedBusiness) return;
    try {
      const data = await subscriptionService.getMerchantStats(selectedBusiness.id);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleCreatePlan = async () => {
    if (!selectedBusiness) {
      setError('Please select a business first');
      return;
    }
    if (!formData.name || formData.amount <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await subscriptionService.createPlan(selectedBusiness.id, formData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        features: [],
        amount: 0,
        currency: 'SLE',
        interval: 'monthly',
        interval_count: 1,
        trial_days: 0,
      });
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      if (plan.is_active) {
        await subscriptionService.deactivatePlan(plan.id);
      } else {
        await subscriptionService.updatePlan(plan.id, { name: plan.name }); // Just to trigger update
      }
      await loadPlans();
    } catch (err) {
      console.error('Failed to toggle plan status:', err);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index),
    });
  };

  const copySubscriptionLink = (planId: string) => {
    const link = `${window.location.origin}/subscribe/${planId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(planId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { SLE: 'Le', USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || currency} ${amount.toLocaleString()}`;
  };

  // Show loading state while fetching businesses
  if (loadingBusinesses) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  // Show message if no businesses
  if (businesses.length === 0) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Business Found</h2>
          <p className="text-gray-500 mb-4">Create a business first to offer subscription plans</p>
          <Button onClick={() => window.location.href = '/merchant/developer/new'}>
            Create Business
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header with Business Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
            <p className="text-gray-500 mt-1">Create recurring subscription plans for your customers</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Business Selector */}
            <div className="relative">
              <button
                onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Store className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{selectedBusiness?.name || 'Select Business'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showBusinessDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {businesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setSelectedBusiness(biz);
                        setShowBusinessDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between ${
                        selectedBusiness?.id === biz.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{biz.name}</p>
                        {biz.enabled_features?.includes('subscriptions') ? (
                          <span className="text-xs text-green-600">Subscriptions enabled</span>
                        ) : (
                          <span className="text-xs text-gray-400">Subscriptions not enabled</span>
                        )}
                      </div>
                      {selectedBusiness?.id === biz.id && (
                        <Check className="w-4 h-4 text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => setShowCreateModal(true)} disabled={!selectedBusiness?.enabled_features?.includes('subscriptions')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </div>

        {/* Warning if subscriptions not enabled */}
        {selectedBusiness && !selectedBusiness.enabled_features?.includes('subscriptions') && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Subscriptions not enabled</p>
              <p className="text-sm text-yellow-700">
                Contact admin to enable subscription billing for "{selectedBusiness.name}".
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_subscriptions}</p>
                <p className="text-sm text-gray-500">Active Subscribers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.trialing_subscriptions}</p>
                <p className="text-sm text-gray-500">In Trial</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatAmount(stats.mrr, stats.currency)}</p>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Repeat className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</p>
                <p className="text-sm text-gray-500">Active Plans</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plans'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscribers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Subscribers
            </button>
          </nav>
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {loadingPlans ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <Card className="p-12 text-center">
                <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subscription plans yet</h3>
                <p className="text-gray-500 mb-6">Create your first plan to start accepting recurring payments</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Plan
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`overflow-hidden ${!plan.is_active ? 'opacity-60' : ''}`}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-500">{plan.description || 'No description'}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatAmount(plan.amount, plan.currency)}
                        </span>
                        <span className="text-gray-500 ml-1">
                          / {plan.interval_count > 1 ? `${plan.interval_count} ` : ''}{plan.interval}
                        </span>
                      </div>

                      {plan.trial_days > 0 && (
                        <div className="mb-4 inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                          <Clock className="w-3 h-3" />
                          {plan.trial_days}-day trial
                        </div>
                      )}

                      {plan.features && plan.features.length > 0 && (
                        <ul className="space-y-2 mb-4">
                          {plan.features.slice(0, 3).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-green-500" />
                              {feature}
                            </li>
                          ))}
                          {plan.features.length > 3 && (
                            <li className="text-sm text-gray-400">+{plan.features.length - 3} more</li>
                          )}
                        </ul>
                      )}

                      <div className="flex items-center gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => copySubscriptionLink(plan.id)}
                        >
                          {copiedLink === plan.id ? (
                            <><Check className="w-4 h-4 mr-1" /> Copied!</>
                          ) : (
                            <><Copy className="w-4 h-4 mr-1" /> Copy Link</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/subscribe/${plan.id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePlanStatus(plan)}
                        >
                          {plan.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <Card>
            <CardHeader>
              <CardTitle>All Subscribers</CardTitle>
            </CardHeader>
            {loadingSubscribers ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading subscribers...</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No subscribers yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Billing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sub.customer_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{sub.customer_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{sub.plan?.name || 'Unknown Plan'}</p>
                          <p className="text-sm text-gray-500">
                            {sub.plan && formatAmount(sub.plan.amount, sub.plan.currency)}/{sub.plan?.interval}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[sub.status] || 'bg-gray-100'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {sub.next_billing_date
                            ? new Date(sub.next_billing_date).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Create Plan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Create Subscription Plan</h2>
                <p className="text-gray-500 text-sm mt-1">Set up a recurring payment plan for your customers</p>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Premium Membership"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what's included in this plan..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="50000"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="SLE">SLE (Leone)</option>
                      <option value="USD">USD (Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (Pound)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Interval</label>
                    <select
                      value={formData.interval}
                      onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                    <input
                      type="number"
                      value={formData.trial_days || ''}
                      onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      placeholder="Add a feature..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button type="button" variant="outline" onClick={addFeature}>Add</Button>
                  </div>
                  {formData.features && formData.features.length > 0 && (
                    <ul className="space-y-2">
                      {formData.features.map((feature, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{feature}</span>
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="p-6 border-t flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlan} disabled={creating}>
                  {creating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    'Create Plan'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}
