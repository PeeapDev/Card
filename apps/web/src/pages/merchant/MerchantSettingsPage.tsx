import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Building,
  Code2,
  ToggleLeft,
  ToggleRight,
  Save,
  AlertCircle,
  CheckCircle,
  Boxes,
  ShoppingCart,
  Package,
  Fuel,
  Truck,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Wifi,
  Puzzle,
  Calendar,
  Palette,
  Nfc,
  Wallet,
  Link2,
  FileText,
  Crown,
  Pin,
  PinOff,
  MoreVertical,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { useDeveloperMode } from '@/context/DeveloperModeContext';
import { useApps } from '@/context/AppsContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { NFCAgentSettings } from '@/components/settings/NFCAgentSettings';
import { ThemeColorSelector } from '@/components/settings/ThemeColorSelector';
import { AppSetupWizard } from '@/components/apps/AppSetupWizard';
import { supabase } from '@/lib/supabase';

export function MerchantSettingsPage() {
  const { user } = useAuth();
  const { isDeveloperMode, toggleDeveloperMode } = useDeveloperMode();
  const { isAppEnabled, toggleApp, refreshApps, completeAppSetup, isAppPinned, toggleAppPin } = useApps();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [setupWizardApp, setSetupWizardApp] = useState<string | null>(null);
  const [existingWalletInfo, setExistingWalletInfo] = useState<{ id: string; balance: number } | null>(null);
  const [wasSetupBefore, setWasSetupBefore] = useState(false);

  // Handler for toggling apps - checks if wallet already exists
  const handleToggleApp = async (appId: string) => {
    const currentlyEnabled = isAppEnabled(appId);

    if (currentlyEnabled) {
      // Disabling - just toggle off, no wizard
      await toggleApp(appId);
    } else {
      // Enabling - first check if a wallet for this app already exists
      try {
        const { data: existingWallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user?.id)
          .eq('wallet_type', `app_${appId}`)
          .single();

        if (existingWallet) {
          // Wallet already exists - just enable the app silently, no wizard needed
          await completeAppSetup(appId, existingWallet.id, {
            reactivated_date: new Date().toISOString(),
          });
          await refreshApps();
          return;
        }
      } catch (err) {
        // No existing wallet found - this is expected for first-time setup
        console.log('No existing wallet, will show setup wizard');
      }

      // First time setup - show wizard
      await toggleApp(appId);
      setWasSetupBefore(false);
      setExistingWalletInfo(null);
      setSetupWizardApp(appId);
    }
  };

  // Update tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const [settings, setSettings] = useState({
    businessName: 'Acme Store',
    businessEmail: 'contact@acmestore.com',
    businessPhone: '+1 (555) 123-4567',
    businessAddress: '123 Main St, Suite 100',
    notifyTransactions: true,
    notifyPayouts: true,
    notifyDisputes: true,
    notifyWeeklyReport: true,
    twoFactorEnabled: false,
    ipWhitelist: '',
  });

  const handleSave = () => {
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'apps', label: 'Apps', icon: Boxes },
    { id: 'theme', label: 'Color Theme', icon: Palette },
    { id: 'nfc', label: 'NFC Reader', icon: Puzzle },
    { id: 'developer', label: 'Developer Mode', icon: Code2 },
  ];

  // Available apps configuration - enabled state comes from AppsContext
  const availableApps = [
    {
      id: 'terminal',
      name: 'Payment Terminal',
      description: 'Accept contactless payments via NFC tap-to-pay on compatible devices',
      icon: Nfc,
      color: 'indigo',
      enabled: isAppEnabled('terminal'),
      path: '/merchant/terminal',
      features: ['NFC payments', 'Tap to pay', 'Quick checkout', 'Receipt generation'],
    },
    {
      id: 'driver_wallet',
      name: 'Driver Wallet',
      description: 'Collect payments from drivers and manage transportation revenue',
      icon: Wallet,
      color: 'teal',
      enabled: isAppEnabled('driver_wallet'),
      path: '/merchant/driver-wallet',
      features: ['Driver collections', 'Daily settlements', 'Revenue tracking', 'Driver management'],
    },
    {
      id: 'payment_links',
      name: 'Payment Links',
      description: 'Create shareable payment links to collect payments from anyone',
      icon: Link2,
      color: 'cyan',
      enabled: isAppEnabled('payment_links'),
      path: '/merchant/payment-links',
      features: ['Shareable links', 'Custom amounts', 'QR codes', 'Payment tracking'],
    },
    {
      id: 'invoices',
      name: 'Invoices',
      description: 'Create and send professional invoices to your customers',
      icon: FileText,
      color: 'slate',
      enabled: isAppEnabled('invoices'),
      path: '/merchant/invoices',
      features: ['Professional invoices', 'Auto reminders', 'Payment tracking', 'PDF export'],
    },
    {
      id: 'pos',
      name: 'Point of Sale',
      description: 'Full POS system with inventory, sales tracking, and offline support',
      icon: ShoppingCart,
      color: 'green',
      enabled: isAppEnabled('pos'),
      path: '/merchant/apps/pos',
      features: ['Quick checkout', 'Inventory tracking', 'Offline mode', 'Sales reports'],
    },
    {
      id: 'events',
      name: 'Event Management',
      description: 'Create events, sell tickets with QR codes, manage staff, and track analytics',
      icon: Calendar,
      color: 'purple',
      enabled: isAppEnabled('events'),
      path: '/merchant/apps/events',
      features: ['Ticket sales', 'QR scanning', 'Staff management', 'Event wallet'],
    },
    {
      id: 'fuel_station',
      name: 'Fuel Station CRM',
      description: 'Manage fuel stations with pump tracking, pricing, and customer management',
      icon: Fuel,
      color: 'orange',
      enabled: isAppEnabled('fuel_station'),
      comingSoon: true,
      features: ['Pump management', 'Pricing control', 'Customer loyalty', 'Shift reports'],
    },
    {
      id: 'transportation',
      name: 'Transportation',
      description: 'Full transportation management with driver apps, route tracking, and passenger payments',
      icon: Truck,
      color: 'blue',
      enabled: isAppEnabled('transportation'),
      requiresPlus: true, // Merchant+ feature
      path: '/merchant/apps/transportation',
      features: ['Driver app', 'Route tracking', 'Passenger payments', 'Fleet management'],
    },
  ];

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500">Manage your merchant account settings</p>
          </div>
          {showSaveSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Settings saved successfully</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs */}
          <Card className="p-4 lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                    {tab.id === 'developer' && isDeveloperMode && (
                      <span className="ml-auto px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                        ON
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </Card>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'general' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6">Business Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={settings.businessName}
                      onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={settings.businessEmail}
                      onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Phone
                    </label>
                    <input
                      type="tel"
                      value={settings.businessPhone}
                      onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Address
                    </label>
                    <textarea
                      value={settings.businessAddress}
                      onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* Push Notifications */}
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Push Notifications</h2>
                      <p className="text-sm text-gray-500">Get instant alerts on your device</p>
                    </div>
                  </div>
                  <NotificationSettings />
                </Card>

                {/* Email Notifications */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-6">Email Notifications</h2>
                  <div className="space-y-4">
                    {[
                      { key: 'notifyTransactions', label: 'Transaction Notifications', desc: 'Receive emails for every transaction' },
                      { key: 'notifyPayouts', label: 'Payout Notifications', desc: 'Get notified when payouts are processed' },
                      { key: 'notifyDisputes', label: 'Dispute Alerts', desc: 'Immediate alerts for chargebacks and disputes' },
                      { key: 'notifyWeeklyReport', label: 'Weekly Reports', desc: 'Receive weekly business summary emails' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key as keyof typeof settings] })}
                          className="text-gray-600"
                        >
                          {settings[item.key as keyof typeof settings] ? (
                            <ToggleRight className="w-10 h-10 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-10 h-10" />
                          )}
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'security' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6">Security Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, twoFactorEnabled: !settings.twoFactorEnabled })}
                      className="text-gray-600"
                    >
                      {settings.twoFactorEnabled ? (
                        <ToggleRight className="w-10 h-10 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-10 h-10" />
                      )}
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Whitelist (Optional)
                    </label>
                    <textarea
                      value={settings.ipWhitelist}
                      onChange={(e) => setSettings({ ...settings, ipWhitelist: e.target.value })}
                      placeholder="Enter IP addresses, one per line"
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Only allow API access from these IP addresses
                    </p>
                  </div>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </Card>
            )}

            {activeTab === 'apps' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Boxes className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Merchant Apps</h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        Enable apps to add them to your sidebar. Disabled apps won't appear in navigation.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {availableApps.map((app) => {
                      const Icon = app.icon;
                      const colorClasses = {
                        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                        indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                        teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
                        cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
                        slate: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400',
                      };

                      return (
                        <div
                          key={app.id}
                          className={`border rounded-xl p-5 transition-all ${
                            app.enabled
                              ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-lg ${colorClasses[app.color as keyof typeof colorClasses]}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-white">{app.name}</h3>
                                  {app.comingSoon && (
                                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                      Coming Soon
                                    </span>
                                  )}
                                  {app.requiresPlus && (
                                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-200 to-orange-200 dark:from-amber-900/50 dark:to-orange-900/50 text-amber-700 dark:text-amber-400 text-xs rounded-full flex items-center gap-1">
                                      <Crown className="w-3 h-3" />
                                      Merchant+
                                    </span>
                                  )}
                                  {app.enabled && !app.comingSoon && !app.requiresPlus && (
                                    <span className="px-2 py-0.5 bg-green-200 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs rounded-full">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{app.description}</p>

                                {/* Features */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {app.features.map((feature, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded border dark:border-gray-700"
                                    >
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Actions - Toggle, Pin, and Open */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Pin to Sidebar Button - only for enabled apps */}
                              {app.enabled && !app.comingSoon && !app.requiresPlus && (
                                <button
                                  onClick={() => toggleAppPin(app.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isAppPinned(app.id)
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                  title={isAppPinned(app.id) ? 'Unpin from sidebar' : 'Pin to sidebar'}
                                >
                                  {isAppPinned(app.id) ? (
                                    <Pin className="w-4 h-4" />
                                  ) : (
                                    <PinOff className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {/* Toggle Switch - not for comingSoon or requiresPlus */}
                              {!app.comingSoon && !app.requiresPlus && (
                                <button
                                  onClick={() => handleToggleApp(app.id)}
                                  className="text-gray-600 dark:text-gray-400"
                                  title={app.enabled ? 'Disable app' : 'Enable app'}
                                >
                                  {app.enabled ? (
                                    <ToggleRight className="w-10 h-10 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <ToggleLeft className="w-10 h-10" />
                                  )}
                                </button>
                              )}

                              {/* Open App Button */}
                              {app.enabled && app.path && !app.comingSoon && !app.requiresPlus ? (
                                <Button
                                  onClick={() => navigate(app.path!)}
                                  size="sm"
                                >
                                  Open
                                  <ExternalLink className="w-3 h-3 ml-2" />
                                </Button>
                              ) : app.comingSoon ? (
                                <Button variant="outline" size="sm" disabled>
                                  Coming Soon
                                </Button>
                              ) : app.requiresPlus ? (
                                <Button
                                  onClick={() => navigate('/merchant/upgrade')}
                                  size="sm"
                                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                >
                                  <Crown className="w-3 h-3 mr-2" />
                                  Upgrade
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Info Card */}
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        How Apps Work
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Enabled apps appear in the "Apps" section of your sidebar. Use the <Pin className="w-3 h-3 inline mx-1" /> pin button to add apps directly to your main sidebar for quick access.
                        Your data is preserved even when apps are disabled.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Quick Access - only show if at least one app is enabled */}
                {availableApps.some(app => app.enabled && !app.comingSoon) && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {isAppEnabled('terminal') && (
                        <button
                          onClick={() => navigate('/merchant/terminal')}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Nfc className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Payment Terminal</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Accept NFC payments</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                        </button>
                      )}
                      {isAppEnabled('driver_wallet') && (
                        <button
                          onClick={() => navigate('/merchant/driver-wallet')}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                            <Wallet className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Driver Wallet</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Collect from drivers</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                        </button>
                      )}
                      {isAppEnabled('payment_links') && (
                        <button
                          onClick={() => navigate('/merchant/payment-links')}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                            <Link2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Payment Links</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Create payment links</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                        </button>
                      )}
                      {isAppEnabled('invoices') && (
                        <button
                          onClick={() => navigate('/merchant/invoices')}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
                            <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Invoices</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Manage invoices</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                        </button>
                      )}
                      {isAppEnabled('pos') && (
                        <button
                          onClick={() => navigate('/merchant/apps/pos')}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">POS Terminal</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Start selling</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                        </button>
                      )}
                      {isAppEnabled('events') && (
                        <button
                          onClick={() => navigate('/merchant/apps/events')}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Events</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Manage events</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                        </button>
                      )}
                    </div>
                  </Card>
                )}

                {/* Merchant+ Exclusive Apps */}
                <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/30">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">Merchant+ Exclusive Apps</h3>
                        <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full">
                          PRO
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Unlock advanced business tools with Merchant+ subscription
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Transportation */}
                    <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-amber-200/50 dark:border-amber-700/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">Transportation</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Full fleet management with driver apps
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Driver App</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Route Tracking</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Fleet Analytics</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Branch */}
                    <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-amber-200/50 dark:border-amber-700/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">Multi-Branch Management</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Manage multiple business locations
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Branch Analytics</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Staff Roles</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Unified Reports</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Analytics */}
                    <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-amber-200/50 dark:border-amber-700/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                          <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">Advanced Inventory</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Supplier management & auto-ordering
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Suppliers</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Auto-Order</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Stock Alerts</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* API Access */}
                    <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-amber-200/50 dark:border-amber-700/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">Full API Access</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Custom integrations & webhooks
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">REST API</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">Webhooks</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded">SDK</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      onClick={() => window.open('https://plus.peeap.com', '_blank')}
                      className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/30"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Merchant+
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                      Starting at Le 50,000/month. Cancel anytime.
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'theme' && (
              <Card className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <Palette className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Color Theme</h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Choose your preferred color theme for cards and UI elements in your merchant dashboard.
                    </p>
                  </div>
                </div>

                <ThemeColorSelector type="merchant" />
              </Card>
            )}

            {activeTab === 'nfc' && (
              <NFCAgentSettings />
            )}

            {activeTab === 'developer' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <Code2 className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Developer Mode</h2>
                        <p className="text-gray-500 mt-1">
                          Enable developer mode to access API keys, webhooks, SDK documentation, and developer tools.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleDeveloperMode}
                      className="text-gray-600"
                    >
                      {isDeveloperMode ? (
                        <ToggleRight className="w-12 h-12 text-indigo-600" />
                      ) : (
                        <ToggleLeft className="w-12 h-12" />
                      )}
                    </button>
                  </div>
                </Card>

                {isDeveloperMode ? (
                  <>
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-indigo-900">Developer Mode is Active</p>
                        <p className="text-sm text-indigo-700 mt-1">
                          You now have access to the Developer section in your sidebar. Navigate there to manage API keys, webhooks, and view documentation.
                        </p>
                      </div>
                    </div>

                    <Card className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">What you can do with Developer Mode:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <div className="p-2 bg-indigo-100 rounded">
                            <CreditCard className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">API Keys</p>
                            <p className="text-xs text-gray-500">Generate and manage API credentials</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <div className="p-2 bg-indigo-100 rounded">
                            <Bell className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Webhooks</p>
                            <p className="text-xs text-gray-500">Configure event notifications</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <div className="p-2 bg-indigo-100 rounded">
                            <Settings className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Sandbox Testing</p>
                            <p className="text-xs text-gray-500">Test your integration safely</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <div className="p-2 bg-indigo-100 rounded">
                            <Code2 className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">SDK & Documentation</p>
                            <p className="text-xs text-gray-500">Access code samples and guides</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </>
                ) : (
                  <Card className="p-6">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Code2 className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Developer Mode is Disabled</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Enable developer mode to access API integration features, webhooks, and SDK documentation.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* App Setup Wizard Modal */}
      {setupWizardApp && (
        <AppSetupWizard
          appId={setupWizardApp}
          isOpen={true}
          onClose={() => {
            setSetupWizardApp(null);
            setExistingWalletInfo(null);
            setWasSetupBefore(false);
          }}
          onComplete={() => {
            setSetupWizardApp(null);
            setExistingWalletInfo(null);
            setWasSetupBefore(false);
            refreshApps();
          }}
          existingWallet={existingWalletInfo}
          wasSetupBefore={wasSetupBefore}
        />
      )}
    </MerchantLayout>
  );
}
