import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardService, CreateCardRequest, UpdateCardLimitsRequest } from '@/services/card.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Card } from '@/types';

// Check if we're in demo mode
const isDemoMode = () => {
  return localStorage.getItem('demoUser') !== null;
};

export function useCards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cards', user?.id],
    queryFn: async (): Promise<Card[]> => {
      // If demo mode, fetch from Supabase or return empty array
      if (isDemoMode()) {
        if (!user?.id) return [];

        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching cards:', error);
          return [];
        }

        return (data || []).map(c => ({
          id: c.id,
          walletId: c.wallet_id,
          cardNumber: c.card_number || '',
          maskedNumber: c.masked_number || '****',
          expiryMonth: c.expiry_month || 12,
          expiryYear: c.expiry_year || 2025,
          cardholderName: c.cardholder_name || '',
          status: c.status || 'ACTIVE',
          type: c.type || 'VIRTUAL',
          dailyLimit: c.daily_limit || 1000,
          monthlyLimit: c.monthly_limit || 10000,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }));
      }

      // Normal API mode
      return cardService.getCards();
    },
    enabled: !!user?.id,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: ['cards', id],
    queryFn: () => cardService.getCard(id),
    enabled: !!id,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCardRequest) => cardService.createCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function useActivateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cardService.activateCard(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
    },
  });
}

export function useBlockCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cardService.blockCard(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
    },
  });
}

export function useUnblockCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cardService.unblockCard(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
    },
  });
}

export function useUpdateCardLimits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCardLimitsRequest }) =>
      cardService.updateLimits(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
    },
  });
}

export function useCardDetails(id: string) {
  return useQuery({
    queryKey: ['cards', id, 'details'],
    queryFn: () => cardService.getCardDetails(id),
    enabled: false, // Only fetch on demand
  });
}
