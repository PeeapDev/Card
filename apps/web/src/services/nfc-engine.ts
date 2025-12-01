/**
 * NFC Engine Service
 *
 * Handles NFC-based payments with secure transaction keys:
 * - Generate unique NFC transaction tokens
 * - Validate NFC tap payments
 * - Support for Web NFC API (where available)
 */

import { supabase } from '@/lib/supabase';

export interface NFCTransactionToken {
  token: string;
  userId: string;
  walletId: string;
  amount?: number;
  currency: string;
  expiresAt: string;
  nonce: string;
  signature: string;
}

export interface NFCPaymentRequest {
  token: string;
  senderId: string;
  senderWalletId: string;
  amount: number;
  pin?: string;
}

export interface NFCPaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  errorCode?: string;
}

export interface NFCCapabilities {
  available: boolean;
  canRead: boolean;
  canWrite: boolean;
  reason?: string;
}

class NFCEngineService {
  private readonly TOKEN_VERSION = '1';
  private readonly TOKEN_PREFIX = 'NFCPAY';

  /**
   * Check if Web NFC is available
   */
  checkNFCCapabilities(): NFCCapabilities {
    if (typeof window === 'undefined') {
      return { available: false, canRead: false, canWrite: false, reason: 'Not in browser' };
    }

    if (!('NDEFReader' in window)) {
      return {
        available: false,
        canRead: false,
        canWrite: false,
        reason: 'Web NFC not supported. Available on Android Chrome 89+',
      };
    }

    return {
      available: true,
      canRead: true,
      canWrite: true,
    };
  }

  /**
   * Generate a cryptographically secure nonce
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a unique transaction token
   */
  private generateToken(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.getRandomValues(new Uint8Array(8));
    const randomStr = Array.from(random, b => b.toString(36)).join('');
    return `${this.TOKEN_PREFIX}_${timestamp}_${randomStr}`.toUpperCase();
  }

  /**
   * Generate a signature for the transaction (simplified for demo)
   * In production, use proper HMAC or digital signatures
   */
  private generateSignature(data: string, nonce: string): string {
    // Simple hash for demo - in production use proper cryptographic signing
    const combined = `${data}:${nonce}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase();
  }

  /**
   * Generate NFC transaction token for receiving payments
   */
  async generateReceiveToken(
    userId: string,
    walletId: string,
    amount?: number,
    expirationMinutes: number = 5
  ): Promise<NFCTransactionToken> {
    const token = this.generateToken();
    const nonce = this.generateNonce();
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();

    const dataToSign = `${token}:${userId}:${walletId}:${amount || 0}:${expiresAt}`;
    const signature = this.generateSignature(dataToSign, nonce);

    const tokenData: NFCTransactionToken = {
      token,
      userId,
      walletId,
      amount,
      currency: 'USD',
      expiresAt,
      nonce,
      signature,
    };

    // Store token in database
    await supabase.from('nfc_tokens').insert({
      token,
      user_id: userId,
      wallet_id: walletId,
      amount,
      currency: 'USD',
      nonce,
      signature,
      expires_at: expiresAt,
      status: 'active',
    });

    return tokenData;
  }

  /**
   * Generate a tap-to-pay token for sending payments
   */
  async generateSendToken(
    userId: string,
    walletId: string,
    maxAmount: number,
    expirationMinutes: number = 2
  ): Promise<NFCTransactionToken> {
    const token = this.generateToken();
    const nonce = this.generateNonce();
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();

    const dataToSign = `SEND:${token}:${userId}:${maxAmount}:${expiresAt}`;
    const signature = this.generateSignature(dataToSign, nonce);

    const tokenData: NFCTransactionToken = {
      token,
      userId,
      walletId,
      amount: maxAmount,
      currency: 'USD',
      expiresAt,
      nonce,
      signature,
    };

    try {
      await supabase.from('nfc_tokens').insert({
        token,
        user_id: userId,
        wallet_id: walletId,
        amount: maxAmount,
        currency: 'USD',
        nonce,
        signature,
        expires_at: expiresAt,
        status: 'active',
        type: 'send',
      });
    } catch {
      // Ignore errors
    }

    return tokenData;
  }

  /**
   * Validate an NFC token
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    expired?: boolean;
    tokenData?: NFCTransactionToken;
    recipient?: { id: string; name: string; walletId: string };
    error?: string;
  }> {
    // Check database for token
    const { data: tokenRecord } = await supabase
      .from('nfc_tokens')
      .select('*')
      .eq('token', token)
      .eq('status', 'active')
      .single();

    if (!tokenRecord) {
      // Try to decode from the token itself (for offline validation)
      return { valid: false, error: 'Token not found or already used' };
    }

    // Check expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return { valid: false, expired: true, error: 'Token has expired' };
    }

    // Verify signature
    const dataToSign = `${token}:${tokenRecord.user_id}:${tokenRecord.wallet_id}:${tokenRecord.amount || 0}:${tokenRecord.expires_at}`;
    const expectedSignature = this.generateSignature(dataToSign, tokenRecord.nonce);

    if (tokenRecord.signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Get recipient info
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', tokenRecord.user_id)
      .single();

    return {
      valid: true,
      tokenData: {
        token: tokenRecord.token,
        userId: tokenRecord.user_id,
        walletId: tokenRecord.wallet_id,
        amount: tokenRecord.amount,
        currency: tokenRecord.currency,
        expiresAt: tokenRecord.expires_at,
        nonce: tokenRecord.nonce,
        signature: tokenRecord.signature,
      },
      recipient: user ? {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        walletId: tokenRecord.wallet_id,
      } : undefined,
    };
  }

  /**
   * Process NFC payment
   */
  async processPayment(request: NFCPaymentRequest): Promise<NFCPaymentResult> {
    // Validate token first
    const validation = await this.validateToken(request.token);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        errorCode: validation.expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      };
    }

    const tokenData = validation.tokenData!;

    // Check amount if token has fixed amount
    if (tokenData.amount && request.amount !== tokenData.amount) {
      return {
        success: false,
        error: `Amount must be exactly $${tokenData.amount}`,
        errorCode: 'AMOUNT_MISMATCH',
      };
    }

    // Get sender wallet balance
    const { data: senderWallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('id', request.senderWalletId)
      .single();

    if (!senderWallet || senderWallet.balance < request.amount) {
      return {
        success: false,
        error: 'Insufficient balance',
        errorCode: 'INSUFFICIENT_BALANCE',
      };
    }

    // Generate transaction ID
    const transactionId = `nfc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Deduct from sender
      await supabase
        .from('wallets')
        .update({ balance: senderWallet.balance - request.amount })
        .eq('id', request.senderWalletId);

      // Add to recipient
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', tokenData.walletId)
        .single();

      await supabase
        .from('wallets')
        .update({ balance: (recipientWallet?.balance || 0) + request.amount })
        .eq('id', tokenData.walletId);

      // Mark token as used
      await supabase
        .from('nfc_tokens')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          transaction_id: transactionId,
        })
        .eq('token', request.token);

      // Create transaction record
      try {
        await supabase.from('transactions').insert({
          external_id: transactionId,
          wallet_id: request.senderWalletId,
          type: 'TRANSFER',
          amount: -request.amount,
          currency: 'USD',
          status: 'COMPLETED',
          description: 'NFC Payment',
          metadata: {
            nfc_token: request.token,
            recipient_wallet: tokenData.walletId,
            method: 'nfc',
          },
        });
      } catch {
        // Ignore errors
      }

      return {
        success: true,
        transactionId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment processing failed',
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  /**
   * Encode token data for NFC tag
   */
  encodeForNFC(tokenData: NFCTransactionToken): string {
    return btoa(JSON.stringify({
      v: this.TOKEN_VERSION,
      t: tokenData.token,
      u: tokenData.userId,
      w: tokenData.walletId,
      a: tokenData.amount,
      c: tokenData.currency,
      e: tokenData.expiresAt,
      n: tokenData.nonce,
      s: tokenData.signature,
    }));
  }

  /**
   * Decode token data from NFC tag
   */
  decodeFromNFC(encoded: string): NFCTransactionToken | null {
    try {
      const data = JSON.parse(atob(encoded));
      return {
        token: data.t,
        userId: data.u,
        walletId: data.w,
        amount: data.a,
        currency: data.c || 'USD',
        expiresAt: data.e,
        nonce: data.n,
        signature: data.s,
      };
    } catch {
      return null;
    }
  }

  /**
   * Start NFC reader (Web NFC API)
   */
  async startNFCReader(
    onRead: (data: NFCTransactionToken) => void,
    onError: (error: string) => void
  ): Promise<{ stop: () => void } | null> {
    const capabilities = this.checkNFCCapabilities();

    if (!capabilities.available) {
      onError(capabilities.reason || 'NFC not available');
      return null;
    }

    try {
      // @ts-ignore - Web NFC types
      const reader = new NDEFReader();
      await reader.scan();

      reader.addEventListener('reading', ({ message }: any) => {
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const decoder = new TextDecoder();
            const encoded = decoder.decode(record.data);
            const tokenData = this.decodeFromNFC(encoded);

            if (tokenData) {
              onRead(tokenData);
            }
          }
        }
      });

      reader.addEventListener('error', () => {
        onError('NFC read error');
      });

      return {
        stop: () => {
          // Web NFC doesn't have a stop method, but we can ignore further reads
        },
      };
    } catch (error: any) {
      onError(error.message || 'Failed to start NFC reader');
      return null;
    }
  }

  /**
   * Write to NFC tag (Web NFC API)
   */
  async writeToNFC(tokenData: NFCTransactionToken): Promise<boolean> {
    const capabilities = this.checkNFCCapabilities();

    if (!capabilities.canWrite) {
      throw new Error(capabilities.reason || 'NFC write not available');
    }

    try {
      // @ts-ignore - Web NFC types
      const writer = new NDEFReader();
      const encoded = this.encodeForNFC(tokenData);

      await writer.write({
        records: [
          {
            recordType: 'text',
            data: encoded,
          },
        ],
      });

      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to write NFC tag');
    }
  }
}

export const nfcEngine = new NFCEngineService();
