import { useState } from 'react';
import {
  TestTube,
  Play,
  RotateCcw,
  CreditCard,
  DollarSign,
  MapPin,
  Store,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface SimulationResult {
  id: string;
  type: string;
  status: 'success' | 'failed' | 'pending';
  request: object;
  response: object;
  timestamp: string;
  duration: number;
}

export function SimulatorPage() {
  const [activeTab, setActiveTab] = useState<'authorization' | 'clearing' | 'refund' | 'reversal'>('authorization');
  const [isLoading, setIsLoading] = useState(false);

  const [authForm, setAuthForm] = useState({
    cardId: 'card_test_1234567890',
    amount: '100.00',
    currency: 'USD',
    merchantName: 'Test Merchant',
    merchantCategory: '5411',
    merchantCity: 'New York',
    merchantCountry: 'US',
    authorizationType: 'purchase',
  });

  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([
    {
      id: 'sim_001',
      type: 'Authorization',
      status: 'success',
      request: { cardId: 'card_test_123', amount: 50.00, merchant: 'Coffee Shop' },
      response: { approved: true, authorizationCode: 'AUTH123', balance: 950.00 },
      timestamp: '2024-01-15T10:30:00Z',
      duration: 145,
    },
    {
      id: 'sim_002',
      type: 'Clearing',
      status: 'success',
      request: { authorizationId: 'auth_456', finalAmount: 48.50 },
      response: { cleared: true, transactionId: 'txn_789' },
      timestamp: '2024-01-15T10:28:00Z',
      duration: 89,
    },
    {
      id: 'sim_003',
      type: 'Authorization',
      status: 'failed',
      request: { cardId: 'card_test_999', amount: 5000.00, merchant: 'Unknown' },
      response: { approved: false, declineReason: 'INSUFFICIENT_FUNDS' },
      timestamp: '2024-01-15T10:25:00Z',
      duration: 67,
    },
  ]);

  const merchantCategories = [
    { code: '5411', name: 'Grocery Stores' },
    { code: '5812', name: 'Restaurants' },
    { code: '5912', name: 'Drug Stores' },
    { code: '5541', name: 'Gas Stations' },
    { code: '5311', name: 'Department Stores' },
    { code: '5999', name: 'Miscellaneous Retail' },
    { code: '7011', name: 'Hotels & Lodging' },
    { code: '4111', name: 'Transportation' },
    { code: '6011', name: 'ATM/Cash Withdrawal' },
    { code: '7995', name: 'Gambling' },
  ];

  const handleSimulate = async () => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newResult: SimulationResult = {
      id: `sim_${Date.now()}`,
      type: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
      status: Math.random() > 0.2 ? 'success' : 'failed',
      request: {
        cardId: authForm.cardId,
        amount: parseFloat(authForm.amount),
        currency: authForm.currency,
        merchant: {
          name: authForm.merchantName,
          category: authForm.merchantCategory,
          city: authForm.merchantCity,
          country: authForm.merchantCountry,
        },
        type: authForm.authorizationType,
      },
      response: Math.random() > 0.2
        ? {
            approved: true,
            authorizationCode: `AUTH${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            balance: 1000 - parseFloat(authForm.amount),
            message: 'Transaction approved',
          }
        : {
            approved: false,
            declineCode: 'INSUFFICIENT_FUNDS',
            message: 'Transaction declined due to insufficient funds',
          },
      timestamp: new Date().toISOString(),
      duration: Math.floor(Math.random() * 200) + 50,
    };

    setSimulationResults([newResult, ...simulationResults]);
    setIsLoading(false);
  };

  const handleReset = () => {
    setAuthForm({
      cardId: 'card_test_1234567890',
      amount: '100.00',
      currency: 'USD',
      merchantName: 'Test Merchant',
      merchantCategory: '5411',
      merchantCity: 'New York',
      merchantCountry: 'US',
      authorizationType: 'purchase',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Success</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Simulator</h1>
            <p className="text-gray-500">Test card transactions in sandbox environment</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
              <TestTube className="w-3 h-3" />
              Sandbox Mode
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Sandbox Environment</p>
              <p className="text-sm text-blue-700 mt-1">
                All transactions in the simulator are test transactions and do not affect real cards or accounts.
                Use test card IDs starting with "card_test_" for simulations.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulation Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Type Tabs */}
            <Card className="p-1">
              <div className="flex gap-1">
                {(['authorization', 'clearing', 'refund', 'reversal'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </Card>

            {/* Form */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {activeTab === 'authorization' && 'Simulate Authorization'}
                {activeTab === 'clearing' && 'Simulate Clearing'}
                {activeTab === 'refund' && 'Simulate Refund'}
                {activeTab === 'reversal' && 'Simulate Reversal'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    Card ID
                  </label>
                  <input
                    type="text"
                    value={authForm.cardId}
                    onChange={(e) => setAuthForm({ ...authForm, cardId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                    placeholder="card_test_1234567890"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={authForm.amount}
                    onChange={(e) => setAuthForm({ ...authForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="100.00"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <div className="relative">
                    <select
                      value={authForm.currency}
                      onChange={(e) => setAuthForm({ ...authForm, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Merchant Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Store className="w-4 h-4 inline mr-1" />
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    value={authForm.merchantName}
                    onChange={(e) => setAuthForm({ ...authForm, merchantName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Test Merchant"
                  />
                </div>

                {/* Merchant Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Category (MCC)</label>
                  <div className="relative">
                    <select
                      value={authForm.merchantCategory}
                      onChange={(e) => setAuthForm({ ...authForm, merchantCategory: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                    >
                      {merchantCategories.map((cat) => (
                        <option key={cat.code} value={cat.code}>
                          {cat.code} - {cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Merchant City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Merchant City
                  </label>
                  <input
                    type="text"
                    value={authForm.merchantCity}
                    onChange={(e) => setAuthForm({ ...authForm, merchantCity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="New York"
                  />
                </div>

                {/* Merchant Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Country</label>
                  <div className="relative">
                    <select
                      value={authForm.merchantCountry}
                      onChange={(e) => setAuthForm({ ...authForm, merchantCountry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                    >
                      <option value="US">United States</option>
                      <option value="NG">Nigeria</option>
                      <option value="GB">United Kingdom</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Authorization Type */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authorization Type</label>
                  <div className="flex gap-4">
                    {['purchase', 'atm_withdrawal', 'preauth', 'refund'].map((type) => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="authType"
                          value={type}
                          checked={authForm.authorizationType === type}
                          onChange={(e) => setAuthForm({ ...authForm, authorizationType: e.target.value })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSimulate}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Simulation
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </Card>
          </div>

          {/* Quick Test Cards */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Test Cards
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-green-600">Always Approved</span>
                    <button
                      onClick={() => {
                        setAuthForm({ ...authForm, cardId: 'card_test_approved' });
                        copyToClipboard('card_test_approved');
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  <code className="text-sm font-mono text-gray-700">card_test_approved</code>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-red-600">Always Declined</span>
                    <button
                      onClick={() => {
                        setAuthForm({ ...authForm, cardId: 'card_test_declined' });
                        copyToClipboard('card_test_declined');
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  <code className="text-sm font-mono text-gray-700">card_test_declined</code>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-yellow-600">Insufficient Funds</span>
                    <button
                      onClick={() => {
                        setAuthForm({ ...authForm, cardId: 'card_test_nsf' });
                        copyToClipboard('card_test_nsf');
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  <code className="text-sm font-mono text-gray-700">card_test_nsf</code>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-purple-600">Requires 3DS</span>
                    <button
                      onClick={() => {
                        setAuthForm({ ...authForm, cardId: 'card_test_3ds' });
                        copyToClipboard('card_test_3ds');
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  <code className="text-sm font-mono text-gray-700">card_test_3ds</code>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-orange-600">Card Frozen</span>
                    <button
                      onClick={() => {
                        setAuthForm({ ...authForm, cardId: 'card_test_frozen' });
                        copyToClipboard('card_test_frozen');
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  <code className="text-sm font-mono text-gray-700">card_test_frozen</code>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Response Codes</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">00</span>
                  <span className="text-green-600">Approved</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">51</span>
                  <span className="text-red-600">Insufficient Funds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">05</span>
                  <span className="text-red-600">Do Not Honor</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">14</span>
                  <span className="text-red-600">Invalid Card</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">54</span>
                  <span className="text-red-600">Expired Card</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">62</span>
                  <span className="text-red-600">Restricted Card</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Simulation Results */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Simulation History</h2>
            <button className="text-sm text-gray-500 hover:text-gray-700">Clear History</button>
          </div>
          <div className="divide-y divide-gray-200">
            {simulationResults.map((result) => (
              <div key={result.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-500">{result.id}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {result.type}
                    </span>
                    {getStatusBadge(result.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{result.duration}ms</span>
                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Request</p>
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                      {JSON.stringify(result.request, null, 2)}
                    </pre>
                  </div>
                  <div className="p-3 bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Response</p>
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
