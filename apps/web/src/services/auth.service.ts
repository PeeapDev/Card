import { supabase } from '@/lib/supabase';
import type { User, AuthTokens, LoginRequest, RegisterRequest, UserRole } from '@/types';
import { normalizePhoneNumber } from '@/utils/phone';
import { verifyTOTP } from '@/lib/totp';
import { sessionService } from './session.service';

export interface MfaRequiredResponse {
  mfaRequired: true;
  userId: string;
  email: string;
}

/**
 * Parse roles from database - handles various formats:
 * - Proper array: ['superadmin', 'admin']
 * - Array with comma-separated element: ['superadmin,admin'] (migration bug)
 * - PostgreSQL string format: '{superadmin,admin}'
 * - Comma-separated string: 'superadmin,admin'
 * - Single role: 'admin'
 */
function parseRoles(rolesData: unknown): UserRole[] {
  if (!rolesData) return ['user'];

  // Already a proper array - but elements might contain commas (migration bug)
  if (Array.isArray(rolesData)) {
    const allRoles: string[] = [];
    for (const item of rolesData) {
      if (typeof item === 'string' && item.length > 0) {
        // Check if the item itself contains commas (migration bug: ['admin,user'])
        if (item.includes(',')) {
          allRoles.push(...item.split(',').map(r => r.trim()).filter(r => r));
        } else {
          allRoles.push(item.trim());
        }
      }
    }
    return allRoles.length > 0 ? (allRoles as UserRole[]) : ['user'];
  }

  // PostgreSQL array string format: {role1,role2}
  if (typeof rolesData === 'string') {
    const trimmed = rolesData.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1);
      if (!inner) return ['user'];
      const roles = inner.split(',').map(r => r.trim()).filter(r => r) as UserRole[];
      return roles.length > 0 ? roles : ['user'];
    }
    // Comma-separated string
    if (trimmed.includes(',')) {
      const roles = trimmed.split(',').map(r => r.trim()).filter(r => r) as UserRole[];
      return roles.length > 0 ? roles : ['user'];
    }
    // Single role string
    if (trimmed) return [trimmed as UserRole];
  }

  return ['user'];
}

export const authService = {
  async login(data: LoginRequest & { mfaCode?: string }): Promise<{ user: User; tokens: AuthTokens } | MfaRequiredResponse> {
    // Determine if login is via phone or email
    const loginIdentifier = data.email; // Can be email or phone
    const isEmail = loginIdentifier.includes('@');

    // Fetch user from Supabase - try phone first (normalized), then email
    let dbUser = null;
    let error = null;

    if (!isEmail) {
      // Phone-based login - normalize the phone number first
      const normalizedPhone = normalizePhoneNumber(loginIdentifier);

      // Try with normalized phone
      const { data: users, error: phoneError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .limit(1);

      if (!phoneError && users && users.length > 0) {
        dbUser = users[0];
      } else {
        // Also try with original input in case it's stored differently
        const { data: users2 } = await supabase
          .from('users')
          .select('*')
          .eq('phone', loginIdentifier)
          .limit(1);

        if (users2 && users2.length > 0) {
          dbUser = users2[0];
        } else {
          error = phoneError;
        }
      }
    }

    // If not found by phone, try email
    if (!dbUser) {
      const { data: users, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginIdentifier)
        .limit(1);

      if (!emailError && users && users.length > 0) {
        dbUser = users[0];
      } else {
        error = emailError;
      }
    }

    if (error || !dbUser) {
      throw new Error('Invalid credentials');
    }

    // Validate password against stored password_hash
    // Note: In production, use proper password hashing (bcrypt, argon2)
    if (dbUser.password_hash !== data.password) {
      throw new Error('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (dbUser.two_factor_enabled && dbUser.two_factor_secret) {
      // If no MFA code provided, return MFA required response
      if (!data.mfaCode) {
        return {
          mfaRequired: true,
          userId: dbUser.id,
          email: dbUser.email,
        };
      }

      // Verify MFA code using native browser TOTP implementation
      const isValidMfa = await verifyTOTP(dbUser.two_factor_secret, data.mfaCode);

      if (!isValidMfa) {
        throw new Error('Invalid verification code');
      }
    }

    // Parse roles - handles PostgreSQL array, string array, or legacy single role
    const userRoles = parseRoles(dbUser.roles || dbUser.role);
    console.log('[Auth] Login roles parsed:', { raw: dbUser.roles, parsed: userRoles });

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      profilePicture: dbUser.profile_picture || undefined,
      roles: userRoles,
      kycStatus: dbUser.kyc_status,
      kycTier: dbUser.kyc_tier,
      emailVerified: dbUser.email_verified,
      createdAt: dbUser.created_at,
    };

    // Create secure database-backed session
    const sessionToken = await sessionService.createSession(user.id);

    // Generate tokens object for backwards compatibility
    // The actual session is stored in a secure cookie, not localStorage
    const tokens: AuthTokens = {
      accessToken: sessionToken,
      refreshToken: sessionToken,
      expiresIn: 604800, // 7 days
    };

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', dbUser.id);

    return { user, tokens };
  },

  async register(data: RegisterRequest): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if user exists by email
    const { data: existingByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .limit(1);

    if (existingByEmail && existingByEmail.length > 0) {
      throw new Error('Email already registered');
    }

    // Check if user exists by phone (if provided)
    if (data.phone) {
      const normalizedPhone = normalizePhoneNumber(data.phone);
      const { data: existingByPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .limit(1);

      if (existingByPhone && existingByPhone.length > 0) {
        throw new Error('Phone number already registered');
      }
    }

    const externalId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine the role to assign
    const assignedRole = data.role || 'user';

    // Create user
    // Note: In production, hash the password before storing!
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        external_id: externalId,
        email: data.email,
        phone: data.phone ? normalizePhoneNumber(data.phone) : null,
        password_hash: data.password, // In production, hash this!
        first_name: data.firstName,
        last_name: data.lastName,
        status: 'ACTIVE',
        kyc_status: 'NOT_STARTED',
        email_verified: false,
        roles: assignedRole,
        kyc_tier: 0,
      })
      .select()
      .single();

    if (error || !newUser) {
      console.error('Registration error:', error);
      throw new Error(error?.message || 'Failed to create user');
    }

    // Create primary wallet for new user
    const walletExternalId = `wal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { error: walletError } = await supabase
      .from('wallets')
      .insert({
        external_id: walletExternalId,
        user_id: newUser.id,
        balance: 0,
        currency: 'SLE',
        wallet_type: 'primary',
        status: 'ACTIVE',
      });

    if (walletError) {
      console.error('Failed to create wallet for new user:', walletError);
      // Don't throw - user can still use the app, wallet can be created later
    }

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      roles: [assignedRole as UserRole],
      kycStatus: newUser.kyc_status,
      kycTier: newUser.kyc_tier,
      emailVerified: newUser.email_verified,
      createdAt: newUser.created_at,
    };

    // Create secure database-backed session
    const sessionToken = await sessionService.createSession(user.id);

    const tokens: AuthTokens = {
      accessToken: sessionToken,
      refreshToken: sessionToken,
      expiresIn: 604800, // 7 days
    };

    return { user, tokens };
  },

  async logout(): Promise<void> {
    // Destroy database session and clear cookie
    await sessionService.logout();
  },

  async getProfile(): Promise<User> {
    // Validate session from cookie and get user
    const user = await sessionService.validateSession();
    if (!user) {
      throw new Error('Not authenticated');
    }
    return user;
  },

  async refreshToken(_refreshToken: string): Promise<AuthTokens> {
    // Refresh the database session
    await sessionService.refreshSession();
    const token = sessionService.getSessionToken() || '';
    return {
      accessToken: token,
      refreshToken: token,
      expiresIn: 604800, // 7 days
    };
  },

  setTokens(_tokens: AuthTokens): void {
    // Tokens are stored in secure cookies by sessionService, not in localStorage
    // This method exists for backwards compatibility but does nothing
  },

  getTokens(): AuthTokens | null {
    const token = sessionService.getSessionToken();
    if (token) {
      return { accessToken: token, refreshToken: token, expiresIn: 0 };
    }
    return null;
  },

  getAccessToken(): string | null {
    return sessionService.getSessionToken() || null;
  },

  getRefreshToken(): string | null {
    return sessionService.getSessionToken() || null;
  },

  isAuthenticated(): boolean {
    return sessionService.hasSession();
  },
};
