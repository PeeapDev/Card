/**
 * Transfers Resource
 * Handle internal transfers between wallets
 */

import { HttpClient } from '../client';
import {
  TransferParams,
  TransferResult,
  Transfer,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class TransfersResource {
  constructor(private client: HttpClient) {}

  /**
   * Send a transfer to another user
   * @param params - Transfer parameters including recipient and amount
   * @returns Transfer result
   */
  async send(params: TransferParams): Promise<TransferResult> {
    const response = await this.client.post<TransferResult>('/transfers', params);
    return response.data;
  }

  /**
   * Get transfer by ID
   * @param transferId - The transfer ID
   * @returns Transfer details
   */
  async get(transferId: string): Promise<Transfer> {
    const response = await this.client.get<Transfer>(`/transfers/${transferId}`);
    return response.data;
  }

  /**
   * Get transfer by reference
   * @param reference - The transfer reference
   * @returns Transfer details
   */
  async getByReference(reference: string): Promise<Transfer> {
    const response = await this.client.get<Transfer>('/transfers/reference', { reference });
    return response.data;
  }

  /**
   * List all transfers
   * @param params - Pagination and filter parameters
   * @returns Paginated list of transfers
   */
  async list(params?: PaginationParams & {
    direction?: 'sent' | 'received' | 'all';
    status?: 'pending' | 'completed' | 'failed';
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Transfer>> {
    const response = await this.client.get<PaginatedResponse<Transfer>>('/transfers', params);
    return response.data;
  }

  /**
   * Validate recipient before sending transfer
   * @param params - Recipient identifier (email, phone, or wallet ID)
   * @returns Recipient validation result
   */
  async validateRecipient(params: {
    email?: string;
    phone?: string;
    walletId?: string;
  }): Promise<{
    valid: boolean;
    recipientName?: string;
    recipientId?: string;
  }> {
    const response = await this.client.post<{
      valid: boolean;
      recipientName?: string;
      recipientId?: string;
    }>('/transfers/validate-recipient', params);
    return response.data;
  }

  /**
   * Request a transfer from another user
   * @param params - Transfer request parameters
   * @returns Transfer request result
   */
  async request(params: {
    amount: number;
    fromEmail?: string;
    fromPhone?: string;
    fromWalletId?: string;
    narration?: string;
    expiresIn?: number;
  }): Promise<{
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    amount: number;
    expiresAt: string;
  }> {
    const response = await this.client.post<{
      id: string;
      status: 'pending' | 'approved' | 'rejected' | 'expired';
      amount: number;
      expiresAt: string;
    }>('/transfers/request', params);
    return response.data;
  }

  /**
   * Approve a transfer request
   * @param requestId - The transfer request ID
   * @returns Transfer result
   */
  async approveRequest(requestId: string): Promise<TransferResult> {
    const response = await this.client.post<TransferResult>(`/transfers/request/${requestId}/approve`);
    return response.data;
  }

  /**
   * Reject a transfer request
   * @param requestId - The transfer request ID
   * @param reason - Rejection reason
   * @returns Result
   */
  async rejectRequest(requestId: string, reason?: string): Promise<{ success: boolean }> {
    const response = await this.client.post<{ success: boolean }>(`/transfers/request/${requestId}/reject`, { reason });
    return response.data;
  }

  /**
   * Get pending transfer requests
   * @param direction - Filter by incoming or outgoing requests
   * @returns List of pending requests
   */
  async getPendingRequests(direction: 'incoming' | 'outgoing' = 'incoming'): Promise<Array<{
    id: string;
    amount: number;
    fromUser?: string;
    toUser?: string;
    narration?: string;
    status: string;
    expiresAt: string;
    createdAt: string;
  }>> {
    const response = await this.client.get<Array<{
      id: string;
      amount: number;
      fromUser?: string;
      toUser?: string;
      narration?: string;
      status: string;
      expiresAt: string;
      createdAt: string;
    }>>('/transfers/requests', { direction, status: 'pending' });
    return response.data;
  }

  /**
   * Get transfer fee estimate
   * @param amount - Transfer amount
   * @returns Fee estimate
   */
  async getFeeEstimate(amount: number): Promise<{
    amount: number;
    fee: number;
    total: number;
  }> {
    const response = await this.client.get<{
      amount: number;
      fee: number;
      total: number;
    }>('/transfers/fee-estimate', { amount });
    return response.data;
  }
}
