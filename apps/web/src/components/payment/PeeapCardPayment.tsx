/**
 * PeeapCardPayment Component
 *
 * Allows users to pay with their Peeap closed-loop virtual cards.
 * This component is used in checkout flows for merchants on the platform.
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cardService, IssuedCard } from '@/services/card.service';

interface PeeapCardPaymentProps {
  amount: number;
  currency: string;
  merchantId: string;
  merchantName: string;
  description?: string;
  reference?: string;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  reference?: string;
  amount?: number;
  message?: string;
}

export function PeeapCardPayment({
  amount,
  currency,
  merchantId,
  merchantName,
  description,
  reference,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}: PeeapCardPaymentProps) {
  const { user } = useAuth();

  // State
  const [cards, setCards] = useState<IssuedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<IssuedCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [error, setError] = useState('');

  // Card details (for manual entry if needed)
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadCards();
    }
  }, [user?.id]);

  const loadCards = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const userCards = await cardService.getIssuedCards(user.id);
      // Filter to only active cards with sufficient balance
      const activeCards = userCards.filter(
        (c) => c.cardStatus === 'active' && (c.wallet?.balance || 0) * 100 >= amount
      );
      setCards(activeCards);
      if (activeCards.length === 1) {
        setSelectedCard(activeCards[0]);
      }
    } catch (err: any) {
      console.error('Failed to load cards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amt: number) => {
    return `Le ${(amt / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const formatCardNumber = (num: string) => {
    return num.replace(/(.{4})/g, '$1 ').trim();
  };

  const handlePayWithSelectedCard = async () => {
    if (!selectedCard) {
      setError('Please select a card');
      return;
    }

    // Get the full card details
    const cardDetails = await cardService.getCardSecureDetails(selectedCard.id, user!.id);
    if (!cardDetails) {
      setError('Failed to retrieve card details');
      return;
    }

    // Need CVV - prompt user
    if (!cvv) {
      setShowCvv(true);
      setError('Please enter your CVV');
      return;
    }

    await processPayment(
      cardDetails.cardNumber,
      cvv,
      cardDetails.expiryMonth,
      cardDetails.expiryYear
    );
  };

  const handlePayWithManualEntry = async () => {
    if (!cardNumber || !expiryMonth || !expiryYear || !cvv) {
      setError('Please fill in all card details');
      return;
    }

    await processPayment(
      cardNumber.replace(/\s/g, ''),
      cvv,
      parseInt(expiryMonth),
      parseInt(expiryYear)
    );
  };

  const processPayment = async (
    cardNum: string,
    cardCvv: string,
    expMonth: number,
    expYear: number
  ) => {
    setIsProcessing(true);
    setError('');

    try {
      const data = await api.post<{
        success: boolean;
        transactionId?: string;
        authCode?: string;
        reference?: string;
        amount?: number;
        message?: string;
        declineReason?: string;
        error?: string;
      }>('/virtual-cards/pay', {
        cardNumber: cardNum,
        cvv: cardCvv,
        expiryMonth: expMonth,
        expiryYear: expYear,
        amount: amount,
        description: description || `Payment at ${merchantName}`,
        reference: reference,
      }, {
        headers: {
          'X-Api-Key': merchantId, // Merchant uses their API key in production
        },
      });

      if (data.success) {
        onSuccess({
          success: true,
          transactionId: data.transactionId || '',
          authCode: data.authCode || '',
          reference: data.reference || '',
          amount: data.amount || 0,
          message: data.message || '',
        });
      } else {
        const errorMessage = data.declineReason || data.error || 'Payment failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment Amount Header */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Amount to Pay</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatAmount(amount)}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{merchantName}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {cards.length > 0 && !showManualEntry ? (
        <>
          {/* Card Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCardSelector(!showCardSelector)}
              disabled={disabled || isProcessing}
              className={clsx(
                'w-full p-4 rounded-xl border-2 transition-all text-left',
                showCardSelector
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300'
              )}
            >
              {selectedCard ? (
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-10 rounded-lg flex items-center justify-center text-white text-xs font-mono"
                    style={{ backgroundColor: selectedCard.cardColor }}
                  >
                    {selectedCard.cardLastFour}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCard.cardName}</p>
                    <p className="text-sm text-gray-500">
                      **** {selectedCard.cardLastFour} | Exp: {String(selectedCard.expiryMonth).padStart(2, '0')}/{String(selectedCard.expiryYear).slice(-2)} | Bal: {formatAmount((selectedCard.wallet?.balance || 0) * 100)}
                    </p>
                  </div>
                  <ChevronDown className={clsx('w-5 h-5 text-gray-400 transition-transform', showCardSelector && 'rotate-180')} />
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">Select a Card</p>
                    <p className="text-sm text-gray-500">Choose your Peeap card</p>
                  </div>
                  <ChevronDown className={clsx('w-5 h-5 text-gray-400 transition-transform', showCardSelector && 'rotate-180')} />
                </div>
              )}
            </button>

            {/* Dropdown */}
            {showCardSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      setSelectedCard(card);
                      setShowCardSelector(false);
                      setCvv('');
                    }}
                    className={clsx(
                      'w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                      selectedCard?.id === card.id && 'bg-primary-50 dark:bg-primary-900/20'
                    )}
                  >
                    <div
                      className="w-12 h-8 rounded-lg flex items-center justify-center text-white text-xs font-mono"
                      style={{ backgroundColor: card.cardColor }}
                    >
                      {card.cardLastFour}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{card.cardName}</p>
                      <p className="text-sm text-gray-500">
                        **** {card.cardLastFour} | Exp: {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)} | Bal: {formatAmount((card.wallet?.balance || 0) * 100)}
                      </p>
                    </div>
                    {selectedCard?.id === card.id && (
                      <CheckCircle className="w-5 h-5 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CVV Input */}
          {selectedCard && (
            <div className="relative">
              <Input
                label="CVV"
                type={showCvv ? 'text' : 'password'}
                placeholder="Enter CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                maxLength={3}
                disabled={disabled || isProcessing}
                className="text-center text-lg tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowCvv(!showCvv)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showCvv ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          )}

          {/* Pay Button */}
          <Button
            className="w-full h-12 text-lg"
            onClick={handlePayWithSelectedCard}
            disabled={disabled || isProcessing || !selectedCard || !cvv}
            isLoading={isProcessing}
          >
            {isProcessing ? (
              'Processing...'
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Pay {formatAmount(amount)}
              </>
            )}
          </Button>

          {/* Switch to manual entry */}
          <button
            onClick={() => setShowManualEntry(true)}
            className="w-full text-sm text-gray-500 hover:text-primary-600"
          >
            Enter card details manually
          </button>
        </>
      ) : (
        // Manual Card Entry
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Enter your Peeap card details
            </p>

            <div className="space-y-4">
              <Input
                label="Card Number"
                type="text"
                placeholder="6000 **** **** ****"
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                maxLength={19}
                disabled={disabled || isProcessing}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Month"
                  type="text"
                  placeholder="MM"
                  value={expiryMonth}
                  onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  maxLength={2}
                  disabled={disabled || isProcessing}
                />
                <Input
                  label="Year"
                  type="text"
                  placeholder="YY"
                  value={expiryYear}
                  onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  disabled={disabled || isProcessing}
                />
                <div className="relative">
                  <Input
                    label="CVV"
                    type={showCvv ? 'text' : 'password'}
                    placeholder="***"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    maxLength={3}
                    disabled={disabled || isProcessing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv(!showCvv)}
                    className="absolute right-2 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <Button
            className="w-full h-12 text-lg"
            onClick={handlePayWithManualEntry}
            disabled={disabled || isProcessing || !cardNumber || !expiryMonth || !expiryYear || !cvv}
            isLoading={isProcessing}
          >
            {isProcessing ? (
              'Processing...'
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Pay {formatAmount(amount)}
              </>
            )}
          </Button>

          {/* Back to card selection */}
          {cards.length > 0 && (
            <button
              onClick={() => setShowManualEntry(false)}
              className="w-full text-sm text-gray-500 hover:text-primary-600"
            >
              Select from your saved cards
            </button>
          )}
        </div>
      )}

      {/* No cards message */}
      {cards.length === 0 && !showManualEntry && !isLoading && (
        <div className="text-center py-6">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No eligible Peeap cards found. You need an active card with sufficient balance.
          </p>
          <button
            onClick={() => setShowManualEntry(true)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Enter card details manually
          </button>
        </div>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full text-sm text-gray-500 hover:text-gray-700 mt-4"
        >
          Cancel
        </button>
      )}

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
        <Shield className="w-4 h-4" />
        <span>Secured by Peeap. Your card details are encrypted.</span>
      </div>
    </div>
  );
}

export default PeeapCardPayment;
