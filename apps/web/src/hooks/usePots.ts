/**
 * Pot Hooks - Production Grade
 *
 * React Query hooks for pot (locked wallet) operations with Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { potService } from '@/services/pot.service';
import { useAuth } from '@/context/AuthContext';
import type {
  Pot,
  PotSummary,
  PotTransaction,
  PotNotification,
  PotSettings,
  WithdrawalEligibility,
  CreatePotRequest,
  ContributePotRequest,
  WithdrawPotRequest,
  UpdatePotRequest,
  PotStatus,
  PotTransactionType,
} from '@/types';

// ==========================================
// User Pot Hooks
// ==========================================

/**
 * Get all pots for the current user
 */
export function usePots() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pots', user?.id],
    queryFn: async (): Promise<Pot[]> => {
      if (!user?.id) return [];
      return potService.getPots(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

/**
 * Get a single pot by ID
 */
export function usePot(potId: string) {
  return useQuery({
    queryKey: ['pots', 'detail', potId],
    queryFn: () => potService.getPot(potId),
    enabled: !!potId,
    staleTime: 30000,
  });
}

/**
 * Get pot summary with statistics
 */
export function usePotSummary(potId: string) {
  return useQuery({
    queryKey: ['pots', 'summary', potId],
    queryFn: () => potService.getPotSummary(potId),
    enabled: !!potId,
    staleTime: 30000,
  });
}

/**
 * Get pot transactions
 */
export function usePotTransactions(
  potId: string,
  page = 1,
  limit = 10,
  type?: PotTransactionType
) {
  return useQuery({
    queryKey: ['pots', 'transactions', potId, page, limit, type],
    queryFn: () => potService.getPotTransactions(potId, { page, limit, type }),
    enabled: !!potId,
    staleTime: 10000,
  });
}

/**
 * Check withdrawal eligibility for a pot
 */
export function useWithdrawalEligibility(potId: string) {
  return useQuery({
    queryKey: ['pots', 'eligibility', potId],
    queryFn: () => potService.checkWithdrawalEligibility(potId),
    enabled: !!potId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get pot notifications for the current user
 */
export function usePotNotifications(options?: {
  unreadOnly?: boolean;
  potId?: string;
  limit?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pots', 'notifications', user?.id, options],
    queryFn: async (): Promise<PotNotification[]> => {
      if (!user?.id) return [];
      return potService.getPotNotifications(user.id, options);
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

/**
 * Get unread pot notification count
 */
export function useUnreadPotNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pots', 'notifications', 'unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;
      const notifications = await potService.getPotNotifications(user.id, {
        unreadOnly: true,
      });
      return notifications.length;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

/**
 * Get pot settings
 */
export function usePotSettings() {
  return useQuery({
    queryKey: ['pots', 'settings'],
    queryFn: () => potService.getPotSettings(),
    staleTime: 300000, // 5 minutes
  });
}

// ==========================================
// Mutation Hooks
// ==========================================

/**
 * Create a new pot
 */
export function useCreatePot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreatePotRequest) => {
      if (!user?.id) throw new Error('User not authenticated');
      return potService.createPot(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pots'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

/**
 * Update a pot
 */
export function useUpdatePot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ potId, data }: { potId: string; data: UpdatePotRequest }) =>
      potService.updatePot(potId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pots'] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'detail', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'summary', variables.potId] });
    },
  });
}

/**
 * Contribute to a pot
 */
export function useContributeToPot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContributePotRequest) => potService.contributeToPot(data),
    onSuccess: (_, variables) => {
      // Invalidate pot queries
      queryClient.invalidateQueries({ queryKey: ['pots'] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'detail', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'summary', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'transactions', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'eligibility', variables.potId] });
      // Invalidate wallet queries (source wallet was debited)
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallets', variables.sourceWalletId] });
    },
  });
}

/**
 * Withdraw from a pot
 */
export function useWithdrawFromPot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WithdrawPotRequest) => potService.withdrawFromPot(data),
    onSuccess: (_, variables) => {
      // Invalidate pot queries
      queryClient.invalidateQueries({ queryKey: ['pots'] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'detail', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'summary', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'transactions', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'eligibility', variables.potId] });
      // Invalidate wallet queries (destination wallet was credited)
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallets', variables.destinationWalletId] });
    },
  });
}

/**
 * Close a pot
 */
export function useClosePot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      potId,
      destinationWalletId,
    }: {
      potId: string;
      destinationWalletId: string;
    }) => potService.closePot(potId, destinationWalletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pots'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      potService.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pots', 'notifications'] });
    },
  });
}

// ==========================================
// Admin Hooks
// ==========================================

/**
 * Get all pots (admin)
 */
export function useAllPots(params?: {
  page?: number;
  limit?: number;
  status?: PotStatus;
  userId?: string;
}) {
  return useQuery({
    queryKey: ['pots', 'admin', 'all', params],
    queryFn: () => potService.getAllPots(params),
    staleTime: 30000,
  });
}

/**
 * Admin toggle pot lock
 */
export function useAdminTogglePotLock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      potId,
      lock,
      reason,
    }: {
      potId: string;
      lock: boolean;
      reason?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return potService.adminTogglePotLock(potId, user.id, lock, reason);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pots'] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'detail', variables.potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'admin'] });
    },
  });
}

/**
 * Admin force unlock pot
 */
export function useAdminForceUnlock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (potId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return potService.adminForceUnlock(potId, user.id);
    },
    onSuccess: (_, potId) => {
      queryClient.invalidateQueries({ queryKey: ['pots'] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'detail', potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'eligibility', potId] });
      queryClient.invalidateQueries({ queryKey: ['pots', 'admin'] });
    },
  });
}

/**
 * Update pot settings (admin)
 */
export function useUpdatePotSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      potService.updatePotSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pots', 'settings'] });
    },
  });
}
