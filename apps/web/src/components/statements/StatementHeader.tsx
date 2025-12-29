/**
 * Statement Header Component
 * Displays statement title, period, and business/user info
 */

import { getMonthName } from '@/services/statement.service';

interface StatementHeaderProps {
  type: 'merchant' | 'user';
  name: string;
  email?: string;
  phone?: string;
  month: number;
  year: number;
  generatedAt: string;
}

export function StatementHeader({
  type,
  name,
  email,
  phone,
  month,
  year,
  generatedAt,
}: StatementHeaderProps) {
  const monthName = getMonthName(month);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  return (
    <div className="mb-8 print:mb-4">
      {/* Header with logo and title */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {type === 'merchant' ? 'Merchant Statement' : 'Transaction Statement'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {monthName} {year}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
          <p>Generated: {new Date(generatedAt).toLocaleDateString()}</p>
          <p>{new Date(generatedAt).toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Business/User info and period */}
      <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {type === 'merchant' ? 'Business' : 'Account Holder'}
          </h3>
          <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
          {email && <p className="text-sm text-gray-600 dark:text-gray-300">{email}</p>}
          {phone && <p className="text-sm text-gray-600 dark:text-gray-300">{phone}</p>}
        </div>
        <div className="text-right">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Statement Period
          </h3>
          <p className="font-semibold text-gray-900 dark:text-white">
            {periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
