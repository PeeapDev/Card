/**
 * Settlement Resource
 * Manage merchant settlements and payouts
 */

import { HttpClient } from '../client';
import {
  Settlement,
  SettlementSummary,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class SettlementResource {
  constructor(private client: HttpClient) {}

  /**
   * Get settlement summary
   * @returns Settlement summary including pending amounts and next payout date
   */
  async getSummary(): Promise<SettlementSummary> {
    const response = await this.client.get<SettlementSummary>('/settlements/summary');
    return response.data;
  }

  /**
   * List all settlements
   * @param params - Pagination and filter parameters
   * @returns Paginated list of settlements
   */
  async list(params?: PaginationParams & {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Settlement>> {
    const response = await this.client.get<PaginatedResponse<Settlement>>('/settlements', params);
    return response.data;
  }

  /**
   * Get settlement by ID
   * @param settlementId - The settlement ID
   * @returns Settlement details
   */
  async get(settlementId: string): Promise<Settlement> {
    const response = await this.client.get<Settlement>(`/settlements/${settlementId}`);
    return response.data;
  }

  /**
   * Get transactions included in a settlement
   * @param settlementId - The settlement ID
   * @param params - Pagination parameters
   * @returns Paginated list of transactions
   */
  async getTransactions(settlementId: string, params?: PaginationParams): Promise<PaginatedResponse<{
    id: string;
    amount: number;
    fee: number;
    netAmount: number;
    reference: string;
    createdAt: string;
  }>> {
    const response = await this.client.get<PaginatedResponse<{
      id: string;
      amount: number;
      fee: number;
      netAmount: number;
      reference: string;
      createdAt: string;
    }>>(`/settlements/${settlementId}/transactions`, params);
    return response.data;
  }

  /**
   * Request an instant settlement (if eligible)
   * @param amount - Amount to settle (optional, defaults to full pending amount)
   * @returns Settlement result
   */
  async requestInstant(amount?: number): Promise<Settlement> {
    const response = await this.client.post<Settlement>('/settlements/instant', { amount });
    return response.data;
  }

  /**
   * Get settlement schedule
   * @returns Settlement schedule configuration
   */
  async getSchedule(): Promise<{
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    minimumAmount: number;
    nextSettlementDate: string;
  }> {
    const response = await this.client.get<{
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      minimumAmount: number;
      nextSettlementDate: string;
    }>('/settlements/schedule');
    return response.data;
  }

  /**
   * Update settlement schedule
   * @param params - Schedule configuration
   * @returns Updated schedule
   */
  async updateSchedule(params: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    minimumAmount?: number;
  }): Promise<{
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    minimumAmount: number;
    nextSettlementDate: string;
  }> {
    const response = await this.client.put<{
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      minimumAmount: number;
      nextSettlementDate: string;
    }>('/settlements/schedule', params);
    return response.data;
  }

  /**
   * Get fee breakdown for settlements
   * @returns Fee structure
   */
  async getFees(): Promise<{
    transactionFeePercent: number;
    transactionFeeFixed: number;
    settlementFeePercent: number;
    settlementFeeFixed: number;
    instantSettlementFeePercent: number;
  }> {
    const response = await this.client.get<{
      transactionFeePercent: number;
      transactionFeeFixed: number;
      settlementFeePercent: number;
      settlementFeeFixed: number;
      instantSettlementFeePercent: number;
    }>('/settlements/fees');
    return response.data;
  }

  /**
   * Generate settlement report
   * @param params - Report parameters
   * @returns Report download URL
   */
  async generateReport(params: {
    startDate: string;
    endDate: string;
    format?: 'csv' | 'pdf' | 'xlsx';
  }): Promise<{
    reportId: string;
    downloadUrl: string;
    expiresAt: string;
  }> {
    const response = await this.client.post<{
      reportId: string;
      downloadUrl: string;
      expiresAt: string;
    }>('/settlements/report', params);
    return response.data;
  }

  /**
   * Get settlement analytics
   * @param params - Date range parameters
   * @returns Settlement analytics
   */
  async getAnalytics(params: {
    startDate: string;
    endDate: string;
  }): Promise<{
    totalSettled: number;
    totalFees: number;
    settlementCount: number;
    averageSettlementTime: number;
    byPeriod: Array<{
      period: string;
      amount: number;
      count: number;
    }>;
  }> {
    const response = await this.client.get<{
      totalSettled: number;
      totalFees: number;
      settlementCount: number;
      averageSettlementTime: number;
      byPeriod: Array<{
        period: string;
        amount: number;
        count: number;
      }>;
    }>('/settlements/analytics', params);
    return response.data;
  }
}
