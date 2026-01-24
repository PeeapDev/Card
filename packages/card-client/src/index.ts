/**
 * Card Service HTTP Client
 *
 * This client is used by other services (web app, api-gateway, etc.)
 * to communicate with the card service via HTTP API instead of
 * direct database access.
 *
 * Usage:
 *   import { CardClient } from '@payment-system/card-client';
 *   const cardClient = new CardClient({ baseUrl: 'http://localhost:3003' });
 *   const cards = await cardClient.getUserCards(userId);
 */

export interface CardClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface Card {
  id: string;
  userId: string;
  walletId: string;
  cardNumber: string;
  maskedNumber: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  type: 'VIRTUAL' | 'PHYSICAL';
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'FROZEN' | 'EXPIRED' | 'TERMINATED';
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  nfcEnabled: boolean;
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  atmEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  type: 'purchase' | 'refund' | 'topup' | 'withdrawal' | 'p2p_send' | 'p2p_receive';
  amount: number;
  feeAmount: number;
  currency: string;
  description: string;
  merchantName?: string;
  merchantCategory?: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  reference: string;
  createdAt: string;
}

export interface CreateCardRequest {
  userId: string;
  walletId: string;
  type: 'VIRTUAL' | 'PHYSICAL';
  cardholderName: string;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface ProcessPaymentRequest {
  cardToken: string;
  amount: number;
  currency: string;
  merchantId: string;
  merchantName: string;
  description: string;
  checkoutSessionId?: string;
}

export interface ProcessPaymentResponse {
  success: boolean;
  transactionId?: string;
  authorizationCode?: string;
  newBalance?: number;
  error?: string;
  declineCode?: string;
}

export interface CardLookupResponse {
  cardId: string;
  maskedNumber: string;
  cardholderName: string;
  walletId: string;
  walletBalance: number;
  currency: string;
  status: string;
}

export class CardClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: CardClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-API-Key': this.apiKey }),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // ==========================================
  // Card Management
  // ==========================================

  /**
   * Get all cards for a user
   */
  async getUserCards(userId: string): Promise<Card[]> {
    return this.request<Card[]>('GET', `/api/cards/user/${userId}`);
  }

  /**
   * Get a single card by ID
   */
  async getCard(cardId: string): Promise<Card> {
    return this.request<Card>('GET', `/api/cards/${cardId}`);
  }

  /**
   * Get card by token (for payment processing)
   */
  async getCardByToken(cardToken: string): Promise<Card> {
    return this.request<Card>('GET', `/api/cards/by-token/${cardToken}`);
  }

  /**
   * Create a new card
   */
  async createCard(data: CreateCardRequest): Promise<Card> {
    return this.request<Card>('POST', '/api/cards', data);
  }

  /**
   * Activate a card
   */
  async activateCard(cardId: string, activationCode?: string): Promise<Card> {
    return this.request<Card>('POST', `/api/cards/${cardId}/activate`, { activationCode });
  }

  /**
   * Block a card
   */
  async blockCard(cardId: string, reason: string): Promise<Card> {
    return this.request<Card>('POST', `/api/cards/${cardId}/block`, { reason });
  }

  /**
   * Unblock a card
   */
  async unblockCard(cardId: string): Promise<Card> {
    return this.request<Card>('POST', `/api/cards/${cardId}/unblock`);
  }

  /**
   * Freeze a card (temporary)
   */
  async freezeCard(cardId: string): Promise<Card> {
    return this.request<Card>('POST', `/api/cards/${cardId}/freeze`);
  }

  /**
   * Unfreeze a card
   */
  async unfreezeCard(cardId: string): Promise<Card> {
    return this.request<Card>('POST', `/api/cards/${cardId}/unfreeze`);
  }

  /**
   * Update card limits
   */
  async updateCardLimits(cardId: string, limits: {
    dailyLimit?: number;
    weeklyLimit?: number;
    monthlyLimit?: number;
    perTransactionLimit?: number;
  }): Promise<Card> {
    return this.request<Card>('PATCH', `/api/cards/${cardId}/limits`, limits);
  }

  /**
   * Update card features (NFC, online, international, ATM)
   */
  async updateCardFeatures(cardId: string, features: {
    nfcEnabled?: boolean;
    onlineEnabled?: boolean;
    internationalEnabled?: boolean;
    atmEnabled?: boolean;
  }): Promise<Card> {
    return this.request<Card>('PATCH', `/api/cards/${cardId}/features`, features);
  }

  // ==========================================
  // Card Payment Processing
  // ==========================================

  /**
   * Look up a card for payment (returns limited info)
   */
  async lookupCardForPayment(
    cardNumber: string,
    cvv?: string
  ): Promise<CardLookupResponse | null> {
    return this.request<CardLookupResponse | null>('POST', '/api/cards/lookup', {
      cardNumber,
      cvv,
    });
  }

  /**
   * Process a card payment
   */
  async processPayment(data: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    return this.request<ProcessPaymentResponse>('POST', '/api/cards/process-payment', data);
  }

  /**
   * Verify card details before payment
   */
  async verifyCard(
    cardToken: string,
    options?: {
      checkExpiry?: boolean;
      checkStatus?: boolean;
      checkLimits?: boolean;
      amount?: number;
    }
  ): Promise<{ valid: boolean; reason?: string }> {
    return this.request<{ valid: boolean; reason?: string }>('POST', '/api/cards/verify', {
      cardToken,
      ...options,
    });
  }

  /**
   * Get card transactions
   */
  async getCardTransactions(
    cardId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<CardTransaction[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<CardTransaction[]>('GET', `/api/cards/${cardId}/transactions${query}`);
  }

  // ==========================================
  // Card Token Vault
  // ==========================================

  /**
   * Tokenize a card (store and return token)
   */
  async tokenizeCard(data: {
    userId: string;
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
  }): Promise<{ token: string; lastFour: string }> {
    return this.request<{ token: string; lastFour: string }>('POST', '/api/token-vault/tokenize', data);
  }

  /**
   * Look up token by PAN (for cards already in system)
   */
  async lookupTokenByPan(
    pan: string,
    expiryMonth: number,
    expiryYear: number
  ): Promise<string> {
    return this.request<string>('POST', '/api/token-vault/lookup', {
      pan,
      expiryMonth,
      expiryYear,
    });
  }

  // ==========================================
  // Health Check
  // ==========================================

  /**
   * Check card service health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('GET', '/health');
  }
}

// Export a factory function for creating the client
export function createCardClient(config: CardClientConfig): CardClient {
  return new CardClient(config);
}

export default CardClient;
