/**
 * Contribute to Pot Modal Component
 *
 * A modal for adding funds to a pot from a wallet
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ArrowUpRight,
  Wallet,
  Loader2,
  Check,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useContributeToPot, usePotSettings } from '@/hooks/usePots';
import { useWallets } from '@/hooks/useWallets';
import type { Pot, Wallet as WalletType } from '@/types';

interface ContributePotModalProps {
  isOpen: boolean;
  onClose: () => void;
  pot: Pot;
  onSuccess?: () => void;
}

export function ContributePotModal({
  isOpen,
  onClose,
  pot,
  onSuccess,
}: ContributePotModalProps) {
  const contributeToPot = useContributeToPot();
  const { data: settings } = usePotSettings();
  const { data: wallets = [] } = useWallets();

  const [amount, setAmount] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Slide to confirm state
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const sliderPositionRef = useRef(0);

  const THRESHOLD = 85;

  // Filter only primary wallets
  const primaryWallets = wallets.filter((w: WalletType) => w.status === 'ACTIVE');

  const selectedWallet = primaryWallets.find((w: WalletType) => w.id === sourceWalletId);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setSourceWalletId('');
      setDescription('');
      setErrors({});
      setSliderPosition(0);
      setIsComplete(false);
    }
  }, [isOpen]);

  // Keep ref in sync with state
  useEffect(() => {
    sliderPositionRef.current = sliderPosition;
  }, [sliderPosition]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const amountNum = parseFloat(amount);

    if (!amount || amountNum <= 0) {
      newErrors.amount = 'Amount is required';
    } else if (settings && amountNum < settings.minContributionAmount) {
      newErrors.amount = `Minimum amount is ${formatCurrency(settings.minContributionAmount)}`;
    } else if (settings && amountNum > settings.maxContributionAmount) {
      newErrors.amount = `Maximum amount is ${formatCurrency(settings.maxContributionAmount)}`;
    }

    if (!sourceWalletId) {
      newErrors.sourceWalletId = 'Please select a wallet';
    } else if (selectedWallet && amountNum > selectedWallet.balance) {
      newErrors.amount = 'Insufficient wallet balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getMaxPosition = useCallback(() => {
    if (!containerRef.current) return 200;
    return containerRef.current.offsetWidth - 64 - 8;
  }, []);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current || !containerRef.current || contributeToPot.isPending) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const maxPosition = getMaxPosition();
      const newPosition = Math.max(0, Math.min(clientX - containerRect.left - 32, maxPosition));
      const percentage = (newPosition / maxPosition) * 100;

      setSliderPosition(percentage);
      sliderPositionRef.current = percentage;
    },
    [contributeToPot.isPending, getMaxPosition]
  );

  const handleEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;

    const currentPosition = sliderPositionRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (currentPosition >= THRESHOLD && !contributeToPot.isPending) {
      if (!validateForm()) {
        setSliderPosition(0);
        return;
      }

      setIsComplete(true);
      setSliderPosition(100);

      try {
        await contributeToPot.mutateAsync({
          potId: pot.id,
          sourceWalletId,
          amount: parseFloat(amount),
          description: description || undefined,
        });
        onSuccess?.();
        setTimeout(onClose, 500);
      } catch (error: any) {
        setErrors({ submit: error.message || 'Failed to contribute' });
        setIsComplete(false);
        setSliderPosition(0);
      }
    } else {
      setSliderPosition(0);
    }
  }, [contributeToPot, pot.id, sourceWalletId, amount, description, onSuccess, onClose]);

  const handleStart = useCallback(
    (clientX: number) => {
      if (contributeToPot.isPending || isComplete) return;
      isDraggingRef.current = true;
      setIsDragging(true);
    },
    [contributeToPot.isPending, isComplete]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMove(e.clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        handleEnd();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDraggingRef.current) {
        handleEnd();
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleMove, handleEnd]);

  const sliderTranslateX = (sliderPosition / 100) * getMaxPosition();
  const isFormValid = amount && parseFloat(amount) > 0 && sourceWalletId;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${pot.color || '#4F46E5'}15` }}
            >
              <ArrowUpRight
                className="w-5 h-5"
                style={{ color: pot.color || '#4F46E5' }}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add to Pot</h2>
              <p className="text-sm text-gray-500">{pot.name}</p>
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
        <div className="p-6 space-y-6">
          {/* Current Balance */}
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Current Pot Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(pot.currentBalance)}
            </p>
            {pot.goalAmount && (
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (pot.currentBalance / pot.goalAmount) * 100)}%`,
                      backgroundColor: pot.color || '#4F46E5',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(pot.goalAmount - pot.currentBalance)} to reach goal
                </p>
              </div>
            )}
          </div>

          {/* Source Wallet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Wallet className="w-4 h-4 inline mr-1" />
              From Wallet
            </label>
            <select
              value={sourceWalletId}
              onChange={(e) => setSourceWalletId(e.target.value)}
              className={clsx(
                'w-full px-4 py-3 rounded-xl border transition-colors',
                errors.sourceWalletId
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-primary-500'
              )}
            >
              <option value="">Select wallet</option>
              {primaryWallets.map((wallet: WalletType) => (
                <option key={wallet.id} value={wallet.id}>
                  Wallet ({wallet.currency}) - {formatCurrency(wallet.balance)}
                </option>
              ))}
            </select>
            {errors.sourceWalletId && (
              <p className="mt-1 text-sm text-red-600">{errors.sourceWalletId}</p>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                SLE
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={clsx(
                  'w-full pl-14 pr-4 py-4 text-2xl font-semibold rounded-xl border transition-colors',
                  errors.amount
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-primary-500'
                )}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
            {selectedWallet && (
              <p className="mt-1 text-sm text-gray-500">
                Available: {formatCurrency(selectedWallet.balance)}
              </p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          {selectedWallet && (
            <div className="flex gap-2">
              {[10, 50, 100, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  disabled={preset > selectedWallet.balance}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                    preset > selectedWallet.balance
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  +{preset}
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Birthday money, Weekly savings"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 transition-colors"
            />
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="p-4 bg-red-50 rounded-xl">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer - Slide to Confirm */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div
            ref={containerRef}
            className={clsx(
              'relative h-16 rounded-2xl overflow-hidden select-none',
              !isFormValid ? 'opacity-50 cursor-not-allowed' : 'cursor-grab',
              isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-primary-600 to-primary-500'
            )}
          >
            {/* Background text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-white/80 font-medium">
                {contributeToPot.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isComplete ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <span>
                      Slide to add {amount ? formatCurrency(parseFloat(amount)) : 'amount'}
                    </span>
                    <ChevronRight className="w-5 h-5 animate-pulse" />
                  </>
                )}
              </div>
            </div>

            {/* Progress fill */}
            <div
              className={clsx(
                'absolute inset-y-0 left-0 transition-all duration-100',
                isComplete ? 'bg-green-600' : 'bg-primary-700/30'
              )}
              style={{ width: `${sliderPosition}%` }}
            />

            {/* Slider thumb */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={clsx(
                'absolute top-1 bottom-1 left-1 w-14 rounded-xl flex items-center justify-center',
                isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab',
                isComplete ? 'bg-white' : 'bg-white shadow-lg',
                !isFormValid || contributeToPot.isPending ? 'pointer-events-none' : ''
              )}
              style={{
                transform: `translateX(${sliderTranslateX}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              {contributeToPot.isPending ? (
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              ) : isComplete ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : (
                <ArrowUpRight className="w-6 h-6 text-primary-600" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContributePotModal;
