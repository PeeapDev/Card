import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Layers,
  ShieldCheck,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalCustomers: number;
  verifiedCustomers: number;
  totalCards: number;
  activeCards: number;
  cardPrograms: number;
  totalVolume: number;
  pendingAuthorizations: number;
  disputesOpen: number;
}

export function AdminDashboard() {
  const [stats] = useState<DashboardStats>({
    totalAccounts: 1456,
    activeAccounts: 1289,
    totalCustomers: 1247,
    verifiedCustomers: 1089,
    totalCards: 2341,
    activeCards: 2156,
    cardPrograms: 5,
    totalVolume: 2456780.50,
    pendingAuthorizations: 12,
    disputesOpen: 3,
  });

  const [recentTransactions] = useState([
    { id: 'TXN-001', customer: 'John Doe', amount: 1250.00, type: 'purchase', status: 'completed', time: '2 min ago' },
    { id: 'TXN-002', customer: 'Jane Smith', amount: 89.99, type: 'purchase', status: 'completed', time: '5 min ago' },
    { id: 'TXN-003', customer: 'Acme Corp', amount: 5000.00, type: 'transfer', status: 'pending', time: '8 min ago' },
    { id: 'TXN-004', customer: 'Bob Wilson', amount: 320.50, type: 'purchase', status: 'completed', time: '12 min ago' },
    { id: 'TXN-005', customer: 'Tech Inc', amount: 15000.00, type: 'transfer', status: 'flagged', time: '15 min ago' },
  ]);

  const [pendingItems] = useState([
    { type: 'authorization', description: '12 pending authorization requests', priority: 'high' },
    { type: 'kyc', description: '23 KYC verifications awaiting review', priority: 'medium' },
    { type: 'dispute', description: '3 open disputes need attention', priority: 'high' },
    { type: 'compliance', description: 'Monthly compliance report due', priority: 'low' },
  ]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Overview of your card issuing platform</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Last updated: Just now</span>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              View Analytics
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +5.2%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500">Total Accounts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.activeAccounts.toLocaleString()} active</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.3%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500">Customers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.verifiedCustomers.toLocaleString()} verified</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +8.7%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500">Cards Issued</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCards.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.activeCards.toLocaleString()} active</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +15.4%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500">Total Volume</p>
            <p className="text-2xl font-bold text-gray-900">${(stats.totalVolume / 1000000).toFixed(2)}M</p>
            <p className="text-xs text-gray-400 mt-1">This month</p>
          </Card>
        </div>

        {/* Action Required Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Pending Authorizations</p>
                  <p className="text-sm text-gray-500">{stats.pendingAuthorizations} requests waiting</p>
                </div>
              </div>
              <Link to="/admin/authorization" className="text-primary-600 hover:text-primary-700">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Open Disputes</p>
                  <p className="text-sm text-gray-500">{stats.disputesOpen} disputes need attention</p>
                </div>
              </div>
              <Link to="/admin/disputes" className="text-primary-600 hover:text-primary-700">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Card Programs</p>
                  <p className="text-sm text-gray-500">{stats.cardPrograms} active programs</p>
                </div>
              </div>
              <Link to="/admin/card-programs" className="text-primary-600 hover:text-primary-700">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <Link to="/admin/transactions" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View all
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="pb-3 font-medium">Transaction ID</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTransactions.map((txn) => (
                    <tr key={txn.id} className="text-sm">
                      <td className="py-3 font-mono text-gray-600">{txn.id}</td>
                      <td className="py-3 text-gray-900">{txn.customer}</td>
                      <td className="py-3 font-medium">${txn.amount.toLocaleString()}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          txn.status === 'completed' ? 'bg-green-100 text-green-700' :
                          txn.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {txn.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {txn.status === 'pending' && <Clock className="w-3 h-3" />}
                          {txn.status === 'flagged' && <AlertTriangle className="w-3 h-3" />}
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">{txn.time}</td>
                      <td className="py-3">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pending Items */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Action Required</h2>
            <div className="space-y-3">
              {pendingItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    item.priority === 'high' ? 'bg-red-50 border-l-red-500' :
                    item.priority === 'medium' ? 'bg-yellow-50 border-l-yellow-500' :
                    'bg-blue-50 border-l-blue-500'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{item.priority} priority</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">API Requests (24h)</p>
            <p className="text-xl font-bold text-gray-900">45,672</p>
            <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              99.9% success rate
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Webhook Deliveries</p>
            <p className="text-xl font-bold text-gray-900">12,456</p>
            <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              98.7% delivered
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Avg Response Time</p>
            <p className="text-xl font-bold text-gray-900">145ms</p>
            <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3" />
              -12ms from yesterday
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Active Developers</p>
            <p className="text-xl font-bold text-gray-900">89</p>
            <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +5 this week
            </p>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
