/**
 * Statement Transaction Table Component
 * Displays all transactions with fee breakdown
 */

import { formatCurrency, formatDate, type StatementTransaction } from '@/services/statement.service';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatementTransactionTableProps {
  transactions: StatementTransaction[];
  currency?: string;
  showFees?: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'PENDING':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'FAILED':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
};

export function StatementTransactionTable({
  transactions,
  currency = 'SLE',
  showFees = true,
}: StatementTransactionTableProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Transactions ({transactions.length})
        </h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Reference</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Gross</th>
                {showFees && (
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Fee</th>
                )}
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={showFees ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                    No transactions in this period
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                      {tx.reference.slice(0, 12)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white max-w-[200px] truncate">
                      {tx.description}
                      {tx.customerName && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs block">
                          {tx.customerName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={tx.status} />
                        <span className="text-xs capitalize text-gray-600 dark:text-gray-400">
                          {tx.status.toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(tx.grossAmount, currency)}
                    </td>
                    {showFees && (
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 whitespace-nowrap">
                        -{formatCurrency(tx.gatewayFee + tx.platformFee, currency)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                      {formatCurrency(tx.netAmount, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {transactions.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900 font-medium">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    Totals:
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(
                      transactions.reduce((sum, tx) => sum + tx.grossAmount, 0),
                      currency
                    )}
                  </td>
                  {showFees && (
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                      -{formatCurrency(
                        transactions.reduce((sum, tx) => sum + tx.gatewayFee + tx.platformFee, 0),
                        currency
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                    {formatCurrency(
                      transactions.reduce((sum, tx) => sum + tx.netAmount, 0),
                      currency
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
