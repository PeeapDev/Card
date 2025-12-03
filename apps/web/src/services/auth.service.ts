import { supabase } from '@/lib/supabase';
import type { User, AuthTokens, LoginRequest, RegisterRequest, UserRole } from '@/types';
import { normalizePhoneNumber } from '@/utils/phone';

export const authService = {
  async login(data: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
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

    // Create user object
    // Handle both 'roles' (comma-separated) and 'role' (single value) columns
    let userRoles: UserRole[] = ['user'];
    if (dbUser.roles) {
      userRoles = dbUser.roles.split(',').map((r: string) => r.trim()) as UserRole[];
    } else if (dbUser.role) {
      userRoles = [dbUser.role] as UserRole[];
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      roles: userRoles,
      kycStatus: dbUser.kyc_status,
      kycTier: dbUser.kyc_tier,
      emailVerified: dbUser.email_verified,
      createdAt: dbUser.created_at,
    };

    // Generate tokens
    const tokens: AuthTokens = {
      accessToken: btoa(JSON.stringify({
        userId: user.id,
        email: user.email,
        roles: user.roles,
        exp: Date.now() + 3600000
      })),
      refreshToken: btoa(JSON.stringify({
        userId: user.id,
        exp: Date.now() + 604800000
      })),
      expiresIn: 3600,
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
        roles: 'user',
        kyc_tier: 0,
      })
      .select()
      .single();

    if (error || !newUser) {
      console.error('Registration error:', error);
      throw new Error(error?.message || 'Failed to create user');
    }

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      roles: ['user'],
      kycStatus: newUser.kyc_status,
      kycTier: newUser.kyc_tier,
      emailVerified: newUser.email_verified,
      createdAt: newUser.created_at,
    };

    const tokens: AuthTokens = {
      accessToken: btoa(JSON.stringify({
        userId: user.id,
        email: user.email,
        roles: user.roles,
        exp: Date.now() + 3600000
      })),
      refreshToken: btoa(JSON.stringify({
        userId: user.id,
        exp: Date.now() + 604800000
      })),
      expiresIn: 3600,
    };

    return { user, tokens };
  },

  async logout(): Promise<void> {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  async getProfile(): Promise<User> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const payload = JSON.parse(atob(accessToken));
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', payload.userId)
        .limit(1);

      if (error || !users || users.length === 0) {
        throw new Error('User not found');
      }

      const dbUser = users[0];

      // Handle both 'roles' (comma-separated) and 'role' (single value) columns
      let userRoles: UserRole[] = ['user'];
      if (dbUser.roles) {
        userRoles = dbUser.roles.split(',').map((r: string) => r.trim()) as UserRole[];
      } else if (dbUser.role) {
        userRoles = [dbUser.role] as UserRole[];
      }

      return {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        phone: dbUser.phone,
        roles: userRoles,
        kycStatus: dbUser.kyc_status,
        kycTier: dbUser.kyc_tier,
        emailVerified: dbUser.email_verified,
        createdAt: dbUser.created_at,
      };
    } catch {
      throw new Error('Invalid token');
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = JSON.parse(atob(refreshToken));
      if (payload.exp < Date.now()) {
        throw new Error('Refresh token expired');
      }

      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('id', payload.userId)
        .limit(1);

      if (!users || users.length === 0) {
        throw new Error('User not found');
      }

      const dbUser = users[0];

      // Handle both 'roles' (comma-separated) and 'role' (single value) columns
      let userRoles: string[] = ['user'];
      if (dbUser.roles) {
        userRoles = dbUser.roles.split(',').map((r: string) => r.trim());
      } else if (dbUser.role) {
        userRoles = [dbUser.role];
      }

      return {
        accessToken: btoa(JSON.stringify({
          userId: dbUser.id,
          email: dbUser.email,
          roles: userRoles,
          exp: Date.now() + 3600000
        })),
        refreshToken: btoa(JSON.stringify({
          userId: dbUser.id,
          exp: Date.now() + 604800000
        })),
        expiresIn: 3600,
      };
    } catch {
      throw new Error('Invalid refresh token');
    }
  },

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Date.now();
    } catch {
      return false;
    }
  },
};
