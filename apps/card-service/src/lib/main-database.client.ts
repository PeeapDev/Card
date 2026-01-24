/**
 * Main Database Client for Card Service
 *
 * This client connects to the main Supabase database for:
 * - User lookups (to validate card ownership)
 * - Wallet operations (to credit/debit for card payments)
 *
 * The card service owns all card-related data, but needs to reference
 * users and wallets which remain in the main database.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  kycStatus: string;
  kycTier?: number;
}

export interface WalletInfo {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: string;
}

@Injectable()
export class MainDatabaseClient implements OnModuleInit {
  private client: SupabaseClient;
  private readonly logger = new Logger(MainDatabaseClient.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    }

    this.client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Connected to main Supabase database for user/wallet lookups');
  }

  /**
   * Get user information by ID
   */
  async getUser(userId: string): Promise<UserInfo | null> {
    const { data, error } = await this.client
      .from('users')
      .select('id, email, first_name, last_name, phone, kyc_status, kyc_tier')
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.warn(`User lookup failed: ${error.message}`);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      kycStatus: data.kyc_status,
      kycTier: data.kyc_tier,
    };
  }

  /**
   * Get user's primary wallet
   */
  async getUserWallet(userId: string, currency = 'SLE'): Promise<WalletInfo | null> {
    const { data, error } = await this.client
      .from('wallets')
      .select('id, user_id, balance, currency, status')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (error) {
      this.logger.warn(`Wallet lookup failed: ${error.message}`);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      balance: parseFloat(data.balance),
      currency: data.currency,
      status: data.status,
    };
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<WalletInfo | null> {
    const { data, error } = await this.client
      .from('wallets')
      .select('id, user_id, balance, currency, status')
      .eq('id', walletId)
      .single();

    if (error) {
      this.logger.warn(`Wallet lookup by ID failed: ${error.message}`);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      balance: parseFloat(data.balance),
      currency: data.currency,
      status: data.status,
    };
  }

  /**
   * Debit a wallet (for card payments)
   * Uses RPC for atomic operation
   */
  async debitWallet(walletId: string, amount: number, description: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const { data, error } = await this.client.rpc('wallet_withdraw', {
      p_wallet_id: walletId,
      p_amount: amount,
      p_description: description,
    });

    if (error) {
      this.logger.error(`Wallet debit failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true, transactionId: data };
  }

  /**
   * Credit a wallet (for card refunds)
   */
  async creditWallet(walletId: string, amount: number, description: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const { data, error } = await this.client.rpc('wallet_deposit', {
      p_wallet_id: walletId,
      p_amount: amount,
      p_description: description,
    });

    if (error) {
      this.logger.error(`Wallet credit failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true, transactionId: data };
  }

  /**
   * Transfer between wallets (for card-to-card transfers)
   */
  async transferBetweenWallets(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const { data, error } = await this.client.rpc('wallet_transfer', {
      p_from_wallet_id: fromWalletId,
      p_to_wallet_id: toWalletId,
      p_amount: amount,
      p_description: description,
    });

    if (error) {
      this.logger.error(`Wallet transfer failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true, transactionId: data };
  }

  /**
   * Verify user ownership of wallet
   */
  async verifyWalletOwnership(walletId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('wallets')
      .select('id')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  }
}
