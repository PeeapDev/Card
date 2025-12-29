/**
 * Statement Summary Component
 * Displays summary cards with gross, fees, and net amounts
 */

import { formatCurrency, type StatementSummary as SummaryData } from '@/services/statement.service';
import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';

interface StatementSummaryProps {
  summary: SummaryData;
  currency?: string;
}

export function StatementSummary({ summary, currency = 'SLE' }: StatementSummaryProps) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>

      {/* Main summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Gross Sales</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summary.grossAmount, currency)}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">Total Fees</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summary.totalFees, currency)}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Net Earnings</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summary.netAmount, currency)}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.transactionCount}
          </p>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Fee Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Gateway Fees (Monime 1.5%)</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(summary.gatewayFees, currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Platform Fees</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(summary.platformFees, currency)}
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Fees</span>
            <span className="font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalFees, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction status breakdown */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.completedCount}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
        </div>
        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.pendingCount}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.failedCount}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
        </div>
      </div>
    </div>
  );
}
