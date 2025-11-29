/**
 * Payments Resource
 * Process payments, refunds, and payment inquiries
 */

import { HttpClient } from '../client';
import {
  ChargeParams,
  ChargeResult,
  RefundParams,
  RefundResult,
  Payment,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class PaymentsResource {
  constructor(private client: HttpClient) {}

  /**
   * Create a payment charge
   * @param params - Charge parameters including amount and customer details
   * @returns Charge result with payment URL if applicable
   */
  async charge(params: ChargeParams): Promise<ChargeResult> {
    const response = await this.client.post<ChargeResult>('/payments/charge', params);
    return response.data;
  }

  /**
   * Get payment by ID
   * @param paymentId - The payment ID
   * @returns Payment details
   */
  async get(paymentId: string): Promise<Payment> {
    const response = await this.client.get<Payment>(`/payments/${paymentId}`);
    return response.data;
  }

  /**
   * Get payment by reference
   * @param reference - The payment reference
   * @returns Payment details
   */
  async getByReference(reference: string): Promise<Payment> {
    const response = await this.client.get<Payment>('/payments/reference', { reference });
    return response.data;
  }

  /**
   * List all payments
   * @param params - Pagination and filter parameters
   * @returns Paginated list of payments
   */
  async list(params?: PaginationParams & {
    status?: 'pending' | 'completed' | 'failed' | 'refunded';
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Payment>> {
    const response = await this.client.get<PaginatedResponse<Payment>>('/payments', params);
    return response.data;
  }

  /**
   * Refund a payment
   * @param params - Refund parameters
   * @returns Refund result
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    const response = await this.client.post<RefundResult>('/payments/refund', params);
    return response.data;
  }

  /**
   * Get refund by ID
   * @param refundId - The refund ID
   * @returns Refund details
   */
  async getRefund(refundId: string): Promise<RefundResult> {
    const response = await this.client.get<RefundResult>(`/payments/refunds/${refundId}`);
    return response.data;
  }

  /**
   * List refunds for a payment
   * @param paymentId - The payment ID
   * @returns List of refunds
   */
  async listRefunds(paymentId: string): Promise<RefundResult[]> {
    const response = await this.client.get<RefundResult[]>(`/payments/${paymentId}/refunds`);
    return response.data;
  }

  /**
   * Verify payment status
   * @param paymentId - The payment ID to verify
   * @returns Payment verification result
   */
  async verify(paymentId: string): Promise<{
    verified: boolean;
    status: string;
    amount: number;
    reference: string;
  }> {
    const response = await this.client.get<{
      verified: boolean;
      status: string;
      amount: number;
      reference: string;
    }>(`/payments/${paymentId}/verify`);
    return response.data;
  }

  /**
   * Cancel a pending payment
   * @param paymentId - The payment ID to cancel
   * @returns Cancellation result
   */
  async cancel(paymentId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>(`/payments/${paymentId}/cancel`);
    return response.data;
  }

  /**
   * Create a payment link
   * @param params - Payment link parameters
   * @returns Payment link details
   */
  async createPaymentLink(params: {
    amount: number;
    description?: string;
    expiresIn?: number;
    reference?: string;
    redirectUrl?: string;
  }): Promise<{
    id: string;
    url: string;
    amount: number;
    expiresAt: string;
  }> {
    const response = await this.client.post<{
      id: string;
      url: string;
      amount: number;
      expiresAt: string;
    }>('/payments/link', params);
    return response.data;
  }

  /**
   * Get payment statistics
   * @param period - Time period for stats
   * @returns Payment statistics
   */
  async getStats(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalAmount: number;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    successRate: number;
    averageAmount: number;
  }> {
    const response = await this.client.get<{
      totalAmount: number;
      totalCount: number;
      successfulCount: number;
      failedCount: number;
      successRate: number;
      averageAmount: number;
    }>('/payments/stats', { period });
    return response.data;
  }
}
