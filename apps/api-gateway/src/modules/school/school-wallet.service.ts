import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export interface SchoolWallet {
  id: string;
  school_id: string;
  name: string;
  balance: number;
  currency: string;
  status: 'active' | 'suspended' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface WalletPermission {
  id: string;
  wallet_id: string;
  user_id: string;
  role: 'owner' | 'accountant' | 'staff' | 'viewer';
  permissions: string[];
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit' | 'transfer' | 'bank_transfer';
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

@Injectable()
export class SchoolWalletService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Create a new school wallet
   */
  async createSchoolWallet(params: {
    schoolId: string;
    schoolName: string;
    ownerUserId: string;
    currency?: string;
  }): Promise<SchoolWallet> {
    const walletId = `sw_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    // Check if school already has a wallet
    const { data: existing } = await this.supabase
      .from('school_wallets')
      .select('id')
      .eq('school_id', params.schoolId)
      .single();

    if (existing) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'WALLET_EXISTS',
          message: 'This school already has a wallet',
        },
      });
    }

    // Create the school wallet
    const { error: walletError } = await this.supabase.from('school_wallets').insert({
      id: walletId,
      school_id: params.schoolId,
      name: `${params.schoolName} Wallet`,
      balance: 0,
      currency: params.currency || 'SLE',
      status: 'active',
      created_at: now,
      updated_at: now,
    });

    if (walletError) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CREATION_FAILED',
          message: `Failed to create wallet: ${walletError.message}`,
        },
      });
    }

    // Add owner permission
    await this.supabase.from('school_wallet_permissions').insert({
      id: `swp_${crypto.randomBytes(12).toString('hex')}`,
      wallet_id: walletId,
      user_id: params.ownerUserId,
      role: 'owner',
      permissions: ['view', 'transfer', 'withdraw', 'manage_permissions', 'view_transactions'],
      created_at: now,
    });

    return {
      id: walletId,
      school_id: params.schoolId,
      name: `${params.schoolName} Wallet`,
      balance: 0,
      currency: params.currency || 'SLE',
      status: 'active',
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Get school wallet details
   */
  async getSchoolWallet(walletId: string, userId: string): Promise<SchoolWallet & { permissions: WalletPermission[] }> {
    // Check user has permission to view this wallet
    const { data: permission } = await this.supabase
      .from('school_wallet_permissions')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('user_id', userId)
      .single();

    if (!permission) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to view this wallet',
        },
      });
    }

    // Get wallet details
    const { data: wallet, error } = await this.supabase
      .from('school_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error || !wallet) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'School wallet not found',
        },
      });
    }

    // Get all permissions
    const { data: permissions } = await this.supabase
      .from('school_wallet_permissions')
      .select('*')
      .eq('wallet_id', walletId);

    return {
      ...wallet,
      permissions: permissions || [],
    };
  }

  /**
   * Get school wallet by school ID
   */
  async getWalletBySchoolId(schoolId: string): Promise<SchoolWallet | null> {
    const { data: wallet } = await this.supabase
      .from('school_wallets')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    return wallet;
  }

  /**
   * Add or update wallet permission
   */
  async updatePermission(params: {
    walletId: string;
    requestingUserId: string;
    targetUserId: string;
    role: 'owner' | 'accountant' | 'staff' | 'viewer';
    permissions: string[];
  }): Promise<WalletPermission> {
    // Check requesting user is owner
    const { data: requesterPerm } = await this.supabase
      .from('school_wallet_permissions')
      .select('role')
      .eq('wallet_id', params.walletId)
      .eq('user_id', params.requestingUserId)
      .single();

    if (!requesterPerm || requesterPerm.role !== 'owner') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only wallet owners can manage permissions',
        },
      });
    }

    const now = new Date().toISOString();

    // Check if permission already exists
    const { data: existing } = await this.supabase
      .from('school_wallet_permissions')
      .select('id')
      .eq('wallet_id', params.walletId)
      .eq('user_id', params.targetUserId)
      .single();

    if (existing) {
      // Update existing permission
      const { data: updated, error } = await this.supabase
        .from('school_wallet_permissions')
        .update({
          role: params.role,
          permissions: params.permissions,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: `Failed to update permission: ${error.message}`,
          },
        });
      }

      return updated;
    } else {
      // Create new permission
      const permId = `swp_${crypto.randomBytes(12).toString('hex')}`;
      const { data: created, error } = await this.supabase
        .from('school_wallet_permissions')
        .insert({
          id: permId,
          wallet_id: params.walletId,
          user_id: params.targetUserId,
          role: params.role,
          permissions: params.permissions,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'CREATION_FAILED',
            message: `Failed to create permission: ${error.message}`,
          },
        });
      }

      return created;
    }
  }

  /**
   * Transfer funds from school wallet to personal wallet
   */
  async transferToPersonal(params: {
    schoolWalletId: string;
    targetWalletId: string;
    amount: number;
    currency: string;
    description?: string;
    requestingUserId: string;
    pin: string;
  }): Promise<WalletTransaction> {
    // Check user has transfer permission
    const { data: permission } = await this.supabase
      .from('school_wallet_permissions')
      .select('permissions, role')
      .eq('wallet_id', params.schoolWalletId)
      .eq('user_id', params.requestingUserId)
      .single();

    if (!permission || !permission.permissions.includes('transfer')) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to transfer funds',
        },
      });
    }

    // Verify PIN
    const { data: user } = await this.supabase
      .from('users')
      .select('wallet_pin_hash, wallet_pin')
      .eq('id', params.requestingUserId)
      .single();

    if (user) {
      const pinHash = crypto.createHash('sha256').update(params.pin).digest('hex');
      const pinValid = user.wallet_pin_hash === pinHash || user.wallet_pin === params.pin;
      if (!pinValid) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'INVALID_PIN',
            message: 'Invalid PIN',
          },
        });
      }
    }

    // Get school wallet
    const { data: schoolWallet } = await this.supabase
      .from('school_wallets')
      .select('*')
      .eq('id', params.schoolWalletId)
      .single();

    if (!schoolWallet) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'School wallet not found',
        },
      });
    }

    if (schoolWallet.balance < params.amount) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient wallet balance',
          balance: schoolWallet.balance,
          required: params.amount,
        },
      });
    }

    // Get target personal wallet
    const { data: targetWallet } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', params.targetWalletId)
      .single();

    if (!targetWallet) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'TARGET_WALLET_NOT_FOUND',
          message: 'Target wallet not found',
        },
      });
    }

    const now = new Date().toISOString();
    const transactionId = `swtxn_${crypto.randomBytes(12).toString('hex')}`;

    // Debit school wallet
    await this.supabase
      .from('school_wallets')
      .update({
        balance: schoolWallet.balance - params.amount,
        updated_at: now,
      })
      .eq('id', params.schoolWalletId);

    // Credit personal wallet
    await this.supabase
      .from('wallets')
      .update({
        balance: targetWallet.balance + params.amount,
        updated_at: now,
      })
      .eq('id', params.targetWalletId);

    // Create transaction record
    const { data: transaction, error } = await this.supabase
      .from('school_wallet_transactions')
      .insert({
        id: transactionId,
        wallet_id: params.schoolWalletId,
        type: 'transfer',
        amount: params.amount,
        currency: params.currency,
        description: params.description || 'Transfer to personal wallet',
        reference: params.targetWalletId,
        status: 'completed',
        metadata: {
          target_wallet_id: params.targetWalletId,
          initiated_by: params.requestingUserId,
        },
        created_at: now,
        completed_at: now,
      })
      .select()
      .single();

    if (error) {
      // Rollback
      await this.supabase
        .from('school_wallets')
        .update({ balance: schoolWallet.balance, updated_at: now })
        .eq('id', params.schoolWalletId);
      await this.supabase
        .from('wallets')
        .update({ balance: targetWallet.balance, updated_at: now })
        .eq('id', params.targetWalletId);

      throw new BadRequestException({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to create transaction record',
        },
      });
    }

    return transaction;
  }

  /**
   * Initiate bank transfer via Monime
   */
  async initiateBankTransfer(params: {
    schoolWalletId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    currency: string;
    description?: string;
    requestingUserId: string;
    pin: string;
  }): Promise<WalletTransaction> {
    // Check user has withdraw permission
    const { data: permission } = await this.supabase
      .from('school_wallet_permissions')
      .select('permissions')
      .eq('wallet_id', params.schoolWalletId)
      .eq('user_id', params.requestingUserId)
      .single();

    if (!permission || !permission.permissions.includes('withdraw')) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to withdraw funds',
        },
      });
    }

    // Verify PIN
    const { data: user } = await this.supabase
      .from('users')
      .select('wallet_pin_hash, wallet_pin')
      .eq('id', params.requestingUserId)
      .single();

    if (user) {
      const pinHash = crypto.createHash('sha256').update(params.pin).digest('hex');
      const pinValid = user.wallet_pin_hash === pinHash || user.wallet_pin === params.pin;
      if (!pinValid) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'INVALID_PIN',
            message: 'Invalid PIN',
          },
        });
      }
    }

    // Get school wallet
    const { data: schoolWallet } = await this.supabase
      .from('school_wallets')
      .select('*')
      .eq('id', params.schoolWalletId)
      .single();

    if (!schoolWallet) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'School wallet not found',
        },
      });
    }

    // Add fee calculation (example: 1% fee, minimum 500 SLE)
    const fee = Math.max(params.amount * 0.01, 500);
    const totalDebit = params.amount + fee;

    if (schoolWallet.balance < totalDebit) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient wallet balance (including fee)',
          balance: schoolWallet.balance,
          required: totalDebit,
          fee: fee,
        },
      });
    }

    const now = new Date().toISOString();
    const transactionId = `swbtxn_${crypto.randomBytes(12).toString('hex')}`;

    // Create pending transaction (bank transfer takes time)
    const { data: transaction, error } = await this.supabase
      .from('school_wallet_transactions')
      .insert({
        id: transactionId,
        wallet_id: params.schoolWalletId,
        type: 'bank_transfer',
        amount: params.amount,
        currency: params.currency,
        description: params.description || `Bank transfer to ${params.accountName}`,
        status: 'pending',
        metadata: {
          bank_code: params.bankCode,
          account_number: params.accountNumber,
          account_name: params.accountName,
          fee: fee,
          initiated_by: params.requestingUserId,
        },
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to create transaction',
        },
      });
    }

    // Debit school wallet (including fee)
    await this.supabase
      .from('school_wallets')
      .update({
        balance: schoolWallet.balance - totalDebit,
        updated_at: now,
      })
      .eq('id', params.schoolWalletId);

    // TODO: Call Monime API to initiate actual bank transfer
    // For now, we'll simulate success after a short delay
    // In production, you'd call the Monime API here and update transaction status via webhook

    return transaction;
  }

  /**
   * Credit school wallet (for incoming payments)
   */
  async creditSchoolWallet(params: {
    schoolId: string;
    amount: number;
    currency: string;
    description: string;
    reference: string;
    metadata?: Record<string, any>;
  }): Promise<WalletTransaction> {
    // Get school wallet by school ID
    const { data: wallet } = await this.supabase
      .from('school_wallets')
      .select('*')
      .eq('school_id', params.schoolId)
      .single();

    if (!wallet) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'School wallet not found',
        },
      });
    }

    const now = new Date().toISOString();
    const transactionId = `swtxn_${crypto.randomBytes(12).toString('hex')}`;
    const newBalance = wallet.balance + params.amount;

    // Credit the wallet
    await this.supabase
      .from('school_wallets')
      .update({
        balance: newBalance,
        updated_at: now,
      })
      .eq('id', wallet.id);

    // Create transaction record
    const { data: transaction, error } = await this.supabase
      .from('school_wallet_transactions')
      .insert({
        id: transactionId,
        wallet_id: wallet.id,
        type: 'credit',
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        reference: params.reference,
        status: 'completed',
        metadata: params.metadata,
        created_at: now,
        completed_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to record transaction',
        },
      });
    }

    return transaction;
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(params: {
    walletId: string;
    userId: string;
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
  }): Promise<{ transactions: WalletTransaction[]; total: number }> {
    // Check user has permission
    const { data: permission } = await this.supabase
      .from('school_wallet_permissions')
      .select('permissions')
      .eq('wallet_id', params.walletId)
      .eq('user_id', params.userId)
      .single();

    if (!permission || !permission.permissions.includes('view_transactions')) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to view transactions',
        },
      });
    }

    let query = this.supabase
      .from('school_wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', params.walletId)
      .order('created_at', { ascending: false });

    if (params.type) {
      query = query.eq('type', params.type);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }

    query = query.range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);

    const { data: transactions, count, error } = await query;

    if (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to fetch transactions',
        },
      });
    }

    return {
      transactions: transactions || [],
      total: count || 0,
    };
  }
}
