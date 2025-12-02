/**
 * Create Pot Modal Component
 *
 * A modal form for creating a new pot with all configuration options
 */

import { useState, useEffect } from 'react';
import {
  X,
  PiggyBank,
  Target,
  Calendar,
  Repeat,
  Wallet,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCreatePot, usePotSettings } from '@/hooks/usePots';
import { useWallets } from '@/hooks/useWallets';
import type { CreatePotRequest, PotLockType, AutoDepositFrequency, Wallet as WalletType } from '@/types';

interface CreatePotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const POT_COLORS = [
  '#4F46E5', // Indigo
  '#0891B2', // Cyan
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#2563EB', // Blue
];

const LOCK_TYPE_OPTIONS: { value: PotLockType; label: string; description: string }[] = [
  {
    value: 'time_based',
    label: 'Time-Based',
    description: 'Lock until a specific date',
  },
  {
    value: 'goal_based',
    label: 'Goal-Based',
    description: 'Lock until you reach your goal',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Lock until date AND goal reached',
  },
  {
    value: 'manual',
    label: 'Flexible',
    description: 'No lock, withdraw anytime',
  },
];

const FREQUENCY_OPTIONS: { value: AutoDepositFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function CreatePotModal({ isOpen, onClose, onSuccess }: CreatePotModalProps) {
  const createPot = useCreatePot();
  const { data: settings } = usePotSettings();
  const { data: wallets = [] } = useWallets();

  const [formData, setFormData] = useState<CreatePotRequest>({
    name: '',
    description: '',
    lockType: 'time_based',
    lockPeriodDays: 30,
    color: POT_COLORS[0],
  });

  const [showAutoDeposit, setShowAutoDeposit] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter only primary wallets (not pot wallets)
  const primaryWallets = wallets.filter((w: WalletType) => w.status === 'ACTIVE');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        lockType: 'time_based',
        lockPeriodDays: 30,
        color: POT_COLORS[0],
      });
      setShowAutoDeposit(false);
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Pot name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    if (formData.goalAmount !== undefined && formData.goalAmount <= 0) {
      newErrors.goalAmount = 'Goal amount must be positive';
    }

    if (
      (formData.lockType === 'time_based' || formData.lockType === 'hybrid') &&
      !formData.lockPeriodDays &&
      !formData.maturityDate
    ) {
      newErrors.lockPeriodDays = 'Lock period or maturity date is required';
    }

    if (formData.autoDepositEnabled) {
      if (!formData.autoDepositAmount || formData.autoDepositAmount <= 0) {
        newErrors.autoDepositAmount = 'Auto-deposit amount is required';
      }
      if (!formData.autoDepositFrequency) {
        newErrors.autoDepositFrequency = 'Frequency is required';
      }
      if (!formData.sourceWalletId) {
        newErrors.sourceWalletId = 'Source wallet is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createPot.mutateAsync(formData);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to create pot' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create New Pot</h2>
              <p className="text-sm text-gray-500">Start saving towards your goal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Pot Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pot Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Emergency Fund, Vacation, New Phone"
                className={clsx(
                  'w-full px-4 py-3 rounded-xl border transition-colors',
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What are you saving for?"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors resize-none"
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {POT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={clsx(
                      'w-8 h-8 rounded-full transition-all',
                      formData.color === color && 'ring-2 ring-offset-2 ring-gray-400'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Target Amount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  SLE
                </span>
                <input
                  type="number"
                  value={formData.goalAmount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goalAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-14 pr-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors"
                />
              </div>
              {errors.goalAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.goalAmount}</p>
              )}
            </div>

            {/* Lock Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Lock Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LOCK_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, lockType: option.value })}
                    className={clsx(
                      'p-3 rounded-xl border text-left transition-all',
                      formData.lockType === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="font-medium text-sm text-gray-900">
                      {option.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Lock Period */}
            {(formData.lockType === 'time_based' || formData.lockType === 'hybrid') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lock Period (Days)
                </label>
                <input
                  type="number"
                  value={formData.lockPeriodDays || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lockPeriodDays: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="30"
                  min={settings?.minLockPeriodDays || 7}
                  max={settings?.maxLockPeriodDays || 3650}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: {settings?.minLockPeriodDays || 7} days, Max: {settings?.maxLockPeriodDays || 3650} days
                </p>
                {errors.lockPeriodDays && (
                  <p className="mt-1 text-sm text-red-600">{errors.lockPeriodDays}</p>
                )}
              </div>
            )}

            {/* Auto-Deposit Toggle */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAutoDeposit(!showAutoDeposit);
                  if (!showAutoDeposit) {
                    setFormData({
                      ...formData,
                      autoDepositEnabled: true,
                    });
                  } else {
                    setFormData({
                      ...formData,
                      autoDepositEnabled: false,
                      autoDepositAmount: undefined,
                      autoDepositFrequency: undefined,
                      sourceWalletId: undefined,
                    });
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Auto-Deposit</p>
                    <p className="text-sm text-gray-500">Schedule automatic contributions</p>
                  </div>
                </div>
                <ChevronDown
                  className={clsx(
                    'w-5 h-5 text-gray-400 transition-transform',
                    showAutoDeposit && 'rotate-180'
                  )}
                />
              </button>

              {showAutoDeposit && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount per deposit *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        SLE
                      </span>
                      <input
                        type="number"
                        value={formData.autoDepositAmount || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            autoDepositAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-14 pr-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors"
                      />
                    </div>
                    {errors.autoDepositAmount && (
                      <p className="mt-1 text-sm text-red-600">{errors.autoDepositAmount}</p>
                    )}
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency *
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {FREQUENCY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, autoDepositFrequency: option.value })
                          }
                          className={clsx(
                            'py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                            formData.autoDepositFrequency === option.value
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {errors.autoDepositFrequency && (
                      <p className="mt-1 text-sm text-red-600">{errors.autoDepositFrequency}</p>
                    )}
                  </div>

                  {/* Source Wallet */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Wallet className="w-4 h-4 inline mr-1" />
                      Source Wallet *
                    </label>
                    <select
                      value={formData.sourceWalletId || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, sourceWalletId: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors"
                    >
                      <option value="">Select wallet</option>
                      {primaryWallets.map((wallet: WalletType) => (
                        <option key={wallet.id} value={wallet.id}>
                          Wallet ({wallet.currency}) - {new Intl.NumberFormat('en-SL', {
                            style: 'currency',
                            currency: wallet.currency,
                          }).format(wallet.balance)}
                        </option>
                      ))}
                    </select>
                    {errors.sourceWalletId && (
                      <p className="mt-1 text-sm text-red-600">{errors.sourceWalletId}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createPot.isPending}
                className={clsx(
                  'flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                  createPot.isPending
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {createPot.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Pot'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePotModal;
