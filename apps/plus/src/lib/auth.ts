import { supabase } from './supabase';

export type UserTier = 'basic' | 'business' | 'business_plus' | 'developer';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: string[];
  tier?: UserTier;
  businessName?: string;
  kycStatus?: string;
  kycTier?: number;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('232')) cleaned = cleaned.substring(3);
  if (!cleaned.startsWith('0') && cleaned.length === 8) cleaned = '0' + cleaned;
  if (cleaned.length === 8) cleaned = '0' + cleaned;
  return cleaned;
}

export const authService = {
  async login(data: { email: string; password: string }): Promise<{ user: User; tokens: AuthTokens }> {
    const loginIdentifier = data.email;
    const isEmail = loginIdentifier.includes('@');

    let dbUser = null;

    // Try phone-based login first
    if (!isEmail) {
      const normalizedPhone = normalizePhoneNumber(loginIdentifier);

      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .limit(1);

      if (users && users.length > 0) {
        dbUser = users[0];
      } else {
        const { data: users2 } = await supabase
          .from('users')
          .select('*')
          .eq('phone', loginIdentifier)
          .limit(1);

        if (users2 && users2.length > 0) {
          dbUser = users2[0];
        }
      }
    }

    // Try email-based login
    if (!dbUser) {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginIdentifier)
        .limit(1);

      if (users && users.length > 0) {
        dbUser = users[0];
      }
    }

    if (!dbUser) {
      throw new Error('Invalid credentials');
    }

    // Validate password
    if (dbUser.password_hash !== data.password) {
      throw new Error('Invalid credentials');
    }

    // Parse roles
    let userRoles: string[] = ['user'];
    if (dbUser.roles) {
      userRoles = dbUser.roles.split(',').map((r: string) => r.trim());
    } else if (dbUser.role) {
      userRoles = [dbUser.role];
    }

    // Determine tier from roles or tier column
    let tier: UserTier = 'basic';
    if (dbUser.tier) {
      tier = dbUser.tier as UserTier;
    } else if (userRoles.includes('business_plus') || userRoles.includes('corporate')) {
      tier = 'business_plus';
    } else if (userRoles.includes('business') || userRoles.includes('merchant')) {
      tier = 'business';
    } else if (userRoles.includes('developer')) {
      tier = 'developer';
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      roles: userRoles,
      tier,
      businessName: dbUser.business_name || dbUser.first_name,
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
        tier: user.tier,
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

  async register(data: {
    email: string;
    password: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    tier?: UserTier;
  }): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if email exists
    const { data: existingByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .limit(1);

    if (existingByEmail && existingByEmail.length > 0) {
      throw new Error('Email already registered');
    }

    // Check if phone exists
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
    const tier = data.tier || 'basic';

    // Set role based on tier
    let role = 'user';
    if (tier === 'business' || tier === 'business_plus') {
      role = 'merchant';
    } else if (tier === 'developer') {
      role = 'developer';
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        external_id: externalId,
        email: data.email,
        phone: data.phone ? normalizePhoneNumber(data.phone) : null,
        password_hash: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        business_name: data.businessName,
        status: 'ACTIVE',
        kyc_status: 'NOT_STARTED',
        email_verified: false,
        roles: role,
        tier: tier,
        kyc_tier: 0,
      })
      .select()
      .single();

    if (error || !newUser) {
      throw new Error(error?.message || 'Failed to create user');
    }

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      roles: [role],
      tier: tier,
      businessName: newUser.business_name,
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
        tier: user.tier,
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

  async getProfile(accessToken: string): Promise<User> {
    try {
      const payload = JSON.parse(atob(accessToken));

      if (payload.exp < Date.now()) {
        throw new Error('Token expired');
      }

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', payload.userId)
        .limit(1);

      if (error || !users || users.length === 0) {
        throw new Error('User not found');
      }

      const dbUser = users[0];

      let userRoles: string[] = ['user'];
      if (dbUser.roles) {
        userRoles = dbUser.roles.split(',').map((r: string) => r.trim());
      } else if (dbUser.role) {
        userRoles = [dbUser.role];
      }

      let tier: UserTier = 'basic';
      if (dbUser.tier) {
        tier = dbUser.tier as UserTier;
      } else if (userRoles.includes('business_plus') || userRoles.includes('corporate')) {
        tier = 'business_plus';
      } else if (userRoles.includes('business') || userRoles.includes('merchant')) {
        tier = 'business';
      } else if (userRoles.includes('developer')) {
        tier = 'developer';
      }

      return {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        phone: dbUser.phone,
        roles: userRoles,
        tier,
        businessName: dbUser.business_name || dbUser.first_name,
        kycStatus: dbUser.kyc_status,
        kycTier: dbUser.kyc_tier,
        emailVerified: dbUser.email_verified,
        createdAt: dbUser.created_at,
      };
    } catch {
      throw new Error('Invalid token');
    }
  },

  async validateToken(token: string): Promise<{ valid: boolean; user?: User }> {
    try {
      const user = await this.getProfile(token);
      return { valid: true, user };
    } catch {
      return { valid: false };
    }
  },

  setTokens(tokens: AuthTokens): void {
    // Store tokens in cookies instead of localStorage
    const secure = window.location.protocol === 'https:';
    const sameSite = 'Lax';
    document.cookie = `plus_token=${tokens.accessToken}; path=/; max-age=3600; ${secure ? 'secure;' : ''} samesite=${sameSite}`;
    document.cookie = `plus_refresh_token=${tokens.refreshToken}; path=/; max-age=604800; ${secure ? 'secure;' : ''} samesite=${sameSite}`;
  },

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )plus_token=([^;]*)/);
    return match ? match[1] : null;
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )plus_refresh_token=([^;]*)/);
    return match ? match[1] : null;
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

  logout(): void {
    // Clear all cookies
    document.cookie = 'plus_token=; path=/; max-age=0';
    document.cookie = 'plus_refresh_token=; path=/; max-age=0';
    document.cookie = 'plus_session=; path=/; max-age=0';
    document.cookie = 'plus_user=; path=/; max-age=0';
    document.cookie = 'plus_tier=; path=/; max-age=0';
    document.cookie = 'plus_setup_complete=; path=/; max-age=0';
  },

  // Cookie helpers
  setCookie(name: string, value: string, maxAge: number = 86400): void {
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; ${secure ? 'secure;' : ''} samesite=Lax`;
  },

  getCookie(name: string): string | null {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },

  deleteCookie(name: string): void {
    document.cookie = `${name}=; path=/; max-age=0`;
  },
};
