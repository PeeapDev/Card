/**
 * Exchange Modal - Currency Exchange Between Wallets
 *
 * Allows users to exchange between USD and SLE wallets
 * with live rate preview and fee calculation
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, RefreshCw, AlertCircle, CheckCircle, X, Loader2, ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { exchangeService, ExchangeCalculation, CanExchangeResult } from '@/services/exchange.service';
import type { Wallet } from '@/types';

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWallet: Wallet | null;
  wallets: Wallet[];
  onSuccess: () => void;
}

export function ExchangeModal({ isOpen, onClose, sourceWallet, wallets, onSuccess }: ExchangeModalProps) {
  const [amount, setAmount] = useState('');
  const [targetWalletId, setTargetWalletId] = useState('');
  const [calculation, setCalculation] = useState<ExchangeCalculation | null>(null);
  const [canExchange, setCanExchange] = useState<CanExchangeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Get available target wallets (different currency than source)
  const targetWallets = wallets.filter(
    (w) => w.id !== sourceWallet?.id && w.currency !== sourceWallet?.currency && w.status === 'ACTIVE'
  );

  // Check if user can exchange
  const checkCanExchange = useCallback(async () => {
    try {
      const result = await exchangeService.canExchange();
      setCanExchange(result);
    } catch (err: any) {
      console.error('Failed to check exchange permission:', err);
    }
  }, []);

  // Calculate exchange on amount change
  const calculateExchange = useCallback(async () => {
    if (!amount || !sourceWallet || !targetWalletId) {
      setCalculation(null);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      setCalculation(null);
      return;
    }

    const targetWallet = wallets.find((w) => w.id === targetWalletId);
    if (!targetWallet) return;

    setCalculating(true);
    try {
      const result = await exchangeService.calculateExchange(
        parsedAmount,
        sourceWallet.currency,
        targetWallet.currency
      );
      setCalculation(result);
      setError('');
    } catch (err: any) {
      console.error('Failed to calculate exchange:', err);
      setError(err.message || 'Failed to calculate exchange rate');
      setCalculation(null);
    } finally {
      setCalculating(false);
    }
  }, [amount, sourceWallet, targetWalletId, wallets]);

  // Initial checks when modal opens
  useEffect(() => {
    if (isOpen && sourceWallet) {
      checkCanExchange();
      // Auto-select first available target wallet
      if (targetWallets.length > 0 && !targetWalletId) {
        setTargetWalletId(targetWallets[0].id);
      }
    }
  }, [isOpen, sourceWallet, checkCanExchange, targetWallets, targetWalletId]);

  // Debounce calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateExchange();
    }, 300);
    return () => clearTimeout(timer);
  }, [calculateExchange]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setTargetWalletId('');
      setCalculation(null);
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleExchange = async () => {
    if (!sourceWallet || !targetWalletId || !amount) return;

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (parsedAmount > sourceWallet.balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await exchangeService.executeExchange({
        fromWalletId: sourceWallet.id,
        toWalletId: targetWalletId,
        amount: parsedAmount,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Exchange failed');
      }
    } catch (err: any) {
      console.error('Exchange failed:', err);
      setError(err.message || 'Exchange failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string): string => {
    return currency === 'USD' ? '$' : 'Le';
  };

  const formatAmount = (amt: number, currency: string): string => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isOpen || !sourceWallet) return null;

  const targetWallet = wallets.find((w) => w.id === targetWalletId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Exchange Currency</h2>
              <p className="text-sm text-gray-500">Convert between USD and SLE</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Permission Check */}
        {canExchange && !canExchange.allowed && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Exchange not available</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{canExchange.reason}</p>
          </div>
        )}

        {/* No target wallets available */}
        {targetWallets.length === 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-800">No exchange destination available</p>
            <p className="text-sm text-amber-700 mt-1">
              You need a wallet in a different currency to exchange.
              {sourceWallet.currency === 'USD'
                ? ' Create a SLE wallet to exchange your dollars.'
                : ' Create a USD wallet to exchange your Leones.'}
            </p>
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Exchange Successful!</h3>
            <p className="text-gray-500">
              {calculation && (
                <>
                  {formatAmount(calculation.fromAmount, sourceWallet.currency)} has been exchanged to{' '}
                  {formatAmount(calculation.netAmount, targetWallet?.currency || '')}
                </>
              )}
            </p>
          </div>
        ) : (
          canExchange?.allowed && targetWallets.length > 0 && (
            <div className="space-y-4">
              {/* From Wallet */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">From</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      sourceWallet.currency === 'USD' ? 'bg-green-100' : 'bg-primary-100'
                    }`}>
                      <span className={`text-lg font-bold ${
                        sourceWallet.currency === 'USD' ? 'text-green-600' : 'text-primary-600'
                      }`}>
                        {getCurrencySymbol(sourceWallet.currency)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sourceWallet.currency} Wallet</p>
                      <p className="text-sm text-gray-500">
                        Balance: {formatAmount(sourceWallet.balance, sourceWallet.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Exchange</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol(sourceWallet.currency)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-2">
                  {(sourceWallet.currency === 'USD' ? [10, 25, 50, 100] : [100, 500, 1000, 5000]).map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className="flex-1 px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                      disabled={loading}
                    >
                      {getCurrencySymbol(sourceWallet.currency)}{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="flex justify-center">
                <div className="p-2 bg-gray-100 rounded-full">
                  <ArrowDown className="w-5 h-5 text-gray-500" />
                </div>
              </div>

              {/* To Wallet Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <select
                  value={targetWalletId}
                  onChange={(e) => setTargetWalletId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  disabled={loading}
                >
                  {targetWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.currency} Wallet - {formatAmount(w.balance, w.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exchange Rate Preview */}
              {calculating && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                  <span className="text-sm text-gray-500">Calculating...</span>
                </div>
              )}

              {calculation && !calculating && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Exchange Rate</span>
                    <span className="font-medium text-gray-900">
                      1 {calculation.fromCurrency} = {calculation.exchangeRate.toFixed(4)} {calculation.toCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">You Send</span>
                    <span className="font-medium text-gray-900">
                      {formatAmount(calculation.fromAmount, calculation.fromCurrency)}
                    </span>
                  </div>
                  {calculation.feeAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fee ({calculation.feePercentage}%)</span>
                      <span className="text-gray-500">
                        -{formatAmount(calculation.feeAmount, calculation.toCurrency)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-purple-200 pt-2 flex justify-between">
                    <span className="font-medium text-gray-900">You Receive</span>
                    <span className="text-lg font-bold text-purple-600">
                      {formatAmount(calculation.netAmount, calculation.toCurrency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Limits Info */}
              {canExchange && (canExchange.dailyRemaining || canExchange.monthlyRemaining) && (
                <div className="text-xs text-gray-500 space-y-1">
                  {canExchange.dailyRemaining && (
                    <p>Daily limit remaining: {formatAmount(canExchange.dailyRemaining, sourceWallet.currency)}</p>
                  )}
                  {canExchange.monthlyRemaining && (
                    <p>Monthly limit remaining: {formatAmount(canExchange.monthlyRemaining, sourceWallet.currency)}</p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleExchange}
                  disabled={!amount || !targetWalletId || parseFloat(amount) <= 0 || loading || calculating}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exchanging...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Exchange
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        )}
      </Card>
    </div>
  );
}
