/**
 * SSO Configuration Service
 *
 * Reads and caches SSO module configuration from the database.
 * Used by both the web app and API to enforce SSO settings.
 */

import { supabase } from '@/lib/supabase';

export interface InternalSsoConfig {
  enabled: boolean;
  apps: Record<string, {
    enabled: boolean;
    domain: string;
    dev_port: number;
  }>;
  token_expiry_minutes: number;
  session_expiry_days: number;
}

export interface ExternalSsoConfig {
  enabled: boolean;
  require_approval: boolean;
  allowed_scopes: string[];
  dangerous_scopes: string[];
  token_expiry: {
    authorization_code_minutes: number;
    access_token_hours: number;
    refresh_token_days: number;
  };
}

export interface SharedApiConfig {
  enabled: boolean;
  endpoints: Record<string, boolean>;
  rate_limits: {
    per_minute: number;
    per_hour: number;
  };
  transfer_settings: {
    require_pin: boolean;
    max_amount: number;
    daily_limit: number;
  };
}

export interface SsoConfig {
  internal_sso: InternalSsoConfig;
  external_sso: ExternalSsoConfig;
  shared_api: SharedApiConfig;
}

// Default configuration (used if database is unavailable)
const DEFAULT_CONFIG: SsoConfig = {
  internal_sso: {
    enabled: true,
    apps: {
      my: { enabled: true, domain: 'my.peeap.com', dev_port: 5173 },
      plus: { enabled: true, domain: 'plus.peeap.com', dev_port: 3000 },
      checkout: { enabled: true, domain: 'checkout.peeap.com', dev_port: 5174 },
      developer: { enabled: false, domain: 'developer.peeap.com', dev_port: 5175 },
    },
    token_expiry_minutes: 5,
    session_expiry_days: 7,
  },
  external_sso: {
    enabled: false,
    require_approval: true,
    allowed_scopes: ['profile', 'email', 'wallet:read', 'transactions:read'],
    dangerous_scopes: ['wallet:write', 'transfers:write'],
    token_expiry: {
      authorization_code_minutes: 10,
      access_token_hours: 1,
      refresh_token_days: 30,
    },
  },
  shared_api: {
    enabled: true,
    endpoints: {
      user: true,
      contacts: true,
      wallet: true,
      transactions: true,
      transfer: true,
      checkout: true,
    },
    rate_limits: {
      per_minute: 60,
      per_hour: 1000,
    },
    transfer_settings: {
      require_pin: false,
      max_amount: 1000000,
      daily_limit: 5000000,
    },
  },
};

// Cache configuration to avoid repeated database calls
let cachedConfig: SsoConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class SsoConfigService {
  /**
   * Get SSO configuration (with caching)
   */
  async getConfig(): Promise<SsoConfig> {
    const now = Date.now();

    // Return cached config if still valid
    if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL) {
      return cachedConfig;
    }

    try {
      const { data, error } = await supabase
        .from('sso_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Failed to load SSO config:', error);
        return DEFAULT_CONFIG;
      }

      const config = { ...DEFAULT_CONFIG };

      data?.forEach((row) => {
        const key = row.setting_key as keyof SsoConfig;
        if (key in config) {
          (config as any)[key] = {
            ...(config as any)[key],
            ...row.setting_value,
          };
        }
      });

      // Update cache
      cachedConfig = config;
      cacheTimestamp = now;

      return config;
    } catch (err) {
      console.error('Failed to load SSO config:', err);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Clear the configuration cache
   */
  clearCache(): void {
    cachedConfig = null;
    cacheTimestamp = 0;
  }

  /**
   * Check if internal SSO is enabled
   */
  async isInternalSsoEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.internal_sso.enabled;
  }

  /**
   * Check if a specific app is enabled for SSO
   */
  async isAppEnabled(appCode: string): Promise<boolean> {
    const config = await this.getConfig();
    return config.internal_sso.apps[appCode]?.enabled ?? false;
  }

  /**
   * Check if external SSO (OAuth) is enabled
   */
  async isExternalSsoEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.external_sso.enabled;
  }

  /**
   * Check if a scope is allowed for OAuth
   */
  async isScopeAllowed(scope: string): Promise<boolean> {
    const config = await this.getConfig();
    return config.external_sso.allowed_scopes.includes(scope);
  }

  /**
   * Check if shared API is enabled
   */
  async isSharedApiEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.shared_api.enabled;
  }

  /**
   * Check if a specific shared API endpoint is enabled
   */
  async isEndpointEnabled(endpoint: string): Promise<boolean> {
    const config = await this.getConfig();
    return config.shared_api.endpoints[endpoint] ?? false;
  }

  /**
   * Get SSO URL for a specific app
   */
  async getSsoUrl(appCode: string): Promise<string | null> {
    const config = await this.getConfig();
    const app = config.internal_sso.apps[appCode];

    if (!app?.enabled) {
      return null;
    }

    const isDev = import.meta.env.DEV;
    const baseUrl = isDev
      ? `http://localhost:${app.dev_port}`
      : `https://${app.domain}`;

    return `${baseUrl}/auth/sso`;
  }

  /**
   * Get token expiry settings
   */
  async getTokenExpiry(): Promise<{
    ssoToken: number;
    session: number;
    authCode: number;
    accessToken: number;
    refreshToken: number;
  }> {
    const config = await this.getConfig();

    return {
      ssoToken: config.internal_sso.token_expiry_minutes * 60 * 1000, // ms
      session: config.internal_sso.session_expiry_days * 24 * 60 * 60 * 1000, // ms
      authCode: config.external_sso.token_expiry.authorization_code_minutes * 60 * 1000,
      accessToken: config.external_sso.token_expiry.access_token_hours * 60 * 60 * 1000,
      refreshToken: config.external_sso.token_expiry.refresh_token_days * 24 * 60 * 60 * 1000,
    };
  }

  /**
   * Validate transfer against settings
   */
  async validateTransfer(amount: number): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const config = await this.getConfig();
    const { max_amount, require_pin } = config.shared_api.transfer_settings;

    if (amount > max_amount) {
      return {
        valid: false,
        error: `Amount exceeds maximum limit of ${max_amount}`,
      };
    }

    return { valid: true };
  }

  /**
   * Log SSO event
   */
  async logEvent(event: {
    event_type: string;
    user_id?: string;
    source_app?: string;
    target_app?: string;
    client_id?: string;
    success: boolean;
    error_message?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('sso_event_logs').insert({
        ...event,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log SSO event:', err);
    }
  }
}

export const ssoConfigService = new SsoConfigService();
