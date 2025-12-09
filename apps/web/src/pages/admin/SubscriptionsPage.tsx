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
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { currencyService, Currency } from '@/services/currency.service';

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
}

export function SubscriptionsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

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

  // Stats
  const stats = {
    totalSubscribers: 156,
    monthlyRevenue: plans.reduce((sum, p) => sum + (p.monthlyPrice * Math.floor(Math.random() * 50)), 0),
    activeStarter: 45,
    activeBusiness: 89,
    activeEnterprise: 22,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage merchant subscription plans and pricing</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Changes saved
              </span>
            )}
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
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Business Plan</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.activeBusiness} active</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4" delay={0.3}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enterprise Plan</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.activeEnterprise} active</p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Info Banner */}
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

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
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
                  defaultValue={14}
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
      </div>
    </AdminLayout>
  );
}
