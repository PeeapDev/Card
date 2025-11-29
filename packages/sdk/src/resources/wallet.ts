/**
 * Wallet Resource
 * Manage wallet operations including balance, top-ups, withdrawals, and transactions
 */

import { HttpClient } from '../client';
import {
  WalletBalance,
  TopUpParams,
  TopUpResult,
  WithdrawParams,
  WithdrawResult,
  WalletTransaction,
  PaginationParams,
  PaginatedResponse,
} from '../types';

export class WalletResource {
  constructor(private client: HttpClient) {}

  /**
   * Get current wallet balance
   * @returns Wallet balance details including available and pending amounts
   */
  async getBalance(): Promise<WalletBalance> {
    const response = await this.client.get<WalletBalance>('/wallet/balance');
    return response.data;
  }

  /**
   * Top up wallet balance
   * @param params - Top up parameters including amount and payment method
   * @returns Top up transaction details
   */
  async topUp(params: TopUpParams): Promise<TopUpResult> {
    const response = await this.client.post<TopUpResult>('/wallet/topup', params);
    return response.data;
  }

  /**
   * Withdraw funds from wallet to bank account
   * @param params - Withdrawal parameters including amount and bank details
   * @returns Withdrawal transaction details
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    const response = await this.client.post<WithdrawResult>('/wallet/withdraw', params);
    return response.data;
  }

  /**
   * Get wallet transaction history
   * @param params - Pagination parameters
   * @returns Paginated list of wallet transactions
   */
  async getTransactions(params?: PaginationParams): Promise<PaginatedResponse<WalletTransaction>> {
    const response = await this.client.get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', params);
    return response.data;
  }

  /**
   * Get a specific transaction by ID
   * @param transactionId - The transaction ID
   * @returns Transaction details
   */
  async getTransaction(transactionId: string): Promise<WalletTransaction> {
    const response = await this.client.get<WalletTransaction>(`/wallet/transactions/${transactionId}`);
    return response.data;
  }

  /**
   * Get supported banks for withdrawal
   * @returns List of supported banks
   */
  async getSupportedBanks(): Promise<Array<{ code: string; name: string }>> {
    const response = await this.client.get<Array<{ code: string; name: string }>>('/wallet/banks');
    return response.data;
  }

  /**
   * Verify bank account details before withdrawal
   * @param bankCode - Bank code
   * @param accountNumber - Account number to verify
   * @returns Account verification result
   */
  async verifyBankAccount(bankCode: string, accountNumber: string): Promise<{ accountName: string; valid: boolean }> {
    const response = await this.client.post<{ accountName: string; valid: boolean }>('/wallet/verify-account', {
      bankCode,
      accountNumber,
    });
    return response.data;
  }
}
