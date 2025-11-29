import { api } from './api';
import type { Wallet, Transaction, PaginatedResponse } from '@/types';

export interface CreateWalletRequest {
  currency?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface DepositRequest {
  walletId: string;
  amount: number;
  reference?: string;
}

export interface TransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description?: string;
}

export const walletService = {
  async getWallets(): Promise<Wallet[]> {
    const response = await api.get<Wallet[]>('/wallets');
    return response.data;
  },

  async getWallet(id: string): Promise<Wallet> {
    const response = await api.get<Wallet>(`/wallets/${id}`);
    return response.data;
  },

  async createWallet(data: CreateWalletRequest): Promise<Wallet> {
    const response = await api.post<Wallet>('/wallets', data);
    return response.data;
  },

  async deposit(data: DepositRequest): Promise<Transaction> {
    const response = await api.post<Transaction>(`/wallets/${data.walletId}/deposit`, {
      amount: data.amount,
      reference: data.reference,
    });
    return response.data;
  },

  async transfer(data: TransferRequest): Promise<Transaction> {
    const response = await api.post<Transaction>('/wallets/transfer', data);
    return response.data;
  },

  async getTransactions(
    walletId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Transaction>> {
    const response = await api.get<PaginatedResponse<Transaction>>(
      `/wallets/${walletId}/transactions`,
      { params }
    );
    return response.data;
  },

  async freezeWallet(id: string): Promise<Wallet> {
    const response = await api.post<Wallet>(`/wallets/${id}/freeze`);
    return response.data;
  },

  async unfreezeWallet(id: string): Promise<Wallet> {
    const response = await api.post<Wallet>(`/wallets/${id}/unfreeze`);
    return response.data;
  },
};
