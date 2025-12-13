/**
 * SSO Service for cross-domain authentication
 *
 * Supports:
 * 1. Internal SSO between Peeap domains (my.peeap.com <-> plus.peeap.com)
 * 2. OAuth-style SSO for third-party applications
 *
 * Flow (Internal SSO):
 * 1. User initiates SSO from source app
 * 2. Sync user data to Supabase users table
 * 3. Generate one-time SSO token and store in database
 * 4. Redirect to target app /auth/sso?token=xxx
 * 5. Target app validates token, creates session
 * 6. Token is marked as used (single use)
 *
 * Flow (Third-party OAuth):
 * 1. Third-party redirects to /auth/authorize?client_id=xxx&redirect_uri=xxx
 * 2. User logs in (if not already)
 * 3. User approves access
 * 4. Generate authorization code
 * 5. Redirect to third-party with code
 * 6. Third-party exchanges code for access token
 */

import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

// Peeap domain configurations
export type PeeapApp = 'my' | 'plus' | 'checkout' | 'developer';

interface AppConfig {
  name: string;
  domain: string;
  devPort: number;
  ssoPath: string;
}

const APP_CONFIGS: Record<PeeapApp, AppConfig> = {
  my: {
    name: 'Peeap Pay',
    domain: 'my.peeap.com',
    devPort: 5173,
    ssoPath: '/auth/sso',
  },
  plus: {
    name: 'Peeap Plus',
    domain: 'plus.peeap.com',
    devPort: 3000,
    ssoPath: '/auth/sso',
  },
  checkout: {
    name: 'Peeap Checkout',
    domain: 'checkout.peeap.com',
    devPort: 5174,
    ssoPath: '/auth/sso',
  },
  developer: {
    name: 'Peeap Developer',
    domain: 'developer.peeap.com',
    devPort: 5175,
    ssoPath: '/auth/sso',
  },
};

/**
 * Detect which Peeap app we're currently running on
 */
function detectCurrentApp(): PeeapApp {
  if (typeof window === 'undefined') return 'my';

  const hostname = window.location.hostname;
  const port = window.location.port;

  // Check by domain in production
  if (hostname.includes('plus.peeap.com')) return 'plus';
  if (hostname.includes('checkout.peeap.com')) return 'checkout';
  if (hostname.includes('developer.peeap.com')) return 'developer';
  if (hostname.includes('my.peeap.com')) return 'my';

  // Check by port in development
  if (port === '3000') return 'plus';
  if (port === '5174') return 'checkout';
  if (port === '5175') return 'developer';

  return 'my'; // Default
}

// Generate UUID v4 without external dependency
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate a secure random token
function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface SsoToken {
  id: string;
  user_id: string;
  token: string;
  source_app?: string;
  target_app: string;
  client_id?: string; // For third-party OAuth
  tier?: string;
  redirect_path?: string;
  scope?: string; // For OAuth
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface OAuthClient {
  id: string;
  client_id: string;
  client_secret: string;
  name: string;
  redirect_uris: string[];
  scopes: string[];
  is_active: boolean;
  created_at: string;
  logo_url?: string;
  website_url?: string;
}

export interface OAuthAuthorizationCode {
  id: string;
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export const ssoService = {
  /**
   * Get app configuration
   */
  getAppConfig(app: PeeapApp): AppConfig {
    return APP_CONFIGS[app];
  },

  /**
   * Get the SSO URL for a target app
   */
  getSsoUrl(targetApp: PeeapApp): string {
    const config = APP_CONFIGS[targetApp];
    const isDev = import.meta.env.DEV;

    if (isDev) {
      return `http://localhost:${config.devPort}${config.ssoPath}`;
    }

    return `https://${config.domain}${config.ssoPath}`;
  },

  /**
   * Sync user data to Supabase users table
   * This ensures the user exists in Supabase before SSO redirect
   */
  async syncUserToSupabase(user: User): Promise<void> {
    console.log('SSO: Syncing user to Supabase:', { id: user.id, email: user.email });

    // Check if user exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .limit(1);

    if (checkError) {
      console.error('SSO: Error checking if user exists:', checkError);
    }

    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.firstName || user.email?.split('@')[0] || 'User',
      last_name: user.lastName || '',
      phone: user.phone || null,
      roles: user.roles?.join(',') || 'user',
      updated_at: new Date().toISOString(),
    };

    if (existingUsers && existingUsers.length > 0) {
      // Update existing user
      console.log('SSO: User exists, updating...');
      const { error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', user.id);

      if (error) {
        console.error('SSO: Failed to update user in Supabase:', error);
      } else {
        console.log('SSO: User updated successfully');
      }
    } else {
      // Insert new user
      console.log('SSO: User does not exist, inserting...');
      const { error } = await supabase
        .from('users')
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('SSO: Failed to insert user in Supabase:', error);
        // Try upsert as fallback
        console.log('SSO: Trying upsert as fallback...');
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            ...userData,
            created_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (upsertError) {
          console.error('SSO: Upsert also failed:', upsertError);
          throw new Error('Failed to sync user data');
        }
        console.log('SSO: Upsert succeeded');
      } else {
        console.log('SSO: User inserted successfully');
      }
    }

    // Verify the user was created
    const { data: verifyUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', user.id)
      .limit(1);

    if (!verifyUser || verifyUser.length === 0) {
      console.error('SSO: User verification failed - user not found after sync');
      throw new Error('User sync verification failed');
    }
    console.log('SSO: User verified in database:', verifyUser[0]);
  },

  /**
   * Generate a one-time SSO token for cross-domain login
   */
  async generateSsoToken(params: {
    userId: string;
    sourceApp?: PeeapApp;
    targetApp: PeeapApp | 'external';
    clientId?: string; // For third-party OAuth
    tier?: string;
    redirectPath?: string;
    scope?: string;
    expiryMinutes?: number;
  }): Promise<{ token: string; expiresAt: Date }> {
    const token = generateUuid();
    const expiryMinutes = params.expiryMinutes || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const { error } = await supabase.from('sso_tokens').insert({
      user_id: params.userId,
      token: token,
      source_app: params.sourceApp || 'my',
      target_app: params.targetApp,
      client_id: params.clientId,
      tier: params.tier,
      redirect_path: params.redirectPath,
      scope: params.scope,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error('Failed to create SSO token:', error);
      throw new Error('Failed to create SSO token');
    }

    return { token, expiresAt };
  },

  /**
   * Validate and consume an SSO token (one-time use)
   */
  async validateSsoToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    sourceApp?: string;
    targetApp?: string;
    clientId?: string;
    tier?: string;
    redirectPath?: string;
    scope?: string;
    error?: string;
  }> {
    // Find the token
    const { data: ssoTokens, error: findError } = await supabase
      .from('sso_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .limit(1);

    if (findError || !ssoTokens || ssoTokens.length === 0) {
      return { valid: false, error: 'Token not found or already used' };
    }

    const ssoToken = ssoTokens[0] as SsoToken;

    // Check expiration
    if (new Date(ssoToken.expires_at) < new Date()) {
      return { valid: false, error: 'Token expired' };
    }

    // Mark token as used
    const { error: updateError } = await supabase
      .from('sso_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', ssoToken.id);

    if (updateError) {
      console.error('Failed to mark SSO token as used:', updateError);
    }

    return {
      valid: true,
      userId: ssoToken.user_id,
      sourceApp: ssoToken.source_app,
      targetApp: ssoToken.target_app,
      clientId: ssoToken.client_id,
      tier: ssoToken.tier,
      redirectPath: ssoToken.redirect_path,
      scope: ssoToken.scope,
    };
  },

  /**
   * Get the current app we're running on
   */
  getCurrentApp(): PeeapApp {
    return detectCurrentApp();
  },

  /**
   * Get the SSO redirect URL for any Peeap app
   * Bidirectional - works from any app to any other app
   */
  async getRedirectUrl(params: {
    user: User;
    targetApp: PeeapApp;
    tier?: string;
    redirectPath?: string;
  }): Promise<string> {
    // Sync user to Supabase first
    await this.syncUserToSupabase(params.user);

    const currentApp = detectCurrentApp();

    const { token } = await this.generateSsoToken({
      userId: params.user.id,
      sourceApp: currentApp,
      targetApp: params.targetApp,
      tier: params.tier,
      redirectPath: params.redirectPath,
    });

    const ssoUrl = this.getSsoUrl(params.targetApp);
    const url = new URL(ssoUrl);
    url.searchParams.set('token', token);

    if (params.redirectPath) {
      url.searchParams.set('redirect', params.redirectPath);
    }

    return url.toString();
  },

  /**
   * Redirect to another Peeap app with SSO
   * This is a convenience method that handles the full flow
   */
  async redirectToApp(params: {
    user: User;
    targetApp: PeeapApp;
    tier?: string;
    redirectPath?: string;
  }): Promise<void> {
    const url = await this.getRedirectUrl(params);
    window.location.href = url;
  },

  /**
   * Check if we can SSO to a target app (not same app)
   */
  canSsoTo(targetApp: PeeapApp): boolean {
    const currentApp = detectCurrentApp();
    return currentApp !== targetApp;
  },

  // ============================================
  // OAuth 2.0 Methods for Third-Party Integration
  // ============================================

  /**
   * Validate an OAuth client
   */
  async validateOAuthClient(clientId: string, redirectUri: string): Promise<{
    valid: boolean;
    client?: OAuthClient;
    error?: string;
  }> {
    const { data: clients, error } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .limit(1);

    if (error || !clients || clients.length === 0) {
      return { valid: false, error: 'Invalid client' };
    }

    const client = clients[0] as OAuthClient;

    // Validate redirect URI
    if (!client.redirect_uris.includes(redirectUri)) {
      return { valid: false, error: 'Invalid redirect URI' };
    }

    return { valid: true, client };
  },

  /**
   * Generate an OAuth authorization code
   */
  async generateAuthorizationCode(params: {
    clientId: string;
    userId: string;
    redirectUri: string;
    scope: string;
  }): Promise<{ code: string; expiresAt: Date }> {
    const code = generateSecureToken(48);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error } = await supabase.from('oauth_authorization_codes').insert({
      code,
      client_id: params.clientId,
      user_id: params.userId,
      redirect_uri: params.redirectUri,
      scope: params.scope,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error('Failed to create authorization code:', error);
      throw new Error('Failed to create authorization code');
    }

    return { code, expiresAt };
  },

  /**
   * Exchange an authorization code for an access token
   */
  async exchangeCodeForToken(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    userId?: string;
    error?: string;
  }> {
    // Validate client credentials
    const { data: clients, error: clientError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', params.clientId)
      .eq('client_secret', params.clientSecret)
      .eq('is_active', true)
      .limit(1);

    if (clientError || !clients || clients.length === 0) {
      return { success: false, error: 'Invalid client credentials' };
    }

    // Find and validate the authorization code
    const { data: codes, error: codeError } = await supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', params.code)
      .eq('client_id', params.clientId)
      .eq('redirect_uri', params.redirectUri)
      .is('used_at', null)
      .limit(1);

    if (codeError || !codes || codes.length === 0) {
      return { success: false, error: 'Invalid or expired authorization code' };
    }

    const authCode = codes[0] as OAuthAuthorizationCode;

    // Check expiration
    if (new Date(authCode.expires_at) < new Date()) {
      return { success: false, error: 'Authorization code expired' };
    }

    // Mark code as used
    await supabase
      .from('oauth_authorization_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', authCode.id);

    // Generate access token
    const accessToken = generateSecureToken(64);
    const refreshToken = generateSecureToken(64);
    const expiresIn = 3600; // 1 hour

    // Store the access token
    const { error: tokenError } = await supabase.from('oauth_access_tokens').insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      client_id: params.clientId,
      user_id: authCode.user_id,
      scope: authCode.scope,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    if (tokenError) {
      console.error('Failed to create access token:', tokenError);
      return { success: false, error: 'Failed to create access token' };
    }

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresIn,
      scope: authCode.scope,
      userId: authCode.user_id,
    };
  },

  /**
   * Validate an OAuth access token
   */
  async validateAccessToken(accessToken: string): Promise<{
    valid: boolean;
    userId?: string;
    clientId?: string;
    scope?: string;
    error?: string;
  }> {
    const { data: tokens, error } = await supabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('access_token', accessToken)
      .is('revoked_at', null)
      .limit(1);

    if (error || !tokens || tokens.length === 0) {
      return { valid: false, error: 'Invalid access token' };
    }

    const token = tokens[0];

    // Check expiration
    if (new Date(token.expires_at) < new Date()) {
      return { valid: false, error: 'Access token expired' };
    }

    return {
      valid: true,
      userId: token.user_id,
      clientId: token.client_id,
      scope: token.scope,
    };
  },

  /**
   * Refresh an access token
   */
  async refreshAccessToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    // Validate client credentials
    const { data: clients } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', params.clientId)
      .eq('client_secret', params.clientSecret)
      .eq('is_active', true)
      .limit(1);

    if (!clients || clients.length === 0) {
      return { success: false, error: 'Invalid client credentials' };
    }

    // Find the refresh token
    const { data: tokens } = await supabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('refresh_token', params.refreshToken)
      .eq('client_id', params.clientId)
      .is('revoked_at', null)
      .limit(1);

    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'Invalid refresh token' };
    }

    const oldToken = tokens[0];

    // Revoke old token
    await supabase
      .from('oauth_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', oldToken.id);

    // Generate new tokens
    const accessToken = generateSecureToken(64);
    const refreshToken = generateSecureToken(64);
    const expiresIn = 3600;

    // Store new token
    const { error } = await supabase.from('oauth_access_tokens').insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      client_id: params.clientId,
      user_id: oldToken.user_id,
      scope: oldToken.scope,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    if (error) {
      return { success: false, error: 'Failed to refresh token' };
    }

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresIn,
    };
  },

  /**
   * Revoke an access token
   */
  async revokeAccessToken(accessToken: string): Promise<boolean> {
    const { error } = await supabase
      .from('oauth_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('access_token', accessToken);

    return !error;
  },

  /**
   * Clean up expired tokens (can be called periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date().toISOString();

    // Clean SSO tokens
    await supabase
      .from('sso_tokens')
      .delete()
      .lt('expires_at', now);

    // Clean authorization codes
    await supabase
      .from('oauth_authorization_codes')
      .delete()
      .lt('expires_at', now);

    // Clean expired access tokens (keep revoked ones for audit)
    await supabase
      .from('oauth_access_tokens')
      .delete()
      .lt('expires_at', now)
      .is('revoked_at', null);
  },
};
