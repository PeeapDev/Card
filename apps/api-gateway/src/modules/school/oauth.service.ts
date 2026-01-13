import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

interface OAuthClient {
  id: string;
  client_id: string;
  client_secret: string;
  name: string;
  redirect_uris: string[];
  scopes: string[];
  is_active: boolean;
}

interface OAuthAuthorizationCode {
  id: string;
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope: string;
  expires_at: string;
  used_at?: string;
  metadata?: {
    school_id?: number | string;
    index_number?: string;
    student_name?: string;
    user_type?: string;
  };
}

interface OAuthAccessToken {
  id: string;
  access_token: string;
  refresh_token: string;
  client_id: string;
  user_id: string;
  scope: string;
  expires_at: string;
  revoked_at?: string;
}

@Injectable()
export class OAuthService {
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
   * Generate a secure random token
   */
  private generateSecureToken(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64url').substring(0, length);
  }

  /**
   * Validate OAuth client credentials
   */
  async validateClient(clientId: string, clientSecret: string): Promise<OAuthClient | null> {
    const { data: clients, error } = await this.supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('client_secret', clientSecret)
      .eq('is_active', true)
      .limit(1);

    if (error || !clients || clients.length === 0) {
      return null;
    }

    return clients[0] as OAuthClient;
  }

  /**
   * Validate redirect URI against allowed patterns (supports wildcards)
   */
  validateRedirectUri(client: OAuthClient, redirectUri: string): boolean {
    return client.redirect_uris.some(allowedUri => {
      // Exact match
      if (allowedUri === redirectUri) return true;

      // Wildcard match (e.g., https://*.gov.school.edu.sl/peeap-settings/callback)
      if (allowedUri.includes('*')) {
        const pattern = allowedUri
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
          .replace(/\*/g, '[a-zA-Z0-9-]+');       // Replace * with subdomain pattern
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(redirectUri);
      }

      return false;
    });
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(params: {
    grantType: string;
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
    user?: {
      peeap_id: string;
      email?: string;
    };
    school_connection?: {
      peeap_school_id?: string;
    };
  }> {
    // Validate grant type
    if (params.grantType !== 'authorization_code') {
      throw new BadRequestException({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported',
      });
    }

    // Validate client credentials
    const client = await this.validateClient(params.clientId, params.clientSecret);
    if (!client) {
      throw new UnauthorizedException({
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      });
    }

    // Validate redirect URI
    if (!this.validateRedirectUri(client, params.redirectUri)) {
      throw new BadRequestException({
        error: 'invalid_request',
        error_description: 'Invalid redirect URI',
      });
    }

    // Find and validate the authorization code
    const { data: codes, error: codeError } = await this.supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', params.code)
      .eq('client_id', params.clientId)
      .eq('redirect_uri', params.redirectUri)
      .is('used_at', null)
      .limit(1);

    if (codeError || !codes || codes.length === 0) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code',
      });
    }

    const authCode = codes[0] as OAuthAuthorizationCode;

    // Check expiration
    if (new Date(authCode.expires_at) < new Date()) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Authorization code expired',
      });
    }

    // Mark code as used
    await this.supabase
      .from('oauth_authorization_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', authCode.id);

    // Generate access and refresh tokens
    const accessToken = this.generateSecureToken(64);
    const refreshToken = this.generateSecureToken(64);
    const expiresIn = 3600; // 1 hour

    // Store the access token
    const { error: tokenError } = await this.supabase.from('oauth_access_tokens').insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      client_id: params.clientId,
      user_id: authCode.user_id,
      scope: authCode.scope,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    if (tokenError) {
      throw new BadRequestException({
        error: 'server_error',
        error_description: 'Failed to create access token',
      });
    }

    // Get user info
    const { data: userData } = await this.supabase
      .from('users')
      .select('id, email')
      .eq('id', authCode.user_id)
      .limit(1);

    const user = userData?.[0];

    // Build response
    const response: any = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
      scope: authCode.scope,
    };

    if (user) {
      response.user = {
        peeap_id: user.id,
        email: user.email,
      };
    }

    // Include school connection info if present in metadata
    if (authCode.metadata?.school_id) {
      response.school_connection = {
        peeap_school_id: `sch_${authCode.metadata.school_id}`,
      };
    }

    return response;
  }

  /**
   * Refresh an access token
   */
  async refreshToken(params: {
    grantType: string;
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }> {
    if (params.grantType !== 'refresh_token') {
      throw new BadRequestException({
        error: 'unsupported_grant_type',
        error_description: 'Only refresh_token grant type is supported for this endpoint',
      });
    }

    // Validate client credentials
    const client = await this.validateClient(params.clientId, params.clientSecret);
    if (!client) {
      throw new UnauthorizedException({
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      });
    }

    // Find the refresh token
    const { data: tokens, error } = await this.supabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('refresh_token', params.refreshToken)
      .eq('client_id', params.clientId)
      .is('revoked_at', null)
      .limit(1);

    if (error || !tokens || tokens.length === 0) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Invalid refresh token',
      });
    }

    const oldToken = tokens[0] as OAuthAccessToken;

    // Revoke old token
    await this.supabase
      .from('oauth_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', oldToken.id);

    // Generate new tokens
    const accessToken = this.generateSecureToken(64);
    const refreshToken = this.generateSecureToken(64);
    const expiresIn = 3600;

    // Store new token
    const { error: tokenError } = await this.supabase.from('oauth_access_tokens').insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      client_id: params.clientId,
      user_id: oldToken.user_id,
      scope: oldToken.scope,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    if (tokenError) {
      throw new BadRequestException({
        error: 'server_error',
        error_description: 'Failed to refresh token',
      });
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
    };
  }

  /**
   * Validate an access token and return user info
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

    const token = tokens[0] as OAuthAccessToken;

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
   * Revoke an access token
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('oauth_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('access_token', accessToken);

    return !error;
  }
}
