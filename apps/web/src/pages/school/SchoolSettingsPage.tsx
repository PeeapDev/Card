import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Settings,
  ArrowLeft,
  Building2,
  Palette,
  Globe,
  Shield,
  Bell,
  Save,
  Copy,
  Check,
  CreditCard,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Users,
  Receipt,
  Bus,
  Store,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { SchoolLayout } from '@/components/school';
import { supabaseAdmin } from '@/lib/supabase';

interface PeeapConnection {
  connected: boolean;
  schoolId?: string;
  schoolName?: string;
  connectedAt?: string;
  lastSync?: string;
  syncSettings: {
    students: boolean;
    fees: boolean;
    transport: boolean;
    vendors: boolean;
  };
  stats?: {
    studentsLinked: number;
    walletsActive: number;
    transactionsToday: number;
  };
}

interface SchoolData {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
}

export function SchoolSettingsPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [activeTab, setActiveTab] = useState('general');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // School data from database/SaaS
  const [schoolData, setSchoolData] = useState<SchoolData>({
    name: '',
    type: 'Secondary School',
    address: '',
    phone: '',
    email: '',
    logoUrl: null,
  });

  // Connection state from database
  const [peeapConnection, setPeeapConnection] = useState<PeeapConnection>({
    connected: false,
    syncSettings: {
      students: false,
      fees: false,
      transport: false,
      vendors: false,
    },
  });

  // Fetch school connection and data on mount
  useEffect(() => {
    const fetchSchoolData = async () => {
      setLoading(true);
      try {
        const domain = schoolSlug || localStorage.getItem('school_domain');
        if (!domain) return;

        // Fetch from Supabase school_connections
        const { data: connection } = await supabaseAdmin
          .from('school_connections')
          .select('*')
          .eq('peeap_school_id', domain)
          .maybeSingle();

        if (connection) {
          const settings = connection.settings || {};
          const stats = connection.stats || {};

          setPeeapConnection({
            connected: true,
            schoolId: connection.school_id,
            schoolName: connection.school_name,
            connectedAt: connection.connected_at,
            lastSync: connection.last_sync_at,
            syncSettings: {
              students: settings.auto_sync_students ?? true,
              fees: settings.sync_fee_payments ?? true,
              transport: settings.sync_transport_payments ?? true,
              vendors: settings.enable_vendor_payments ?? true,
            },
            stats: {
              studentsLinked: stats.students_linked || 0,
              walletsActive: stats.wallets_active || 0,
              transactionsToday: stats.transactions_today || 0,
            },
          });

          setSchoolData({
            name: connection.school_name || '',
            type: settings.school_type || 'Secondary School',
            address: settings.address || '',
            phone: settings.phone || '',
            email: connection.connected_by_email || '',
            logoUrl: connection.school_logo_url,
          });
        }

        // Also try to fetch from SaaS API for latest data
        try {
          const response = await fetch(`https://${domain}.gov.school.edu.sl/api/peeap/school-info`);
          if (response.ok) {
            const result = await response.json();
            const saasData = result.data || result;
            setSchoolData(prev => ({
              ...prev,
              name: saasData.school_name || prev.name,
              type: saasData.school_type || prev.type,
              address: saasData.address || prev.address,
              phone: saasData.phone || prev.phone,
              email: saasData.email || prev.email,
            }));
          }
        } catch (e) {
          console.log('Could not fetch from SaaS API');
        }
      } catch (err) {
        console.error('Error fetching school data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [schoolSlug]);

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'integration', label: 'Integration', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectPeeap = async () => {
    setConnecting(true);
    // In real app, redirect to Peeap OAuth
    // window.location.href = 'https://peeap.com/oauth/authorize?client_id=SCHOOL_CLIENT&redirect_uri=...';

    // Mock: simulate OAuth callback
    setTimeout(() => {
      setPeeapConnection({
        connected: true,
        schoolId: 'school_001',
        schoolName: 'Government Secondary School',
        connectedAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        syncSettings: {
          students: true,
          fees: true,
          transport: true,
          vendors: true,
        },
        stats: {
          studentsLinked: 0,
          walletsActive: 0,
          transactionsToday: 0,
        },
      });
      setConnecting(false);
    }, 2000);
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from Peeap? Students will no longer be able to make payments.')) {
      setPeeapConnection({
        connected: false,
        syncSettings: {
          students: false,
          fees: false,
          transport: false,
          vendors: false,
        },
      });
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    // In real app, call API to trigger sync
    setTimeout(() => {
      setPeeapConnection(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
      }));
      setSyncing(false);
    }, 2000);
  };

  const handleToggleSync = (key: keyof PeeapConnection['syncSettings']) => {
    setPeeapConnection(prev => ({
      ...prev,
      syncSettings: {
        ...prev.syncSettings,
        [key]: !prev.syncSettings[key],
      },
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const widgetCode = `<div id="peeap-wallet"></div>
<script src="https://js.peeap.com/widget.js"></script>
<script>
  PeeapWidget.init({
    schoolId: '${peeapConnection.schoolId || 'YOUR_SCHOOL_ID'}',
    container: '#peeap-wallet'
  });
</script>`;

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="mb-6">
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Tabs */}
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

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          School Name
                        </label>
                        <input
                          type="text"
                          value={schoolData.name}
                          onChange={(e) => setSchoolData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          School Type
                        </label>
                        <select
                          value={schoolData.type}
                          onChange={(e) => setSchoolData(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option>Secondary School</option>
                          <option>Primary School</option>
                          <option>University</option>
                          <option>Vocational School</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address
                        </label>
                        <textarea
                          value={schoolData.address}
                          onChange={(e) => setSchoolData(prev => ({ ...prev, address: e.target.value }))}
                          rows={2}
                          placeholder="Enter school address"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={schoolData.phone}
                            onChange={(e) => setSchoolData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+232..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={schoolData.email}
                            onChange={(e) => setSchoolData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Payment Settings - Peeap Connection */}
              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Settings</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Connect your school to Peeap for cashless payments
                      </p>
                    </div>
                    {peeapConnection.connected && (
                      <a
                        href="https://docs.peeap.com/api-reference/schools"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        API Docs
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Connection Status Card */}
                  <div className={`p-6 rounded-xl border-2 ${
                    peeapConnection.connected
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                          peeapConnection.connected
                            ? 'bg-green-100 dark:bg-green-900/50'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <img
                            src="/peeap-logo.svg"
                            alt="Peeap"
                            className="w-10 h-10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <CreditCard className={`w-8 h-8 hidden ${
                            peeapConnection.connected ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                              Peeap Payments
                            </h3>
                            {peeapConnection.connected ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                Connected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                                <AlertCircle className="h-3 w-3" />
                                Not Connected
                              </span>
                            )}
                          </div>
                          {peeapConnection.connected ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Connected as <span className="font-medium">{peeapConnection.schoolName}</span>
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Enable cashless payments for students and staff
                            </p>
                          )}
                        </div>
                      </div>

                      {peeapConnection.connected ? (
                        <button
                          onClick={handleDisconnect}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Unlink className="h-4 w-4" />
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectPeeap}
                          disabled={connecting}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Link2 className="h-4 w-4" />
                              Connect with Peeap
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {peeapConnection.connected && peeapConnection.connectedAt && (
                      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Connected:</span>{' '}
                          <span className="text-gray-700 dark:text-gray-300">{formatDate(peeapConnection.connectedAt)}</span>
                        </div>
                        {peeapConnection.lastSync && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Last sync:</span>{' '}
                            <span className="text-gray-700 dark:text-gray-300">{formatDate(peeapConnection.lastSync)}</span>
                            <button
                              onClick={handleSyncNow}
                              disabled={syncing}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            >
                              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats - Only show when connected */}
                  {peeapConnection.connected && peeapConnection.stats && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {peeapConnection.stats.studentsLinked}
                            </p>
                            <p className="text-sm text-gray-500">Students Linked</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {peeapConnection.stats.walletsActive}
                            </p>
                            <p className="text-sm text-gray-500">Active Wallets</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {peeapConnection.stats.transactionsToday}
                            </p>
                            <p className="text-sm text-gray-500">Today's Transactions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sync Settings - Only show when connected */}
                  {peeapConnection.connected && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Data Sync Settings</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Choose what data to sync between your school system and Peeap
                      </p>

                      <div className="space-y-4">
                        {[
                          { key: 'students' as const, label: 'Students', desc: 'Sync student records and link wallets', icon: Users },
                          { key: 'fees' as const, label: 'Fees', desc: 'Sync fee structures and payment status', icon: Receipt },
                          { key: 'transport' as const, label: 'Transport', desc: 'Sync bus routes and transport payments', icon: Bus },
                          { key: 'vendors' as const, label: 'Vendors', desc: 'Sync approved vendors and products', icon: Store },
                        ].map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                                <item.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleSync(item.key)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                peeapConnection.syncSettings[item.key]
                                  ? 'bg-blue-600'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  peeapConnection.syncSettings[item.key] ? 'left-7' : 'left-1'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Not Connected Info */}
                  {!peeapConnection.connected && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                        Why connect with Peeap?
                      </h3>
                      <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Cashless payments for students at school vendors
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Parents can top up wallets and pay fees remotely
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Real-time transaction notifications
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          No API keys needed - secure SSO connection
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Use your existing student QR codes
                        </li>
                      </ul>
                    </div>
                  )}
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

              {/* Branding Settings */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Branding</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customize how your school appears in Peeap
                  </p>

                  {/* School Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      School Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                        {schoolData.logoUrl ? (
                          <img src={schoolData.logoUrl} alt="School logo" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Building2 className="h-10 w-10 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          Upload Logo
                        </button>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB. 200x200px recommended.</p>
                      </div>
                    </div>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        defaultValue="#2563eb"
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        defaultValue="#2563eb"
                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Used for buttons and accents in the payment UI</p>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Display Name (for receipts)
                    </label>
                    <input
                      type="text"
                      value={schoolData.name}
                      onChange={(e) => setSchoolData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Save className="h-4 w-4" />
                    Save Branding
                  </button>
                </div>
              )}

              {/* Security & Notifications show placeholder */}
              {(activeTab === 'security' || activeTab === 'notifications') && (
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
    </SchoolLayout>
  );
}
