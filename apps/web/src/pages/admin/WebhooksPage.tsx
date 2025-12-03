import { useState } from 'react';
import {
  Webhook,
  Plus,
  Settings,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  ChevronDown,
  Send,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  events: string[];
  status: 'active' | 'disabled' | 'failing';
  secret: string;
  createdAt: string;
  lastTriggered: string | null;
  successRate: number;
  totalDeliveries: number;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  statusCode: number | null;
  timestamp: string;
  duration: number | null;
  retries: number;
  payload: object;
  response: string | null;
}

export function WebhooksPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [webhooks] = useState<WebhookEndpoint[]>([]);

  const [deliveries] = useState<WebhookDelivery[]>([]);

  const eventTypes = [
    { category: 'Card', events: ['card.created', 'card.updated', 'card.activated', 'card.frozen', 'card.terminated'] },
    { category: 'Transaction', events: ['transaction.created', 'transaction.authorized', 'transaction.cleared', 'transaction.declined', 'transaction.reversed'] },
    { category: 'Customer', events: ['customer.created', 'customer.updated', 'customer.kyc.submitted', 'customer.kyc.approved', 'customer.kyc.rejected'] },
    { category: 'Account', events: ['account.created', 'account.funded', 'account.debited', 'account.closed'] },
    { category: 'Dispute', events: ['dispute.created', 'dispute.updated', 'dispute.won', 'dispute.lost'] },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Active</span>;
      case 'disabled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"><XCircle className="w-3 h-3" /> Disabled</span>;
      case 'failing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3" /> Failing</span>;
      default:
        return null;
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Success</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
      case 'retrying':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><RotateCcw className="w-3 h-3" /> Retrying</span>;
      default:
        return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
            <p className="text-gray-500">Manage webhook endpoints and monitor deliveries</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Endpoint
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Endpoints</p>
            <p className="text-2xl font-bold">{webhooks.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {webhooks.filter(w => w.status === 'active').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Failing</p>
            <p className="text-2xl font-bold text-red-600">
              {webhooks.filter(w => w.status === 'failing').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Deliveries (24h)</p>
            <p className="text-2xl font-bold">12,456</p>
          </Card>
        </div>

        {/* Webhook Endpoints */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Webhook Endpoints</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      webhook.status === 'active' ? 'bg-green-100' :
                      webhook.status === 'failing' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <Webhook className={`w-5 h-5 ${
                        webhook.status === 'active' ? 'text-green-600' :
                        webhook.status === 'failing' ? 'text-red-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-gray-900">{webhook.url}</code>
                        <button onClick={() => copyToClipboard(webhook.url)} className="p-1 hover:bg-gray-200 rounded">
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                        <a href={webhook.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-200 rounded">
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </a>
                      </div>
                      <p className="text-sm text-gray-500">{webhook.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(webhook.status)}
                    <div className="flex items-center gap-1">
                      <button className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
                        <Settings className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Events</p>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 3).map((event) => (
                        <span key={event} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {event}
                        </span>
                      ))}
                      {webhook.events.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          +{webhook.events.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                    <p className={`text-sm font-medium ${
                      webhook.successRate >= 95 ? 'text-green-600' :
                      webhook.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {webhook.successRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Deliveries</p>
                    <p className="text-sm font-medium">{webhook.totalDeliveries.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Signing Secret</p>
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono text-gray-600">
                        {showSecrets[webhook.id] ? webhook.secret : '••••••••••••••••'}
                      </code>
                      <button onClick={() => toggleSecretVisibility(webhook.id)} className="p-1 hover:bg-gray-200 rounded">
                        {showSecrets[webhook.id] ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
                      </button>
                      <button onClick={() => copyToClipboard(webhook.secret)} className="p-1 hover:bg-gray-200 rounded">
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedWebhook(webhook)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    View Deliveries
                  </button>
                  <button className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    Send Test Event
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Deliveries */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Deliveries</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-primary-500">
                  <option value="all">All Events</option>
                  <option value="card">Card Events</option>
                  <option value="transaction">Transaction Events</option>
                  <option value="customer">Customer Events</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-primary-500">
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="retrying">Retrying</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Response</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                        {delivery.event}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">
                        {webhooks.find(w => w.id === delivery.webhookId)?.url.replace(/https?:\/\//, '').slice(0, 30)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getDeliveryStatusBadge(delivery.status)}
                      {delivery.retries > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {delivery.retries} retries
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        delivery.statusCode && delivery.statusCode >= 200 && delivery.statusCode < 300
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {delivery.statusCode || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {delivery.duration ? `${delivery.duration}ms` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(delivery.timestamp).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {delivery.status === 'failed' && (
                          <button className="p-1 bg-orange-100 text-orange-600 rounded hover:bg-orange-200" title="Retry">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Event Types Reference */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Available Event Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {eventTypes.map((category) => (
              <div key={category.category}>
                <h3 className="text-sm font-medium text-gray-900 mb-2">{category.category}</h3>
                <div className="space-y-1">
                  {category.events.map((event) => (
                    <div
                      key={event}
                      className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary-600 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Create Webhook Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add Webhook Endpoint</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/webhooks"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of this endpoint"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Events to Subscribe</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded text-primary-600" />
                      <span className="text-sm font-medium">All Events (*)</span>
                    </label>
                    <hr />
                    {eventTypes.map((category) => (
                      <div key={category.category}>
                        <p className="text-xs font-medium text-gray-500 mb-1">{category.category}</p>
                        <div className="space-y-1 ml-2">
                          {category.events.map((event) => (
                            <label key={event} className="flex items-center gap-2">
                              <input type="checkbox" className="rounded text-primary-600" />
                              <span className="text-sm text-gray-700">{event}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    Create Endpoint
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
