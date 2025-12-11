/**
 * SSO Service for cross-domain authentication
 *
 * Flow:
 * 1. User clicks upgrade on my.peeap.com
 * 2. Generate one-time SSO token and store in database
 * 3. Redirect to plus.peeap.com/auth/sso?token=xxx
 * 4. Plus validates token against database, logs user in
 * 5. Token is marked as used (single use)
 */

import { supabase } from '@/lib/supabase';

// Generate UUID v4 without external dependency
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface SsoToken {
  id: string;
  user_id: string;
  token: string;
  target_app: string;
  tier?: string;
  redirect_path?: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export const ssoService = {
  /**
   * Generate a one-time SSO token for cross-domain login
   */
  async generateSsoToken(params: {
    userId: string;
    targetApp: 'plus' | 'my';
    tier?: string;
    redirectPath?: string;
  }): Promise<{ token: string; expiresAt: Date }> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    const { error } = await supabase.from('sso_tokens').insert({
      user_id: params.userId,
      token: token,
      target_app: params.targetApp,
      tier: params.tier,
      redirect_path: params.redirectPath,
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
    tier?: string;
    redirectPath?: string;
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
      tier: ssoToken.tier,
      redirectPath: ssoToken.redirect_path,
    };
  },

  /**
   * Get the SSO redirect URL for plus.peeap.com
   */
  async getRedirectUrl(params: {
    userId: string;
    tier: string;
    redirectPath?: string;
  }): Promise<string> {
    const { token } = await this.generateSsoToken({
      userId: params.userId,
      targetApp: 'plus',
      tier: params.tier,
      redirectPath: params.redirectPath || `/setup?tier=${params.tier}`,
    });

    const url = new URL('https://plus.peeap.com/auth/sso');
    url.searchParams.set('token', token);

    return url.toString();
  },

  /**
   * Clean up expired tokens (can be called periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    await supabase
      .from('sso_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());
  },
};
