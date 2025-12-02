/**
 * Pot Card Component
 *
 * Displays a pot summary card with progress, status, and quick actions
 */

import { PiggyBank, Lock, Unlock, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Pot } from '@/types';

interface PotCardProps {
  pot: Pot;
  onClick?: () => void;
  className?: string;
}

export function PotCard({ pot, onClick, className }: PotCardProps) {
  const progressPercent = pot.goalAmount
    ? Math.min(100, (pot.currentBalance / pot.goalAmount) * 100)
    : 0;

  const isLocked = pot.lockStatus === 'LOCKED' || pot.adminLocked;
  const isUnlocked = pot.lockStatus === 'UNLOCKED' && !pot.adminLocked;

  const daysUntilUnlock = pot.lockEndDate
    ? Math.max(0, Math.ceil((new Date(pot.lockEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get pot icon component
  const getPotIcon = () => {
    switch (pot.icon) {
      case 'piggy-bank':
      default:
        return PiggyBank;
    }
  };

  const IconComponent = getPotIcon();

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg hover:border-primary-300',
        pot.adminLocked && 'border-red-300 bg-red-50/30',
        className
      )}
    >
      {/* Header with color strip */}
      <div
        className="h-2"
        style={{ backgroundColor: pot.color || '#4F46E5' }}
      />

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${pot.color || '#4F46E5'}15` }}
            >
              <IconComponent
                className="w-6 h-6"
                style={{ color: pot.color || '#4F46E5' }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">{pot.name}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-green-500" />
                )}
                <span className={clsx(
                  'text-xs font-medium',
                  isLocked ? 'text-amber-600' : 'text-green-600'
                )}>
                  {pot.adminLocked ? 'Admin Locked' : isLocked ? 'Locked' : 'Unlocked'}
                </span>
              </div>
            </div>
          </div>

          {pot.autoDepositEnabled && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 rounded-full">
              <TrendingUp className="w-3 h-3 text-primary-600" />
              <span className="text-xs font-medium text-primary-700">Auto</span>
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(pot.currentBalance)}
          </p>
          {pot.goalAmount && (
            <p className="text-sm text-gray-500">
              of {formatCurrency(pot.goalAmount)} goal
            </p>
          )}
        </div>

        {/* Progress bar */}
        {pot.goalAmount && (
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: pot.color || '#4F46E5',
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {progressPercent.toFixed(0)}% of goal
            </p>
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center justify-between text-sm">
          {pot.lockEndDate && isLocked && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {daysUntilUnlock > 0
                  ? `${daysUntilUnlock} days left`
                  : `Unlocks ${formatDate(pot.lockEndDate)}`}
              </span>
            </div>
          )}

          {pot.autoDepositEnabled && pot.autoDepositAmount && (
            <div className="text-gray-500">
              {formatCurrency(pot.autoDepositAmount)}/{pot.autoDepositFrequency}
            </div>
          )}
        </div>

        {/* Admin lock warning */}
        {pot.adminLocked && pot.adminLockReason && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{pot.adminLockReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PotCard;
