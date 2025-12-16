/**
 * POS Payment Callback Page
 *
 * Handles redirect back from Monime payment gateway
 * Processes success, cancel, and failed payment states
 * Shows appropriate animations and completes the sale
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { monimeService } from '@/services/monime.service';
import posService from '@/services/pos.service';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Printer,
  Home,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

interface PendingSaleData {
  id: string;
  cart: any[];
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: string;
  mobileMoneyProvider: string;
  customerPhone: string;
  merchantId: string;
  monimeTransactionId?: string;
  createdAt: string;
}

type PaymentStatus = 'loading' | 'verifying' | 'success' | 'cancelled' | 'failed';

export function POSPaymentCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [pendingSale, setPendingSale] = useState<PendingSaleData | null>(null);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const completedRef = useRef(false);

  // Get URL parameters
  const urlStatus = searchParams.get('status') || searchParams.get('peeap_status');
  const saleId = searchParams.get('sale_id');
  const transactionId = searchParams.get('transaction_id') || searchParams.get('monime_reference');

  useEffect(() => {
    const processCallback = async () => {
      // Prevent duplicate processing
      if (completedRef.current) return;

      if (!saleId) {
        setError('Missing sale information');
        setStatus('failed');
        return;
      }

      // Retrieve pending sale data from sessionStorage
      const storedData = sessionStorage.getItem(`pos_pending_sale_${saleId}`);
      if (!storedData) {
        setError('Sale data not found. The sale may have already been processed.');
        setStatus('failed');
        return;
      }

      const saleData: PendingSaleData = JSON.parse(storedData);
      setPendingSale(saleData);

      // Handle different statuses
      if (urlStatus === 'cancel' || urlStatus === 'cancelled') {
        setStatus('cancelled');
        // Clean up the pending sale
        sessionStorage.removeItem(`pos_pending_sale_${saleId}`);
        return;
      }

      if (urlStatus === 'failed' || urlStatus === 'error') {
        setStatus('failed');
        setError('Payment was declined or failed');
        // Clean up the pending sale
        sessionStorage.removeItem(`pos_pending_sale_${saleId}`);
        return;
      }

      // For success status, verify with Monime
      if (urlStatus === 'success') {
        setStatus('verifying');

        try {
          // Verify the transaction with Monime
          if (saleData.monimeTransactionId) {
            const tx = await monimeService.getTransaction(saleData.monimeTransactionId);

            if (tx.status === 'completed') {
              // Payment confirmed - complete the sale
              completedRef.current = true;
              await completeSale(saleData);
              setStatus('success');
              setShowConfetti(true);
              setSaleCompleted(true);

              // Clean up the pending sale
              sessionStorage.removeItem(`pos_pending_sale_${saleId}`);

              // Hide confetti after animation
              setTimeout(() => setShowConfetti(false), 5000);
            } else if (tx.status === 'pending' || tx.status === 'processing') {
              // Payment still processing - wait and retry
              setTimeout(() => processCallback(), 2000);
            } else {
              // Payment failed or cancelled
              setStatus('failed');
              setError(`Payment status: ${tx.status}`);
              sessionStorage.removeItem(`pos_pending_sale_${saleId}`);
            }
          } else {
            // No transaction ID - assume success based on redirect
            completedRef.current = true;
            await completeSale(saleData);
            setStatus('success');
            setShowConfetti(true);
            setSaleCompleted(true);
            sessionStorage.removeItem(`pos_pending_sale_${saleId}`);
            setTimeout(() => setShowConfetti(false), 5000);
          }
        } catch (error: any) {
          console.error('Error verifying payment:', error);
          // If verification fails but we got a success redirect, complete the sale anyway
          if (!completedRef.current) {
            completedRef.current = true;
            await completeSale(saleData);
            setStatus('success');
            setShowConfetti(true);
            setSaleCompleted(true);
            sessionStorage.removeItem(`pos_pending_sale_${saleId}`);
            setTimeout(() => setShowConfetti(false), 5000);
          }
        }
      }
    };

    processCallback();
  }, [saleId, urlStatus]);

  const completeSale = async (saleData: PendingSaleData) => {
    try {
      // Create sale record
      const saleRecord = {
        merchant_id: saleData.merchantId,
        subtotal: saleData.totalAmount - saleData.taxAmount + saleData.discountAmount,
        tax_amount: saleData.taxAmount,
        discount_amount: saleData.discountAmount,
        total_amount: saleData.totalAmount,
        payment_method: 'mobile_money' as const,
        payment_status: 'completed' as const,
        payment_reference: saleData.monimeTransactionId,
        customer_phone: saleData.customerPhone,
        status: 'completed' as const,
        items: [] as any[],
      };

      // Create sale items array
      const saleItems = saleData.cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        discount_amount: 0,
        tax_amount: 0,
        total_price: item.price * item.quantity,
      }));

      // createSale automatically handles inventory updates
      await posService.createSale(saleRecord, saleItems);
    } catch (error) {
      console.error('Error completing sale:', error);
      // Don't throw - the payment was successful, just log the error
    }
  };

  const handleReturnToTerminal = () => {
    navigate('/merchant/apps/pos');
  };

  const handleNewSale = () => {
    // Clear any remaining data and go to terminal
    sessionStorage.removeItem(`pos_pending_sale_${saleId}`);
    navigate('/merchant/apps/pos');
  };

  const handleRetry = () => {
    navigate('/merchant/apps/pos');
  };

  // Loading state
  if (status === 'loading' || status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
            <Loader2 className="w-12 h-12 text-primary-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {status === 'loading' ? 'Processing Payment...' : 'Verifying Payment...'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Please wait while we confirm your payment
          </p>
          {pendingSale && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(pendingSale.totalAmount)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div
                  className={`w-3 h-3 ${
                    ['bg-green-500', 'bg-yellow-500', 'bg-blue-500', 'bg-pink-500', 'bg-purple-500'][
                      Math.floor(Math.random() * 5)
                    ]
                  }`}
                  style={{
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center relative z-10">
          {/* Success Animation */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-75"></div>
            <div className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center animate-bounce-once">
              <CheckCircle2 className="w-14 h-14 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 animate-pulse" />
            <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The payment has been received and the sale is complete
          </p>

          {pendingSale && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 mb-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Paid</span>
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                  Mobile Money
                </span>
              </div>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(pendingSale.totalAmount)}
              </p>
              <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {pendingSale.cart.length} item{pendingSale.cart.length !== 1 ? 's' : ''} sold
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleNewSale}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Start New Sale
            </Button>
            <Button
              onClick={handleReturnToTerminal}
              variant="outline"
              className="w-full"
            >
              <Home className="w-5 h-5 mr-2" />
              Return to Terminal
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti {
            animation: confetti 3s ease-out forwards;
          }
          @keyframes bounce-once {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .animate-bounce-once {
            animation: bounce-once 0.5s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Cancelled state
  if (status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Cancelled
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The payment was cancelled. Your cart is still available.
          </p>

          {pendingSale && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Unpaid Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(pendingSale.totalAmount)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRetry}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={handleReturnToTerminal}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Return to Terminal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Failed
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          {error || 'The payment could not be completed'}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          Please try again or use a different payment method
        </p>

        {pendingSale && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6 border border-red-200 dark:border-red-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Amount Due</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(pendingSale.totalAmount)}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleRetry}
            className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={handleReturnToTerminal}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}
