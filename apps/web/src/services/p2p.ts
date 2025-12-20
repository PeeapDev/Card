/**
 * P2P Transfer Service
 *
 * Handles P2P transfers via the backend API.
 * Falls back to direct Supabase calls if API is unavailable.
 */

import { api } from './api';
import { supabase } from '@/lib/supabase';

export interface P2PTransferRequest {
  recipientId: string;
  recipientWalletId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  amount: number;
  currency?: string;
  note?: string;
  method: 'wallet' | 'qr' | 'nfc' | 'phone' | 'link' | 'email';
  idempotencyKey?: string;
}

export interface P2PTransferResult {
  success: boolean;
  transactionId?: string;
  fee?: number;
  netAmount?: number;
  recipientName?: string;
  timestamp?: string;
  error?: string;
  errorCode?: string;
}

export interface FeeCalculation {
  amount: number;
  fee: number;
  netAmount: number;
  feeType: string;
  feePercentage: number;
}

export interface TransferLimits {
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  minAmount: number;
  dailyUsed?: number;
  monthlyUsed?: number;
}

class P2PTransferService {
  /**
   * Calculate fee for a transfer
   */
  async calculateFee(amount: number, userType: string = 'standard'): Promise<FeeCalculation> {
    try {
      const response = await api.post('/p2p/calculate-fee', { amount, userType });
      return response.data;
    } catch (error) {
      // Fallback fee calculation
      const feePercentage = this.getDefaultFeePercentage(userType);
      const calculatedFee = (amount * feePercentage) / 100;
      const fee = Math.max(calculatedFee, 0.10); // Min fee $0.10

      return {
        amount,
        fee: Math.round(fee * 100) / 100,
        netAmount: Math.round((amount - fee) * 100) / 100,
        feeType: 'percentage',
        feePercentage,
      };
    }
  }

  /**
   * Get transfer limits for user type
   */
  async getLimits(userType: string = 'standard'): Promise<TransferLimits> {
    try {
      const response = await api.get(`/p2p/limits/${userType}`);
      return response.data;
    } catch (error) {
      // Fallback: try to get from database
      return this.getLimitsFromDatabase(userType);
    }
  }

  /**
   * Get limits from database (fallback)
   */
  private async getLimitsFromDatabase(userType: string): Promise<TransferLimits> {
    try {
      const { data, error } = await supabase
        .from('transfer_limits')
        .select('*')
        .eq('user_type', userType)
        .eq('is_active', true)
        .single();

      if (data && !error) {
        return {
          dailyLimit: parseFloat(data.daily_limit),
          monthlyLimit: parseFloat(data.monthly_limit),
          perTransactionLimit: parseFloat(data.per_transaction_limit),
          minAmount: parseFloat(data.min_amount),
        };
      }
    } catch (err) {
      console.error('Error fetching limits from database:', err);
    }

    // Ultimate fallback to hardcoded defaults
    return this.getDefaultLimits(userType);
  }

  /**
   * Process P2P transfer
   */
  async sendMoney(
    senderId: string,
    senderWalletId: string,
    request: P2PTransferRequest,
    userType: string = 'standard'
  ): Promise<P2PTransferResult> {
    try {
      // Try API first
      const response = await api.post('/p2p/send', {
        senderId,
        senderWalletId,
        ...request,
        currency: request.currency || 'USD',
      });
      return response.data;
    } catch (apiError) {
      // Fallback to direct Supabase call
      return this.sendMoneyDirect(senderId, senderWalletId, request, userType);
    }
  }

  /**
   * Direct transfer using Supabase
   */
  private async sendMoneyDirect(
    senderId: string,
    senderWalletId: string,
    request: P2PTransferRequest,
    userType: string
  ): Promise<P2PTransferResult> {
    const feeCalc = await this.calculateFee(request.amount, userType);

    // Get sender wallet
    const { data: senderWallet, error: senderError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('id', senderWalletId)
      .single();

    if (senderError || !senderWallet) {
      return { success: false, error: 'Sender wallet not found', errorCode: 'WALLET_NOT_FOUND' };
    }

    if (senderWallet.balance < request.amount) {
      return { success: false, error: 'Insufficient balance', errorCode: 'INSUFFICIENT_BALANCE' };
    }

    // Get recipient wallet
    let recipientWalletId = request.recipientWalletId;

    if (!recipientWalletId && request.recipientId) {
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', request.recipientId)
        .eq('wallet_type', 'primary')
        .single();

      if (recipientWallet) {
        recipientWalletId = recipientWallet.id;
      }
    }

    if (!recipientWalletId) {
      return { success: false, error: 'Recipient wallet not found', errorCode: 'RECIPIENT_NOT_FOUND' };
    }

    // Generate transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create transfer record
      const { error: insertError } = await supabase
        .from('p2p_transfers')
        .insert({
          transaction_id: transactionId,
          sender_id: senderId,
          sender_wallet_id: senderWalletId,
          recipient_id: request.recipientId,
          recipient_wallet_id: recipientWalletId,
          amount: request.amount,
          fee: feeCalc.fee,
          net_amount: feeCalc.netAmount,
          currency: request.currency || 'USD',
          method: request.method,
          status: 'completed',
          note: request.note || null,
          idempotency_key: request.idempotencyKey || null,
          completed_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update sender balance
      await supabase
        .from('wallets')
        .update({ balance: senderWallet.balance - request.amount })
        .eq('id', senderWalletId);

      // Get and update recipient balance
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', recipientWalletId)
        .single();

      await supabase
        .from('wallets')
        .update({ balance: (recipientWallet?.balance || 0) + feeCalc.netAmount })
        .eq('id', recipientWalletId);

      return {
        success: true,
        transactionId,
        fee: feeCalc.fee,
        netAmount: feeCalc.netAmount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Transfer error:', error);
      return { success: false, error: 'Transfer failed', errorCode: 'PROCESSING_ERROR' };
    }
  }

  /**
   * Generate a payment link
   */
  async generateLink(
    senderId: string,
    amount: number,
    currency: string = 'USD',
    expiresInHours: number = 24
  ): Promise<{ url: string; token: string; expiresAt: string }> {
    try {
      const response = await api.post('/p2p/generate-link', {
        senderId,
        amount,
        currency,
        expiresIn: expiresInHours * 3600,
      });
      return response.data;
    } catch (error) {
      // Generate a basic link locally
      const token = `link_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

      return {
        url: `${window.location.origin}/pay/${token}`,
        token,
        expiresAt,
      };
    }
  }

  /**
   * Get recent transfers for a user
   */
  async getRecentTransfers(userId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('p2p_transfers')
      .select(`
        id,
        transaction_id,
        amount,
        fee,
        net_amount,
        currency,
        method,
        status,
        note,
        created_at,
        completed_at,
        sender_id,
        recipient_id
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transfers:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get default fee percentage by user type
   */
  private getDefaultFeePercentage(userType: string): number {
    switch (userType) {
      case 'agent_plus':
        return 0.2;
      case 'agent':
        return 0.5;
      case 'merchant':
        return 0.5;
      case 'standard':
      default:
        return 1.0;
    }
  }

  /**
   * Get default limits by user type (in New Leone / SLE)
   */
  private getDefaultLimits(userType: string): TransferLimits {
    switch (userType) {
      case 'agent_plus':
        return {
          dailyLimit: 100000,         // NLe 100,000 per day (~$4,444 USD)
          monthlyLimit: 500000,       // NLe 500,000 per month
          perTransactionLimit: 50000, // NLe 50,000 per transaction
          minAmount: 0.10,            // NLe 0.10 minimum
        };
      case 'agent':
        return {
          dailyLimit: 20000,          // NLe 20,000 per day (~$889 USD)
          monthlyLimit: 100000,       // NLe 100,000 per month
          perTransactionLimit: 10000, // NLe 10,000 per transaction
          minAmount: 0.50,            // NLe 0.50 minimum
        };
      case 'merchant':
        return {
          dailyLimit: 50000,          // NLe 50,000 per day (~$2,222 USD)
          monthlyLimit: 200000,       // NLe 200,000 per month
          perTransactionLimit: 25000, // NLe 25,000 per transaction
          minAmount: 0.10,            // NLe 0.10 minimum
        };
      case 'standard':
      default:
        return {
          dailyLimit: 5000,           // NLe 5,000 per day (~$222 USD)
          monthlyLimit: 25000,        // NLe 25,000 per month
          perTransactionLimit: 2500,  // NLe 2,500 per transaction
          minAmount: 1,               // NLe 1 minimum
        };
    }
  }
}

export const p2pService = new P2PTransferService();
