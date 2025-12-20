/**
 * Exchange Service - Frontend Integration
 *
 * Handles currency exchange between user wallets (USD <-> SLE)
 * Admin functions for managing exchange rates and permissions
 */

import { api } from '@/lib/api';

// =====================================================
// TYPES
// =====================================================

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  marginPercentage: number;
  effectiveRate: number;
  isActive: boolean;
  updatedAt: string;
}

export interface ExchangeCalculation {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  feeAmount: number;
  feePercentage: number;
  netAmount: number;
}

export interface CanExchangeResult {
  allowed: boolean;
  reason?: string;
  dailyRemaining?: number;
  monthlyRemaining?: number;
  feePercentage?: number;
}

export interface ExchangeTransaction {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  feeAmount: number;
  status: string;
  reference: string;
  createdAt: string;
}

export interface ExecuteExchangeResult {
  success: boolean;
  transaction?: ExchangeTransaction;
  error?: string;
  fromWalletNewBalance?: number;
  toWalletNewBalance?: number;
}

export interface ExchangePermission {
  id: string;
  userType: string;
  canExchange: boolean;
  dailyLimit?: number;
  monthlyLimit?: number;
  minAmount?: number;
  maxAmount?: number;
  feePercentage: number;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SetExchangeRateRequest {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  marginPercentage?: number;
}

export interface SetExchangePermissionRequest {
  userType: string;
  canExchange: boolean;
  dailyLimit?: number;
  monthlyLimit?: number;
  minAmount?: number;
  maxAmount?: number;
  feePercentage?: number;
}

export interface ExecuteExchangeRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
}

// =====================================================
// SERVICE
// =====================================================

export const exchangeService = {
  /**
   * Get current exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    return api.get<ExchangeRate>('/exchange/rate', {
      params: { fromCurrency, toCurrency },
    });
  },

  /**
   * Calculate exchange preview with fees
   */
  async calculateExchange(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeCalculation> {
    return api.post<ExchangeCalculation>('/exchange/calculate', {
      amount,
      fromCurrency,
      toCurrency,
    });
  },

  /**
   * Check if current user can exchange and get their limits
   */
  async canExchange(amount?: number): Promise<CanExchangeResult> {
    const params: Record<string, string> = {};
    if (amount !== undefined) {
      params.amount = amount.toString();
    }
    return api.get<CanExchangeResult>('/exchange/can-exchange', { params });
  },

  /**
   * Execute currency exchange between user's wallets
   */
  async executeExchange(request: ExecuteExchangeRequest): Promise<ExecuteExchangeResult> {
    return api.post<ExecuteExchangeResult>('/exchange/execute', request);
  },

  /**
   * Get user's exchange history
   */
  async getExchangeHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ExchangeTransaction>> {
    return api.get<PaginatedResponse<ExchangeTransaction>>('/exchange/history', {
      params: { page: page.toString(), limit: limit.toString() },
    });
  },

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  /**
   * Get all exchange rates (admin)
   */
  async getAllExchangeRates(): Promise<ExchangeRate[]> {
    return api.get<ExchangeRate[]>('/exchange/admin/rates');
  },

  /**
   * Set exchange rate (admin)
   */
  async setExchangeRate(request: SetExchangeRateRequest): Promise<ExchangeRate> {
    return api.post<ExchangeRate>('/exchange/admin/rate', request);
  },

  /**
   * Get all exchange permissions (admin)
   */
  async getAllPermissions(): Promise<ExchangePermission[]> {
    return api.get<ExchangePermission[]>('/exchange/admin/permissions');
  },

  /**
   * Set exchange permission for user type (superadmin)
   */
  async setExchangePermission(request: SetExchangePermissionRequest): Promise<ExchangePermission> {
    return api.post<ExchangePermission>('/exchange/admin/permission', request);
  },

  /**
   * Get all exchange transactions (admin)
   */
  async getAllExchangeTransactions(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<ExchangeTransaction>> {
    return api.get<PaginatedResponse<ExchangeTransaction>>('/exchange/admin/transactions', {
      params: { page: page.toString(), limit: limit.toString() },
    });
  },

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Format currency amount for display
   */
  formatAmount(amount: number, currency: string): string {
    const symbol = currency === 'USD' ? '$' : 'NLe';
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    });
    return `${symbol}${formatted}`;
  },

  /**
   * Get exchange rate display string
   */
  formatExchangeRate(rate: ExchangeRate): string {
    return `1 ${rate.fromCurrency} = ${rate.effectiveRate.toFixed(4)} ${rate.toCurrency}`;
  },
};
