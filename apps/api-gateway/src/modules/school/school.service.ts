import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

interface StudentWalletLink {
  id: string;
  peeap_user_id: string;
  school_id: number;
  index_number: string;
  peeap_wallet_id: string;
  daily_limit: number;
  is_active: boolean;
}

interface WalletBalance {
  wallet_id: string;
  owner_name: string;
  owner_type: string;
  index_number?: string;
  balance: number;
  currency: string;
  daily_limit: number;
  daily_spent: number;
  available_today: number;
  status: string;
  last_transaction_at?: string;
}

interface PaymentSession {
  id: string;
  session_id: string;
  school_id: number;
  payer_type: string;
  payer_id: number;
  payer_name: string;
  payer_index_number?: string;
  payer_wallet_id: string;
  vendor_id: string;
  vendor_name: string;
  amount: number;
  currency: string;
  description?: string;
  items?: any[];
  status: string;
  expires_at: string;
  completed_at?: string;
  transaction_id?: string;
}

@Injectable()
export class SchoolService {
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
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `pay_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Validate OAuth access token and extract user info
   */
  async validateAccessToken(accessToken: string): Promise<{
    valid: boolean;
    userId?: string;
    clientId?: string;
    scope?: string;
  }> {
    const { data: tokens, error } = await this.supabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('access_token', accessToken)
      .is('revoked_at', null)
      .limit(1);

    if (error || !tokens || tokens.length === 0) {
      return { valid: false };
    }

    const token = tokens[0];

    // Check expiration
    if (new Date(token.expires_at) < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: token.user_id,
      clientId: token.client_id,
      scope: token.scope,
    };
  }

  /**
   * Get wallet balance by student index number
   */
  async getWalletBalance(identifier: string, schoolId?: number): Promise<WalletBalance> {
    // First, try to find the wallet link by index number
    let query = this.supabase
      .from('student_wallet_links')
      .select('*')
      .eq('index_number', identifier)
      .eq('is_active', true);

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data: links, error: linkError } = await query.limit(1);

    if (linkError) {
      throw new BadRequestException('Failed to query wallet link');
    }

    if (!links || links.length === 0) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'No wallet found for this identifier',
        },
      });
    }

    const link = links[0] as StudentWalletLink;

    // Get the actual wallet balance from wallets table
    const { data: wallets, error: walletError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', link.peeap_wallet_id)
      .limit(1);

    if (walletError || !wallets || wallets.length === 0) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet not found',
        },
      });
    }

    const wallet = wallets[0];

    // Get user info for owner name
    const { data: users } = await this.supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', link.peeap_user_id)
      .limit(1);

    const user = users?.[0];
    const ownerName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown';

    // Calculate daily spent (transactions from today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayTransactions } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('wallet_id', link.peeap_wallet_id)
      .eq('type', 'debit')
      .gte('created_at', todayStart.toISOString());

    const dailySpent = todayTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const dailyLimit = link.daily_limit || 100;
    const availableToday = Math.max(0, dailyLimit - dailySpent);

    // Get last transaction
    const { data: lastTransaction } = await this.supabase
      .from('transactions')
      .select('created_at')
      .eq('wallet_id', link.peeap_wallet_id)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      wallet_id: link.peeap_wallet_id,
      owner_name: ownerName,
      owner_type: 'student',
      index_number: link.index_number,
      balance: wallet.balance || 0,
      currency: wallet.currency || 'NLE',
      daily_limit: dailyLimit,
      daily_spent: dailySpent,
      available_today: Math.min(availableToday, wallet.balance || 0),
      status: wallet.status || 'active',
      last_transaction_at: lastTransaction?.[0]?.created_at,
    };
  }

  /**
   * Authorize a payment with PIN verification
   */
  async authorizePayment(params: {
    sessionId: string;
    walletId: string;
    amount: number;
    currency: string;
    pin: string;
    vendorId: string;
    vendorName: string;
    description?: string;
    items?: any[];
    metadata?: {
      school_id?: number;
      payer_type?: string;
      payer_id?: number;
    };
  }): Promise<{
    transaction_id: string;
    session_id: string;
    status: string;
    amount: number;
    currency: string;
    balance_before: number;
    balance_after: number;
    completed_at: string;
    receipt: {
      number: string;
      url: string;
    };
  }> {
    // Get wallet
    const { data: wallets, error: walletError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', params.walletId)
      .limit(1);

    if (walletError || !wallets || wallets.length === 0) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet not found',
        },
      });
    }

    const wallet = wallets[0];

    // Check wallet status
    if (wallet.status !== 'active') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Wallet is locked or inactive',
        },
      });
    }

    // Verify PIN
    const { data: users, error: userError } = await this.supabase
      .from('users')
      .select('id, wallet_pin, wallet_pin_attempts, wallet_pin_locked_until')
      .eq('id', wallet.user_id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const user = users[0];

    // Check if account is locked
    if (user.wallet_pin_locked_until && new Date(user.wallet_pin_locked_until) > new Date()) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Wallet is locked due to too many failed PIN attempts',
          unlock_at: user.wallet_pin_locked_until,
        },
      });
    }

    // Verify PIN (simple comparison - in production, use hashed PINs)
    const storedPin = user.wallet_pin || '1234'; // Default PIN for testing
    if (params.pin !== storedPin) {
      // Increment failed attempts
      const attempts = (user.wallet_pin_attempts || 0) + 1;
      const maxAttempts = 3;

      if (attempts >= maxAttempts) {
        // Lock account for 15 minutes
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await this.supabase
          .from('users')
          .update({
            wallet_pin_attempts: attempts,
            wallet_pin_locked_until: lockUntil.toISOString(),
          })
          .eq('id', user.id);

        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Wallet is locked due to too many failed PIN attempts',
            unlock_at: lockUntil.toISOString(),
          },
        });
      }

      await this.supabase
        .from('users')
        .update({ wallet_pin_attempts: attempts })
        .eq('id', user.id);

      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_PIN',
          message: 'The PIN entered is incorrect',
          attempts_remaining: maxAttempts - attempts,
        },
      });
    }

    // Reset PIN attempts on successful verification
    await this.supabase
      .from('users')
      .update({ wallet_pin_attempts: 0, wallet_pin_locked_until: null })
      .eq('id', user.id);

    // Check balance
    if (wallet.balance < params.amount) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Wallet balance is insufficient',
          balance: wallet.balance,
          required: params.amount,
        },
      });
    }

    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayTransactions } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('wallet_id', params.walletId)
      .eq('type', 'debit')
      .gte('created_at', todayStart.toISOString());

    const dailySpent = todayTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const dailyLimit = 100; // Default daily limit

    if (dailySpent + params.amount > dailyLimit) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DAILY_LIMIT_EXCEEDED',
          message: 'Daily spending limit exceeded',
          daily_limit: dailyLimit,
          daily_spent: dailySpent,
          available: dailyLimit - dailySpent,
          required: params.amount,
        },
      });
    }

    // Process the payment
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - params.amount;
    const transactionId = `txn_${crypto.randomBytes(12).toString('hex')}`;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const completedAt = new Date().toISOString();

    // Update wallet balance
    const { error: updateError } = await this.supabase
      .from('wallets')
      .update({ balance: balanceAfter, updated_at: completedAt })
      .eq('id', params.walletId);

    if (updateError) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to process transaction',
        },
      });
    }

    // Create transaction record
    await this.supabase.from('transactions').insert({
      id: transactionId,
      wallet_id: params.walletId,
      user_id: wallet.user_id,
      type: 'debit',
      amount: params.amount,
      currency: params.currency,
      description: params.description || `Payment to ${params.vendorName}`,
      status: 'completed',
      reference: params.sessionId,
      metadata: {
        vendor_id: params.vendorId,
        vendor_name: params.vendorName,
        items: params.items,
        receipt_number: receiptNumber,
        ...params.metadata,
      },
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      created_at: completedAt,
      completed_at: completedAt,
    });

    return {
      transaction_id: transactionId,
      session_id: params.sessionId,
      status: 'completed',
      amount: params.amount,
      currency: params.currency,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      completed_at: completedAt,
      receipt: {
        number: receiptNumber,
        url: `https://api.peeap.com/receipts/${receiptNumber}`,
      },
    };
  }

  /**
   * Link a student wallet
   */
  async linkStudentWallet(params: {
    schoolId: number;
    studentId: number;
    indexNumber: string;
    peeapUserId: string;
    walletId: string;
  }): Promise<{
    linked: boolean;
    wallet_id: string;
    linked_at: string;
  }> {
    const linkedAt = new Date().toISOString();

    // Check if link already exists
    const { data: existing } = await this.supabase
      .from('student_wallet_links')
      .select('id')
      .eq('index_number', params.indexNumber)
      .eq('school_id', params.schoolId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing link
      await this.supabase
        .from('student_wallet_links')
        .update({
          peeap_user_id: params.peeapUserId,
          peeap_wallet_id: params.walletId,
          is_active: true,
          updated_at: linkedAt,
        })
        .eq('id', existing[0].id);
    } else {
      // Create new link
      await this.supabase.from('student_wallet_links').insert({
        school_id: params.schoolId,
        student_id: params.studentId,
        index_number: params.indexNumber,
        peeap_user_id: params.peeapUserId,
        peeap_wallet_id: params.walletId,
        daily_limit: 100,
        is_active: true,
        created_at: linkedAt,
      });
    }

    return {
      linked: true,
      wallet_id: params.walletId,
      linked_at: linkedAt,
    };
  }

  /**
   * Get school vendors
   */
  async getVendors(schoolId: number): Promise<any[]> {
    const { data: vendors, error } = await this.supabase
      .from('school_vendors')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (error) {
      return [];
    }

    return vendors || [];
  }

  /**
   * Get vendor products
   */
  async getVendorProducts(vendorId: string): Promise<any[]> {
    const { data: products, error } = await this.supabase
      .from('vendor_products')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_available', true);

    if (error) {
      return [];
    }

    return products || [];
  }
}
