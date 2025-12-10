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
  type: 'payment' | 'request' | 'merchant';
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
    const deepLink = `${window.location.origin}/pay?qr=${reference}`;

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
      console.log('QR codes table not available, skipping database storage');
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
    const deepLink = `${window.location.origin}/pay?qr=${reference}&amount=${amount}`;

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
      console.log('QR codes table not available, skipping database storage');
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
    const deepLink = `${window.location.origin}/pay?merchant=${reference}`;

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
   * Check if QR data is a URL and extract payment info
   */
  private parseURLQR(qrData: string): { type: 'checkout' | 'pay' | 'qr'; id: string } | null {
    try {
      // Check if it's a URL
      if (!qrData.startsWith('http://') && !qrData.startsWith('https://')) {
        return null;
      }

      const url = new URL(qrData);
      const pathname = url.pathname;

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

      // Handle ?qr={reference} format
      const qrParam = url.searchParams.get('qr');
      if (qrParam) {
        return { type: 'qr', id: qrParam };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate and decode a scanned QR code
   */
  async validateQR(qrData: string): Promise<QRValidationResult> {
    // First, check if it's a URL-based QR code
    const urlData = this.parseURLQR(qrData);
    if (urlData) {
      if (urlData.type === 'checkout') {
        // It's a checkout session - return the session ID for redirection
        return {
          valid: true,
          data: {
            type: 'merchant',
            version: '1.0',
            userId: '',
            currency: 'SLE',
            reference: urlData.id,
          },
          checkoutSessionId: urlData.id,
        };
      }
      if (urlData.type === 'qr') {
        // It's a QR reference - validate by reference
        return this.validateQRByReference(urlData.id);
      }
    }

    // Try to decode as base64-encoded PEEAPPAY format
    const data = this.decodeQRData(qrData);

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
}

export const qrEngine = new QREngineService();
