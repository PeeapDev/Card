/**
 * Embed Checkout Page
 *
 * This page is designed to be rendered inside an iframe on merchant websites.
 * It handles the complete checkout flow without redirecting away from the merchant's site.
 *
 * URL format: /embed/checkout?session=xxx&origin=xxx
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getApiEndpoint } from '@/config/urls';
import {
  EmbedHeader,
  PaymentTabs,
  QRPaymentTab,
  CardPaymentTab,
  OrangeMoneyTab,
  PaymentSuccess,
  PaymentError,
  type PaymentMethod,
} from '@/components/embed';

// Types
interface CheckoutSession {
  id: string;
  externalId: string;
  merchantId: string;
  status: 'OPEN' | 'COMPLETE' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  currencyCode: string;
  description?: string;
  merchantName: string;
  merchantLogoUrl?: string;
  merchantIsVerified?: boolean;
  paymentMethods: {
    qr?: boolean;
    card?: boolean;
    mobile?: boolean;
  };
  expiresAt: string;
  reference?: string;
  metadata?: {
    allowedOrigin?: string;
  };
}

type CheckoutState = 'loading' | 'ready' | 'success' | 'error' | 'expired';

interface PaymentResult {
  transactionId?: string;
  reference?: string;
  status: string;
}

interface PaymentError {
  message: string;
  code?: string;
}

// PostMessage types
type ParentMessage =
  | { type: 'PEEAP_INIT'; sessionId: string }
  | { type: 'PEEAP_CLOSE' };

type IframeMessage =
  | { type: 'PEEAP_READY' }
  | { type: 'PEEAP_HEIGHT'; height: number }
  | { type: 'PEEAP_SUCCESS'; result: PaymentResult }
  | { type: 'PEEAP_ERROR'; error: PaymentError }
  | { type: 'PEEAP_CLOSE' };

export function EmbedCheckoutPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const parentOrigin = searchParams.get('origin');

  // State
  const [state, setState] = useState<CheckoutState>('loading');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qr');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<PaymentError | null>(null);

  // Send message to parent window
  const sendToParent = useCallback((message: IframeMessage) => {
    if (parentOrigin && window.parent !== window) {
      try {
        window.parent.postMessage(message, parentOrigin);
      } catch (err) {
        console.error('[EmbedCheckout] Failed to send message to parent:', err);
      }
    }
  }, [parentOrigin]);

  // Update iframe height
  const updateHeight = useCallback(() => {
    const height = document.documentElement.scrollHeight;
    sendToParent({ type: 'PEEAP_HEIGHT', height });
  }, [sendToParent]);

  // Listen for messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (parentOrigin && event.origin !== parentOrigin) {
        console.warn('[EmbedCheckout] Ignoring message from unauthorized origin:', event.origin);
        return;
      }

      const data = event.data as ParentMessage;

      if (data.type === 'PEEAP_CLOSE') {
        handleClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [parentOrigin]);

  // Fetch session on mount
  useEffect(() => {
    if (!sessionId) {
      setError({ message: 'Invalid checkout session', code: 'INVALID_SESSION' });
      setState('error');
      return;
    }

    fetchSession();
  }, [sessionId]);

  // Update height when state changes
  useEffect(() => {
    updateHeight();
  }, [state, selectedMethod, updateHeight]);

  // Notify parent when ready
  useEffect(() => {
    if (state === 'ready') {
      sendToParent({ type: 'PEEAP_READY' });
    }
  }, [state, sendToParent]);

  // Fetch checkout session
  const fetchSession = async () => {
    try {
      const response = await fetch(getApiEndpoint(`/checkout/sessions/${sessionId}`));

      if (!response.ok) {
        throw new Error('Session not found');
      }

      const data = await response.json();

      // Check session status
      if (data.status === 'COMPLETE') {
        setPaymentResult({ status: 'complete', reference: data.reference });
        setState('success');
        return;
      }

      if (data.status === 'EXPIRED' || data.status === 'CANCELLED') {
        setError({ message: 'This payment session has expired', code: 'SESSION_EXPIRED' });
        setState('expired');
        return;
      }

      // Map API response to session object
      setSession({
        id: data.id,
        externalId: data.external_id || sessionId!,
        merchantId: data.merchant_id,
        status: data.status,
        amount: data.amount,
        currencyCode: data.currency_code || 'SLE',
        description: data.description,
        merchantName: data.merchant_name || 'Merchant',
        merchantLogoUrl: data.merchant_logo_url,
        merchantIsVerified: data.merchant_is_verified,
        paymentMethods: data.payment_methods || { qr: true, card: true, mobile: true },
        expiresAt: data.expires_at,
        reference: data.reference,
        metadata: data.metadata,
      });

      setState('ready');
    } catch (err: any) {
      console.error('[EmbedCheckout] Failed to fetch session:', err);
      setError({ message: err.message || 'Failed to load checkout', code: 'FETCH_ERROR' });
      setState('error');
    }
  };

  // Handle successful payment
  const handlePaymentComplete = (result: any) => {
    const paymentResult: PaymentResult = {
      transactionId: result.transactionId || result.transaction_id,
      reference: result.reference || session?.reference,
      status: 'success',
    };

    setPaymentResult(paymentResult);
    setState('success');
    sendToParent({ type: 'PEEAP_SUCCESS', result: paymentResult });
  };

  // Handle payment error
  const handlePaymentError = (err: PaymentError) => {
    setError(err);
    setState('error');
    sendToParent({ type: 'PEEAP_ERROR', error: err });
  };

  // Handle close
  const handleClose = () => {
    sendToParent({ type: 'PEEAP_CLOSE' });
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setState('ready');
  };

  // Handle back to method selection
  const handleBack = () => {
    setError(null);
    setState('ready');
  };

  // Render loading state
  if (state === 'loading') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    );
  }

  // Render error state
  if (state === 'error' || state === 'expired') {
    return (
      <div className="min-h-[400px] bg-white rounded-2xl overflow-hidden">
        <PaymentError
          message={error?.message || 'An error occurred'}
          code={error?.code}
          onRetry={state === 'error' ? handleRetry : undefined}
          onClose={handleClose}
        />
      </div>
    );
  }

  // Render success state
  if (state === 'success' && session) {
    return (
      <div className="min-h-[400px] bg-white rounded-2xl overflow-hidden">
        <PaymentSuccess
          amount={session.amount}
          currency={session.currencyCode}
          transactionId={paymentResult?.transactionId}
          merchantName={session.merchantName}
          onComplete={handleClose}
        />
      </div>
    );
  }

  // Render checkout
  if (!session) return null;

  return (
    <div className="min-h-[400px] bg-white rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <EmbedHeader
        merchantName={session.merchantName}
        merchantLogo={session.merchantLogoUrl}
        isVerified={session.merchantIsVerified}
        amount={session.amount}
        currency={session.currencyCode}
        description={session.description}
        onClose={handleClose}
      />

      {/* Payment Method Tabs */}
      <PaymentTabs
        selectedMethod={selectedMethod}
        onMethodChange={setSelectedMethod}
        enabledMethods={{
          qr: session.paymentMethods.qr !== false,
          card: session.paymentMethods.card !== false,
          orange: session.paymentMethods.mobile !== false,
        }}
      />

      {/* Payment Method Content */}
      <div className="min-h-[300px]">
        {selectedMethod === 'qr' && (
          <QRPaymentTab
            sessionId={session.externalId}
            amount={session.amount}
            currency={session.currencyCode}
            merchantName={session.merchantName}
            onPaymentComplete={handlePaymentComplete}
            onError={handlePaymentError}
          />
        )}

        {selectedMethod === 'card' && (
          <CardPaymentTab
            sessionId={session.externalId}
            amount={session.amount}
            currency={session.currencyCode}
            onPaymentComplete={handlePaymentComplete}
            onError={handlePaymentError}
          />
        )}

        {selectedMethod === 'orange' && (
          <OrangeMoneyTab
            sessionId={session.externalId}
            amount={session.amount}
            currency={session.currencyCode}
            onPaymentComplete={handlePaymentComplete}
            onError={handlePaymentError}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <a
            href="https://my.peeap.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:text-indigo-600"
          >
            Peeap
          </a>
        </p>
      </div>
    </div>
  );
}

export default EmbedCheckoutPage;
