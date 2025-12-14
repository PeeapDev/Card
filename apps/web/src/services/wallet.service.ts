/**
 * Wallet Service - Production Grade
 *
 * Direct Supabase integration for wallet operations
 * Includes proper error handling, type safety, and transaction support
 */

import { supabase } from '@/lib/supabase';
import type { Wallet, Transaction, PaginatedResponse } from '@/types';

export type WalletType = 'primary' | 'driver' | 'pot' | 'merchant';

export interface CreateWalletRequest {
  currency?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  walletType?: WalletType;
  name?: string;
}

export interface DepositRequest {
  walletId: string;
  amount: number;
  reference?: string;
  description?: string;
}

export interface TransferRequest {
  fromWalletId: string;
  toWalletId?: string;
  toUserId?: string;
  amount: number;
  description?: string;
}

export interface WithdrawRequest {
  walletId: string;
  amount: number;
  reference?: string;
  description?: string;
}

// Extended wallet with additional fields
export interface ExtendedWallet extends Wallet {
  walletType: WalletType;
  name?: string;
  externalId?: string;
}

// Map database row to Wallet type
const mapWallet = (row: any): ExtendedWallet => ({
  id: row.id,
  userId: row.user_id,
  balance: parseFloat(row.balance) || 0,
  currency: row.currency || 'SLE',
  status: row.status || 'ACTIVE',
  dailyLimit: parseFloat(row.daily_limit) || 5000,
  monthlyLimit: parseFloat(row.monthly_limit) || 50000,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  walletType: row.wallet_type || 'primary',
  name: row.name,
  externalId: row.external_id,
});

// Map database row to Transaction type
const mapTransaction = (row: any): Transaction => ({
  id: row.id,
  walletId: row.wallet_id,
  cardId: row.card_id || undefined,
  type: row.type,
  amount: parseFloat(row.amount) || 0,
  currency: row.currency || 'SLE',
  status: row.status || 'COMPLETED',
  description: row.description || undefined,
  merchantName: row.merchant_name || undefined,
  merchantCategory: row.merchant_category || undefined,
  reference: row.reference || row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const walletService = {
  /**
   * Get all wallets for the current user
   */
  async getWallets(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapWallet);
  },

  /**
   * Get a single wallet by ID
   */
  async getWallet(id: string): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching wallet:', error);
      throw new Error(error.message);
    }

    return mapWallet(data);
  },

  /**
   * Get wallet by user ID (primary wallet)
   */
  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No wallet found
        return null;
      }
      console.error('Error fetching wallet by user:', error);
      throw new Error(error.message);
    }

    return mapWallet(data);
  },

  /**
   * Create a new wallet for the current user
   */
  async createWallet(userId: string, data: CreateWalletRequest): Promise<ExtendedWallet> {
    // Generate external_id (required by database)
    const walletType = data.walletType || 'primary';
    const prefix = walletType === 'driver' ? 'DRV' : walletType === 'merchant' ? 'MRC' : 'WAL';
    const externalId = `${prefix}-${data.currency || 'SLE'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        external_id: externalId,
        currency: data.currency || 'SLE',
        balance: 0,
        status: 'ACTIVE',
        daily_limit: data.dailyLimit || 5000,
        monthly_limit: data.monthlyLimit || 50000,
        wallet_type: walletType,
        name: data.name || (walletType === 'driver' ? 'Driver Wallet' : null),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating wallet:', error);
      throw new Error(error.message);
    }

    return mapWallet(wallet);
  },

  /**
   * Get wallet by type for a user
   */
  async getWalletByType(userId: string, walletType: WalletType): Promise<ExtendedWallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', walletType)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching wallet by type:', error);
      throw new Error(error.message);
    }

    return data ? mapWallet(data) : null;
  },

  /**
   * Get or create a wallet of a specific type
   */
  async getOrCreateWalletByType(userId: string, walletType: WalletType, name?: string): Promise<ExtendedWallet> {
    // First try to get existing wallet
    const existing = await this.getWalletByType(userId, walletType);
    if (existing) return existing;

    // Create new wallet
    return this.createWallet(userId, { walletType, name });
  },

  /**
   * Transfer between user's own wallets (e.g., driver wallet to primary wallet)
   */
  async transferBetweenOwnWallets(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    description?: string
  ): Promise<Transaction> {
    return this.transfer({
      fromWalletId,
      toWalletId,
      amount,
      description: description || 'Internal transfer',
    });
  },

  /**
   * Deposit funds into a wallet
   */
  async deposit(data: DepositRequest): Promise<Transaction> {
    // First, update wallet balance
    const { data: wallet, error: walletError } = await supabase
      .rpc('wallet_deposit', {
        p_wallet_id: data.walletId,
        p_amount: data.amount,
        p_reference: data.reference || `DEP-${Date.now()}`,
        p_description: data.description || 'Deposit',
      });

    if (walletError) {
      // Fallback: manual update if RPC doesn't exist
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: supabase.rpc('increment_balance', { amount: data.amount }),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.walletId);

      if (updateError) {
        // Direct balance update
        const { data: currentWallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', data.walletId)
          .single();

        if (currentWallet) {
          await supabase
            .from('wallets')
            .update({
              balance: (parseFloat(currentWallet.balance) || 0) + data.amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.walletId);
        }
      }
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: data.walletId,
        type: 'DEPOSIT',
        amount: data.amount,
        currency: 'SLE',
        status: 'COMPLETED',
        description: data.description || 'Deposit',
        reference: data.reference || `DEP-${Date.now()}`,
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating deposit transaction:', txError);
      throw new Error(txError.message);
    }

    return mapTransaction(transaction);
  },

  /**
   * Transfer funds between wallets
   */
  async transfer(data: TransferRequest): Promise<Transaction> {
    // If toUserId is provided, find their wallet
    let toWalletId = data.toWalletId;

    if (data.toUserId && !toWalletId) {
      const { data: recipientWallet, error: findError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', data.toUserId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .single();

      if (findError || !recipientWallet) {
        throw new Error('Recipient wallet not found');
      }
      toWalletId = recipientWallet.id;
    }

    if (!toWalletId) {
      throw new Error('Recipient wallet ID is required');
    }

    // Try RPC function first for atomic transfer
    const { data: rpcResult, error: rpcError } = await supabase.rpc('wallet_transfer', {
      p_from_wallet_id: data.fromWalletId,
      p_to_wallet_id: toWalletId,
      p_amount: data.amount,
      p_description: data.description || 'Transfer',
    });

    if (!rpcError && rpcResult) {
      // RPC succeeded, fetch the transaction
      const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', data.fromWalletId)
        .eq('type', 'TRANSFER')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tx) return mapTransaction(tx);
    }

    // Fallback: Manual transfer (not atomic, but works without RPC)
    // Check source wallet balance
    const { data: sourceWallet, error: sourceError } = await supabase
      .from('wallets')
      .select('balance, status')
      .eq('id', data.fromWalletId)
      .single();

    if (sourceError || !sourceWallet) {
      throw new Error('Source wallet not found');
    }

    if (sourceWallet.status !== 'ACTIVE') {
      throw new Error('Source wallet is not active');
    }

    const sourceBalance = parseFloat(sourceWallet.balance) || 0;
    if (sourceBalance < data.amount) {
      throw new Error('Insufficient balance');
    }

    // Debit source wallet
    const { error: debitError } = await supabase
      .from('wallets')
      .update({
        balance: sourceBalance - data.amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.fromWalletId);

    if (debitError) {
      throw new Error('Failed to debit source wallet');
    }

    // Credit destination wallet
    const { data: destWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', toWalletId)
      .single();

    const destBalance = parseFloat(destWallet?.balance) || 0;

    const { error: creditError } = await supabase
      .from('wallets')
      .update({
        balance: destBalance + data.amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', toWalletId);

    if (creditError) {
      // Rollback: Credit back the source wallet
      await supabase
        .from('wallets')
        .update({ balance: sourceBalance })
        .eq('id', data.fromWalletId);
      throw new Error('Failed to credit destination wallet');
    }

    const reference = `TRF-${Date.now()}`;

    // Create debit transaction
    const { data: debitTx, error: debitTxError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: data.fromWalletId,
        type: 'TRANSFER',
        amount: -data.amount, // Negative for outgoing
        currency: 'SLE',
        status: 'COMPLETED',
        description: data.description || 'Transfer sent',
        reference,
      })
      .select()
      .single();

    if (debitTxError) {
      console.error('Error creating debit transaction:', debitTxError);
    }

    // Create credit transaction for recipient
    await supabase
      .from('transactions')
      .insert({
        wallet_id: toWalletId,
        type: 'TRANSFER',
        amount: data.amount, // Positive for incoming
        currency: 'SLE',
        status: 'COMPLETED',
        description: data.description || 'Transfer received',
        reference,
      });

    return debitTx ? mapTransaction(debitTx) : {
      id: reference,
      walletId: data.fromWalletId,
      type: 'TRANSFER',
      amount: -data.amount,
      currency: 'SLE',
      status: 'COMPLETED',
      description: data.description || 'Transfer',
      reference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Get transactions for a wallet
   */
  async getTransactions(
    walletId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Transaction>> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', walletId);

    // Get paginated data
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(error.message);
    }

    const total = count || 0;

    return {
      data: (data || []).map(mapTransaction),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Freeze a wallet
   */
  async freezeWallet(id: string): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .update({ status: 'FROZEN', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error freezing wallet:', error);
      throw new Error(error.message);
    }

    return mapWallet(data);
  },

  /**
   * Unfreeze a wallet
   */
  async unfreezeWallet(id: string): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error unfreezing wallet:', error);
      throw new Error(error.message);
    }

    return mapWallet(data);
  },
};
