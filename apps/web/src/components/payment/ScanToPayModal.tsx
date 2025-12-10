/**
 * Scan to Pay Modal Component
 *
 * Allows users to scan QR codes to make payments
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  QrCode,
  User,
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { QRScanner } from './QRScanner';
import { QRValidationResult } from '@/services/qr-engine';
import { useWallets } from '@/hooks/useWallets';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { currencyService, Currency } from '@/services/currency.service';

interface ScanToPayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'scan' | 'confirm' | 'processing' | 'success' | 'error';

export function ScanToPayModal({ isOpen, onClose }: ScanToPayModalProps) {
  const { user } = useAuth();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('scan');
  const [scanResult, setScanResult] = useState<QRValidationResult | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Currency state
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    currencyService.getCurrencies().then(setCurrencies);
  }, []);

  // Set default wallet when wallets load - prioritize SLE wallet
  useEffect(() => {
    if (wallets && wallets.length > 0 && !selectedWalletId) {
      // Prioritize: 1) Active SLE wallet, 2) Any active wallet, 3) First wallet
      const sleWallet = wallets.find(w => w.status === 'ACTIVE' && w.currency === 'SLE');
      const activeWallet = wallets.find(w => w.status === 'ACTIVE');
      const defaultWallet = sleWallet || activeWallet || wallets[0];
      setSelectedWalletId(defaultWallet.id);
    }
  }, [wallets, selectedWalletId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('scan');
        setScanResult(null);
        setAmount('');
        setError('');
        setTransactionId(null);
      }, 300);
    }
  }, [isOpen]);

  const getCurrencySymbol = (code: string): string => {
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  const formatCurrency = (amt: number, currencyCode: string): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleScanResult = (result: QRValidationResult) => {
    if (!result.valid) {
      setError(result.error || 'Invalid QR code');
      setStep('error');
      return;
    }

    // Check if this is a checkout session QR code
    if (result.checkoutSessionId) {
      // Close modal and redirect to checkout page
      onClose();
      navigate(`/checkout/pay/${result.checkoutSessionId}`);
      return;
    }

    setScanResult(result);

    // Pre-fill amount if specified in QR
    if (result.data?.amount) {
      setAmount(result.data.amount.toString());
    }

    setStep('confirm');
  };

  const handleConfirmPayment = async () => {
    if (!scanResult?.recipient || !amount || !selectedWalletId) {
      setError('Missing payment details');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Check wallet balance
    const selectedWallet = wallets?.find(w => w.id === selectedWalletId);
    if (!selectedWallet || selectedWallet.balance < paymentAmount) {
      setError('Insufficient balance');
      return;
    }

    setStep('processing');
    setError('');

    try {
      // Generate unique external_id for this transaction
      const externalId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create transfer transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          wallet_id: selectedWalletId,
          type: 'TRANSFER',
          amount: -paymentAmount,
          currency: selectedWallet.currency || 'SLE',
          status: 'COMPLETED',
          description: `Payment to ${scanResult.recipient.name}`,
          external_id: externalId,
          metadata: {
            recipient_id: scanResult.recipient.id,
            recipient_wallet_id: scanResult.recipient.walletId,
            qr_reference: scanResult.data?.reference,
            payment_type: 'qr_scan',
          },
        })
        .select()
        .single();

      if (txError) throw txError;

      // Deduct from sender's wallet
      const { error: deductError } = await supabase
        .from('wallets')
        .update({
          balance: selectedWallet.balance - paymentAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedWalletId);

      if (deductError) throw deductError;

      // Credit recipient's wallet
      if (scanResult.recipient.walletId) {
        const { data: recipientWallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', scanResult.recipient.walletId)
          .single();

        if (recipientWallet) {
          await supabase
            .from('wallets')
            .update({
              balance: (recipientWallet.balance || 0) + paymentAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', scanResult.recipient.walletId);

          // Create credit transaction for recipient
          const recipientExternalId = `qr_rcv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await supabase
            .from('transactions')
            .insert({
              user_id: scanResult.recipient.id,
              wallet_id: scanResult.recipient.walletId,
              type: 'TRANSFER',
              amount: paymentAmount,
              currency: selectedWallet.currency || 'SLE',
              status: 'COMPLETED',
              description: `Payment from ${user?.firstName} ${user?.lastName}`,
              external_id: recipientExternalId,
              metadata: {
                sender_id: user?.id,
                sender_wallet_id: selectedWalletId,
                qr_reference: scanResult.data?.reference,
                payment_type: 'qr_receive',
              },
            });
        }
      }

      setTransactionId(transaction?.id || 'success');
      setStep('success');
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('scan');
    setScanResult(null);
    setAmount('');
    setError('');
  };

  if (!isOpen) return null;

  const selectedWallet = wallets?.find(w => w.id === selectedWalletId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <QrCode className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scan to Pay</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 'scan' && 'Scan a QR code to pay'}
                {step === 'confirm' && 'Confirm payment details'}
                {step === 'processing' && 'Processing payment...'}
                {step === 'success' && 'Payment successful!'}
                {step === 'error' && 'Payment failed'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content based on step */}
        {step === 'scan' && (
          <QRScanner
            onScan={handleScanResult}
            onClose={onClose}
            autoValidate={true}
          />
        )}

        {step === 'confirm' && scanResult?.recipient && (
          <div className="space-y-4">
            {/* Recipient Info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Paying to</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{scanResult.recipient.name}</p>
                </div>
              </div>
              {scanResult.data?.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {scanResult.data.description}
                </p>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  {getCurrencySymbol(scanResult.data?.currency || 'SLE')}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!!scanResult.data?.amount}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
                  placeholder="0.00"
                />
              </div>
              {scanResult.data?.amount && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Amount is fixed by the payment request
                </p>
              )}
            </div>

            {/* Wallet Selection - Mobile-friendly card buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pay from
              </label>
              {walletsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading wallets...</span>
                </div>
              ) : wallets && wallets.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => setSelectedWalletId(wallet.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        selectedWalletId === wallet.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedWalletId === wallet.id
                          ? 'bg-primary-100 dark:bg-primary-800'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Wallet className={`w-5 h-5 ${
                          selectedWalletId === wallet.id
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${
                          selectedWalletId === wallet.id
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {wallet.currency} Wallet
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(wallet.balance, wallet.currency)}
                        </p>
                      </div>
                      {selectedWalletId === wallet.id && (
                        <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No wallets available
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRetry}
              >
                Scan Again
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPayment}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                Pay {amount ? formatCurrency(parseFloat(amount), scanResult.data?.currency || 'SLE') : ''}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary-600 dark:text-primary-400 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Processing your payment...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-2">
              You paid {formatCurrency(parseFloat(amount), scanResult?.data?.currency || 'SLE')} to {scanResult?.recipient?.name}
            </p>
            {transactionId && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Transaction ID: {transactionId.slice(0, 8)}...
              </p>
            )}
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Payment Failed</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              {error || 'Something went wrong. Please try again.'}
            </p>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
