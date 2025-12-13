/**
 * Shared API Service - Cross-Domain SSO Access
 *
 * This service allows any Peeap domain to access shared functionality
 * from my.peeap.com using SSO session tokens.
 *
 * Supported features:
 * - User profile
 * - Contacts
 * - Wallet balance & transactions
 * - P2P transfers
 * - Hosted checkout
 */

import { authService } from './auth.service';

// API base URL - points to my.peeap.com API
const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5173/api';
  }
  return 'https://my.peeap.com/api';
};

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface Contact {
  id: string;
  contactUserId?: string;
  nickname?: string;
  isFavorite?: boolean;
  lastTransactionAt?: string;
  contact?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
  // Fallback fields
  name?: string;
  phone?: string;
}

interface Wallet {
  id: string;
  balance: number;
  currency: string;
  status: string;
  dailyLimit?: number;
  monthlyLimit?: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  merchantName?: string;
  reference: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: string[];
  tier: string;
  kycStatus?: string;
  kycTier?: string;
  emailVerified?: boolean;
  createdAt: string;
}

interface TransferRequest {
  recipientId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  amount: number;
  description?: string;
  pin?: string;
}

interface CheckoutRequest {
  amount: number;
  currency?: string;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string;
}

class SharedApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  /**
   * Get authorization header for API requests
   */
  private getAuthHeader(): string | null {
    const tokens = authService.getTokens();
    if (tokens?.accessToken) {
      return `Bearer ${tokens.accessToken}`;
    }

    // Try session token from cookie (for plus.peeap.com)
    const sessionCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('plus_session='));

    if (sessionCookie) {
      const sessionToken = sessionCookie.split('=')[1];
      return `SSO ${sessionToken}`;
    }

    return null;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const authHeader = this.getAuthHeader();

    if (!authHeader) {
      return { error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || `Request failed: ${response.status}` };
      }

      return { data };
    } catch (error: any) {
      console.error(`[SharedAPI] ${endpoint} error:`, error);
      return { error: error.message || 'Request failed' };
    }
  }

  // ============================================
  // USER
  // ============================================

  /**
   * Get current user profile
   */
  async getUser(): Promise<ApiResponse<User>> {
    const response = await this.request<{ user: User }>('/shared/user');
    if (response.data) {
      return { data: response.data.user };
    }
    return { error: response.error || 'Failed to get user' };
  }

  // ============================================
  // CONTACTS
  // ============================================

  /**
   * Get user's contacts
   */
  async getContacts(): Promise<ApiResponse<Contact[]>> {
    const response = await this.request<{ contacts: Contact[] }>('/shared/contacts');
    if (response.data) {
      return { data: response.data.contacts };
    }
    return { error: response.error || 'Failed to get contacts' };
  }

  /**
   * Add a contact
   */
  async addContact(contactUserId: string, nickname?: string): Promise<ApiResponse<Contact>> {
    const response = await this.request<{ contact: Contact }>('/shared/contacts', {
      method: 'POST',
      body: JSON.stringify({ contactUserId, nickname }),
    });
    if (response.data) {
      return { data: response.data.contact };
    }
    return { error: response.error || 'Failed to add contact' };
  }

  // ============================================
  // WALLET
  // ============================================

  /**
   * Get user's wallet balance
   */
  async getWallet(): Promise<ApiResponse<{ wallet: Wallet | null; wallets: Wallet[] }>> {
    return this.request('/shared/wallet');
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    return this.request(`/shared/wallet/transactions?page=${page}&limit=${limit}`);
  }

  // ============================================
  // TRANSFERS
  // ============================================

  /**
   * Transfer money to another user
   */
  async transfer(request: TransferRequest): Promise<ApiResponse<{
    success: boolean;
    transactionId: string;
    amount: number;
    recipientId: string;
  }>> {
    return this.request('/shared/transfer', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ============================================
  // CHECKOUT
  // ============================================

  /**
   * Create a hosted checkout session
   */
  async createCheckout(request: CheckoutRequest): Promise<ApiResponse<CheckoutSession>> {
    return this.request('/shared/checkout/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Redirect to hosted checkout
   */
  async redirectToCheckout(request: CheckoutRequest): Promise<void> {
    const response = await this.createCheckout(request);

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.data?.checkoutUrl) {
      window.location.href = response.data.checkoutUrl;
    }
  }
}

export const sharedApiService = new SharedApiService();

// Export types
export type {
  Contact,
  Wallet,
  Transaction,
  User,
  TransferRequest,
  CheckoutRequest,
  CheckoutSession,
};
