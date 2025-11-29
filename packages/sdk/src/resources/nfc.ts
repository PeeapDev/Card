/**
 * NFC Resource
 * Manage NFC tags and tap-to-pay operations
 */

import { HttpClient } from '../client';
import {
  NFCTag,
  RegisterNFCParams,
  NFCPaymentParams,
  NFCPaymentResult,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class NFCResource {
  constructor(private client: HttpClient) {}

  /**
   * Register a new NFC tag
   * @param params - NFC tag registration parameters
   * @returns Registered NFC tag details
   */
  async register(params: RegisterNFCParams): Promise<NFCTag> {
    const response = await this.client.post<NFCTag>('/nfc/register', params);
    return response.data;
  }

  /**
   * Get NFC tag by ID
   * @param tagId - The NFC tag ID
   * @returns NFC tag details
   */
  async get(tagId: string): Promise<NFCTag> {
    const response = await this.client.get<NFCTag>(`/nfc/${tagId}`);
    return response.data;
  }

  /**
   * Get NFC tag by hardware tag ID
   * @param hardwareTagId - The hardware NFC tag identifier
   * @returns NFC tag details
   */
  async getByHardwareId(hardwareTagId: string): Promise<NFCTag> {
    const response = await this.client.get<NFCTag>('/nfc/lookup', { tagId: hardwareTagId });
    return response.data;
  }

  /**
   * List all registered NFC tags
   * @param params - Pagination parameters
   * @returns Paginated list of NFC tags
   */
  async list(params?: PaginationParams & {
    type?: 'payment' | 'identification';
    status?: 'active' | 'disabled';
  }): Promise<PaginatedResponse<NFCTag>> {
    const response = await this.client.get<PaginatedResponse<NFCTag>>('/nfc', params);
    return response.data;
  }

  /**
   * Process NFC tap payment
   * @param params - NFC payment parameters
   * @returns Payment result
   */
  async processPayment(params: NFCPaymentParams): Promise<NFCPaymentResult> {
    const response = await this.client.post<NFCPaymentResult>('/nfc/pay', params);
    return response.data;
  }

  /**
   * Enable an NFC tag
   * @param tagId - The NFC tag ID to enable
   * @returns Updated NFC tag
   */
  async enable(tagId: string): Promise<NFCTag> {
    const response = await this.client.post<NFCTag>(`/nfc/${tagId}/enable`);
    return response.data;
  }

  /**
   * Disable an NFC tag
   * @param tagId - The NFC tag ID to disable
   * @returns Updated NFC tag
   */
  async disable(tagId: string): Promise<NFCTag> {
    const response = await this.client.post<NFCTag>(`/nfc/${tagId}/disable`);
    return response.data;
  }

  /**
   * Link NFC tag to a card
   * @param tagId - The NFC tag ID
   * @param cardId - The card ID to link
   * @returns Updated NFC tag
   */
  async linkToCard(tagId: string, cardId: string): Promise<NFCTag> {
    const response = await this.client.post<NFCTag>(`/nfc/${tagId}/link-card`, { cardId });
    return response.data;
  }

  /**
   * Link NFC tag to a wallet
   * @param tagId - The NFC tag ID
   * @param walletId - The wallet ID to link
   * @returns Updated NFC tag
   */
  async linkToWallet(tagId: string, walletId: string): Promise<NFCTag> {
    const response = await this.client.post<NFCTag>(`/nfc/${tagId}/link-wallet`, { walletId });
    return response.data;
  }

  /**
   * Unlink NFC tag from card/wallet
   * @param tagId - The NFC tag ID
   * @returns Updated NFC tag
   */
  async unlink(tagId: string): Promise<NFCTag> {
    const response = await this.client.post<NFCTag>(`/nfc/${tagId}/unlink`);
    return response.data;
  }

  /**
   * Delete an NFC tag
   * @param tagId - The NFC tag ID to delete
   * @returns Confirmation
   */
  async delete(tagId: string): Promise<{ success: boolean }> {
    const response = await this.client.delete<{ success: boolean }>(`/nfc/${tagId}`);
    return response.data;
  }

  /**
   * Get NFC tag transaction history
   * @param tagId - The NFC tag ID
   * @param params - Pagination parameters
   * @returns Paginated list of transactions
   */
  async getTransactions(tagId: string, params?: PaginationParams): Promise<PaginatedResponse<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    merchantName?: string;
    createdAt: string;
  }>> {
    const response = await this.client.get<PaginatedResponse<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      merchantName?: string;
      createdAt: string;
    }>>(`/nfc/${tagId}/transactions`, params);
    return response.data;
  }

  /**
   * Set spending limit for NFC tag
   * @param tagId - The NFC tag ID
   * @param params - Spending limit parameters
   * @returns Updated NFC tag
   */
  async setSpendingLimit(tagId: string, params: {
    dailyLimit?: number;
    transactionLimit?: number;
  }): Promise<NFCTag & {
    dailyLimit: number;
    transactionLimit: number;
  }> {
    const response = await this.client.patch<NFCTag & {
      dailyLimit: number;
      transactionLimit: number;
    }>(`/nfc/${tagId}/limits`, params);
    return response.data;
  }

  /**
   * Get NFC tag usage statistics
   * @param tagId - The NFC tag ID
   * @returns Usage statistics
   */
  async getStats(tagId: string): Promise<{
    totalTransactions: number;
    totalAmount: number;
    averageTransaction: number;
    lastUsed?: string;
    topMerchants: Array<{ name: string; count: number; amount: number }>;
  }> {
    const response = await this.client.get<{
      totalTransactions: number;
      totalAmount: number;
      averageTransaction: number;
      lastUsed?: string;
      topMerchants: Array<{ name: string; count: number; amount: number }>;
    }>(`/nfc/${tagId}/stats`);
    return response.data;
  }

  /**
   * Verify NFC tap for authentication
   * @param tagId - The hardware NFC tag identifier
   * @returns Verification result
   */
  async verifyTap(tagId: string): Promise<{
    verified: boolean;
    userId?: string;
    linkedResource?: {
      type: 'card' | 'wallet';
      id: string;
    };
  }> {
    const response = await this.client.post<{
      verified: boolean;
      userId?: string;
      linkedResource?: {
        type: 'card' | 'wallet';
        id: string;
      };
    }>('/nfc/verify-tap', { tagId });
    return response.data;
  }
}
