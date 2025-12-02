/**
 * Withdraw from Pot Modal Component
 *
 * A modal for withdrawing funds from a pot to a wallet
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ArrowDownLeft,
  Wallet,
  Loader2,
  Check,
  ChevronRight,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useWithdrawFromPot, useWithdrawalEligibility } from '@/hooks/usePots';
import { useWallets } from '@/hooks/useWallets';
import type { Pot, Wallet as WalletType } from '@/types';

interface WithdrawPotModalProps {
  isOpen: boolean;
  onClose: () => void;
  pot: Pot;
  onSuccess?: () => void;
}

export function WithdrawPotModal({
  isOpen,
  onClose,
  pot,
  onSuccess,
}: WithdrawPotModalProps) {
  const withdrawFromPot = useWithdrawFromPot();
  const { data: eligibility, isLoading: loadingEligibility } = useWithdrawalEligibility(pot.id);
  const { data: wallets = [] } = useWallets();

  const [amount, setAmount] = useState('');
  const [destinationWalletId, setDestinationWalletId] = useState('');
  const [forceWithPenalty, setForceWithPenalty] = useState(false);
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setDestinationWalletId('');
      setForceWithPenalty(false);
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

  const canWithdraw = eligibility?.canWithdraw || false;
  const canWithdrawWithPenalty = eligibility?.canWithdrawWithPenalty || false;
  const penaltyPercent = eligibility?.penaltyPercent || 0;

  const amountNum = parseFloat(amount) || 0;
  const penaltyAmount = forceWithPenalty ? amountNum * (penaltyPercent / 100) : 0;
  const actualAmount = amountNum - penaltyAmount;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!amount || amountNum <= 0) {
      newErrors.amount = 'Amount is required';
    } else if (amountNum > pot.currentBalance) {
      newErrors.amount = 'Amount exceeds pot balance';
    }

    if (!destinationWalletId) {
      newErrors.destinationWalletId = 'Please select a destination wallet';
    }

    if (!canWithdraw && !forceWithPenalty) {
      newErrors.eligibility = 'Withdrawal not allowed. Enable early withdrawal with penalty.';
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
      if (!isDraggingRef.current || !containerRef.current || withdrawFromPot.isPending) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const maxPosition = getMaxPosition();
      const newPosition = Math.max(0, Math.min(clientX - containerRect.left - 32, maxPosition));
      const percentage = (newPosition / maxPosition) * 100;

      setSliderPosition(percentage);
      sliderPositionRef.current = percentage;
    },
    [withdrawFromPot.isPending, getMaxPosition]
  );

  const handleEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;

    const currentPosition = sliderPositionRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (currentPosition >= THRESHOLD && !withdrawFromPot.isPending) {
      if (!validateForm()) {
        setSliderPosition(0);
        return;
      }

      setIsComplete(true);
      setSliderPosition(100);

      try {
        await withdrawFromPot.mutateAsync({
          potId: pot.id,
          destinationWalletId,
          amount: amountNum,
          forceWithPenalty: !canWithdraw && forceWithPenalty,
          description: description || undefined,
        });
        onSuccess?.();
        setTimeout(onClose, 500);
      } catch (error: any) {
        setErrors({ submit: error.message || 'Failed to withdraw' });
        setIsComplete(false);
        setSliderPosition(0);
      }
    } else {
      setSliderPosition(0);
    }
  }, [
    withdrawFromPot,
    pot.id,
    destinationWalletId,
    amountNum,
    canWithdraw,
    forceWithPenalty,
    description,
    onSuccess,
    onClose,
  ]);

  const handleStart = useCallback(
    (clientX: number) => {
      if (withdrawFromPot.isPending || isComplete) return;
      isDraggingRef.current = true;
      setIsDragging(true);
    },
    [withdrawFromPot.isPending, isComplete]
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
  const isFormValid =
    amount &&
    amountNum > 0 &&
    destinationWalletId &&
    (canWithdraw || forceWithPenalty);

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
              <ArrowDownLeft
                className="w-5 h-5"
                style={{ color: pot.color || '#4F46E5' }}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Withdraw from Pot</h2>
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
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Loading state */}
          {loadingEligibility ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Eligibility Status */}
              {!canWithdraw && (
                <div
                  className={clsx(
                    'p-4 rounded-xl',
                    canWithdrawWithPenalty ? 'bg-amber-50' : 'bg-red-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {canWithdrawWithPenalty ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p
                        className={clsx(
                          'font-medium',
                          canWithdrawWithPenalty ? 'text-amber-800' : 'text-red-800'
                        )}
                      >
                        {eligibility?.reason || 'Withdrawal not available'}
                      </p>
                      {canWithdrawWithPenalty && (
                        <p className="text-sm text-amber-700 mt-1">
                          Early withdrawal incurs a {penaltyPercent}% penalty fee.
                        </p>
                      )}
                      {eligibility?.daysUntilUnlock && eligibility.daysUntilUnlock > 0 && (
                        <p className="text-sm text-amber-700 mt-1">
                          {eligibility.daysUntilUnlock} days until maturity.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Current Balance */}
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(pot.currentBalance)}
                </p>
              </div>

              {/* Destination Wallet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Wallet className="w-4 h-4 inline mr-1" />
                  To Wallet
                </label>
                <select
                  value={destinationWalletId}
                  onChange={(e) => setDestinationWalletId(e.target.value)}
                  className={clsx(
                    'w-full px-4 py-3 rounded-xl border transition-colors',
                    errors.destinationWalletId
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
                {errors.destinationWalletId && (
                  <p className="mt-1 text-sm text-red-600">{errors.destinationWalletId}</p>
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
                    max={pot.currentBalance}
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
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAmount((pot.currentBalance * 0.25).toFixed(2))}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((pot.currentBalance * 0.5).toFixed(2))}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((pot.currentBalance * 0.75).toFixed(2))}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(pot.currentBalance.toFixed(2))}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Max
                </button>
              </div>

              {/* Early Withdrawal Toggle */}
              {!canWithdraw && canWithdrawWithPenalty && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <div>
                    <p className="font-medium text-amber-800">Enable early withdrawal</p>
                    <p className="text-sm text-amber-700">
                      {penaltyPercent}% penalty will be deducted
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceWithPenalty}
                      onChange={(e) => setForceWithPenalty(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}

              {/* Summary */}
              {amountNum > 0 && (
                <div className="p-4 rounded-xl bg-gray-50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Withdrawal amount</span>
                    <span className="font-medium">{formatCurrency(amountNum)}</span>
                  </div>
                  {penaltyAmount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>Penalty ({penaltyPercent}%)</span>
                      <span>-{formatCurrency(penaltyAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2 mt-2">
                    <span>You'll receive</span>
                    <span className="text-green-600">{formatCurrency(actualAmount)}</span>
                  </div>
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
                  placeholder="e.g., Emergency expense"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Error message */}
              {(errors.submit || errors.eligibility) && (
                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="text-sm text-red-600">
                    {errors.submit || errors.eligibility}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Slide to Confirm */}
        {!loadingEligibility && (
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
                  {withdrawFromPot.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : isComplete ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Withdrawn!</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Slide to withdraw{' '}
                        {amount ? formatCurrency(actualAmount) : 'amount'}
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
                  !isFormValid || withdrawFromPot.isPending ? 'pointer-events-none' : ''
                )}
                style={{
                  transform: `translateX(${sliderTranslateX}px)`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                }}
              >
                {withdrawFromPot.isPending ? (
                  <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                ) : isComplete ? (
                  <Check className="w-6 h-6 text-green-600" />
                ) : (
                  <ArrowDownLeft className="w-6 h-6 text-primary-600" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WithdrawPotModal;
