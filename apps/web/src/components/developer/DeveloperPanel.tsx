import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Key,
  Activity,
  BookOpen,
  Terminal,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Webhook,
  Zap,
  Plus,
  Trash2,
  ExternalLink,
  Code,
  FileCode,
  TestTube,
  Play,
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Developer Dashboard Overview
export function DeveloperOverview() {
  const [showSecret, setShowSecret] = useState(false);
  const [apiKeys] = useState({
    publicKey: 'pk_live_51234567890abcdefghij',
    secretKey: 'sk_live_abcdefghij1234567890xyz',
    testPublicKey: 'pk_test_98765432109876543210',
    testSecretKey: 'sk_test_zyxwvutsrqpo0987654321',
  });

  const [stats] = useState({
    totalRequests: 45672,
    successRate: 99.2,
    avgLatency: 145,
    activeWebhooks: 3,
  });

  const [recentRequests] = useState([
    { id: 1, endpoint: 'POST /v1/cards', status: 200, latency: 123, time: '2 mins ago' },
    { id: 2, endpoint: 'GET /v1/wallets', status: 200, latency: 89, time: '5 mins ago' },
    { id: 3, endpoint: 'POST /v1/transactions', status: 400, latency: 45, time: '8 mins ago' },
    { id: 4, endpoint: 'GET /v1/users/me', status: 200, latency: 67, time: '12 mins ago' },
    { id: 5, endpoint: 'POST /v1/webhooks', status: 201, latency: 234, time: '15 mins ago' },
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* API Keys */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            API Keys
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Live Mode
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Publishable Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-white px-3 py-2 rounded border font-mono truncate">
                {apiKeys.publicKey}
              </code>
              <button
                onClick={() => copyToClipboard(apiKeys.publicKey)}
                className="p-2 hover:bg-gray-200 rounded"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Secret Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-white px-3 py-2 rounded border font-mono truncate">
                {showSecret ? apiKeys.secretKey : '••••••••••••••••••••••••'}
              </code>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-2 hover:bg-gray-200 rounded"
              >
                {showSecret ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={() => copyToClipboard(apiKeys.secretKey)}
                className="p-2 hover:bg-gray-200 rounded"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Never share your secret key publicly. Use environment variables in production.
          </p>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Requests</p>
              <p className="text-xl font-semibold">{stats.totalRequests.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-xl font-semibold">{stats.successRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Zap className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Latency</p>
              <p className="text-xl font-semibold">{stats.avgLatency}ms</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Webhook className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Webhooks</p>
              <p className="text-xl font-semibold">{stats.activeWebhooks}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Requests & Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent API Requests</h2>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <div className="space-y-3">
            {recentRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    req.status >= 200 && req.status < 300 ? 'bg-green-100 text-green-700' :
                    req.status >= 400 ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {req.status}
                  </span>
                  <code className="text-sm font-mono text-gray-700">{req.endpoint}</code>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{req.latency}ms</span>
                  <span>{req.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Install SDK</p>
              <code className="text-sm text-green-400 font-mono">
                npm install @softtouch/sdk
              </code>
            </div>
            <div className="p-4 bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Initialize</p>
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`import { SoftTouchSDK } from '@softtouch/sdk';

const sdk = new SoftTouchSDK({
  apiKey: 'your-api-key',
  environment: 'sandbox'
});`}
              </pre>
            </div>
            <a href="/docs" className="block text-center py-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              View Full Documentation
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

// API Keys Management
export function ApiKeysPanel() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [apiKeys] = useState([
    { id: 'key_1', name: 'Production Key', type: 'live', publicKey: 'pk_live_51234567890abcdefghij', secretKey: 'sk_live_abcdefghij1234567890xyz', created: '2024-01-15', lastUsed: '2 hours ago' },
    { id: 'key_2', name: 'Test Key', type: 'test', publicKey: 'pk_test_98765432109876543210', secretKey: 'sk_test_zyxwvutsrqpo0987654321', created: '2024-01-10', lastUsed: '5 mins ago' },
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-gray-500">Manage your API credentials</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create New Key
        </button>
      </div>

      <div className="space-y-4">
        {apiKeys.map((key) => (
          <Card key={key.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${key.type === 'live' ? 'bg-green-100' : 'bg-amber-100'}`}>
                  <Key className={`w-5 h-5 ${key.type === 'live' ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{key.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    key.type === 'live' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {key.type === 'live' ? 'Live' : 'Test'}
                  </span>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Publishable Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded border font-mono truncate">
                    {key.publicKey}
                  </code>
                  <button onClick={() => copyToClipboard(key.publicKey)} className="p-2 hover:bg-gray-100 rounded">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Secret Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded border font-mono truncate">
                    {showSecrets[key.id] ? key.secretKey : '••••••••••••••••••••••••'}
                  </code>
                  <button onClick={() => toggleSecret(key.id)} className="p-2 hover:bg-gray-100 rounded">
                    {showSecrets[key.id] ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                  </button>
                  <button onClick={() => copyToClipboard(key.secretKey)} className="p-2 hover:bg-gray-100 rounded">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
              <span>Created: {key.created}</span>
              <span>Last used: {key.lastUsed}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Webhooks Management
export function WebhooksPanel() {
  const [webhooks] = useState([
    { id: 'wh_1', url: 'https://example.com/webhooks/payments', events: ['payment.completed', 'payment.failed'], status: 'active', lastTriggered: '5 mins ago' },
    { id: 'wh_2', url: 'https://api.myapp.com/hooks/cards', events: ['card.created', 'card.frozen'], status: 'active', lastTriggered: '2 hours ago' },
    { id: 'wh_3', url: 'https://test.example.com/webhook', events: ['*'], status: 'disabled', lastTriggered: 'Never' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-gray-500">Configure webhook endpoints for event notifications</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Endpoint
        </button>
      </div>

      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${webhook.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Webhook className={`w-5 h-5 ${webhook.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <code className="text-sm font-mono">{webhook.url}</code>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map((event, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  webhook.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {webhook.status}
                </span>
                <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              Last triggered: {webhook.lastTriggered}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Webhook Signature Verification</h3>
        <div className="p-4 bg-gray-900 rounded-lg">
          <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`// Verify webhook signature
const isValid = sdk.webhooks.verifySignature({
  payload: req.body,
  signature: req.headers['x-webhook-signature'],
  secret: process.env.WEBHOOK_SECRET
});`}
          </pre>
        </div>
      </Card>
    </div>
  );
}

// Request Logs
export function RequestLogsPanel() {
  const [logs] = useState([
    { id: 1, method: 'POST', endpoint: '/v1/payments/charge', status: 200, latency: 245, time: '2024-01-20 14:32:15', requestId: 'req_abc123' },
    { id: 2, method: 'GET', endpoint: '/v1/wallets/balance', status: 200, latency: 89, time: '2024-01-20 14:31:42', requestId: 'req_def456' },
    { id: 3, method: 'POST', endpoint: '/v1/cards/virtual', status: 400, latency: 156, time: '2024-01-20 14:30:18', requestId: 'req_ghi789' },
    { id: 4, method: 'GET', endpoint: '/v1/transactions', status: 200, latency: 312, time: '2024-01-20 14:28:55', requestId: 'req_jkl012' },
    { id: 5, method: 'POST', endpoint: '/v1/transfers', status: 201, latency: 423, time: '2024-01-20 14:27:33', requestId: 'req_mno345' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Request Logs</h2>
          <p className="text-sm text-gray-500">Monitor your API requests</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Methods</option>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Status</option>
            <option>2xx Success</option>
            <option>4xx Client Error</option>
            <option>5xx Server Error</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    log.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                    log.method === 'POST' ? 'bg-green-100 text-green-700' :
                    log.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {log.method}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm font-mono">{log.endpoint}</code>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    log.status >= 200 && log.status < 300 ? 'bg-green-100 text-green-700' :
                    log.status >= 400 && log.status < 500 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{log.latency}ms</td>
                <td className="px-6 py-4 text-sm text-gray-500">{log.time}</td>
                <td className="px-6 py-4">
                  <code className="text-xs text-gray-500">{log.requestId}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// Sandbox Panel
export function SandboxPanel() {
  const [selectedEndpoint, setSelectedEndpoint] = useState('wallet.getBalance');
  const [response, setResponse] = useState<string | null>(null);

  const endpoints = [
    { id: 'wallet.getBalance', name: 'Get Wallet Balance', method: 'GET' },
    { id: 'wallet.topUp', name: 'Top Up Wallet', method: 'POST' },
    { id: 'cards.createVirtual', name: 'Create Virtual Card', method: 'POST' },
    { id: 'payments.charge', name: 'Charge Payment', method: 'POST' },
    { id: 'transfers.send', name: 'Send Transfer', method: 'POST' },
  ];

  const runTest = () => {
    setResponse(JSON.stringify({
      success: true,
      data: {
        balance: 125000,
        currency: 'SLE',
        available: 120000,
        pending: 5000
      },
      requestId: 'req_sandbox_' + Date.now()
    }, null, 2));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">API Sandbox</h2>
        <p className="text-sm text-gray-500">Test API endpoints in a safe environment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Select Endpoint</h3>
          <div className="space-y-2">
            {endpoints.map((ep) => (
              <button
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                  selectedEndpoint === ep.id ? 'bg-indigo-50 border-2 border-indigo-500' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium text-sm">{ep.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  {ep.method}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={runTest}
            className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run Test
          </button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Response</h3>
          <div className="bg-gray-900 rounded-lg p-4 min-h-[300px]">
            {response ? (
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">{response}</pre>
            ) : (
              <p className="text-gray-500 text-sm">Run a test to see the response</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// SDK Documentation Panel
export function SDKDocsPanel() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const languages = [
    { id: 'javascript', name: 'JavaScript/Node.js' },
    { id: 'python', name: 'Python' },
    { id: 'go', name: 'Go' },
    { id: 'php', name: 'PHP' },
    { id: 'java', name: 'Java' },
  ];

  const codeExamples: Record<string, string> = {
    javascript: `import { SoftTouchSDK } from '@softtouch/sdk';

const sdk = new SoftTouchSDK({
  apiKey: process.env.SOFTTOUCH_API_KEY,
  environment: 'sandbox'
});

// Get wallet balance
const balance = await sdk.wallet.getBalance();
console.log(balance);

// Create virtual card
const card = await sdk.cards.createVirtual({
  spendingLimit: 500000,
  currency: 'SLE'
});

// Process payment
const payment = await sdk.payments.charge({
  amount: 25000,
  currency: 'SLE',
  customerId: 'cust_123'
});`,
    python: `from softtouch import SoftTouchSDK

sdk = SoftTouchSDK(
    api_key=os.environ['SOFTTOUCH_API_KEY'],
    environment='sandbox'
)

# Get wallet balance
balance = sdk.wallet.get_balance()
print(balance)

# Create virtual card
card = sdk.cards.create_virtual(
    spending_limit=500000,
    currency='SLE'
)

# Process payment
payment = sdk.payments.charge(
    amount=25000,
    currency='SLE',
    customer_id='cust_123'
)`,
    go: `package main

import (
    "github.com/softtouch/sdk-go"
)

func main() {
    client := softtouch.NewClient(
        os.Getenv("SOFTTOUCH_API_KEY"),
        softtouch.WithEnvironment("sandbox"),
    )

    // Get wallet balance
    balance, _ := client.Wallet.GetBalance()

    // Create virtual card
    card, _ := client.Cards.CreateVirtual(&softtouch.CardParams{
        SpendingLimit: 500000,
        Currency: "SLE",
    })

    // Process payment
    payment, _ := client.Payments.Charge(&softtouch.ChargeParams{
        Amount: 25000,
        Currency: "SLE",
        CustomerID: "cust_123",
    })
}`,
    php: `<?php
use SoftTouch\\SDK\\SoftTouchSDK;

$sdk = new SoftTouchSDK([
    'api_key' => getenv('SOFTTOUCH_API_KEY'),
    'environment' => 'sandbox'
]);

// Get wallet balance
$balance = $sdk->wallet->getBalance();

// Create virtual card
$card = $sdk->cards->createVirtual([
    'spending_limit' => 500000,
    'currency' => 'SLE'
]);

// Process payment
$payment = $sdk->payments->charge([
    'amount' => 25000,
    'currency' => 'SLE',
    'customer_id' => 'cust_123'
]);`,
    java: `import com.softtouch.sdk.SoftTouchSDK;

public class Main {
    public static void main(String[] args) {
        SoftTouchSDK sdk = new SoftTouchSDK.Builder()
            .apiKey(System.getenv("SOFTTOUCH_API_KEY"))
            .environment("sandbox")
            .build();

        // Get wallet balance
        Balance balance = sdk.wallet().getBalance();

        // Create virtual card
        Card card = sdk.cards().createVirtual(
            new VirtualCardParams()
                .setSpendingLimit(500000)
                .setCurrency("SLE")
        );

        // Process payment
        Payment payment = sdk.payments().charge(
            new ChargeParams()
                .setAmount(25000)
                .setCurrency("SLE")
                .setCustomerId("cust_123")
        );
    }
}`
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">SDK & Documentation</h2>
        <p className="text-sm text-gray-500">Code examples and integration guides</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4 border-b pb-4">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLanguage(lang.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedLanguage === lang.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">
            {codeExamples[selectedLanguage]}
          </pre>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileCode className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold">NPM Package</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">Install via npm or yarn</p>
          <code className="text-sm bg-gray-100 px-3 py-2 rounded block">npm install @softtouch/sdk</code>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold">API Reference</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">Complete API documentation</p>
          <a href="/docs" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View Docs <ExternalLink className="w-3 h-3" />
          </a>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Code className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold">GitHub</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">Source code and examples</p>
          <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </Card>
      </div>
    </div>
  );
}
