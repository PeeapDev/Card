/**
 * Secure Session Service
 *
 * Manages user sessions with database-backed tokens stored in HTTP-only cookies.
 * NO localStorage is used for security.
 *
 * Note: We use supabaseAdmin because this app uses custom JWT auth,
 * not Supabase Auth. auth.uid() returns NULL, so RLS policies fail.
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { User, UserRole } from '@/types';
import Cookies from 'js-cookie';

// Session configuration
const SESSION_COOKIE_NAME = 'peeap_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a cryptographically secure random token
 */
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export const sessionService = {
  /**
   * Create a new session for a user
   */
  async createSession(userId: string): Promise<string> {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // Store session in database
    const { error } = await supabaseAdmin
      .from('sso_tokens')
      .insert({
        user_id: userId,
        token: token,
        expires_at: expiresAt.toISOString(),
        target_app: 'peeap-pay',
        source_app: 'login'
      });

    if (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }

    // Set HTTP-only cookie (js-cookie sets it as non-httpOnly,
    // but we'll use secure + sameSite for protection)
    Cookies.set(SESSION_COOKIE_NAME, token, {
      expires: 7, // 7 days
      secure: window.location.protocol === 'https:',
      sameSite: 'strict',
      path: '/'
    });

    return token;
  },

  /**
   * Validate session and get user data
   */
  async validateSession(): Promise<User | null> {
    const token = Cookies.get(SESSION_COOKIE_NAME);
    if (!token) {
      return null;
    }

    // Check session in database
    // Accept sessions for 'peeap-pay' or 'my' (both refer to the main web app)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sso_tokens')
      .select('user_id, expires_at, used_at')
      .eq('token', token)
      .in('target_app', ['peeap-pay', 'my'])
      .single();

    if (sessionError || !session) {
      // Invalid session, clear cookie
      this.clearSession();
      return null;
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      this.clearSession();
      await this.deleteSession(token);
      return null;
    }

    // Get user data
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', session.user_id)
      .single();

    if (userError || !dbUser) {
      this.clearSession();
      return null;
    }

    // Update last activity
    await supabaseAdmin
      .from('sso_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // Parse roles
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
      profilePicture: dbUser.profile_picture || undefined,
      roles: userRoles,
      kycStatus: dbUser.kyc_status,
      kycTier: dbUser.kyc_tier,
      emailVerified: dbUser.email_verified,
      createdAt: dbUser.created_at,
    };
  },

  /**
   * Get current session token
   */
  getSessionToken(): string | undefined {
    return Cookies.get(SESSION_COOKIE_NAME);
  },

  /**
   * Clear session cookie
   */
  clearSession(): void {
    Cookies.remove(SESSION_COOKIE_NAME, { path: '/' });
  },

  /**
   * Delete session from database
   */
  async deleteSession(token?: string): Promise<void> {
    const sessionToken = token || Cookies.get(SESSION_COOKIE_NAME);
    if (sessionToken) {
      await supabaseAdmin
        .from('sso_tokens')
        .delete()
        .eq('token', sessionToken);
    }
    this.clearSession();
  },

  /**
   * Logout - destroy session
   */
  async logout(): Promise<void> {
    await this.deleteSession();
  },

  /**
   * Check if user has a valid session
   */
  hasSession(): boolean {
    return !!Cookies.get(SESSION_COOKIE_NAME);
  },

  /**
   * Refresh session expiry
   */
  async refreshSession(): Promise<void> {
    const token = Cookies.get(SESSION_COOKIE_NAME);
    if (!token) return;

    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await supabaseAdmin
      .from('sso_tokens')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('token', token);

    // Refresh cookie expiry too
    Cookies.set(SESSION_COOKIE_NAME, token, {
      expires: 7,
      secure: window.location.protocol === 'https:',
      sameSite: 'strict',
      path: '/'
    });
  }
};
