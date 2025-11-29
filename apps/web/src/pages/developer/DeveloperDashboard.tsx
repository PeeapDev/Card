import { useState } from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DeveloperLayout } from '@/components/layout/DeveloperLayout';

export function DeveloperDashboard() {
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
    <DeveloperLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Dashboard</h1>
            <p className="text-gray-500">Manage your API integration</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              API Docs
            </button>
            <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              API Console
            </button>
          </div>
        </div>

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
                <code className="flex-1 text-sm bg-white px-3 py-2 rounded border font-mono">
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
                <code className="flex-1 text-sm bg-white px-3 py-2 rounded border font-mono">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        {/* Recent API Requests */}
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
                  npm install @paymentsystem/sdk
                </code>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Initialize</p>
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
{`import { PaymentSystem } from '@paymentsystem/sdk';

const client = new PaymentSystem({
  apiKey: 'your-api-key'
});`}
                </pre>
              </div>
              <a href="/docs" className="block text-center py-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                View Full Documentation →
              </a>
            </div>
          </Card>
        </div>
      </div>
    </DeveloperLayout>
  );
}
