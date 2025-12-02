/**
 * Monime Payment Service - Frontend Integration
 *
 * Handles deposits and withdrawals via Monime payment gateway
 */

import { api } from '@/lib/api';

// Types
export type DepositMethod = 'CHECKOUT_SESSION' | 'PAYMENT_CODE' | 'MOBILE_MONEY';
export type WithdrawMethod = 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type MonimeTransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'delayed' | 'cancelled';

export interface MonimeDepositRequest {
  walletId: string;
  amount: number; // In minor units (cents)
  currency?: string;
  method?: DepositMethod;
  successUrl?: string;
  cancelUrl?: string;
  phoneNumber?: string;
  description?: string;
}

export interface MonimeDepositResponse {
  id: string;
  monimeReference: string;
  status: MonimeTransactionStatus;
  paymentUrl?: string;
  ussdCode?: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

export interface MobileMoneyDestination {
  phoneNumber: string;
  provider?: string;
  accountName?: string;
}

export interface BankDestination {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface MonimeWithdrawRequest {
  walletId: string;
  amount: number;
  currency?: string;
  method: WithdrawMethod;
  mobileMoneyDestination?: MobileMoneyDestination;
  bankDestination?: BankDestination;
  description?: string;
  pin?: string;
}

export interface MonimeWithdrawResponse {
  id: string;
  monimeReference: string;
  status: MonimeTransactionStatus;
  amount: number;
  currency: string;
  fee?: number;
  netAmount?: number;
  destinationType: WithdrawMethod;
  maskedDestination?: string;
  estimatedCompletionTime?: string;
}

export interface MonimeTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  status: MonimeTransactionStatus;
  monimeReference: string;
  walletId: string;
  amount: number;
  currency: string;
  fee?: number;
  netAmount?: number;
  depositMethod?: DepositMethod;
  withdrawMethod?: WithdrawMethod;
  paymentUrl?: string;
  ussdCode?: string;
  maskedDestination?: string;
  description?: string;
  failureReason?: string;
  delayReason?: string;
  expiresAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Bank {
  providerId: string;
  name: string;
  country: string;
  payoutSupported: boolean;
}

// Helper to convert amount to minor units
export const toMinorUnits = (amount: number): number => Math.round(amount * 100);

// Helper to convert from minor units to display amount
export const fromMinorUnits = (amount: number): number => amount / 100;

export const monimeService = {
  /**
   * Initiate a deposit via Monime
   */
  async initiateDeposit(request: MonimeDepositRequest): Promise<MonimeDepositResponse> {
    const response = await api.post<MonimeDepositResponse>('/monime/deposit', {
      ...request,
      amount: request.amount, // Already in minor units
      currency: request.currency || 'SLE',
      method: request.method || 'CHECKOUT_SESSION',
    });
    return response;
  },

  /**
   * Initiate a withdrawal/cashout via Monime
   */
  async initiateWithdraw(request: MonimeWithdrawRequest): Promise<MonimeWithdrawResponse> {
    const response = await api.post<MonimeWithdrawResponse>('/monime/withdraw', {
      ...request,
      amount: request.amount,
      currency: request.currency || 'SLE',
    });
    return response;
  },

  /**
   * Get a specific transaction by ID
   */
  async getTransaction(transactionId: string): Promise<MonimeTransaction> {
    const response = await api.get<MonimeTransaction>(`/monime/transactions/${transactionId}`);
    return response;
  },

  /**
   * Get user's Monime transactions
   */
  async getTransactions(type?: 'DEPOSIT' | 'WITHDRAWAL'): Promise<MonimeTransaction[]> {
    const params = type ? `?type=${type}` : '';
    const response = await api.get<MonimeTransaction[]>(`/monime/transactions${params}`);
    return response;
  },

  /**
   * Get available banks for withdrawal
   */
  async getBanks(): Promise<Bank[]> {
    const response = await api.get<{ result: Bank[] }>('/monime/banks');
    return response.result || [];
  },

  /**
   * Poll for transaction status updates
   */
  async pollTransactionStatus(
    transactionId: string,
    onUpdate: (tx: MonimeTransaction) => void,
    options?: {
      interval?: number;
      maxAttempts?: number;
      stopStatuses?: MonimeTransactionStatus[];
    }
  ): Promise<MonimeTransaction> {
    const {
      interval = 3000,
      maxAttempts = 60, // 3 minutes with 3s interval
      stopStatuses = ['completed', 'failed', 'expired', 'cancelled'],
    } = options || {};

    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const tx = await this.getTransaction(transactionId);
          onUpdate(tx);

          if (stopStatuses.includes(tx.status)) {
            resolve(tx);
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout - transaction still pending'));
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  },

  /**
   * Open Monime checkout in new window/tab
   */
  openCheckout(paymentUrl: string, options?: { target?: '_blank' | '_self' }): void {
    const target = options?.target || '_blank';
    window.open(paymentUrl, target);
  },

  /**
   * Format USSD code for display
   */
  formatUssdCode(ussdCode: string): string {
    // Format: *123*456# -> *123*456#
    return ussdCode.startsWith('*') ? ussdCode : `*${ussdCode}`;
  },

  /**
   * Dial USSD code (mobile only)
   */
  dialUssd(ussdCode: string): void {
    const formatted = ussdCode.replace('#', '%23'); // URL encode hash
    window.location.href = `tel:${formatted}`;
  },
};
