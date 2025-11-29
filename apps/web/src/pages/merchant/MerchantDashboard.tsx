import { useState } from 'react';
import {
  Store,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  ArrowUpRight,
  Calendar,
  Download,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';

export function MerchantDashboard() {
  const [stats] = useState({
    todayRevenue: 4567.89,
    monthlyRevenue: 125430.50,
    totalTransactions: 1234,
    avgTicket: 45.67,
    successRate: 98.5,
    pendingPayouts: 8456.23,
  });

  const [recentTransactions] = useState([
    { id: 'TXN001', amount: 125.00, status: 'completed', time: '2 mins ago', cardLast4: '4242' },
    { id: 'TXN002', amount: 89.99, status: 'completed', time: '5 mins ago', cardLast4: '1234' },
    { id: 'TXN003', amount: 250.00, status: 'pending', time: '12 mins ago', cardLast4: '5678' },
    { id: 'TXN004', amount: 45.50, status: 'completed', time: '25 mins ago', cardLast4: '9012' },
    { id: 'TXN005', amount: 199.99, status: 'refunded', time: '1 hour ago', cardLast4: '3456' },
  ]);

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Merchant Dashboard</h1>
            <p className="text-gray-500">Welcome back, Acme Store</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Last 30 days
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 text-sm font-medium">Today's Revenue</p>
                <p className="text-3xl font-bold mt-2">${stats.todayRevenue.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-green-100">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm">+12.5% vs yesterday</span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold mt-2">${stats.monthlyRevenue.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-blue-100">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm">+8.3% vs last month</span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-purple-100 text-sm font-medium">Pending Payouts</p>
                <p className="text-3xl font-bold mt-2">${stats.pendingPayouts.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-purple-100">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm">Next payout: Tomorrow</span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Store className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-xl font-semibold">{stats.totalTransactions.toLocaleString()}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Ticket</p>
              <p className="text-xl font-semibold">${stats.avgTicket.toFixed(2)}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-xl font-semibold">{stats.successRate}%</p>
            </div>
          </Card>
        </div>

        {/* Recent Transactions & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <button className="text-sm text-primary-600 hover:text-primary-700">View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Transaction ID</th>
                    <th className="pb-3 font-medium">Card</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0">
                      <td className="py-3 text-sm font-medium">{txn.id}</td>
                      <td className="py-3 text-sm text-gray-600">****{txn.cardLast4}</td>
                      <td className="py-3 text-sm font-medium">${txn.amount.toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          txn.status === 'completed' ? 'bg-green-100 text-green-700' :
                          txn.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">{txn.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">Process Refund</p>
                  <p className="text-xs text-gray-500">Issue customer refunds</p>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <Download className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">Download Report</p>
                  <p className="text-xs text-gray-500">Export transaction data</p>
                </div>
              </button>
              <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">Payment Settings</p>
                  <p className="text-xs text-gray-500">Configure payment options</p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
}
