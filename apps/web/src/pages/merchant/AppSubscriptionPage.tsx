/**
 * App Subscription Page
 *
 * Hybrid subscription system where users can:
 * - Subscribe to individual apps
 * - Subscribe to bundles
 * - View and manage their app subscriptions
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Loader2,
  ShoppingCart,
  Truck,
  FileText,
  Calendar,
  Link as LinkIcon,
  Repeat,
  Package,
  BarChart,
  Gift,
  MapPin,
  Zap,
  Crown,
  Star,
  ArrowRight,
  X,
  Plus,
  Minus,
  ChevronRight,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppSubscription } from '@/hooks/useAppSubscription';
import { AppWithPricing, SubscriptionBundle, AppTier } from '@/services/appSubscription.service';

// Icon mapping for apps
const APP_ICONS: Record<string, React.ElementType> = {
  'shopping-cart': ShoppingCart,
  'file-text': FileText,
  calendar: Calendar,
  truck: Truck,
  link: LinkIcon,
  repeat: Repeat,
  package: Package,
  'bar-chart': BarChart,
  gift: Gift,
  'map-pin': MapPin,
};

export function AppSubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    apps,
    bundles,
    activeApps,
    subscriptions,
    isLoading,
    hasApp,
    getAppTier,
    subscribeToApp,
    subscribeToBundle,
    refresh,
  } = useAppSubscription();

  const [selectedTab, setSelectedTab] = useState<'apps' | 'bundles' | 'my-subscriptions'>('apps');
  const [selectedTier, setSelectedTier] = useState<AppTier>('starter');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [subscribeType, setSubscribeType] = useState<'app' | 'bundle'>('app');
  const [currentAppSlug, setCurrentAppSlug] = useState<string | null>(null);

  // Calculate total for selected apps
  const selectedAppsTotal = useMemo(() => {
    return selectedApps.reduce((total, slug) => {
      const app = apps.find(a => a.slug === slug);
      if (app) {
        return total + app.pricing[selectedTier].price_monthly;
      }
      return total;
    }, 0);
  }, [selectedApps, selectedTier, apps]);

  // Get the bundle for comparison
  const currentBundle = bundles.find(b => b.slug === selectedBundle);

  // Format price
  const formatPrice = (price: number, currency: string = 'NLE') => {
    return `${currency} ${new Intl.NumberFormat('en-SL').format(price)}`;
  };

  // Handle app selection for bundle
  const toggleAppSelection = (slug: string) => {
    if (selectedApps.includes(slug)) {
      setSelectedApps(selectedApps.filter(s => s !== slug));
    } else {
      // Check bundle limit
      if (currentBundle?.bundle_type === 'pick_n' && currentBundle.max_apps) {
        if (selectedApps.length >= currentBundle.max_apps) {
          return; // Max apps reached
        }
      }
      setSelectedApps([...selectedApps, slug]);
    }
  };

  // Handle subscribe to app
  const handleSubscribeApp = async (appSlug: string, tier: AppTier) => {
    setCurrentAppSlug(appSlug);
    setSelectedTier(tier);
    setSubscribeType('app');
    setShowConfirmModal(true);
  };

  // Handle subscribe to bundle
  const handleSubscribeBundle = async (bundleSlug: string) => {
    const bundle = bundles.find(b => b.slug === bundleSlug);
    if (!bundle) return;

    if (bundle.bundle_type === 'pick_n' && selectedApps.length !== bundle.max_apps) {
      alert(`Please select exactly ${bundle.max_apps} apps for this bundle`);
      return;
    }

    setSelectedBundle(bundleSlug);
    setSubscribeType('bundle');
    setShowConfirmModal(true);
  };

  // Confirm subscription
  const confirmSubscription = async () => {
    setSubscribing(true);
    try {
      if (subscribeType === 'app' && currentAppSlug) {
        await subscribeToApp(currentAppSlug, selectedTier, true);
      } else if (subscribeType === 'bundle' && selectedBundle) {
        const appIds = selectedApps.map(slug => {
          const app = apps.find(a => a.slug === slug);
          return app?.id || '';
        }).filter(Boolean);
        await subscribeToBundle(selectedBundle, appIds, true);
      }
      setShowConfirmModal(false);
      setSelectedApps([]);
      setSelectedBundle(null);
      setCurrentAppSlug(null);
      await refresh();
    } catch (error) {
      console.error('Subscription failed:', error);
    } finally {
      setSubscribing(false);
    }
  };

  // Render app card
  const renderAppCard = (app: AppWithPricing) => {
    const Icon = APP_ICONS[app.icon] || Package;
    const hasAccess = hasApp(app.slug);
    const userTier = getAppTier(app.slug);
    const isSelected = selectedApps.includes(app.slug);

    return (
      <Card
        key={app.id}
        className={`p-5 transition-all ${
          hasAccess
            ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'
            : isSelected
            ? 'border-primary-500 bg-primary-50/50 dark:border-primary-500 dark:bg-primary-900/20'
            : 'hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              hasAccess ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Icon className={`w-6 h-6 ${
                hasAccess ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{app.name}</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded capitalize">
                {app.category}
              </span>
            </div>
          </div>
          {hasAccess && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
              <Check className="w-3 h-3" />
              {userTier === 'pro' ? 'Pro' : 'Active'}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{app.description}</p>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className={`p-3 rounded-lg text-center ${
            selectedTier === 'starter' && !hasAccess ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700' : 'bg-gray-50 dark:bg-gray-800'
          }`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Starter</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {formatPrice(app.pricing.starter.price_monthly)}
            </p>
            <p className="text-xs text-gray-400">/month</p>
          </div>
          <div className={`p-3 rounded-lg text-center ${
            selectedTier === 'pro' && !hasAccess ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700' : 'bg-gray-50 dark:bg-gray-800'
          }`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pro</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {formatPrice(app.pricing.pro.price_monthly)}
            </p>
            <p className="text-xs text-gray-400">/month</p>
          </div>
        </div>

        {/* Feature limits */}
        {Object.keys(app.limits.starter).length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Key Limits:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(app.limits.starter).slice(0, 4).map(([key, value]) => {
                const proValue = app.limits.pro[key];
                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ').replace('max ', '')}:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {value === -1 ? '∞' : value} / {proValue === -1 ? '∞' : proValue}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        {hasAccess ? (
          <button
            disabled
            className="w-full py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Subscribed ({userTier})
          </button>
        ) : selectedBundle ? (
          <button
            onClick={() => toggleAppSelection(app.slug)}
            className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
              isSelected
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4" />
                Selected
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Select App
              </>
            )}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSubscribeApp(app.slug, 'starter')}
              className="py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              Starter
            </button>
            <button
              onClick={() => handleSubscribeApp(app.slug, 'pro')}
              className="py-2 bg-purple-500 text-white rounded-lg font-medium text-sm hover:bg-purple-600 transition flex items-center justify-center gap-1"
            >
              <Star className="w-3.5 h-3.5" />
              Pro
            </button>
          </div>
        )}
      </Card>
    );
  };

  // Render bundle card
  const renderBundleCard = (bundle: SubscriptionBundle) => {
    const isAllAccess = bundle.bundle_type === 'all_access';
    const isPickN = bundle.bundle_type === 'pick_n';
    const isSelected = selectedBundle === bundle.slug;

    return (
      <Card
        key={bundle.id}
        className={`p-6 transition-all relative overflow-hidden ${
          isSelected
            ? 'border-2 border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
            : isAllAccess
            ? 'border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20'
            : 'hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        {isAllAccess && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-bl-lg">
            BEST VALUE
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isAllAccess
              ? 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/30'
              : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20'
          }`}>
            {isAllAccess ? (
              <Crown className="w-6 h-6 text-white" />
            ) : (
              <Sparkles className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{bundle.name}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isPickN ? `Pick ${bundle.max_apps} apps` : 'All apps included'}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{bundle.description}</p>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatPrice(bundle.price_monthly)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">/month</span>
          </div>
          {bundle.discount_percentage > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                Save {bundle.discount_percentage}%
              </span>
              <span className="text-xs text-gray-400">compared to individual pricing</span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-4">
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{bundle.app_tier === 'pro' ? 'Pro features' : 'Starter features'} on all apps</span>
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{bundle.trial_days}-day free trial</span>
          </li>
          {isAllAccess && (
            <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Access to all current and future apps</span>
            </li>
          )}
        </ul>

        {/* Action */}
        {isPickN && !isSelected ? (
          <button
            onClick={() => {
              setSelectedBundle(bundle.slug);
              setSelectedApps([]);
            }}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            Select {bundle.max_apps} Apps
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : isPickN && isSelected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Selected: {selectedApps.length}/{bundle.max_apps}
              </span>
              <button
                onClick={() => {
                  setSelectedBundle(null);
                  setSelectedApps([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
            <button
              onClick={() => handleSubscribeBundle(bundle.slug)}
              disabled={selectedApps.length !== bundle.max_apps}
              className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
                selectedApps.length === bundle.max_apps
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedApps.length === bundle.max_apps ? (
                <>
                  <Check className="w-4 h-4" />
                  Subscribe to Bundle
                </>
              ) : (
                <>
                  Select {bundle.max_apps! - selectedApps.length} more app{bundle.max_apps! - selectedApps.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleSubscribeBundle(bundle.slug)}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
              isAllAccess
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-lg shadow-purple-500/20'
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
            }`}
          >
            Start {bundle.trial_days}-Day Trial
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">App Marketplace</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Subscribe to individual apps or save with bundles
          </p>
        </div>

        {/* Active Apps Summary */}
        {activeApps.length > 0 && (
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    You have access to {activeApps.length} app{activeApps.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {activeApps.map(a => a.app_name).join(', ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTab('my-subscriptions')}
                className="text-green-700 dark:text-green-300 hover:underline text-sm font-medium flex items-center gap-1"
              >
                Manage
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            <button
              onClick={() => {
                setSelectedTab('apps');
                setSelectedBundle(null);
                setSelectedApps([]);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'apps'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Individual Apps
            </button>
            <button
              onClick={() => {
                setSelectedTab('bundles');
                setSelectedBundle(null);
                setSelectedApps([]);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'bundles'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Bundles
            </button>
            <button
              onClick={() => setSelectedTab('my-subscriptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'my-subscriptions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              My Subscriptions
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {selectedTab === 'apps' && (
          <div className="space-y-4">
            {/* Bundle selection banner */}
            {selectedBundle && (
              <Card className="p-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <p className="font-medium text-primary-800 dark:text-primary-200">
                      Selecting apps for {currentBundle?.name} - Choose {currentBundle?.max_apps} apps
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBundle(null);
                      setSelectedApps([]);
                    }}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map(renderAppCard)}
            </div>
          </div>
        )}

        {selectedTab === 'bundles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bundles.map(renderBundleCard)}
          </div>
        )}

        {selectedTab === 'my-subscriptions' && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No active subscriptions
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Subscribe to apps or bundles to unlock features
                </p>
                <button
                  onClick={() => setSelectedTab('bundles')}
                  className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
                >
                  Browse Bundles
                </button>
              </Card>
            ) : (
              subscriptions.map((sub) => (
                <Card key={sub.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        sub.status === 'active' || sub.status === 'trialing'
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {sub.subscription_type === 'bundle' ? (
                          <Crown className="w-6 h-6 text-purple-500" />
                        ) : (
                          <Package className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {sub.subscription_type === 'bundle'
                            ? sub.bundle?.name || 'Bundle'
                            : sub.app?.name || 'App'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatPrice(sub.price_monthly, sub.currency)}/month
                          {sub.app_tier && ` - ${sub.app_tier}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        sub.status === 'trialing'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                          : sub.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {sub.status === 'trialing' && <Clock className="w-3 h-3" />}
                        {sub.status === 'active' && <Check className="w-3 h-3" />}
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                      {sub.trial_ends_at && sub.status === 'trialing' && (
                        <p className="text-xs text-gray-400 mt-1">
                          Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Confirm Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
                  {subscribeType === 'bundle' ? (
                    <Crown className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Confirm Subscription
                </h3>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {subscribeType === 'app' ? (
                  <>
                    You're about to subscribe to <strong>{apps.find(a => a.slug === currentAppSlug)?.name}</strong> ({selectedTier} tier)
                  </>
                ) : (
                  <>
                    You're about to subscribe to <strong>{bundles.find(b => b.slug === selectedBundle)?.name}</strong>
                    {selectedApps.length > 0 && (
                      <span className="block mt-2 text-sm">
                        Selected apps: {selectedApps.map(s => apps.find(a => a.slug === s)?.name).join(', ')}
                      </span>
                    )}
                  </>
                )}
              </p>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Price:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {subscribeType === 'app'
                      ? formatPrice(apps.find(a => a.slug === currentAppSlug)?.pricing[selectedTier].price_monthly || 0)
                      : formatPrice(bundles.find(b => b.slug === selectedBundle)?.price_monthly || 0)
                    }/month
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600 dark:text-gray-400">Trial:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {subscribeType === 'app'
                      ? `${apps.find(a => a.slug === currentAppSlug)?.pricing[selectedTier].trial_days || 7} days free`
                      : `${bundles.find(b => b.slug === selectedBundle)?.trial_days || 7} days free`
                    }
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setCurrentAppSlug(null);
                  }}
                  disabled={subscribing}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubscription}
                  disabled={subscribing}
                  className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Start Trial
                    </>
                  )}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

export default AppSubscriptionPage;
