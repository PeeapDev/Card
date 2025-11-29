import { useState } from 'react';
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
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

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

  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    {
      id: '1',
      name: 'Starter',
      description: 'Perfect for small businesses just getting started',
      monthlyPrice: 29,
      yearlyPrice: 290,
      features: [
        'Up to 100 transactions/month',
        'Basic analytics',
        'Email support',
        'Standard payment processing',
        '1 team member',
      ],
      limits: {
        transactions: 100,
        apiCalls: 1000,
        teamMembers: 1,
      },
      isPopular: false,
      isActive: true,
    },
    {
      id: '2',
      name: 'Business',
      description: 'For growing businesses with higher volume',
      monthlyPrice: 99,
      yearlyPrice: 990,
      features: [
        'Up to 1,000 transactions/month',
        'Advanced analytics',
        'Priority email support',
        'Lower processing fees',
        '5 team members',
        'Custom branding',
        'Webhook integrations',
      ],
      limits: {
        transactions: 1000,
        apiCalls: 10000,
        teamMembers: 5,
      },
      isPopular: true,
      isActive: true,
    },
    {
      id: '3',
      name: 'Enterprise',
      description: 'For large organizations with custom needs',
      monthlyPrice: 299,
      yearlyPrice: 2990,
      features: [
        'Unlimited transactions',
        'Real-time analytics',
        '24/7 phone & email support',
        'Lowest processing fees',
        'Unlimited team members',
        'White-label solution',
        'Dedicated account manager',
        'Custom API limits',
        'SLA guarantee',
      ],
      limits: {
        transactions: -1,
        apiCalls: -1,
        teamMembers: -1,
      },
      isPopular: false,
      isActive: true,
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
            <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
            <p className="text-gray-500">Manage merchant subscription plans and pricing</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Changes saved
              </span>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isEditing
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Subscribers</p>
                <p className="text-xl font-semibold">{stats.totalSubscribers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
                <p className="text-xl font-semibold">${stats.monthlyRevenue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Business Plan</p>
                <p className="text-xl font-semibold">{stats.activeBusiness} active</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Enterprise Plan</p>
                <p className="text-xl font-semibold">{stats.activeEnterprise} active</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Subscription Management</p>
              <p className="text-sm text-amber-700 mt-1">
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
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePopular(plan.id)}
                        className={`p-2 rounded-lg ${
                          plan.isPopular ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'
                        }`}
                        title="Set as popular"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => togglePlanStatus(plan.id)}
                        className={`p-2 rounded-lg ${
                          plan.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
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
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          value={plan.monthlyPrice}
                          onChange={(e) => updatePlan(plan.id, 'monthlyPrice', parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-2xl font-bold"
                        />
                        <span className="text-gray-500">/month</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          value={plan.yearlyPrice}
                          onChange={(e) => updatePlan(plan.id, 'yearlyPrice', parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-gray-500 text-sm">/year</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">${plan.monthlyPrice}</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <p className="text-sm text-gray-500">or ${plan.yearlyPrice}/year (save 17%)</p>
                    </>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Limits</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {plan.limits.transactions === -1 ? '∞' : plan.limits.transactions.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Transactions</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {plan.limits.apiCalls === -1 ? '∞' : `${plan.limits.apiCalls / 1000}K`}
                      </p>
                      <p className="text-xs text-gray-500">API Calls</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {plan.limits.teamMembers === -1 ? '∞' : plan.limits.teamMembers}
                      </p>
                      <p className="text-xs text-gray-500">Team</p>
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
            className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Plan
          </button>
        )}

        {/* Subscription Settings */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Subscription Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trial Period</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={14}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-500">days</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Free trial period for new subscribers</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={3}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-500">days</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Days before account suspension after failed payment</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yearly Discount</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={17}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Discount for yearly subscriptions</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Renewal</label>
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" defaultChecked className="rounded text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-600">Enable auto-renewal by default</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Subscriptions will automatically renew</p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
