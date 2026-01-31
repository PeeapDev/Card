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
  nsi: string;  // National Student Identifier (alias for index_number)
  index_number?: string;  // Kept for backward compatibility
  peeap_wallet_id: string;
  daily_limit: number;
  is_active: boolean;
}

interface WalletBalance {
  wallet_id: string;
  owner_name: string;
  owner_type: string;
  nsi?: string;  // National Student Identifier
  index_number?: string;  // Kept for backward compatibility
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
  payer_nsi?: string;  // National Student Identifier
  payer_index_number?: string;  // Kept for backward compatibility
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
   * Get wallet balance by student NSI (National Student Identifier)
   */
  async getWalletBalance(identifier: string, schoolId?: number): Promise<WalletBalance> {
    // First, try to find the wallet link by nsi (or index_number for backward compatibility)
    let query = this.supabase
      .from('student_wallet_links')
      .select('*')
      .or(`nsi.eq.${identifier},index_number.eq.${identifier}`)
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
      nsi: link.nsi || link.index_number,  // Prefer nsi, fallback to index_number
      index_number: link.index_number,  // Kept for backward compatibility
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
    nsi: string;  // National Student Identifier
    peeapUserId: string;
    walletId: string;
  }): Promise<{
    linked: boolean;
    wallet_id: string;
    linked_at: string;
  }> {
    const linkedAt = new Date().toISOString();

    // Check if link already exists (check both nsi and index_number for backward compatibility)
    const { data: existing } = await this.supabase
      .from('student_wallet_links')
      .select('id')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .eq('school_id', params.schoolId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing link
      await this.supabase
        .from('student_wallet_links')
        .update({
          peeap_user_id: params.peeapUserId,
          peeap_wallet_id: params.walletId,
          nsi: params.nsi,  // Ensure nsi is set
          is_active: true,
          updated_at: linkedAt,
        })
        .eq('id', existing[0].id);
    } else {
      // Create new link
      await this.supabase.from('student_wallet_links').insert({
        school_id: params.schoolId,
        student_id: params.studentId,
        nsi: params.nsi,  // Use nsi as primary
        index_number: params.nsi,  // Also set index_number for backward compatibility
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

  // ============================================
  // Quick Access Authentication (Flow 2)
  // ============================================

  /**
   * Verify JWT token from SaaS for quick dashboard access
   * Returns the payload with the Peeap user ID if a mapping exists
   */
  async verifyQuickAccessToken(token: string): Promise<any> {
    const jwtSecret = this.configService.get<string>('PEEAP_JWT_SECRET');

    if (!jwtSecret) {
      throw new BadRequestException('JWT secret not configured');
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid token format');
      }

      const [base64Header, base64Payload, base64Signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', jwtSecret)
        .update(`${base64Header}.${base64Payload}`)
        .digest('base64url');

      if (expectedSignature !== base64Signature) {
        throw new UnauthorizedException('Invalid token signature');
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));

      // Check expiry
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token has expired');
      }

      // IMPORTANT: The JWT contains school's internal user_id, not Peeap user_id
      // Look up the mapping to get the Peeap user ID
      const peeapSchoolId = payload.school_id ? `sch_${payload.school_id}` : null;

      if (peeapSchoolId && payload.user_id) {
        const { data: mapping } = await this.supabase
          .from('school_user_mappings')
          .select('peeap_user_id, peeap_email, has_pin_setup, school_role, is_primary_admin')
          .eq('school_user_id', payload.user_id.toString())
          .eq('peeap_school_id', peeapSchoolId)
          .eq('status', 'active')
          .single();

        if (mapping) {
          // Add the Peeap user info to the payload
          payload.peeap_user_id = mapping.peeap_user_id;
          payload.peeap_email = mapping.peeap_email;
          payload.has_pin_setup = mapping.has_pin_setup;
          payload.is_primary_admin = mapping.is_primary_admin;
          payload.mapping_found = true;
        } else {
          payload.mapping_found = false;

          // Strategy 1: Check if this might be the primary admin
          // Try to find by connected_by_email in school_connections (case-insensitive)
          const { data: connection } = await this.supabase
            .from('school_connections')
            .select('connected_by_user_id, connected_by_email')
            .eq('peeap_school_id', peeapSchoolId)
            .eq('status', 'active')
            .single();

          const emailLower = payload.email?.toLowerCase();
          const connectedEmailLower = connection?.connected_by_email?.toLowerCase();

          if (connection && connectedEmailLower === emailLower) {
            // This user's email matches who connected the school
            // Create the mapping automatically
            payload.peeap_user_id = connection.connected_by_user_id;
            payload.peeap_email = connection.connected_by_email;
            payload.is_primary_admin = true;
            payload.mapping_found = true;
            payload.auto_mapped = true;

            // Create the mapping for future use
            await this.supabase.from('school_user_mappings').upsert({
              school_user_id: payload.user_id.toString(),
              peeap_school_id: peeapSchoolId,
              peeap_user_id: connection.connected_by_user_id,
              school_email: payload.email,
              peeap_email: connection.connected_by_email,
              school_role: payload.role || 'admin',
              is_primary_admin: true,
              has_pin_setup: true,
            }, {
              onConflict: 'school_user_id,peeap_school_id',
            });
          }

          // Strategy 2: If no match yet, try to find a Peeap user with the same email
          // This allows staff members with Peeap accounts to access their school
          if (!payload.mapping_found && emailLower) {
            const { data: peeapUser } = await this.supabase
              .from('users')
              .select('id, email')
              .ilike('email', emailLower)
              .single();

            if (peeapUser) {
              // Found a Peeap user with this email
              // Verify they should have access to this school
              // (they must either be the connector or have a valid mapping)

              // Check if this user connected any school (to verify they're a school admin)
              const { data: userConnection } = await this.supabase
                .from('school_connections')
                .select('peeap_school_id')
                .eq('connected_by_user_id', peeapUser.id)
                .eq('peeap_school_id', peeapSchoolId)
                .eq('status', 'active')
                .single();

              if (userConnection) {
                // User connected THIS school, allow access
                payload.peeap_user_id = peeapUser.id;
                payload.peeap_email = peeapUser.email;
                payload.is_primary_admin = true;
                payload.mapping_found = true;
                payload.auto_mapped = true;

                // Create the mapping for future use
                await this.supabase.from('school_user_mappings').upsert({
                  school_user_id: payload.user_id.toString(),
                  peeap_school_id: peeapSchoolId,
                  peeap_user_id: peeapUser.id,
                  school_email: payload.email,
                  peeap_email: peeapUser.email,
                  school_role: payload.role || 'admin',
                  is_primary_admin: true,
                  has_pin_setup: true,
                }, {
                  onConflict: 'school_user_id,peeap_school_id',
                });
              }
            }
          }
        }
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to verify token');
    }
  }

  /**
   * Verify PIN for quick access and return session tokens
   *
   * IMPORTANT: The userId param is the school's internal user ID from the JWT.
   * We need to look up the corresponding Peeap user ID from the mapping.
   */
  async verifyQuickAccessPin(
    token: string,
    pin: string,
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // First verify the token - this also looks up the Peeap user mapping
    const tokenPayload = await this.verifyQuickAccessToken(token);

    // Verify the user ID in the request matches the token
    if (tokenPayload.user_id.toString() !== userId.toString()) {
      throw new UnauthorizedException('User ID mismatch');
    }

    // Check if we have a Peeap user mapping
    if (!tokenPayload.peeap_user_id) {
      throw new NotFoundException(
        'Your account is not connected to Peeap. Please contact your school administrator ' +
        'or use the same email you used when connecting the school.'
      );
    }

    const peeapUserId = tokenPayload.peeap_user_id;

    // Get the Peeap user and verify PIN
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id, wallet_pin_hash, wallet_pin, email, full_name')
      .eq('id', peeapUserId)
      .single();

    if (userError || !user) {
      throw new NotFoundException('Peeap user not found. The account may have been deleted.');
    }

    // Verify PIN (check both hashed and plain for backwards compatibility)
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
    const pinValid = user.wallet_pin_hash === pinHash || user.wallet_pin === pin;

    if (!pinValid) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // Update last access timestamp in the mapping
    const peeapSchoolId = tokenPayload.school_id ? `sch_${tokenPayload.school_id}` : null;
    if (peeapSchoolId) {
      await this.supabase
        .from('school_user_mappings')
        .update({ last_access_at: new Date().toISOString() })
        .eq('school_user_id', userId.toString())
        .eq('peeap_school_id', peeapSchoolId);
    }

    // Generate session tokens
    const accessToken = this.generateToken(64);
    const refreshToken = this.generateToken(64);
    const expiresIn = 3600; // 1 hour

    // Store the access token - use the PEEAP user ID, not the school user ID
    await this.supabase.from('oauth_access_tokens').insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      user_id: peeapUserId,  // Use Peeap user ID here!
      client_id: 'school-portal',
      scope: 'school_admin',
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private generateToken(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // ============================================
  // Wallet Management (Flow 3)
  // ============================================

  /**
   * Create a new wallet for a student
   */
  async createStudentWallet(params: {
    nsi: string;  // National Student Identifier
    studentName: string;
    studentPhone?: string;
    studentEmail?: string;
    className?: string;
    section?: string;
    schoolId: number;
    pin: string;
    dailyLimit: number;
    parentPhone?: string;
    parentEmail?: string;
  }): Promise<{ peeap_user_id: string; wallet_id: string }> {
    // Check if a wallet already exists for this NSI (or index_number for backward compatibility)
    const { data: existingLink } = await this.supabase
      .from('student_wallet_links')
      .select('*')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .maybeSingle();

    if (existingLink) {
      throw new BadRequestException('A wallet already exists for this NSI');
    }

    // Generate unique IDs
    const userId = crypto.randomUUID();
    const walletId = crypto.randomUUID();
    const externalId = `STU-${params.schoolId}-${params.nsi.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
    const pinHash = crypto.createHash('sha256').update(params.pin).digest('hex');

    // Create user with proper Supabase auth schema compatibility
    const { error: userError } = await this.supabase.from('users').insert({
      id: userId,
      external_id: `USR-STU-${params.nsi.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`,
      email: params.studentEmail || `${params.nsi.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.peeap.local`,
      phone: params.studentPhone || params.parentPhone || null,
      full_name: params.studentName,
      first_name: params.studentName.split(' ')[0] || params.studentName,
      last_name: params.studentName.split(' ').slice(1).join(' ') || '',
      wallet_pin_hash: pinHash,
      wallet_pin: params.pin, // Also store plain for backward compatibility (to be removed)
      account_type: 'student',
      status: 'ACTIVE',
      roles: 'student',
      is_verified: true, // School-created accounts are pre-verified
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (userError) {
      console.error('Failed to create student user:', userError);
      throw new BadRequestException(`Failed to create user: ${userError.message}`);
    }

    // Create wallet with required fields
    const { error: walletError } = await this.supabase.from('wallets').insert({
      id: walletId,
      external_id: externalId,
      user_id: userId,
      balance: 0,
      available_balance: 0,
      currency: 'SLE',
      wallet_type: 'student',
      name: `${params.studentName}'s Wallet`,
      daily_limit: params.dailyLimit || 50000,
      monthly_limit: 500000,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (walletError) {
      console.error('Failed to create student wallet:', walletError);
      // Rollback user creation
      await this.supabase.from('users').delete().eq('id', userId);
      throw new BadRequestException(`Failed to create wallet: ${walletError.message}`);
    }

    // Create student wallet link
    const { error: linkError } = await this.supabase.from('student_wallet_links').insert({
      nsi: params.nsi,  // Use nsi as primary
      index_number: params.nsi,  // Also set index_number for backward compatibility
      peeap_user_id: userId,
      peeap_wallet_id: walletId,
      school_id: params.schoolId,
      current_school_id: params.schoolId.toString(),
      student_name: params.studentName,
      student_phone: params.studentPhone,
      daily_limit: params.dailyLimit || 50000,
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
      linked_at: new Date().toISOString(),
    });

    if (linkError) {
      console.error('Failed to create student wallet link:', linkError);
      // Rollback
      await this.supabase.from('wallets').delete().eq('id', walletId);
      await this.supabase.from('users').delete().eq('id', userId);
      throw new BadRequestException(`Failed to link wallet: ${linkError.message}`);
    }

    return { peeap_user_id: userId, wallet_id: walletId };
  }

  /**
   * Link an existing Peeap wallet to a student
   */
  async linkExistingWallet(params: {
    phoneOrEmail: string;
    pin: string;
    nsi: string;  // National Student Identifier
    studentId: number;
    schoolId: number;
  }): Promise<{ peeap_user_id: string; wallet_id: string }> {
    // Find user by phone or email
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id, wallet_pin_hash')
      .or(`email.eq.${params.phoneOrEmail},phone.eq.${params.phoneOrEmail}`)
      .single();

    if (userError || !user) {
      throw new NotFoundException('No Peeap account found with this phone or email');
    }

    // Verify PIN
    const pinHash = crypto.createHash('sha256').update(params.pin).digest('hex');
    if (user.wallet_pin_hash !== pinHash) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // Get the user's wallet
    const { data: wallet, error: walletError } = await this.supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new NotFoundException('No wallet found for this account');
    }

    // Check if already linked (check both nsi and index_number for backward compatibility)
    const { data: existingLink } = await this.supabase
      .from('student_wallet_links')
      .select('*')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .single();

    if (existingLink) {
      throw new BadRequestException('This NSI is already linked to a wallet');
    }

    // Create the link
    const { error: linkError } = await this.supabase.from('student_wallet_links').insert({
      nsi: params.nsi,  // Use nsi as primary
      index_number: params.nsi,  // Also set index_number for backward compatibility
      peeap_user_id: user.id,
      wallet_id: wallet.id,
      current_school_id: params.schoolId.toString(),
      status: 'active',
      linked_at: new Date().toISOString(),
    });

    if (linkError) {
      throw new BadRequestException(`Failed to link wallet: ${linkError.message}`);
    }

    return { peeap_user_id: user.id, wallet_id: wallet.id };
  }

  /**
   * Top up a student wallet
   */
  async topupWallet(params: {
    walletId: string;
    amount: number;
    currency: string;
    source: string;
    paymentMethod: string;
    reference?: string;
    initiatedBy: string;
  }): Promise<{ transaction_id: string; new_balance: number }> {
    // Get current wallet
    const { data: wallet, error: walletError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', params.walletId)
      .single();

    if (walletError || !wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Calculate new balance
    const newBalance = parseFloat(wallet.balance) + params.amount;

    // Create transaction
    const transactionId = `txn_${crypto.randomBytes(12).toString('hex')}`;

    const { error: txnError } = await this.supabase.from('transactions').insert({
      id: transactionId,
      wallet_id: params.walletId,
      type: 'topup',
      amount: params.amount,
      currency: params.currency,
      balance_before: wallet.balance,
      balance_after: newBalance,
      status: 'completed',
      source: params.source,
      payment_method: params.paymentMethod,
      reference: params.reference,
      initiated_by: params.initiatedBy,
      completed_at: new Date().toISOString(),
    });

    if (txnError) {
      throw new BadRequestException(`Failed to create transaction: ${txnError.message}`);
    }

    // Update wallet balance
    const { error: updateError } = await this.supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', params.walletId);

    if (updateError) {
      throw new BadRequestException(`Failed to update balance: ${updateError.message}`);
    }

    return { transaction_id: transactionId, new_balance: newBalance };
  }

  // ============================================
  // Student Self-Service Fee Payment (Flow 4)
  // ============================================

  /**
   * Get student wallet info by NSI (National Student Identifier)
   */
  async getStudentWalletInfo(params: {
    nsi: string;  // National Student Identifier
    schoolId: number;
  }): Promise<{
    wallet_id: string;
    balance: number;
    currency: string;
    student_name: string;
    username?: string;
  }> {
    // Try to find in student_accounts table first (new system) - check both nsi and index_number
    const { data: studentAccount } = await this.supabase
      .from('student_accounts')
      .select('id, first_name, last_name, username, wallet_id')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .eq('status', 'active')
      .single();

    if (studentAccount && studentAccount.wallet_id) {
      // Get wallet balance
      const { data: wallet } = await this.supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('id', studentAccount.wallet_id)
        .single();

      if (wallet) {
        return {
          wallet_id: wallet.id,
          balance: wallet.balance || 0,
          currency: wallet.currency || 'SLE',
          student_name: `${studentAccount.first_name} ${studentAccount.last_name}`,
          username: studentAccount.username,
        };
      }
    }

    // Fallback to student_wallet_links table (legacy system) - check both nsi and index_number
    const { data: link } = await this.supabase
      .from('student_wallet_links')
      .select('peeap_wallet_id, peeap_user_id, student_name')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .eq('is_active', true)
      .single();

    if (!link) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'No wallet found for this student',
        },
      });
    }

    const { data: wallet } = await this.supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('id', link.peeap_wallet_id)
      .single();

    if (!wallet) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet not found',
        },
      });
    }

    return {
      wallet_id: wallet.id,
      balance: wallet.balance || 0,
      currency: wallet.currency || 'SLE',
      student_name: link.student_name || 'Student',
    };
  }

  /**
   * Pay fee from student wallet (student self-service)
   */
  async payFeeFromWallet(params: {
    studentNsi: string;  // National Student Identifier
    feeId: string;
    feeName: string;
    amount: number;
    currency: string;
    pin: string;
    schoolId: number;
    academicYear?: string;
    term?: string;
  }): Promise<{
    transaction_id: string;
    fee_id: string;
    amount_paid: number;
    currency: string;
    balance_before: number;
    balance_after: number;
    completed_at: string;
    receipt: {
      number: string;
      url: string;
    };
  }> {
    // Step 1: Get student wallet info
    let walletId: string;
    let userId: string | null = null;
    let studentName: string;

    // Try student_accounts first (new system) - check both nsi and index_number
    const { data: studentAccount } = await this.supabase
      .from('student_accounts')
      .select('id, first_name, last_name, wallet_id, paired_user_id')
      .or(`nsi.eq.${params.studentNsi},index_number.eq.${params.studentNsi}`)
      .eq('status', 'active')
      .single();

    if (studentAccount && studentAccount.wallet_id) {
      walletId = studentAccount.wallet_id;
      userId = studentAccount.paired_user_id;
      studentName = `${studentAccount.first_name} ${studentAccount.last_name}`;
    } else {
      // Fallback to student_wallet_links (legacy) - check both nsi and index_number
      const { data: link } = await this.supabase
        .from('student_wallet_links')
        .select('peeap_wallet_id, peeap_user_id, student_name')
        .or(`nsi.eq.${params.studentNsi},index_number.eq.${params.studentNsi}`)
        .eq('is_active', true)
        .single();

      if (!link) {
        throw new NotFoundException({
          success: false,
          error: {
            code: 'WALLET_NOT_FOUND',
            message: 'No wallet found for this student',
          },
        });
      }

      walletId = link.peeap_wallet_id;
      userId = link.peeap_user_id;
      studentName = link.student_name || 'Student';
    }

    // Step 2: Get wallet and check balance
    const { data: wallet, error: walletError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'WALLET_NOT_FOUND',
          message: 'Wallet not found',
        },
      });
    }

    if (wallet.balance < params.amount) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient wallet balance',
          balance: wallet.balance,
          required: params.amount,
        },
      });
    }

    // Step 3: Verify PIN (if user is paired)
    if (userId) {
      const { data: user } = await this.supabase
        .from('users')
        .select('wallet_pin_hash, wallet_pin, wallet_pin_attempts, wallet_pin_locked_until')
        .eq('id', userId)
        .single();

      if (user) {
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

        // Verify PIN
        const pinHash = crypto.createHash('sha256').update(params.pin).digest('hex');
        const pinValid = user.wallet_pin_hash === pinHash || user.wallet_pin === params.pin;

        if (!pinValid) {
          // Increment failed attempts
          const attempts = (user.wallet_pin_attempts || 0) + 1;
          const maxAttempts = 3;

          if (attempts >= maxAttempts) {
            const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            await this.supabase
              .from('users')
              .update({
                wallet_pin_attempts: attempts,
                wallet_pin_locked_until: lockUntil.toISOString(),
              })
              .eq('id', userId);

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
            .eq('id', userId);

          throw new UnauthorizedException({
            success: false,
            error: {
              code: 'INVALID_PIN',
              message: 'The PIN entered is incorrect',
              attempts_remaining: maxAttempts - attempts,
            },
          });
        }

        // Reset PIN attempts on success
        await this.supabase
          .from('users')
          .update({ wallet_pin_attempts: 0, wallet_pin_locked_until: null })
          .eq('id', userId);
      }
    } else {
      // For student accounts without paired user, verify against a simple PIN
      // stored in the student account or use a default verification method
      // For now, we'll require PIN to be set up with wallet creation
      // This is a simplified verification - in production, implement proper PIN storage
      if (params.pin !== '0000' && params.pin.length !== 4) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'INVALID_PIN',
            message: 'Invalid PIN format',
          },
        });
      }
    }

    // Step 4: Process the fee payment
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - params.amount;
    const transactionId = `txn_${crypto.randomBytes(12).toString('hex')}`;
    const receiptNumber = `FEE-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const completedAt = new Date().toISOString();

    // Update wallet balance
    const { error: updateError } = await this.supabase
      .from('wallets')
      .update({ balance: balanceAfter, updated_at: completedAt })
      .eq('id', walletId);

    if (updateError) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Failed to process fee payment',
        },
      });
    }

    // Create transaction record
    await this.supabase.from('transactions').insert({
      id: transactionId,
      wallet_id: walletId,
      user_id: userId,
      type: 'FEE_PAYMENT',
      amount: -params.amount,
      currency: params.currency,
      description: `Fee Payment: ${params.feeName}`,
      status: 'COMPLETED',
      reference: params.feeId,
      metadata: {
        fee_id: params.feeId,
        fee_name: params.feeName,
        school_id: params.schoolId,
        student_name: studentName,
        nsi: params.studentNsi,
        index_number: params.studentNsi,  // Kept for backward compatibility
        academic_year: params.academicYear,
        term: params.term,
        receipt_number: receiptNumber,
        payment_type: 'wallet',
      },
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      created_at: completedAt,
      completed_at: completedAt,
    });

    // Step 5: Update student_fees_cache if exists
    if (studentAccount) {
      await this.supabase
        .from('student_fees_cache')
        .update({
          paid_amount: this.supabase.rpc('increment_paid_amount', { amount: params.amount }),
          status: 'partial', // Will be updated to 'paid' if fully paid
          updated_at: completedAt,
        })
        .eq('student_account_id', studentAccount.id)
        .eq('fee_id_in_school', params.feeId);
    }

    // Step 6: Record in student_wallet_transactions if using new system
    if (studentAccount) {
      await this.supabase.from('student_wallet_transactions').insert({
        student_account_id: studentAccount.id,
        wallet_id: walletId,
        type: 'fee_payment',
        amount: params.amount,
        currency: params.currency,
        status: 'completed',
        description: `Fee Payment: ${params.feeName}`,
        metadata: {
          fee_id: params.feeId,
          fee_name: params.feeName,
          academic_year: params.academicYear,
          term: params.term,
          receipt_number: receiptNumber,
        },
        created_at: completedAt,
      });
    }

    return {
      transaction_id: transactionId,
      fee_id: params.feeId,
      amount_paid: params.amount,
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

  // ============================================
  // External School API Proxy (PEEAP endpoints)
  // ============================================

  private readonly SCHOOL_API_BASE = 'https://gov.school.edu.sl/api/peeap';

  /**
   * Proxy verify-student request to external school API
   */
  async proxyVerifyStudent(body: { nsi?: string; index_number?: string; admission_no?: string; school_id?: number }): Promise<any> {
    try {
      const response = await fetch(`${this.SCHOOL_API_BASE}/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        found: false,
        message: `Failed to connect to school system: ${error.message}`,
      };
    }
  }

  /**
   * Proxy student-financials request to external school API
   */
  async proxyStudentFinancials(body: { student_id: number; school_id: number }): Promise<any> {
    try {
      const response = await fetch(`${this.SCHOOL_API_BASE}/student-financials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to school system: ${error.message}`,
      };
    }
  }

  /**
   * Proxy student-fees-breakdown request to external school API
   * Returns installment-based fee breakdown
   */
  async proxyStudentFeesBreakdown(params: { nsi: string; school_id: number }): Promise<any> {
    try {
      const response = await fetch(
        `${this.SCHOOL_API_BASE}/student-fees-breakdown?nsi=${encodeURIComponent(params.nsi)}&school_id=${params.school_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to school system: ${error.message}`,
      };
    }
  }

  /**
   * Proxy pay-fee request to external school API
   * Supports installment_id for term-specific payments
   */
  async proxyPayFee(body: {
    student_index: string;
    school_id: number;
    amount: number;
    transaction_id: string;
    installment_id?: number;
    fee_id?: number;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.SCHOOL_API_BASE}/pay-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to school system: ${error.message}`,
      };
    }
  }

  // ============================================
  // New NSI-based Endpoints
  // ============================================

  /**
   * Get transactions by NSI (National Student Identifier)
   */
  async getTransactionsByNSI(params: {
    nsi: string;
    schoolId?: string;
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
  }): Promise<{ transactions: any[]; total: number }> {
    // First find the wallet for this NSI
    const { data: link } = await this.supabase
      .from('student_wallet_links')
      .select('peeap_wallet_id')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .eq('is_active', true)
      .single();

    if (!link) {
      // Try student_accounts table
      const { data: studentAccount } = await this.supabase
        .from('student_accounts')
        .select('wallet_id')
        .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
        .eq('status', 'active')
        .single();

      if (!studentAccount?.wallet_id) {
        throw new NotFoundException('No wallet found for this NSI');
      }

      return this.getWalletTransactions(studentAccount.wallet_id, params);
    }

    return this.getWalletTransactions(link.peeap_wallet_id, params);
  }

  private async getWalletTransactions(walletId: string, params: {
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
  }): Promise<{ transactions: any[]; total: number }> {
    let query = this.supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });

    if (params.type) {
      query = query.eq('type', params.type);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch transactions');
    }

    return {
      transactions: data || [],
      total: count || 0,
    };
  }

  /**
   * Update wallet limits by NSI
   */
  async updateWalletLimits(params: {
    nsi: string;
    dailyLimit?: number;
    transactionLimit?: number;
  }): Promise<{ success: boolean; wallet: any }> {
    // Find the wallet link
    const { data: link } = await this.supabase
      .from('student_wallet_links')
      .select('id, peeap_wallet_id, daily_limit')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .eq('is_active', true)
      .single();

    if (!link) {
      throw new NotFoundException('No wallet found for this NSI');
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (params.dailyLimit !== undefined) {
      updates.daily_limit = params.dailyLimit;
    }

    // Update student_wallet_links
    const { error: linkError } = await this.supabase
      .from('student_wallet_links')
      .update(updates)
      .eq('id', link.id);

    if (linkError) {
      throw new BadRequestException('Failed to update limits');
    }

    // Also update the wallet table if transaction_limit is provided
    if (params.transactionLimit !== undefined) {
      await this.supabase
        .from('wallets')
        .update({ transaction_limit: params.transactionLimit })
        .eq('id', link.peeap_wallet_id);
    }

    // Return updated wallet info
    const { data: wallet } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', link.peeap_wallet_id)
      .single();

    return {
      success: true,
      wallet: {
        ...wallet,
        daily_limit: params.dailyLimit ?? (link as any).daily_limit,
      },
    };
  }

  /**
   * Top up wallet by NSI
   */
  async topupWalletByNSI(params: {
    nsi: string;
    amount: number;
    currency: string;
    source: string;
    reference?: string;
  }): Promise<{ success: boolean; transaction: any }> {
    // Find the wallet
    const { data: link } = await this.supabase
      .from('student_wallet_links')
      .select('peeap_wallet_id')
      .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
      .eq('is_active', true)
      .single();

    if (!link) {
      // Try student_accounts
      const { data: studentAccount } = await this.supabase
        .from('student_accounts')
        .select('wallet_id')
        .or(`nsi.eq.${params.nsi},index_number.eq.${params.nsi}`)
        .eq('status', 'active')
        .single();

      if (!studentAccount?.wallet_id) {
        throw new NotFoundException('No wallet found for this NSI');
      }

      return this.processTopup(studentAccount.wallet_id, params);
    }

    return this.processTopup(link.peeap_wallet_id, params);
  }

  private async processTopup(walletId: string, params: {
    amount: number;
    currency: string;
    source: string;
    reference?: string;
  }): Promise<{ success: boolean; transaction: any }> {
    // Get current wallet
    const { data: wallet, error: walletError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const newBalance = parseFloat(wallet.balance) + params.amount;
    const transactionId = `txn_${crypto.randomBytes(12).toString('hex')}`;

    // Create transaction
    const { error: txnError } = await this.supabase.from('transactions').insert({
      id: transactionId,
      wallet_id: walletId,
      type: 'topup',
      amount: params.amount,
      currency: params.currency,
      balance_before: wallet.balance,
      balance_after: newBalance,
      status: 'completed',
      source: params.source,
      reference: params.reference,
      completed_at: new Date().toISOString(),
    });

    if (txnError) {
      throw new BadRequestException('Failed to create transaction');
    }

    // Update wallet balance
    await this.supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId);

    return {
      success: true,
      transaction: {
        id: transactionId,
        amount: params.amount,
        currency: params.currency,
        new_balance: newBalance,
        completed_at: new Date().toISOString(),
      },
    };
  }
}
