/**
 * usePaymentReceiver Hook
 *
 * STANDARDIZED PAYMENT RECEIVING SYSTEM
 *
 * ============================================================
 * RULES:
 * 1. All QR codes in the system MUST be connected to a wallet
 * 2. Every payment MUST have a unique reference for tracking
 * 3. Every payment SHOULD have a note/description
 * 4. Payment completion MUST be verified against the reference
 * ============================================================
 *
 * Flow:
 * 1. Create a checkout session linked to the recipient wallet
 * 2. Generate unique reference for tracking
 * 3. Generate QR code pointing to checkout
 * 4. Poll/listen for payment completion
 * 5. VERIFY payment reference matches before confirming
 * 6. Callback when payment is verified and received
 *
 * Guards:
 * - Reference: Unique ID that travels with payment (e.g., POS-1234567890-abc123)
 * - Note: Description of what payment is for (e.g., "POS Sale - 3 items")
 * - Amount verification: Confirms paid amount matches expected
 * - Session verification: Confirms session ID matches
 *
 * Usage:
 * ```tsx
 * const payment = usePaymentReceiver({
 *   walletId: merchantWalletId,
 *   amount: 1000,
 *   note: 'Invoice #12345',  // IMPORTANT: Always provide a note
 *   onPaymentReceived: (session) => {
 *     // session.reference - the unique reference
 *     // session.verified - true if all guards passed
 *     processSale();
 *   },
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Types
export interface PaymentReceiverConfig {
  /** The wallet ID that will receive the payment (REQUIRED) */
  walletId: string;
  /** The user ID who owns the wallet */
  userId: string;
  /** Payment amount (REQUIRED for QR payments) */
  amount: number;
  /** Currency code (defaults to SLE) */
  currency?: string;
  /**
   * Payment note - IMPORTANT: Always provide this for tracking
   * This identifies what the payment is for (e.g., "Invoice #123", "POS Sale")
   */
  note?: string;
  /** Payment description shown to customer */
  description?: string;
  /** Merchant/Business name to display */
  merchantName?: string;
  /**
   * Custom reference for tracking (auto-generated if not provided)
   * Format: {PREFIX}-{TIMESTAMP}-{RANDOM}
   */
  reference?: string;
  /** Reference prefix (default: 'PAY') */
  referencePrefix?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Callback when payment is received and VERIFIED */
  onPaymentReceived?: (session: VerifiedPayment) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback on session expiry */
  onExpired?: () => void;
  /** Auto-start session creation (default: true) */
  autoStart?: boolean;
  /** Polling interval in ms (default: 2000) */
  pollingInterval?: number;
  /** Strict mode - fail if verification doesn't pass (default: true) */
  strictVerification?: boolean;
}

export interface CheckoutSession {
  id: string;
  externalId?: string;
  status: 'OPEN' | 'COMPLETE' | 'EXPIRED' | 'CANCELLED' | 'PAID';
  amount: number;
  currency: string;
  reference?: string;
  note?: string;
  paidAt?: string;
  transactionId?: string;
}

/** Payment that has been verified against guards */
export interface VerifiedPayment extends CheckoutSession {
  /** Whether all verification guards passed */
  verified: boolean;
  /** Individual verification results */
  verification: {
    /** Reference matches what we sent */
    referenceMatch: boolean;
    /** Amount matches expected (within tolerance) */
    amountMatch: boolean;
    /** Session ID matches */
    sessionMatch: boolean;
  };
  /** The expected amount we were waiting for */
  expectedAmount: number;
  /** The note/description we sent */
  note: string;
}

export type PaymentStatus = 'idle' | 'creating' | 'pending' | 'paid' | 'expired' | 'error';

export interface PaymentReceiverResult {
  /** Current status of the payment */
  status: PaymentStatus;
  /** Whether the session is being created */
  isCreating: boolean;
  /** Whether the QR is ready to display */
  isReady: boolean;
  /** Whether payment is pending (waiting for customer) */
  isPending: boolean;
  /** Whether payment was received */
  isPaid: boolean;
  /** Whether session expired */
  isExpired: boolean;
  /** Whether there was an error */
  isError: boolean;
  /** The checkout session ID */
  sessionId: string | null;
  /** The checkout URL for QR code */
  checkoutUrl: string | null;
  /** The session reference */
  reference: string | null;
  /** Error message if any */
  error: string | null;
  /** Session data when completed */
  session: CheckoutSession | null;
  /** Create/recreate the checkout session */
  createSession: () => Promise<void>;
  /** Cancel and cleanup */
  cancel: () => void;
  /** Reset to initial state */
  reset: () => void;
}

// API endpoint
const getApiBase = () => import.meta.env.VITE_API_URL || 'https://peeap.vercel.app/api';

/**
 * Hook for receiving payments to a wallet via QR code
 */
export function usePaymentReceiver(config: PaymentReceiverConfig): PaymentReceiverResult {
  const {
    walletId,
    userId,
    amount,
    currency = 'SLE',
    note,
    description,
    merchantName,
    reference: customReference,
    referencePrefix = 'PAY',
    metadata,
    onPaymentReceived,
    onError,
    onExpired,
    autoStart = true,
    pollingInterval = 2000,
    strictVerification = true,
  } = config;

  // State
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);

  // Refs
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Generate unique reference with prefix
  const generateReference = useCallback(() => {
    return customReference || `${referencePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }, [customReference, referencePrefix]);

  // Create checkout session
  const createSession = useCallback(async () => {
    if (!walletId || !userId || amount <= 0) {
      const err = new Error('walletId, userId, and positive amount are required');
      setError(err.message);
      setStatus('error');
      onError?.(err);
      return;
    }

    // Cleanup any existing polling
    stopPolling();

    setStatus('creating');
    setError(null);
    setSession(null);

    const paymentReference = generateReference();
    setReference(paymentReference);

    try {
      const API_BASE = getApiBase();

      // Build note for tracking - this travels with the payment
      const paymentNote = note || description || `Payment of ${currency} ${amount.toLocaleString()}`;

      const response = await fetch(`${API_BASE}/router/checkout/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          description: description || `Payment of ${currency} ${amount.toLocaleString()}`,
          recipientId: userId,
          recipientWalletId: walletId,
          recipientName: merchantName || 'Payment',
          reference: paymentReference,
          note: paymentNote,
          metadata: {
            ...metadata,
            source: 'payment_receiver',
            walletId,
            note: paymentNote,
            expectedAmount: amount,
            referencePrefix,
          },
        }),
      });

      const data = await response.json();

      if (!isMountedRef.current) return;

      if (data.sessionId) {
        const url = `${window.location.origin}/checkout/pay/${data.sessionId}`;
        setSessionId(data.sessionId);
        setCheckoutUrl(url);
        setStatus('pending');

        console.log('[PaymentReceiver] Session created:', data.sessionId);

        // Start polling for status
        pollingRef.current = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${API_BASE}/router/checkout/sessions/${data.sessionId}`);
            const sessionData = await statusResponse.json();

            if (!isMountedRef.current) return;

            console.log('[PaymentReceiver] Session status:', sessionData.status);

            if (sessionData.status === 'COMPLETE' || sessionData.status === 'PAID') {
              stopPolling();

              // Extract values for verification
              const receivedAmount = sessionData.amount || 0;
              const receivedReference = sessionData.reference || '';
              const receivedSessionId = sessionData.id || data.sessionId;

              // Perform verification checks
              const referenceMatch = receivedReference === paymentReference;
              const amountMatch = Math.abs(receivedAmount - amount) < 0.01; // Allow tiny floating point variance
              const sessionMatch = receivedSessionId === data.sessionId;

              // All guards must pass for full verification
              const verified = referenceMatch && amountMatch && sessionMatch;

              console.log('[PaymentReceiver] Verification:', {
                referenceMatch,
                amountMatch,
                sessionMatch,
                verified,
                expected: { reference: paymentReference, amount, sessionId: data.sessionId },
                received: { reference: receivedReference, amount: receivedAmount, sessionId: receivedSessionId },
              });

              const verifiedPayment: VerifiedPayment = {
                id: data.sessionId,
                externalId: sessionData.externalId || sessionData.external_id,
                status: sessionData.status,
                amount: receivedAmount,
                currency: sessionData.currency || currency,
                reference: receivedReference,
                note: paymentNote,
                paidAt: sessionData.paidAt || sessionData.paid_at || new Date().toISOString(),
                transactionId: sessionData.transactionId || sessionData.transaction_id,
                verified,
                verification: {
                  referenceMatch,
                  amountMatch,
                  sessionMatch,
                },
                expectedAmount: amount,
              };

              setSession(verifiedPayment);
              setStatus('paid');

              // Only trigger callback if verified OR if strict mode is off
              if (verified || !strictVerification) {
                onPaymentReceived?.(verifiedPayment);
              } else {
                console.warn('[PaymentReceiver] Payment received but verification failed!', verifiedPayment.verification);
                const err = new Error('Payment verification failed - reference or amount mismatch');
                setError(err.message);
                onError?.(err);
              }
            } else if (sessionData.status === 'EXPIRED') {
              stopPolling();
              setStatus('expired');
              onExpired?.();
            } else if (sessionData.status === 'CANCELLED') {
              stopPolling();
              setStatus('idle');
            }
          } catch (pollError) {
            console.error('[PaymentReceiver] Polling error:', pollError);
            // Don't stop polling on network errors - keep trying
          }
        }, pollingInterval);
      } else {
        throw new Error(data.error || 'Failed to create payment session');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('[PaymentReceiver] Error:', err);
      setError(err.message || 'Failed to create payment session');
      setStatus('error');
      onError?.(err);
    }
  }, [
    walletId,
    userId,
    amount,
    currency,
    note,
    description,
    merchantName,
    referencePrefix,
    metadata,
    generateReference,
    stopPolling,
    pollingInterval,
    strictVerification,
    onPaymentReceived,
    onError,
    onExpired,
  ]);

  // Cancel and cleanup
  const cancel = useCallback(() => {
    stopPolling();
    setStatus('idle');
  }, [stopPolling]);

  // Reset to initial state
  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setSessionId(null);
    setCheckoutUrl(null);
    setReference(null);
    setError(null);
    setSession(null);
  }, [stopPolling]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (autoStart && walletId && userId && amount > 0) {
      createSession();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, []); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    isCreating: status === 'creating',
    isReady: status === 'pending' && !!checkoutUrl,
    isPending: status === 'pending',
    isPaid: status === 'paid',
    isExpired: status === 'expired',
    isError: status === 'error',
    sessionId,
    checkoutUrl,
    reference,
    error,
    session,
    createSession,
    cancel,
    reset,
  };
}

export default usePaymentReceiver;
