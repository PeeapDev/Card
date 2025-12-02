/**
 * Card Hooks - Production Grade
 *
 * React Query hooks for card operations with Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cardService,
  CreateCardRequest,
  UpdateCardLimitsRequest,
  CreateCardTypeRequest,
  CreateCardOrderRequest,
  CardType,
  CardOrder,
} from '@/services/card.service';
import { useAuth } from '@/context/AuthContext';
import type { Card } from '@/types';

export function useCards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cards', user?.id],
    queryFn: async (): Promise<Card[]> => {
      if (!user?.id) return [];
      return cardService.getCards(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000,
    retry: 2,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: ['cards', id],
    queryFn: () => cardService.getCard(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateCardRequest) => {
      if (!user?.id) throw new Error('User not authenticated');
      return cardService.createCard(user.id, data);
    },
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

// ==========================================
// Card Types Hooks
// ==========================================

export function useCardTypes(includeInactive = false) {
  return useQuery({
    queryKey: ['cardTypes', { includeInactive }],
    queryFn: () => cardService.getCardTypes(includeInactive),
    staleTime: 60000, // 1 minute
  });
}

export function useCardType(id: string) {
  return useQuery({
    queryKey: ['cardTypes', id],
    queryFn: () => cardService.getCardType(id),
    enabled: !!id,
    staleTime: 60000,
  });
}

export function useCreateCardType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCardTypeRequest) => cardService.createCardType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardTypes'] });
    },
  });
}

export function useUpdateCardType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCardTypeRequest> }) =>
      cardService.updateCardType(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cardTypes'] });
      queryClient.invalidateQueries({ queryKey: ['cardTypes', id] });
    },
  });
}

export function useDeleteCardType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cardService.deleteCardType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardTypes'] });
    },
  });
}

// ==========================================
// Card Orders Hooks
// ==========================================

export function useCardOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cardOrders', user?.id],
    queryFn: async (): Promise<CardOrder[]> => {
      if (!user?.id) return [];
      return cardService.getCardOrders(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

export function useAllCardOrders(status?: string) {
  return useQuery({
    queryKey: ['cardOrders', 'all', status],
    queryFn: () => cardService.getAllCardOrders(status),
    staleTime: 30000,
  });
}

export function useCardOrder(id: string) {
  return useQuery({
    queryKey: ['cardOrders', id],
    queryFn: () => cardService.getCardOrder(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCreateCardOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateCardOrderRequest) => {
      if (!user?.id) throw new Error('User not authenticated');
      return cardService.createCardOrder(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardOrders'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

export function useGenerateCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return cardService.generateCard(orderId, user.id, notes);
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['cardOrders'] });
      queryClient.invalidateQueries({ queryKey: ['cardOrders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function useRejectCardOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return cardService.rejectCardOrder(orderId, user.id, notes);
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['cardOrders'] });
      queryClient.invalidateQueries({ queryKey: ['cardOrders', orderId] });
    },
  });
}

export function useUpdateShipping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, trackingNumber }: { orderId: string; trackingNumber: string }) =>
      cardService.updateShipping(orderId, trackingNumber),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['cardOrders'] });
      queryClient.invalidateQueries({ queryKey: ['cardOrders', orderId] });
    },
  });
}

export function useActivateCardByQR() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (qrCode: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return cardService.activateCardByQR(qrCode, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['cardOrders'] });
    },
  });
}

export function useCardByQR(qrCode: string) {
  return useQuery({
    queryKey: ['cards', 'qr', qrCode],
    queryFn: () => cardService.getCardByQR(qrCode),
    enabled: !!qrCode,
  });
}

export function useCardWithType(id: string) {
  return useQuery({
    queryKey: ['cards', id, 'withType'],
    queryFn: () => cardService.getCardWithType(id),
    enabled: !!id,
    staleTime: 30000,
  });
}
