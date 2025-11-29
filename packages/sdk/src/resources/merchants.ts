/**
 * Merchants Resource
 * Manage merchant accounts and settings
 */

import { HttpClient } from '../client';
import {
  Merchant,
  CreateMerchantParams,
  MerchantStats,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class MerchantsResource {
  constructor(private client: HttpClient) {}

  /**
   * Get current merchant profile
   * @returns Merchant details
   */
  async getProfile(): Promise<Merchant> {
    const response = await this.client.get<Merchant>('/merchants/me');
    return response.data;
  }

  /**
   * Update merchant profile
   * @param params - Update parameters
   * @returns Updated merchant details
   */
  async updateProfile(params: Partial<CreateMerchantParams>): Promise<Merchant> {
    const response = await this.client.patch<Merchant>('/merchants/me', params);
    return response.data;
  }

  /**
   * Get merchant statistics
   * @param period - Time period for stats
   * @returns Merchant statistics
   */
  async getStats(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<MerchantStats> {
    const response = await this.client.get<MerchantStats>('/merchants/me/stats', { period });
    return response.data;
  }

  /**
   * Get merchant transactions
   * @param params - Pagination parameters
   * @returns Paginated list of transactions
   */
  async getTransactions(params?: PaginationParams & {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<{
    id: string;
    amount: number;
    status: string;
    customerEmail?: string;
    reference: string;
    createdAt: string;
  }>> {
    const response = await this.client.get<PaginatedResponse<{
      id: string;
      amount: number;
      status: string;
      customerEmail?: string;
      reference: string;
      createdAt: string;
    }>>('/merchants/me/transactions', params);
    return response.data;
  }

  /**
   * Update settlement account
   * @param params - Bank account details
   * @returns Updated merchant details
   */
  async updateSettlementAccount(params: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  }): Promise<Merchant> {
    const response = await this.client.put<Merchant>('/merchants/me/settlement-account', params);
    return response.data;
  }

  /**
   * Get settlement account details
   * @returns Settlement account information
   */
  async getSettlementAccount(): Promise<{
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    verified: boolean;
  }> {
    const response = await this.client.get<{
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
      verified: boolean;
    }>('/merchants/me/settlement-account');
    return response.data;
  }

  /**
   * Get merchant revenue analytics
   * @param params - Date range parameters
   * @returns Revenue analytics data
   */
  async getRevenueAnalytics(params: {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<Array<{
    date: string;
    revenue: number;
    transactionCount: number;
    averageTicket: number;
  }>> {
    const response = await this.client.get<Array<{
      date: string;
      revenue: number;
      transactionCount: number;
      averageTicket: number;
    }>>('/merchants/me/analytics/revenue', params);
    return response.data;
  }

  /**
   * Get customer analytics
   * @param params - Date range parameters
   * @returns Customer analytics data
   */
  async getCustomerAnalytics(params: {
    startDate: string;
    endDate: string;
  }): Promise<{
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageTransactionsPerCustomer: number;
  }> {
    const response = await this.client.get<{
      totalCustomers: number;
      newCustomers: number;
      returningCustomers: number;
      averageTransactionsPerCustomer: number;
    }>('/merchants/me/analytics/customers', params);
    return response.data;
  }

  /**
   * Generate merchant report
   * @param params - Report parameters
   * @returns Report download URL
   */
  async generateReport(params: {
    type: 'transactions' | 'settlements' | 'summary';
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
    }>('/merchants/me/reports', params);
    return response.data;
  }
}
