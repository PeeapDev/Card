import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  ArrowLeft,
  Building2,
  Palette,
  Globe,
  Key,
  Shield,
  Bell,
  Save,
  Copy,
  Check
} from 'lucide-react';

export function SchoolSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'integration', label: 'Integration', icon: Globe },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const widgetCode = `<div id="peeap-wallet"></div>
<script src="https://js.peeap.com/widget.js"></script>
<script>
  PeeapWidget.init({
    partnerId: 'partner_abc123',
    container: '#peeap-wallet'
  });
</script>`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/school" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage your school's Peeap configuration
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">General Settings</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      School Name
                    </label>
                    <input
                      type="text"
                      defaultValue="ABC Academy"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      School Type
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option>Secondary School</option>
                      <option>Primary School</option>
                      <option>University</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <textarea
                      defaultValue="123 Education Street, Freetown"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              )}

              {/* Integration Settings */}
              {activeTab === 'integration' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Integration</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add this code to your student portal to enable wallet integration.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Widget Code
                    </label>
                    <div className="relative">
                      <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                        <code>{widgetCode}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(widgetCode)}
                        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Allowed Origins
                    </label>
                    <input
                      type="text"
                      defaultValue="https://portal.abcacademy.edu"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only requests from these origins will be accepted
                    </p>
                  </div>
                </div>
              )}

              {/* API Keys */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h2>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Keep your API keys secure. Do not share them publicly.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Partner ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value="partner_abc123xyz789"
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard('partner_abc123xyz789')}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Secret Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value="sk_live_xxxxxxxxxxxxxxxx"
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                      />
                      <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                    Regenerate Keys
                  </button>
                </div>
              )}

              {/* Other tabs show placeholder */}
              {(activeTab === 'branding' || activeTab === 'security' || activeTab === 'notifications') && (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
