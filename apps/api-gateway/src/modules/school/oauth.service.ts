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
    nsi?: string;  // National Student Identifier
    index_number?: string;  // Kept for backward compatibility
    student_name?: string;
    user_type?: string;  // 'student', 'parent', 'admin', 'staff'
    parent_id?: string;  // Parent's ID in school system
    parent_name?: string;
    parent_email?: string;
    parent_phone?: string;
    school_name?: string;
    school_logo_url?: string;
    children?: Array<{
      nsi: string;
      name: string;
      student_id?: string;
      class_id?: string;
      class_name?: string;
      section_name?: string;
      profile_photo_url?: string;
      peeap_wallet_id?: string;
    }>;
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

    // Extract school domain from redirect_uri (e.g., https://ses.gov.school.edu.sl/... -> ses)
    let schoolSlug: string | null = null;
    try {
      const redirectUrl = new URL(params.redirectUri);
      const hostParts = redirectUrl.hostname.split('.');
      if (hostParts.length > 0 && redirectUrl.hostname.includes('gov.school.edu.sl')) {
        schoolSlug = hostParts[0]; // e.g., 'ses' from 'ses.gov.school.edu.sl'
      }
    } catch (e) {
      console.error('[OAuth] Failed to parse redirect URI:', e);
    }

    // Save school connection if this is a school SaaS connection
    if (schoolSlug && params.clientId === 'school_saas') {
      console.log('[OAuth] Creating school connection for:', schoolSlug);

      // Check if connection already exists
      const { data: existingConnection } = await this.supabase
        .from('school_connections')
        .select('*')
        .eq('peeap_school_id', schoolSlug)
        .maybeSingle();

      if (!existingConnection) {
        // Create wallet for the school
        const { data: wallet, error: walletError } = await this.supabase
          .from('wallets')
          .insert({
            currency: 'SLE',
            balance: 0,
            status: 'ACTIVE',
            wallet_type: 'school',
            name: `${schoolSlug.charAt(0).toUpperCase() + schoolSlug.slice(1)} School Wallet`,
            external_id: `SCH-${schoolSlug}`,
          })
          .select()
          .single();

        if (walletError) {
          console.error('[OAuth] Failed to create school wallet:', walletError);
        } else {
          console.log('[OAuth] Created school wallet:', wallet.id);

          // Create school connection
          const { data: newConnection, error: connectionError } = await this.supabase
            .from('school_connections')
            .insert({
              school_id: authCode.metadata?.school_id?.toString() || schoolSlug,
              school_name: `${schoolSlug.charAt(0).toUpperCase() + schoolSlug.slice(1)} School`,
              peeap_school_id: schoolSlug,
              school_domain: `${schoolSlug}.gov.school.edu.sl`,
              connected_by_user_id: authCode.user_id,
              connected_by_email: user?.email || null,
              wallet_id: wallet.id,
              status: 'active',
              saas_origin: `${schoolSlug}.gov.school.edu.sl`,
              connected_at: new Date().toISOString(),
              access_token_id: null, // Will be updated after token is stored
            })
            .select()
            .single();

          if (connectionError) {
            console.error('[OAuth] Failed to create school connection:', connectionError);
            // Clean up wallet
            await this.supabase.from('wallets').delete().eq('id', wallet.id);
          } else {
            console.log('[OAuth] Created school connection:', newConnection.id);
          }
        }
      } else {
        console.log('[OAuth] School connection already exists:', existingConnection.id);
      }
    }

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

    // Include school connection info if present
    if (schoolSlug) {
      response.school_connection = {
        peeap_school_id: schoolSlug,
      };
    } else if (authCode.metadata?.school_id) {
      response.school_connection = {
        peeap_school_id: `sch_${authCode.metadata.school_id}`,
      };
    }

    // Include student NSI info if present
    if (authCode.metadata?.nsi || authCode.metadata?.index_number) {
      response.student = {
        nsi: authCode.metadata.nsi || authCode.metadata.index_number,
        name: authCode.metadata.student_name,
      };
    }

    // Include children array for parent users
    if (authCode.metadata?.children) {
      response.children = authCode.metadata.children;
    }

    // Create parent connection if this is a parent SSO from school
    if (authCode.metadata?.user_type === 'parent' && authCode.metadata?.children) {
      const parentConnection = await this.createParentConnectionFromOAuth({
        peeapUserId: authCode.user_id,
        schoolId: authCode.metadata.school_id?.toString() || schoolSlug || '',
        peeapSchoolId: schoolSlug || `sch_${authCode.metadata.school_id}`,
        schoolName: authCode.metadata.school_name || `${schoolSlug?.charAt(0).toUpperCase()}${schoolSlug?.slice(1)} School`,
        schoolLogoUrl: authCode.metadata.school_logo_url,
        schoolDomain: schoolSlug ? `${schoolSlug}.gov.school.edu.sl` : undefined,
        schoolParentId: authCode.metadata.parent_id || authCode.user_id,
        parentName: authCode.metadata.parent_name,
        parentEmail: authCode.metadata.parent_email || user?.email,
        parentPhone: authCode.metadata.parent_phone,
        children: authCode.metadata.children,
      });

      if (parentConnection) {
        response.parent_connection = {
          connection_id: parentConnection.connection_id,
          chat_enabled: parentConnection.chat_enabled,
          thread_id: parentConnection.thread_id,
          children: parentConnection.children,
        };
      }
    }

    return response;
  }

  /**
   * Create parent connection from OAuth flow
   */
  private async createParentConnectionFromOAuth(params: {
    peeapUserId: string;
    schoolId: string;
    peeapSchoolId?: string;
    schoolName: string;
    schoolLogoUrl?: string;
    schoolDomain?: string;
    schoolParentId: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    children: Array<{
      nsi: string;
      name: string;
      student_id?: string;
      class_id?: string;
      class_name?: string;
      section_name?: string;
      profile_photo_url?: string;
      peeap_wallet_id?: string;
    }>;
  }): Promise<{
    connection_id: string;
    chat_enabled: boolean;
    thread_id?: string;
    children: Array<{ nsi: string; name: string; wallet_id?: string }>;
  } | null> {
    try {
      console.log('[OAuth] Creating parent connection for user:', params.peeapUserId);

      // Get user's wallet
      const { data: wallet } = await this.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', params.peeapUserId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .single();

      // Check if connection already exists
      const { data: existingConnection } = await this.supabase
        .from('school_parent_connections')
        .select('id, chat_enabled')
        .eq('peeap_user_id', params.peeapUserId)
        .eq('school_id', params.schoolId)
        .eq('school_parent_id', params.schoolParentId)
        .single();

      let connectionId: string;

      if (existingConnection) {
        connectionId = existingConnection.id;
        console.log('[OAuth] Updating existing parent connection:', connectionId);

        await this.supabase
          .from('school_parent_connections')
          .update({
            peeap_wallet_id: wallet?.id,
            peeap_school_id: params.peeapSchoolId,
            school_name: params.schoolName,
            school_logo_url: params.schoolLogoUrl,
            school_domain: params.schoolDomain,
            parent_name: params.parentName,
            parent_email: params.parentEmail,
            parent_phone: params.parentPhone,
            status: 'active',
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connectionId);
      } else {
        console.log('[OAuth] Creating new parent connection');

        const { data: newConnection, error: createError } = await this.supabase
          .from('school_parent_connections')
          .insert({
            peeap_user_id: params.peeapUserId,
            peeap_wallet_id: wallet?.id,
            school_id: params.schoolId,
            peeap_school_id: params.peeapSchoolId,
            school_name: params.schoolName,
            school_logo_url: params.schoolLogoUrl,
            school_domain: params.schoolDomain,
            school_parent_id: params.schoolParentId,
            parent_name: params.parentName,
            parent_email: params.parentEmail,
            parent_phone: params.parentPhone,
            status: 'active',
            is_verified: true,
            chat_enabled: true,
          })
          .select('id')
          .single();

        if (createError) {
          console.error('[OAuth] Failed to create parent connection:', createError);
          return null;
        }

        connectionId = newConnection.id;
        console.log('[OAuth] Created parent connection:', connectionId);
      }

      // Create/update children
      const childrenResult: Array<{ nsi: string; name: string; wallet_id?: string }> = [];

      for (const child of params.children) {
        const { data: existingChild } = await this.supabase
          .from('school_parent_children')
          .select('id, student_wallet_id')
          .eq('connection_id', connectionId)
          .eq('nsi', child.nsi)
          .single();

        if (existingChild) {
          await this.supabase
            .from('school_parent_children')
            .update({
              student_name: child.name,
              student_id_in_school: child.student_id,
              class_id: child.class_id,
              class_name: child.class_name,
              section_name: child.section_name,
              profile_photo_url: child.profile_photo_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingChild.id);

          childrenResult.push({
            nsi: child.nsi,
            name: child.name,
            wallet_id: existingChild.student_wallet_id || child.peeap_wallet_id,
          });
        } else {
          const { data: newChild } = await this.supabase
            .from('school_parent_children')
            .insert({
              connection_id: connectionId,
              nsi: child.nsi,
              student_name: child.name,
              student_id_in_school: child.student_id,
              class_id: child.class_id,
              class_name: child.class_name,
              section_name: child.section_name,
              profile_photo_url: child.profile_photo_url,
              student_wallet_id: child.peeap_wallet_id,
            })
            .select('id, student_wallet_id')
            .single();

          if (newChild) {
            childrenResult.push({
              nsi: child.nsi,
              name: child.name,
              wallet_id: newChild.student_wallet_id,
            });
          }
        }
      }

      // Create initial chat thread if doesn't exist
      let threadId: string | undefined;
      const { data: existingThread } = await this.supabase
        .from('school_chat_threads')
        .select('id')
        .eq('parent_connection_id', connectionId)
        .eq('thread_type', 'direct')
        .eq('status', 'active')
        .single();

      if (!existingThread) {
        const { data: newThread } = await this.supabase
          .from('school_chat_threads')
          .insert({
            school_id: params.schoolId,
            peeap_school_id: params.peeapSchoolId,
            school_name: params.schoolName,
            school_logo_url: params.schoolLogoUrl,
            thread_type: 'direct',
            parent_connection_id: connectionId,
            parent_user_id: params.peeapUserId,
            parent_name: params.parentName,
            status: 'active',
          })
          .select('id')
          .single();

        if (newThread) {
          threadId = newThread.id;

          // Send welcome message
          await this.supabase.from('school_chat_messages').insert({
            thread_id: threadId,
            sender_type: 'system',
            message_type: 'system',
            content: `Welcome to ${params.schoolName}'s chat! You can now receive notifications and communicate with the school directly.`,
            status: 'sent',
          });

          console.log('[OAuth] Created chat thread:', threadId);
        }
      } else {
        threadId = existingThread.id;
      }

      return {
        connection_id: connectionId,
        chat_enabled: true,
        thread_id: threadId,
        children: childrenResult,
      };
    } catch (error) {
      console.error('[OAuth] Error creating parent connection:', error);
      return null;
    }
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
