import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardService, CreateCardRequest, UpdateCardLimitsRequest } from '@/services/card.service';

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: cardService.getCards,
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
