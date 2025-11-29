/**
 * Cards Resource
 * Manage virtual and physical cards including creation, freezing, and transactions
 */

import { HttpClient } from '../client';
import {
  Card,
  CardDetails,
  CreateVirtualCardParams,
  CreatePhysicalCardParams,
  UpdateCardParams,
  CardTransaction,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class CardsResource {
  constructor(private client: HttpClient) {}

  /**
   * Create a new virtual card
   * @param params - Virtual card creation parameters
   * @returns Created card details
   */
  async createVirtual(params: CreateVirtualCardParams): Promise<Card> {
    const response = await this.client.post<Card>('/cards/virtual', params);
    return response.data;
  }

  /**
   * Create a new physical card (shipped to address)
   * @param params - Physical card creation parameters including shipping address
   * @returns Created card details
   */
  async createPhysical(params: CreatePhysicalCardParams): Promise<Card> {
    const response = await this.client.post<Card>('/cards/physical', params);
    return response.data;
  }

  /**
   * List all cards
   * @param params - Pagination parameters
   * @returns Paginated list of cards
   */
  async list(params?: PaginationParams): Promise<PaginatedResponse<Card>> {
    const response = await this.client.get<PaginatedResponse<Card>>('/cards', params);
    return response.data;
  }

  /**
   * Get card by ID
   * @param cardId - The card ID
   * @returns Card details
   */
  async get(cardId: string): Promise<Card> {
    const response = await this.client.get<Card>(`/cards/${cardId}`);
    return response.data;
  }

  /**
   * Get full card details including card number and CVV
   * Note: This is a sensitive operation and may require additional authentication
   * @param cardId - The card ID
   * @returns Full card details including sensitive data
   */
  async getDetails(cardId: string): Promise<CardDetails> {
    const response = await this.client.get<CardDetails>(`/cards/${cardId}/details`);
    return response.data;
  }

  /**
   * Update card settings
   * @param cardId - The card ID
   * @param params - Update parameters
   * @returns Updated card details
   */
  async update(cardId: string, params: UpdateCardParams): Promise<Card> {
    const response = await this.client.patch<Card>(`/cards/${cardId}`, params);
    return response.data;
  }

  /**
   * Freeze a card (temporarily disable)
   * @param cardId - The card ID to freeze
   * @returns Updated card details
   */
  async freeze(cardId: string): Promise<Card> {
    const response = await this.client.post<Card>(`/cards/${cardId}/freeze`);
    return response.data;
  }

  /**
   * Unfreeze a card (re-enable)
   * @param cardId - The card ID to unfreeze
   * @returns Updated card details
   */
  async unfreeze(cardId: string): Promise<Card> {
    const response = await this.client.post<Card>(`/cards/${cardId}/unfreeze`);
    return response.data;
  }

  /**
   * Block a card permanently
   * @param cardId - The card ID to block
   * @param reason - Reason for blocking
   * @returns Updated card details
   */
  async block(cardId: string, reason?: string): Promise<Card> {
    const response = await this.client.post<Card>(`/cards/${cardId}/block`, { reason });
    return response.data;
  }

  /**
   * Cancel a card
   * @param cardId - The card ID to cancel
   * @returns Confirmation
   */
  async cancel(cardId: string): Promise<{ success: boolean }> {
    const response = await this.client.delete<{ success: boolean }>(`/cards/${cardId}`);
    return response.data;
  }

  /**
   * Get card transactions
   * @param cardId - The card ID
   * @param params - Pagination parameters
   * @returns Paginated list of card transactions
   */
  async getTransactions(cardId: string, params?: PaginationParams): Promise<PaginatedResponse<CardTransaction>> {
    const response = await this.client.get<PaginatedResponse<CardTransaction>>(`/cards/${cardId}/transactions`, params);
    return response.data;
  }

  /**
   * Set spending limit for a card
   * @param cardId - The card ID
   * @param limit - New spending limit
   * @returns Updated card details
   */
  async setSpendingLimit(cardId: string, limit: number): Promise<Card> {
    const response = await this.client.patch<Card>(`/cards/${cardId}`, { spendingLimit: limit });
    return response.data;
  }

  /**
   * Get card spending summary
   * @param cardId - The card ID
   * @returns Spending summary
   */
  async getSpendingSummary(cardId: string): Promise<{
    totalSpent: number;
    spendingLimit: number;
    remainingLimit: number;
    transactionCount: number;
    period: string;
  }> {
    const response = await this.client.get<{
      totalSpent: number;
      spendingLimit: number;
      remainingLimit: number;
      transactionCount: number;
      period: string;
    }>(`/cards/${cardId}/spending-summary`);
    return response.data;
  }
}
