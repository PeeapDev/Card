/**
 * Supabase client for backend services
 * Used for wallet operations that need to sync with the frontend Supabase database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration - using the same database as the frontend
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
// Service role key for admin operations (required for auth.admin.createUser)
// IMPORTANT: This key must be set via environment variable in production
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.warn('WARNING: SUPABASE_SERVICE_KEY not set. Admin operations will fail.');
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

export interface SupabaseWallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  status: string;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get a wallet by ID from Supabase
 */
export async function getSupabaseWallet(walletId: string): Promise<SupabaseWallet | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('id', walletId)
    .single();

  if (error) {
    console.error('Error fetching wallet from Supabase:', error);
    return null;
  }

  return data;
}

/**
 * Update wallet balance in Supabase
 */
export async function updateSupabaseWalletBalance(
  walletId: string,
  newBalance: number,
): Promise<SupabaseWallet | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('wallets')
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId)
    .select()
    .single();

  if (error) {
    console.error('Error updating wallet balance in Supabase:', error);
    return null;
  }

  return data;
}

/**
 * Credit wallet balance in Supabase (add amount to existing balance)
 */
export async function creditSupabaseWallet(
  walletId: string,
  amount: number,
  reference?: string,
  description?: string,
): Promise<{ wallet: SupabaseWallet | null; transaction: any }> {
  const supabase = getSupabaseClient();

  // Get current balance
  const wallet = await getSupabaseWallet(walletId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const currentBalance = parseFloat(wallet.balance?.toString() || '0');
  const newBalance = currentBalance + amount;

  // Update balance
  const { data: updatedWallet, error: updateError } = await supabase
    .from('wallets')
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId)
    .select()
    .single();

  if (updateError) {
    console.error('Error crediting wallet in Supabase:', updateError);
    throw new Error('Failed to credit wallet');
  }

  // Create transaction record
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      wallet_id: walletId,
      type: 'DEPOSIT',
      amount: amount,
      currency: wallet.currency || 'SLE',
      status: 'COMPLETED',
      description: description || 'Monime Deposit',
      reference: reference || `DEP-${Date.now()}`,
    })
    .select()
    .single();

  if (txError) {
    console.error('Error creating deposit transaction in Supabase:', txError);
    // Don't throw - balance was already updated
  }

  return { wallet: updatedWallet, transaction };
}
