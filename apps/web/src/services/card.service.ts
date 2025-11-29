import { api } from './api';
import type { Card } from '@/types';

export interface CreateCardRequest {
  walletId: string;
  type: 'VIRTUAL' | 'PHYSICAL';
  cardholderName: string;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface UpdateCardLimitsRequest {
  dailyLimit?: number;
  monthlyLimit?: number;
}

export const cardService = {
  async getCards(): Promise<Card[]> {
    const response = await api.get<Card[]>('/cards');
    return response.data;
  },

  async getCard(id: string): Promise<Card> {
    const response = await api.get<Card>(`/cards/${id}`);
    return response.data;
  },

  async createCard(data: CreateCardRequest): Promise<Card> {
    const response = await api.post<Card>('/cards', data);
    return response.data;
  },

  async activateCard(id: string): Promise<Card> {
    const response = await api.post<Card>(`/cards/${id}/activate`);
    return response.data;
  },

  async blockCard(id: string): Promise<Card> {
    const response = await api.post<Card>(`/cards/${id}/block`);
    return response.data;
  },

  async unblockCard(id: string): Promise<Card> {
    const response = await api.post<Card>(`/cards/${id}/unblock`);
    return response.data;
  },

  async updateLimits(id: string, data: UpdateCardLimitsRequest): Promise<Card> {
    const response = await api.patch<Card>(`/cards/${id}/limits`, data);
    return response.data;
  },

  async getCardDetails(id: string): Promise<{
    cardNumber: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
  }> {
    const response = await api.get(`/cards/${id}/details`);
    return response.data;
  },
};
