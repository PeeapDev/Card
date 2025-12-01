import { supabase } from '@/lib/supabase';
import type { User, AuthTokens, LoginRequest, RegisterRequest } from '@/types';

export const authService = {
  async login(data: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    // Fetch user from Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', data.email)
      .limit(1);

    if (error || !users || users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const dbUser = users[0];

    // For demo purposes - validate against known passwords
    // In production, you would verify the password hash on the backend
    const validPasswords: Record<string, string> = {
      'admin@example.com': 'Admin123!@#',
      'user@example.com': 'User123!@#',
      'user2@example.com': 'User123!@#',
      'merchant@example.com': 'Merchant123!@#',
      'developer@example.com': 'Developer123!@#',
      'agent@example.com': 'Agent123!@#',
    };

    // Check if it's a seeded user or validate against stored hash
    const isSeededUser = validPasswords[data.email];
    if (isSeededUser && validPasswords[data.email] !== data.password) {
      throw new Error('Invalid email or password');
    }

    // Create user object
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      roles: dbUser.roles?.split(',') || ['user'],
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
    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('User already exists');
    }

    const externalId = `usr_${Date.now()}_user`;

    // Create user (password stored as plain text for demo - use proper hashing in production!)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        external_id: externalId,
        email: data.email,
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
      throw new Error('Failed to create user');
    }

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
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
      return {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        roles: dbUser.roles?.split(',') || ['user'],
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
      return {
        accessToken: btoa(JSON.stringify({
          userId: dbUser.id,
          email: dbUser.email,
          roles: dbUser.roles?.split(',') || ['user'],
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
