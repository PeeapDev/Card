import { useState } from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { useDeveloperMode } from '@/context/DeveloperModeContext';

export function MerchantSettingsPage() {
  const { isDeveloperMode, toggleDeveloperMode } = useDeveloperMode();
  const [activeTab, setActiveTab] = useState('general');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

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
    { id: 'developer', label: 'Developer Mode', icon: Code2 },
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
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { key: 'notifyTransactions', label: 'Transaction Notifications', desc: 'Receive alerts for every transaction' },
                    { key: 'notifyPayouts', label: 'Payout Notifications', desc: 'Get notified when payouts are processed' },
                    { key: 'notifyDisputes', label: 'Dispute Alerts', desc: 'Immediate alerts for chargebacks and disputes' },
                    { key: 'notifyWeeklyReport', label: 'Weekly Reports', desc: 'Receive weekly business summary emails' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
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
    </MerchantLayout>
  );
}
