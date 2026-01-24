import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { SchoolLayout } from '@/components/school';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FileText,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';

interface ReportMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
}

export function SchoolReportsPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');

  const metrics: ReportMetric[] = [
    { label: 'Total Revenue', value: 'SLE 45,850,000', change: 12.5, changeLabel: 'vs last month' },
    { label: 'Fee Collection Rate', value: '87%', change: 5.2, changeLabel: 'vs last month' },
    { label: 'Active Students', value: '1,245', change: 3.1, changeLabel: 'vs last month' },
    { label: 'Outstanding Fees', value: 'SLE 8,250,000', change: -15.3, changeLabel: 'vs last month' }
  ];

  const feeCollectionData = [
    { month: 'Aug', collected: 38500000, pending: 6500000 },
    { month: 'Sep', collected: 42000000, pending: 5800000 },
    { month: 'Oct', collected: 40500000, pending: 7200000 },
    { month: 'Nov', collected: 43800000, pending: 6100000 },
    { month: 'Dec', collected: 41200000, pending: 8500000 },
    { month: 'Jan', collected: 45850000, pending: 8250000 }
  ];

  const expenseBreakdown = [
    { category: 'Salaries', amount: 28500000, percentage: 55 },
    { category: 'Utilities', amount: 5200000, percentage: 10 },
    { category: 'Maintenance', amount: 3900000, percentage: 7.5 },
    { category: 'Supplies', amount: 4680000, percentage: 9 },
    { category: 'Transport', amount: 2600000, percentage: 5 },
    { category: 'Other', amount: 7020000, percentage: 13.5 }
  ];

  const topPayingClasses = [
    { class: 'JSS 3', students: 85, collected: 8500000, rate: 95 },
    { class: 'SSS 3', students: 72, collected: 7920000, rate: 92 },
    { class: 'SSS 2', students: 78, collected: 7800000, rate: 91 },
    { class: 'JSS 2', students: 90, collected: 8100000, rate: 88 },
    { class: 'SSS 1', students: 82, collected: 6970000, rate: 85 }
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `SLE ${(amount / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const maxCollected = Math.max(...feeCollectionData.map((d) => d.collected + d.pending));

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Financial insights and performance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'fees', label: 'Fee Collection', icon: DollarSign },
          { id: 'expenses', label: 'Expenses', icon: Wallet },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'payroll', label: 'Payroll', icon: FileText }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedReport(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedReport === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{metric.value}</p>
            <div
              className={`flex items-center gap-1 text-sm ${
                metric.change >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {metric.change >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>
                {Math.abs(metric.change)}% {metric.changeLabel}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Fee Collection Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Fee Collection Trend</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Collected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
              </div>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="flex items-end gap-4 h-64">
            {feeCollectionData.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse" style={{ height: '200px' }}>
                  <div
                    className="w-full bg-indigo-500 rounded-t"
                    style={{ height: `${(data.collected / maxCollected) * 100}%` }}
                  />
                  <div
                    className="w-full bg-gray-200 dark:bg-gray-600"
                    style={{ height: `${(data.pending / maxCollected) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Expense Breakdown</h3>

          {/* Simple Donut representation */}
          <div className="relative w-40 h-40 mx-auto mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">SLE 52M</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              </div>
            </div>
            <svg className="w-full h-full -rotate-90">
              <circle cx="80" cy="80" r="60" fill="none" stroke="#e5e7eb" strokeWidth="20" />
              <circle
                cx="80"
                cy="80"
                r="60"
                fill="none"
                stroke="#6366f1"
                strokeWidth="20"
                strokeDasharray={`${55 * 3.77} ${100 * 3.77}`}
              />
            </svg>
          </div>

          <div className="space-y-3">
            {expenseBreakdown.slice(0, 4).map((expense) => (
              <div key={expense.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{expense.category}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {expense.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Class-wise Fee Collection</h3>
            <button className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Class
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Students
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Amount Collected
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Collection Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topPayingClasses.map((cls) => (
                <tr key={cls.class} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">{cls.class}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-600 dark:text-gray-400">{cls.students}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(cls.collected)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cls.rate >= 90
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : cls.rate >= 80
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {cls.rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          cls.rate >= 90
                            ? 'bg-green-500'
                            : cls.rate >= 80
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${cls.rate}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">This Month</span>
          </div>
          <p className="text-3xl font-bold mb-1">1,245</p>
          <p className="text-sm opacity-80">Active Students</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 opacity-80" />
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold mb-1">87%</p>
          <p className="text-sm opacity-80">Collection Rate</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Wallet className="h-8 w-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">45 Staff</span>
          </div>
          <p className="text-3xl font-bold mb-1">SLE 28.5M</p>
          <p className="text-sm opacity-80">Monthly Payroll</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <FileText className="h-8 w-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">5 Pending</span>
          </div>
          <p className="text-3xl font-bold mb-1">24</p>
          <p className="text-sm opacity-80">Invoices This Month</p>
        </div>
      </div>
    </SchoolLayout>
  );
}
