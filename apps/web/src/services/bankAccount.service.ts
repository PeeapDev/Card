/**
 * Bank Account Service
 *
 * Manages user bank accounts for withdrawals/payouts.
 * Integrates with Monime API for bank listing and KYC verification.
 */

import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

export interface Bank {
  providerId: string;
  name: string;
  country: string;
  status: { active: boolean };
  featureSet?: {
    payout: { canPayTo: boolean };
    payment: { canPayFrom: boolean };
    kycVerification: { canVerifyAccount: boolean };
  };
}

export interface UserBankAccount {
  id: string;
  userId: string;
  bankProviderId: string;
  bankName: string;
  accountNumber: string;
  accountName: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  nickname: string | null;
  isDefault: boolean;
  status: 'active' | 'suspended' | 'deleted';
  country: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddBankAccountRequest {
  bankProviderId: string;
  bankName: string;
  accountNumber: string;
  nickname?: string;
  isDefault?: boolean;
}

export interface VerifyBankAccountResponse {
  verified: boolean;
  accountName?: string;
  accountNumber?: string;
  providerId?: string;
}

// Map database row to UserBankAccount
function mapBankAccount(row: any): UserBankAccount {
  return {
    id: row.id,
    userId: row.user_id,
    bankProviderId: row.bank_provider_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    isVerified: row.is_verified || false,
    verifiedAt: row.verified_at,
    nickname: row.nickname,
    isDefault: row.is_default || false,
    status: row.status || 'active',
    country: row.country || 'SL',
    currency: row.currency || 'SLE',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const bankAccountService = {
  /**
   * Get available banks from Monime
   */
  async getAvailableBanks(country: string = 'SL'): Promise<Bank[]> {
    try {
      // Use the NestJS monime/banks endpoint
      const response = await api.get<{ result: Bank[] } | Bank[]>(`/monime/banks?country=${country}`);

      // Handle various response formats (Monime returns { result: [...] })
      let banks: Bank[];
      if (Array.isArray(response)) {
        banks = response;
      } else if ((response as any).result) {
        banks = (response as any).result;
      } else if ((response as any).banks) {
        banks = (response as any).banks;
      } else {
        banks = [];
      }

      // Map any legacy format (id -> providerId)
      return banks.map(b => ({
        ...b,
        providerId: b.providerId || (b as any).id,
        status: b.status || { active: true },
        featureSet: b.featureSet || {
          payout: { canPayTo: true },
          payment: { canPayFrom: true },
          kycVerification: { canVerifyAccount: false },
        },
      }));
    } catch (error) {
      console.error('Error fetching banks:', error);
      return [];
    }
  },

  /**
   * Verify bank account holder name via KYC
   */
  async verifyBankAccount(providerId: string, accountNumber: string): Promise<VerifyBankAccountResponse> {
    try {
      // Use the mobile money lookup endpoint which also works for banks
      const response = await api.post<VerifyBankAccountResponse>('/mobile-money/lookup', {
        providerId,
        phoneNumber: accountNumber, // API uses phoneNumber field for account lookup
      });
      return response;
    } catch (error) {
      console.error('Error verifying bank account:', error);
      return { verified: false };
    }
  },

  /**
   * Get user's bank accounts
   */
  async getUserBankAccounts(userId?: string): Promise<UserBankAccount[]> {
    try {
      let query = supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('status', 'active')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bank accounts:', error);
        return [];
      }

      return (data || []).map(mapBankAccount);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  },

  /**
   * Get user's default bank account
   */
  async getDefaultBankAccount(userId?: string): Promise<UserBankAccount | null> {
    try {
      let query = supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('status', 'active')
        .eq('is_default', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.limit(1).single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No default account found
          return null;
        }
        console.error('Error fetching default bank account:', error);
        return null;
      }

      return data ? mapBankAccount(data) : null;
    } catch (error) {
      console.error('Error fetching default bank account:', error);
      return null;
    }
  },

  /**
   * Add a new bank account
   */
  async addBankAccount(request: AddBankAccountRequest): Promise<{ success: boolean; account?: UserBankAccount; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // First try to verify the account
      const verification = await this.verifyBankAccount(request.bankProviderId, request.accountNumber);

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .insert({
          user_id: user.id,
          bank_provider_id: request.bankProviderId,
          bank_name: request.bankName,
          account_number: request.accountNumber,
          account_name: verification.accountName || null,
          is_verified: verification.verified,
          verified_at: verification.verified ? new Date().toISOString() : null,
          nickname: request.nickname || null,
          is_default: request.isDefault || false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'This bank account is already added' };
        }
        console.error('Error adding bank account:', error);
        return { success: false, error: error.message };
      }

      return { success: true, account: mapBankAccount(data) };
    } catch (error: any) {
      console.error('Error adding bank account:', error);
      return { success: false, error: error.message || 'Failed to add bank account' };
    }
  },

  /**
   * Update a bank account
   */
  async updateBankAccount(
    accountId: string,
    updates: { nickname?: string; isDefault?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {};
      if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

      const { error } = await supabase
        .from('user_bank_accounts')
        .update(updateData)
        .eq('id', accountId);

      if (error) {
        console.error('Error updating bank account:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating bank account:', error);
      return { success: false, error: error.message || 'Failed to update bank account' };
    }
  },

  /**
   * Delete (soft delete) a bank account
   */
  async deleteBankAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_bank_accounts')
        .update({ status: 'deleted' })
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting bank account:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting bank account:', error);
      return { success: false, error: error.message || 'Failed to delete bank account' };
    }
  },

  /**
   * Set a bank account as default
   */
  async setDefaultBankAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateBankAccount(accountId, { isDefault: true });
  },

  /**
   * Re-verify a bank account
   */
  async reverifyBankAccount(accountId: string): Promise<{ success: boolean; verified: boolean; accountName?: string; error?: string }> {
    try {
      // Get the account details
      const { data: account, error: fetchError } = await supabase
        .from('user_bank_accounts')
        .select('bank_provider_id, account_number')
        .eq('id', accountId)
        .single();

      if (fetchError || !account) {
        return { success: false, verified: false, error: 'Bank account not found' };
      }

      // Verify with Monime
      const verification = await this.verifyBankAccount(account.bank_provider_id, account.account_number);

      // Update the account
      const { error: updateError } = await supabase
        .from('user_bank_accounts')
        .update({
          account_name: verification.accountName || null,
          is_verified: verification.verified,
          verified_at: verification.verified ? new Date().toISOString() : null,
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('Error updating verification:', updateError);
        return { success: false, verified: verification.verified, error: updateError.message };
      }

      return {
        success: true,
        verified: verification.verified,
        accountName: verification.accountName,
      };
    } catch (error: any) {
      console.error('Error re-verifying bank account:', error);
      return { success: false, verified: false, error: error.message || 'Verification failed' };
    }
  },

  /**
   * Format account number for display (mask middle digits)
   */
  formatAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 6) return accountNumber;
    const first = accountNumber.slice(0, 3);
    const last = accountNumber.slice(-3);
    const masked = '*'.repeat(accountNumber.length - 6);
    return `${first}${masked}${last}`;
  },
};
