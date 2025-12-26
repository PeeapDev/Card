/**
 * REST API Module Service
 *
 * Provides external connectivity through:
 * - API Key authentication
 * - Webhook management
 * - Rate limiting
 * - Request logging
 *
 * Other services can use this module to connect external applications.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { getModuleRegistry, requireModule } from './registry';

// Types
export interface ApiKey {
  id: string;
  key_prefix: string;     // First 8 chars shown (pk_live_xxxx)
  key_hash: string;       // SHA256 hash for verification
  name: string;
  description?: string;
  permissions: string[];  // ['payments.read', 'payments.create', etc.]
  environment: 'live' | 'test';
  rate_limit: number;     // Requests per hour
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];       // Events to send
  secret: string;         // For signature verification
  is_active: boolean;
  description?: string;
  retry_count: number;
  last_triggered_at?: string;
  last_status?: 'success' | 'failed';
  failure_count: number;
  created_at: string;
  created_by?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  response_status?: number;
  response_body?: string;
  attempts: number;
  next_retry_at?: string;
  created_at: string;
  delivered_at?: string;
}

export interface ApiRequest {
  id: string;
  api_key_id: string;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export class RestApiModuleError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'RestApiModuleError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * REST API Module - External connectivity service
 */
export class RestApiModule {
  private supabase: SupabaseClient;
  static readonly MODULE_CODE = 'rest_api';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Ensure the REST API module is enabled
   */
  private async ensureEnabled(): Promise<void> {
    // REST API module is always enabled as it's core functionality
    // But we keep this for consistency
  }

  // ==================== API Keys ====================

  /**
   * Generate a new API key
   */
  async createApiKey(params: {
    name: string;
    description?: string;
    permissions: string[];
    environment?: 'live' | 'test';
    rateLimit?: number;
    expiresAt?: Date;
    createdBy?: string;
  }): Promise<{ apiKey: ApiKey; secretKey: string }> {
    await this.ensureEnabled();

    // Generate key
    const environment = params.environment || 'test';
    const prefix = environment === 'live' ? 'pk_live_' : 'pk_test_';
    const randomPart = crypto.randomBytes(24).toString('hex');
    const secretKey = prefix + randomPart;

    // Hash for storage
    const keyHash = crypto.createHash('sha256').update(secretKey).digest('hex');
    const keyPrefix = secretKey.substring(0, 12);

    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name: params.name,
        description: params.description,
        permissions: params.permissions,
        environment,
        rate_limit: params.rateLimit || 1000,
        is_active: true,
        expires_at: params.expiresAt?.toISOString(),
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new RestApiModuleError(`Failed to create API key: ${error.message}`, 'CREATE_KEY_FAILED', 500);
    }

    return { apiKey: data, secretKey };
  }

  /**
   * Validate an API key and return its details
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    if (!key || (!key.startsWith('pk_live_') && !key.startsWith('pk_test_'))) {
      return null;
    }

    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 12);

    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('key_prefix', keyPrefix)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Update last used
    await this.supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return data;
  }

  /**
   * Check if API key has a specific permission
   */
  hasPermission(apiKey: ApiKey, permission: string): boolean {
    if (!apiKey.permissions) return false;

    // Check exact match
    if (apiKey.permissions.includes(permission)) return true;

    // Check wildcard (e.g., 'payments.*' matches 'payments.read')
    const [resource] = permission.split('.');
    if (apiKey.permissions.includes(`${resource}.*`)) return true;
    if (apiKey.permissions.includes('*')) return true;

    return false;
  }

  /**
   * List all API keys
   */
  async listApiKeys(params?: { environment?: 'live' | 'test' }): Promise<ApiKey[]> {
    let query = this.supabase.from('api_keys').select('*');

    if (params?.environment) {
      query = query.eq('environment', params.environment);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new RestApiModuleError(`Failed to list API keys: ${error.message}`, 'LIST_KEYS_FAILED', 500);
    }

    return data || [];
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new RestApiModuleError(`Failed to revoke API key: ${error.message}`, 'REVOKE_KEY_FAILED', 500);
    }
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      throw new RestApiModuleError(`Failed to delete API key: ${error.message}`, 'DELETE_KEY_FAILED', 500);
    }
  }

  // ==================== Webhooks ====================

  /**
   * Register a webhook endpoint
   */
  async createWebhook(params: {
    url: string;
    events: string[];
    description?: string;
    createdBy?: string;
  }): Promise<{ webhook: Webhook; secret: string }> {
    await this.ensureEnabled();

    // Generate webhook secret
    const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');

    const { data, error } = await this.supabase
      .from('webhooks')
      .insert({
        url: params.url,
        events: params.events,
        secret,
        is_active: true,
        description: params.description,
        retry_count: 3,
        failure_count: 0,
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new RestApiModuleError(`Failed to create webhook: ${error.message}`, 'CREATE_WEBHOOK_FAILED', 500);
    }

    return { webhook: data, secret };
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<Webhook[]> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new RestApiModuleError(`Failed to list webhooks: ${error.message}`, 'LIST_WEBHOOKS_FAILED', 500);
    }

    return data || [];
  }

  /**
   * Update webhook
   */
  async updateWebhook(id: string, params: Partial<Pick<Webhook, 'url' | 'events' | 'is_active' | 'description'>>): Promise<Webhook> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new RestApiModuleError(`Failed to update webhook: ${error.message}`, 'UPDATE_WEBHOOK_FAILED', 500);
    }

    return data;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhooks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new RestApiModuleError(`Failed to delete webhook: ${error.message}`, 'DELETE_WEBHOOK_FAILED', 500);
    }
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerWebhooks(eventType: string, payload: Record<string, any>): Promise<void> {
    // Get all active webhooks that listen to this event
    const { data: webhooks } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (!webhooks || webhooks.length === 0) {
      return;
    }

    // Send to each webhook
    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, eventType, payload);
    }
  }

  /**
   * Send webhook payload
   */
  private async sendWebhook(webhook: Webhook, eventType: string, payload: Record<string, any>): Promise<void> {
    const timestamp = Date.now();
    const body = JSON.stringify({
      id: crypto.randomUUID(),
      type: eventType,
      created: timestamp,
      data: payload,
    });

    // Create signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    // Create delivery record
    const { data: delivery } = await this.supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
        status: 'pending',
        attempts: 0,
      })
      .select()
      .single();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
          'X-Webhook-Id': delivery?.id || 'unknown',
        },
        body,
      });

      // Update delivery status
      await this.supabase
        .from('webhook_deliveries')
        .update({
          status: response.ok ? 'delivered' : 'failed',
          response_status: response.status,
          attempts: 1,
          delivered_at: response.ok ? new Date().toISOString() : null,
        })
        .eq('id', delivery?.id);

      // Update webhook last triggered
      await this.supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          last_status: response.ok ? 'success' : 'failed',
          failure_count: response.ok ? 0 : webhook.failure_count + 1,
        })
        .eq('id', webhook.id);
    } catch (error) {
      console.error(`[Webhook] Failed to send to ${webhook.url}:`, error);

      await this.supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          attempts: 1,
          next_retry_at: new Date(Date.now() + 60000).toISOString(), // Retry in 1 min
        })
        .eq('id', delivery?.id);

      await this.supabase
        .from('webhooks')
        .update({
          failure_count: webhook.failure_count + 1,
          last_status: 'failed',
        })
        .eq('id', webhook.id);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.replace('t=', '');
    const v1 = parts.find(p => p.startsWith('v1='))?.replace('v1=', '');

    if (!timestamp || !v1) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    return v1 === expectedSignature;
  }

  // ==================== Rate Limiting ====================

  /**
   * Check rate limit for an API key
   */
  async checkRateLimit(apiKeyId: string, rateLimit: number): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const windowStart = new Date(Date.now() - 3600000); // 1 hour ago

    // Count requests in the last hour
    const { count } = await this.supabase
      .from('api_requests')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', windowStart.toISOString());

    const requestCount = count || 0;
    const remaining = Math.max(0, rateLimit - requestCount);
    const allowed = requestCount < rateLimit;
    const resetAt = new Date(windowStart.getTime() + 3600000);

    return { allowed, remaining, resetAt };
  }

  /**
   * Log an API request
   */
  async logRequest(params: {
    apiKeyId: string;
    method: string;
    path: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.supabase.from('api_requests').insert({
      api_key_id: params.apiKeyId,
      method: params.method,
      path: params.path,
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
  }

  // ==================== Available Permissions ====================

  /**
   * Get all available API permissions
   */
  getAvailablePermissions(): Array<{ permission: string; description: string; category: string }> {
    return [
      // Payments
      { permission: 'payments.read', description: 'View payments', category: 'Payments' },
      { permission: 'payments.create', description: 'Create payments', category: 'Payments' },
      { permission: 'payments.refund', description: 'Refund payments', category: 'Payments' },

      // Checkout
      { permission: 'checkout.create', description: 'Create checkout sessions', category: 'Checkout' },
      { permission: 'checkout.read', description: 'View checkout sessions', category: 'Checkout' },

      // Wallets
      { permission: 'wallets.read', description: 'View wallet balances', category: 'Wallets' },
      { permission: 'wallets.transfer', description: 'Transfer between wallets', category: 'Wallets' },

      // Transactions
      { permission: 'transactions.read', description: 'View transactions', category: 'Transactions' },

      // Users
      { permission: 'users.read', description: 'View user details', category: 'Users' },
      { permission: 'users.create', description: 'Create users', category: 'Users' },

      // Webhooks
      { permission: 'webhooks.manage', description: 'Manage webhooks', category: 'Webhooks' },

      // Full access
      { permission: '*', description: 'Full access to all resources', category: 'Admin' },
    ];
  }
}

// Factory function
let restApiModuleInstance: RestApiModule | null = null;

export function getRestApiModule(supabase: SupabaseClient): RestApiModule {
  if (!restApiModuleInstance) {
    restApiModuleInstance = new RestApiModule(supabase);
  }
  return restApiModuleInstance;
}
