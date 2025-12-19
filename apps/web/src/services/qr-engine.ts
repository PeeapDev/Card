/**
 * QR Engine Service
 *
 * Generates and validates QR codes for payments:
 * - Static QR (merchant receives payments)
 * - Dynamic QR (specific amount/transaction)
 * - Payment requests
 */

import { supabase } from '@/lib/supabase';
import { currencyService } from './currency.service';

export interface QRPaymentData {
  type: 'payment' | 'request' | 'merchant' | 'event_ticket';
  version: string;
  userId: string;
  walletId?: string;
  amount?: number;
  currency: string;
  reference: string;
  expiresAt?: string;
  merchantName?: string;
  description?: string;
  metadata?: Record<string, any>;
  // Event ticket specific fields
  eventId?: string;
  ticketNumber?: string;
}

export interface GeneratedQR {
  qrData: string;
  reference: string;
  expiresAt: string;
  deepLink: string;
}

export interface QRValidationResult {
  valid: boolean;
  expired?: boolean;
  data?: QRPaymentData;
  error?: string;
  recipient?: {
    id: string;
    name: string;
    walletId: string;
  };
  checkoutSessionId?: string; // For URL-based checkout QR codes
  // Event ticket specific fields
  isEventTicket?: boolean;
  eventTicket?: {
    eventId: string;
    ticketNumber: string;
  };
}

class QREngineService {
  private readonly QR_VERSION = '1.0';
  private readonly QR_PREFIX = 'PEEAPPAY';

  /**
   * Generate a unique reference for QR codes
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `QR${timestamp}${random}`.toUpperCase();
  }

  /**
   * Generate expiration time (default 15 minutes for dynamic QR)
   */
  private getExpiration(minutes: number = 15): string {
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  /**
   * Encode QR data to string
   */
  private encodeQRData(data: QRPaymentData): string {
    const payload = {
      p: this.QR_PREFIX,
      v: data.version,
      t: data.type,
      u: data.userId,
      w: data.walletId,
      a: data.amount,
      c: data.currency,
      r: data.reference,
      e: data.expiresAt,
      m: data.merchantName,
      d: data.description,
    };

    // Remove undefined values
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    return btoa(JSON.stringify(cleanPayload));
  }

  /**
   * Decode QR data from string
   */
  private decodeQRData(encoded: string): QRPaymentData | null {
    try {
      const decoded = JSON.parse(atob(encoded));

      if (decoded.p !== this.QR_PREFIX) {
        return null;
      }

      return {
        type: decoded.t,
        version: decoded.v,
        userId: decoded.u,
        walletId: decoded.w,
        amount: decoded.a,
        currency: decoded.c || 'USD',
        reference: decoded.r,
        expiresAt: decoded.e,
        merchantName: decoded.m,
        description: decoded.d,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate a static QR code for receiving payments (no amount)
   */
  async generateStaticQR(userId: string, walletId: string, currency?: string): Promise<GeneratedQR> {
    if (!userId || !walletId) {
      throw new Error('userId and walletId are required');
    }

    const reference = this.generateReference();

    // Get default currency if not provided
    const defaultCurrency = currency || (await currencyService.getDefaultCurrency()).code;

    const data: QRPaymentData = {
      type: 'payment',
      version: this.QR_VERSION,
      userId,
      walletId,
      currency: defaultCurrency,
      reference,
    };

    const qrData = this.encodeQRData(data);
    // Use direct user/wallet URL for universal scanability (works even without qr_codes table)
    const deepLink = `${window.location.origin}/pay?to=${userId}&wallet=${walletId}`;

    // Store QR in database for tracking (optional - table may not exist)
    try {
      await supabase.from('qr_codes').insert({
        reference,
        user_id: userId,
        wallet_id: walletId,
        type: 'static',
        qr_data: qrData,
        status: 'active',
      });
    } catch {
      // Table might not exist yet, continue anyway
    }

    return {
      qrData,
      reference,
      expiresAt: '', // Static QR doesn't expire
      deepLink,
    };
  }

  /**
   * Generate a dynamic QR code with specific amount
   */
  async generateDynamicQR(
    userId: string,
    walletId: string,
    amount: number,
    description?: string,
    expirationMinutes: number = 15,
    currency?: string
  ): Promise<GeneratedQR> {
    if (!userId || !walletId) {
      throw new Error('userId and walletId are required');
    }

    const reference = this.generateReference();
    const expiresAt = this.getExpiration(expirationMinutes);

    // Get default currency if not provided
    const defaultCurrency = currency || (await currencyService.getDefaultCurrency()).code;

    const data: QRPaymentData = {
      type: 'request',
      version: this.QR_VERSION,
      userId,
      walletId,
      amount,
      currency: defaultCurrency,
      reference,
      expiresAt,
      description,
    };

    const qrData = this.encodeQRData(data);
    // Use direct user/wallet URL for universal scanability (works even without qr_codes table)
    const deepLink = `${window.location.origin}/pay?to=${userId}&wallet=${walletId}&amount=${amount}${description ? `&note=${encodeURIComponent(description)}` : ''}`;

    // Store QR in database (optional - table may not exist)
    try {
      await supabase.from('qr_codes').insert({
        reference,
        user_id: userId,
        wallet_id: walletId,
        type: 'dynamic',
        amount,
        description,
        qr_data: qrData,
        expires_at: expiresAt,
        status: 'active',
      });
    } catch {
    }

    return {
      qrData,
      reference,
      expiresAt,
      deepLink,
    };
  }

  /**
   * Generate merchant QR code
   */
  async generateMerchantQR(
    userId: string,
    walletId: string,
    merchantName: string,
    amount?: number,
    currency?: string
  ): Promise<GeneratedQR> {
    const reference = this.generateReference();
    const expiresAt = amount ? this.getExpiration(60) : ''; // 1 hour for amount-specific

    // Get default currency if not provided
    const defaultCurrency = currency || (await currencyService.getDefaultCurrency()).code;

    const data: QRPaymentData = {
      type: 'merchant',
      version: this.QR_VERSION,
      userId,
      walletId,
      amount,
      currency: defaultCurrency,
      reference,
      expiresAt: expiresAt || undefined,
      merchantName,
    };

    const qrData = this.encodeQRData(data);
    // Use direct user/wallet URL for universal scanability (works even without qr_codes table)
    let deepLink = `${window.location.origin}/pay?to=${userId}&wallet=${walletId}&merchant=${encodeURIComponent(merchantName)}`;
    if (amount) {
      deepLink += `&amount=${amount}`;
    }

    try {
      await supabase.from('qr_codes').insert({
        reference,
        user_id: userId,
        wallet_id: walletId,
        type: 'merchant',
        amount,
        merchant_name: merchantName,
        qr_data: qrData,
        expires_at: expiresAt || null,
        status: 'active',
      });
    } catch {
      // Ignore errors
    }

    return {
      qrData,
      reference,
      expiresAt,
      deepLink,
    };
  }

  /**
   * Parse event ticket QR code
   * Format: PEEAP-EVT-{eventId}-{ticketNumber}
   */
  private parseEventTicketQR(qrData: string): { eventId: string; ticketNumber: string } | null {
    // Check for PEEAP-EVT- prefix
    const eventTicketPattern = /^PEEAP-EVT-([0-9a-f-]+)-(.+)$/i;
    const match = qrData.match(eventTicketPattern);

    if (match) {
      return {
        eventId: match[1],
        ticketNumber: match[2],
      };
    }

    return null;
  }

  /**
   * Check if QR data is a URL and extract payment info
   */
  private parseURLQR(qrData: string): { type: 'checkout' | 'pay' | 'qr' | 'scan-pay' | 'wallet' | 'user' | 'event-ticket'; id: string; walletId?: string; userId?: string; eventId?: string; ticketNumber?: string } | null {
    try {
      // Check if it's a URL (case-insensitive)
      const lowerData = qrData.toLowerCase();
      if (!lowerData.startsWith('http://') && !lowerData.startsWith('https://')) {
        console.log('[QR Engine] Not a URL:', qrData.substring(0, 50));
        return null;
      }

      const url = new URL(qrData);
      const pathname = url.pathname;
      console.log('[QR Engine] Parsing URL:', url.href, 'pathname:', pathname);

      // Handle /scan-pay/{sessionId} format (QR scan from checkout)
      const scanPayMatch = pathname.match(/\/scan-pay\/([^/]+)$/);
      if (scanPayMatch) {
        console.log('[QR Engine] Matched scan-pay pattern, sessionId:', scanPayMatch[1]);
        return { type: 'scan-pay', id: scanPayMatch[1] };
      }

      // Handle /events/{eventId}/validate/{ticketNumber} format (event ticket)
      const eventTicketMatch = pathname.match(/\/events\/([^/]+)\/validate\/([^/]+)$/);
      if (eventTicketMatch) {
        console.log('[QR Engine] Matched event ticket pattern, eventId:', eventTicketMatch[1], 'ticketNumber:', eventTicketMatch[2]);
        return { type: 'event-ticket', id: eventTicketMatch[2], eventId: eventTicketMatch[1], ticketNumber: eventTicketMatch[2] };
      }

      // Handle /ticket/{ticketNumber} format (event ticket)
      const ticketMatch = pathname.match(/\/ticket\/([^/]+)$/);
      if (ticketMatch) {
        // Check for event ID in query params
        const eventId = url.searchParams.get('event');
        if (eventId) {
          return { type: 'event-ticket', id: ticketMatch[1], eventId, ticketNumber: ticketMatch[1] };
        }
      }

      // Handle /pay/{sessionId} format (hosted checkout)
      const payMatch = pathname.match(/\/pay\/([^/]+)$/);
      if (payMatch) {
        return { type: 'checkout', id: payMatch[1] };
      }

      // Handle /checkout/pay/{sessionId} format
      const checkoutMatch = pathname.match(/\/checkout\/pay\/([^/]+)$/);
      if (checkoutMatch) {
        return { type: 'checkout', id: checkoutMatch[1] };
      }

      // Handle /wallet/{walletId} format (direct wallet payment)
      const walletMatch = pathname.match(/\/wallet\/([^/]+)$/);
      if (walletMatch) {
        return { type: 'wallet', id: walletMatch[1], walletId: walletMatch[1] };
      }

      // Handle /receive/{userId} or /user/{userId} format (user payment)
      const userMatch = pathname.match(/\/(receive|user)\/([^/]+)$/);
      if (userMatch) {
        return { type: 'user', id: userMatch[2], userId: userMatch[2] };
      }

      // Handle /send-to/{userId} format
      const sendToMatch = pathname.match(/\/send-to\/([^/]+)$/);
      if (sendToMatch) {
        return { type: 'user', id: sendToMatch[1], userId: sendToMatch[1] };
      }

      // Handle query parameters
      const qrParam = url.searchParams.get('qr');
      if (qrParam) {
        return { type: 'qr', id: qrParam };
      }

      // Handle ?to={userId}&wallet={walletId} format (new unified format)
      const userParam = url.searchParams.get('user') || url.searchParams.get('to') || url.searchParams.get('recipient');
      const walletParam = url.searchParams.get('wallet');

      // If we have both user and wallet, use user type with wallet attached
      if (userParam) {
        return { type: 'user', id: userParam, userId: userParam, walletId: walletParam || undefined };
      }

      // Handle ?wallet={walletId} format (wallet only)
      if (walletParam) {
        return { type: 'wallet', id: walletParam, walletId: walletParam };
      }

      console.log('[QR Engine] No URL pattern matched for:', pathname);
      return null;
    } catch (err) {
      console.error('[QR Engine] URL parsing error:', err);
      return null;
    }
  }

  /**
   * Validate and decode a scanned QR code
   */
  async validateQR(qrData: string): Promise<QRValidationResult> {
    // Clean up the QR data - trim whitespace and handle case
    const cleanedData = qrData.trim();
    console.log('[QR Engine] validateQR called with:', cleanedData.substring(0, 100), 'length:', cleanedData.length);

    // First, check if it's an event ticket QR code (PEEAP-EVT-{eventId}-{ticketNumber})
    const eventTicketData = this.parseEventTicketQR(cleanedData);
    if (eventTicketData) {
      console.log('[QR Engine] Event ticket parsed:', eventTicketData);
      return {
        valid: true,
        isEventTicket: true,
        eventTicket: eventTicketData,
        data: {
          type: 'event_ticket',
          version: this.QR_VERSION,
          userId: '',
          currency: '',
          reference: eventTicketData.ticketNumber,
          eventId: eventTicketData.eventId,
          ticketNumber: eventTicketData.ticketNumber,
        },
      };
    }

    // Check if it's a URL-based QR code
    const urlData = this.parseURLQR(cleanedData);
    if (urlData) {
      console.log('[QR Engine] URL parsed successfully:', urlData);

      // Handle event ticket URL
      if (urlData.type === 'event-ticket' && urlData.eventId && urlData.ticketNumber) {
        return {
          valid: true,
          isEventTicket: true,
          eventTicket: {
            eventId: urlData.eventId,
            ticketNumber: urlData.ticketNumber,
          },
          data: {
            type: 'event_ticket',
            version: this.QR_VERSION,
            userId: '',
            currency: '',
            reference: urlData.ticketNumber,
            eventId: urlData.eventId,
            ticketNumber: urlData.ticketNumber,
          },
        };
      }

      if (urlData.type === 'scan-pay' || urlData.type === 'checkout') {
        // It's a checkout session QR - return the session ID for payment processing
        const result = {
          valid: true,
          data: {
            type: 'merchant' as const,
            version: '1.0',
            userId: '',
            currency: 'SLE',
            reference: urlData.id,
          },
          checkoutSessionId: urlData.id,
        };
        console.log('[QR Engine] Returning checkout session result:', result);
        return result;
      }

      if (urlData.type === 'wallet' && urlData.walletId) {
        // It's a wallet QR - look up wallet and user
        return this.validateWalletQR(urlData.walletId);
      }

      if (urlData.type === 'user' && urlData.userId) {
        // It's a user QR - look up user and use provided wallet if available
        return this.validateUserQR(urlData.userId, urlData.walletId);
      }

      if (urlData.type === 'qr') {
        // It's a QR reference - validate by reference
        return this.validateQRByReference(urlData.id);
      }
    }

    // Check if it looks like a UUID (wallet ID or user ID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(cleanedData)) {
      // Try as wallet ID first
      const walletResult = await this.validateWalletQR(cleanedData);
      if (walletResult.valid) {
        return walletResult;
      }
      // Then try as user ID
      const userResult = await this.validateUserQR(cleanedData);
      if (userResult.valid) {
        return userResult;
      }
    }

    // Try to decode as base64-encoded PEEAPPAY format
    const data = this.decodeQRData(cleanedData);

    if (!data) {
      return { valid: false, error: 'Invalid QR code format. Please scan a valid Peeap payment QR code.' };
    }

    // Check expiration for dynamic QR codes
    if (data.expiresAt) {
      const expiry = new Date(data.expiresAt);
      if (expiry < new Date()) {
        return { valid: false, expired: true, error: 'QR code has expired' };
      }
    }

    // Fetch recipient details
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', data.userId)
      .single();

    if (!user) {
      return { valid: false, error: 'Recipient not found' };
    }

    // Get wallet ID if not provided
    let walletId = data.walletId;
    if (!walletId) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', data.userId)
        .eq('wallet_type', 'primary')
        .single();

      walletId = wallet?.id;
    }

    return {
      valid: true,
      data,
      recipient: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        walletId: walletId || '',
      },
    };
  }

  /**
   * Validate QR by reference (from URL)
   */
  async validateQRByReference(reference: string): Promise<QRValidationResult> {
    const { data: qrRecord } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('reference', reference)
      .eq('status', 'active')
      .single();

    if (!qrRecord) {
      return { valid: false, error: 'QR code not found or inactive' };
    }

    if (qrRecord.expires_at && new Date(qrRecord.expires_at) < new Date()) {
      return { valid: false, expired: true, error: 'QR code has expired' };
    }

    return this.validateQR(qrRecord.qr_data);
  }

  /**
   * Mark QR as used after successful payment
   */
  async markQRAsUsed(reference: string, transactionId: string): Promise<void> {
    await supabase
      .from('qr_codes')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        transaction_id: transactionId,
      })
      .eq('reference', reference);
  }

  /**
   * Validate a wallet QR code (direct wallet payment)
   */
  async validateWalletQR(walletId: string): Promise<QRValidationResult> {
    try {
      // Look up wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, user_id, currency, wallet_type, balance')
        .eq('id', walletId)
        .single();

      if (walletError || !wallet) {
        return { valid: false, error: 'Wallet not found' };
      }

      // Get user info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', wallet.user_id)
        .single();

      if (userError || !user) {
        return { valid: false, error: 'Wallet owner not found' };
      }

      const recipientName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';

      return {
        valid: true,
        data: {
          type: 'payment',
          version: this.QR_VERSION,
          userId: wallet.user_id,
          walletId: wallet.id,
          currency: wallet.currency || 'SLE',
          reference: `WALLET-${wallet.id.substring(0, 8)}`,
        },
        recipient: {
          id: user.id,
          name: recipientName,
          walletId: wallet.id,
        },
      };
    } catch (error) {
      console.error('[QR Engine] Wallet validation error:', error);
      return { valid: false, error: 'Failed to validate wallet QR' };
    }
  }

  /**
   * Validate a user QR code (payment to user)
   */
  async validateUserQR(userId: string, providedWalletId?: string): Promise<QRValidationResult> {
    try {
      // Get user info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { valid: false, error: 'User not found' };
      }

      // Use provided wallet ID if available
      let userWallet: { id: string; currency: string } | null = null;
      if (providedWalletId) {
        const { data: providedWallet } = await supabase
          .from('wallets')
          .select('id, currency')
          .eq('id', providedWalletId)
          .single();
        userWallet = providedWallet;
      }

      // If no provided wallet or not found, get user's primary wallet
      if (!userWallet) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, currency')
          .eq('user_id', userId)
          .eq('wallet_type', 'primary')
          .single();
        userWallet = wallet;
      }

      // If still no wallet, try to get any wallet
      if (!userWallet) {
        const { data: anyWallet } = await supabase
          .from('wallets')
          .select('id, currency')
          .eq('user_id', userId)
          .limit(1)
          .single();
        userWallet = anyWallet;
      }

      if (!userWallet) {
        return { valid: false, error: 'User has no wallet' };
      }

      const recipientName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';

      return {
        valid: true,
        data: {
          type: 'payment',
          version: this.QR_VERSION,
          userId: user.id,
          walletId: userWallet.id,
          currency: userWallet.currency || 'SLE',
          reference: `USER-${user.id.substring(0, 8)}`,
        },
        recipient: {
          id: user.id,
          name: recipientName,
          walletId: userWallet.id,
        },
      };
    } catch (error) {
      console.error('[QR Engine] User validation error:', error);
      return { valid: false, error: 'Failed to validate user QR' };
    }
  }
}

export const qrEngine = new QREngineService();
