/**
 * Anonymous Session Management
 * Handles session creation, storage, and validation
 */

import type { AnonymousSession, UserInfo } from './types';

const STORAGE_KEY = 'peeap_chat_session';
const FINGERPRINT_KEY = 'peeap_chat_fp';

export class SessionManager {
  private session: AnonymousSession | null = null;
  private apiKey: string;
  private apiBase: string;

  constructor(apiKey: string, apiBase: string) {
    this.apiKey = apiKey;
    this.apiBase = apiBase;
  }

  /**
   * Get or create an anonymous session
   */
  async getOrCreateSession(): Promise<AnonymousSession> {
    // Try to restore from storage
    const stored = this.getStoredSession();
    if (stored && !this.isExpired(stored)) {
      // Validate with backend
      const isValid = await this.validateSession(stored.sessionId);
      if (isValid) {
        this.session = stored;
        return stored;
      }
    }

    // Create new session
    return await this.createSession();
  }

  /**
   * Create a new anonymous session
   */
  private async createSession(): Promise<AnonymousSession> {
    const fingerprint = await this.getOrCreateFingerprint();
    const domain = window.location.hostname;

    const response = await fetch(`${this.apiBase}/widget/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        fingerprint,
        domain,
        origin: window.location.origin,
        referrer: document.referrer,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create session');
    }

    const data = await response.json();
    const session: AnonymousSession = {
      sessionId: data.sessionId,
      fingerprint,
      name: data.name,
      email: data.email,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
    };

    this.session = session;
    this.storeSession(session);
    return session;
  }

  /**
   * Validate session with backend
   */
  private async validateSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/widget/session/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Widget-Session': sessionId,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Update user info on session
   */
  async updateUserInfo(info: UserInfo): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const response = await fetch(`${this.apiBase}/widget/session`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Widget-Session': this.session.sessionId,
      },
      body: JSON.stringify(info),
    });

    if (!response.ok) {
      throw new Error('Failed to update user info');
    }

    // Update local session
    this.session = {
      ...this.session,
      ...info,
    };
    this.storeSession(this.session);
  }

  /**
   * Get current session
   */
  getSession(): AnonymousSession | null {
    return this.session;
  }

  /**
   * Get session token for API calls
   */
  getSessionToken(): string | null {
    return this.session?.sessionId || null;
  }

  /**
   * Clear session (logout)
   */
  clearSession(): void {
    this.session = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check if session is expired
   */
  private isExpired(session: AnonymousSession): boolean {
    if (!session.expiresAt) return false;
    return new Date(session.expiresAt) < new Date();
  }

  /**
   * Store session in localStorage
   */
  private storeSession(session: AnonymousSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage errors (private browsing, etc.)
    }
  }

  /**
   * Get stored session from localStorage
   */
  private getStoredSession(): AnonymousSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Generate or retrieve browser fingerprint
   */
  private async getOrCreateFingerprint(): Promise<string> {
    try {
      const stored = localStorage.getItem(FINGERPRINT_KEY);
      if (stored) return stored;
    } catch {
      // Ignore
    }

    const fingerprint = await this.generateFingerprint();

    try {
      localStorage.setItem(FINGERPRINT_KEY, fingerprint);
    } catch {
      // Ignore
    }

    return fingerprint;
  }

  /**
   * Generate browser fingerprint for session continuity
   */
  private async generateFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      `${screen.colorDepth}`,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '',
      // @ts-ignore - deviceMemory may not exist
      navigator.deviceMemory?.toString() || '',
    ].filter(Boolean);

    const data = components.join('|');

    // Use SubtleCrypto if available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        return Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } catch {
        // Fall back to simple hash
      }
    }

    // Simple hash fallback
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}
