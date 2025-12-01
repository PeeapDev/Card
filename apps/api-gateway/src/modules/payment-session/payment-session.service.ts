/**
 * Peeap Pay Payment Session Service
 *
 * Handles:
 * - Payment session creation
 * - Signature validation
 * - Expiry handling
 * - Web checkout rendering
 * - App deep link redirect
 * - Web NFC events
 */

import { Injectable } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import { CardEngineService } from '../card-engine/card-engine.service';
import * as crypto from 'crypto';

export interface PaymentSession {
  id: string;
  token: string;
  cardId?: string;
  merchantId: string;
  merchantName?: string;
  merchantLogo?: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  type: 'nfc' | 'qr' | 'web' | 'app';
  source: 'tap' | 'scan' | 'link' | 'api';
  metadata?: Record<string, unknown>;
  customer?: {
    id?: string;
    email?: string;
    phone?: string;
  };
  redirectUrl?: string;
  callbackUrl?: string;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export interface CreateSessionRequest {
  merchantId: string;
  merchantName?: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  customer?: {
    email?: string;
    phone?: string;
  };
  redirectUrl?: string;
  callbackUrl?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

export interface SessionVerificationResult {
  valid: boolean;
  session?: PaymentSession;
  error?: string;
  errorCode?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  sessionId?: string;
  redirectUrl?: string;
  error?: string;
}

@Injectable()
export class PaymentSessionService {
  private readonly PAY_DOMAIN = 'pay.peeap.com';
  private readonly APP_SCHEME = 'peeappay';
  private sessionStore: Map<string, PaymentSession> = new Map();

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly cardEngineService: CardEngineService
  ) {}

  /**
   * Create a new payment session
   */
  async createSession(request: CreateSessionRequest): Promise<PaymentSession> {
    const id = `ps_${crypto.randomBytes(16).toString('hex')}`;
    const expiresIn = request.expiresIn || 900; // 15 minutes default

    // Create signed session token
    const token = this.cryptoService.createSessionToken(
      id,
      request.amount,
      request.currency,
      request.merchantId
    );

    const session: PaymentSession = {
      id,
      token,
      merchantId: request.merchantId,
      merchantName: request.merchantName,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      reference: request.reference,
      status: 'pending',
      type: 'web',
      source: 'api',
      customer: request.customer,
      redirectUrl: request.redirectUrl,
      callbackUrl: request.callbackUrl,
      metadata: request.metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (expiresIn * 1000))
    };

    this.sessionStore.set(id, session);

    return session;
  }

  /**
   * Verify a session token (from NFC tap or QR scan)
   */
  verifySession(token: string): SessionVerificationResult {
    const verification = this.cryptoService.verifyToken(token);

    if (!verification.valid) {
      return {
        valid: false,
        error: verification.error,
        errorCode: 'INVALID_TOKEN'
      };
    }

    // Check if payload contains session ID
    const payload = verification.payload;
    if (!payload) {
      return {
        valid: false,
        error: 'Invalid token payload',
        errorCode: 'INVALID_PAYLOAD'
      };
    }

    // Find session by card ID (for NFC/QR) or create temporary session
    let session: PaymentSession | undefined;

    // Check for existing session
    for (const s of this.sessionStore.values()) {
      if (s.token === token) {
        session = s;
        break;
      }
    }

    if (!session) {
      // Create ad-hoc session from token
      session = {
        id: `ps_adhoc_${crypto.randomBytes(8).toString('hex')}`,
        token,
        cardId: payload.cardId,
        merchantId: payload.merchantId || 'unknown',
        amount: payload.amount || 0,
        currency: payload.currency || 'USD',
        status: 'pending',
        type: payload.type as 'nfc' | 'qr' | 'web' | 'app',
        source: payload.type === 'nfc' ? 'tap' : 'scan',
        createdAt: new Date(),
        expiresAt: new Date(payload.expiresAt || Date.now() + 300000)
      };

      this.sessionStore.set(session.id, session);
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      session.status = 'expired';
      return {
        valid: false,
        error: 'Session has expired',
        errorCode: 'SESSION_EXPIRED'
      };
    }

    // Check status
    if (session.status !== 'pending') {
      return {
        valid: false,
        error: `Session is ${session.status}`,
        errorCode: 'INVALID_SESSION_STATUS'
      };
    }

    return {
      valid: true,
      session
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<PaymentSession | null> {
    return this.sessionStore.get(sessionId) || null;
  }

  /**
   * Get payment URL for session
   */
  getPaymentUrl(session: PaymentSession): string {
    return `https://${this.PAY_DOMAIN}/t/${session.token}`;
  }

  /**
   * Get deep link for mobile app
   */
  getDeepLink(session: PaymentSession): string {
    return `${this.APP_SCHEME}://pay?session=${session.id}&token=${session.token}`;
  }

  /**
   * Get universal link (iOS)
   */
  getUniversalLink(session: PaymentSession): string {
    return `https://${this.PAY_DOMAIN}/app/pay?session=${session.id}`;
  }

  /**
   * Process payment for session
   */
  async processPayment(sessionId: string, cardId: string, pin?: string): Promise<PaymentResult> {
    const session = this.sessionStore.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== 'pending') {
      return { success: false, error: `Session is ${session.status}` };
    }

    if (session.expiresAt < new Date()) {
      session.status = 'expired';
      return { success: false, error: 'Session has expired' };
    }

    // Validate card
    const validation = await this.cardEngineService.validateCardForTransaction(
      cardId,
      session.amount,
      session.merchantId
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Update session
    session.status = 'processing';
    session.cardId = cardId;

    // Process payment (in production, call wallet/payment service)
    const transactionId = `txn_${crypto.randomBytes(16).toString('hex')}`;

    session.status = 'completed';
    session.completedAt = new Date();

    // Trigger callback if configured
    if (session.callbackUrl) {
      this.sendCallback(session, transactionId).catch(console.error);
    }

    return {
      success: true,
      transactionId,
      sessionId: session.id,
      redirectUrl: session.redirectUrl
    };
  }

  /**
   * Send callback to merchant
   */
  private async sendCallback(session: PaymentSession, transactionId: string): Promise<void> {
    if (!session.callbackUrl) return;

    try {
      const callbackData = {
        event: 'payment.completed',
        sessionId: session.id,
        transactionId,
        amount: session.amount,
        currency: session.currency,
        merchantId: session.merchantId,
        reference: session.reference,
        timestamp: new Date().toISOString()
      };

      // Sign callback
      const signature = this.cryptoService.hash(
        JSON.stringify(callbackData) + session.id
      );

      // In production, use HTTP client
      console.log(`[PaymentSession] Callback to ${session.callbackUrl}:`, {
        data: callbackData,
        signature
      });
    } catch (error) {
      console.error('[PaymentSession] Callback failed:', error);
    }
  }

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    const session = this.sessionStore.get(sessionId);
    if (session && session.status === 'pending') {
      session.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get checkout page data
   */
  getCheckoutData(session: PaymentSession): {
    sessionId: string;
    merchantName?: string;
    merchantLogo?: string;
    amount: number;
    currency: string;
    description?: string;
    expiresAt: string;
    deepLink: string;
    universalLink: string;
    qrUrl: string;
    isExpired: boolean;
  } {
    return {
      sessionId: session.id,
      merchantName: session.merchantName,
      merchantLogo: session.merchantLogo,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      expiresAt: session.expiresAt.toISOString(),
      deepLink: this.getDeepLink(session),
      universalLink: this.getUniversalLink(session),
      qrUrl: this.getPaymentUrl(session),
      isExpired: session.expiresAt < new Date()
    };
  }

  /**
   * Handle Web NFC read event
   */
  async handleWebNFCRead(token: string, userAgent: string): Promise<{
    action: 'redirect' | 'checkout' | 'error';
    url?: string;
    session?: PaymentSession;
    error?: string;
  }> {
    const verification = this.verifySession(token);

    if (!verification.valid) {
      return {
        action: 'error',
        error: verification.error
      };
    }

    const session = verification.session!;

    // Check if request is from Peeap app
    const isPeeapApp = userAgent.includes('PeeapPay');

    if (isPeeapApp) {
      // Return deep link for app handling
      return {
        action: 'redirect',
        url: this.getDeepLink(session),
        session
      };
    }

    // Check for iOS/Android app availability
    const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
    const isAndroid = userAgent.includes('Android');

    if (isIOS || isAndroid) {
      // Try universal/app link first, fallback to checkout
      return {
        action: 'checkout',
        url: this.getUniversalLink(session),
        session
      };
    }

    // Desktop or unknown - show web checkout
    return {
      action: 'checkout',
      session
    };
  }
}
