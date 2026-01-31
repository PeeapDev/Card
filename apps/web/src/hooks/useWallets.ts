/**
 * Wallet Hooks - Production Grade
 *
 * React Query hooks for wallet operations with Supabase
 * Includes real-time subscriptions for instant wallet updates (e.g., USSD deposits)
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService, CreateWalletRequest, DepositRequest, TransferRequest } from '@/services/wallet.service';
import { useAuth } from '@/context/AuthContext';
import { supabaseAdmin } from '@/lib/supabase';
import type { Wallet } from '@/types';

/**
 * Hook to subscribe to real-time wallet updates via Supabase Realtime
 * This enables instant wallet balance updates when deposits are made via USSD/short codes
 */
export function useWalletRealtimeSubscription(walletIds?: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to wallet changes for this user
    const channel = supabaseAdmin
      .channel(`wallet-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Wallet balance updated:', payload.new?.id, 'New balance:', payload.new?.balance);
          // Invalidate wallet queries to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
          queryClient.invalidateQueries({ queryKey: ['wallets', 'primary'] });

          // Also update the specific wallet in cache for instant UI update
          if (payload.new?.id) {
            queryClient.setQueryData(['wallets', payload.new.id], (old: any) => ({
              ...old,
              balance: payload.new.balance,
              updatedAt: payload.new.updated_at,
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] New wallet created:', payload.new?.id);
          // Invalidate wallet queries to show new wallet
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to wallet updates for user:', user.id);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Failed to subscribe to wallet updates');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from wallet updates');
      supabaseAdmin.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Subscribe to transaction inserts for specific wallets (if provided)
  useEffect(() => {
    if (!walletIds || walletIds.length === 0) return;

    const channels = walletIds.map((walletId) => {
      const channel = supabaseAdmin
        .channel(`transactions-${walletId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `wallet_id=eq.${walletId}`,
          },
          (payload) => {
            console.log('[Realtime] New transaction for wallet:', walletId, payload.new);
            // Invalidate transactions query
            queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
            // Also invalidate wallets to update balance display
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
          }
        )
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach((channel) => supabaseAdmin.removeChannel(channel));
    };
  }, [walletIds?.join(','), queryClient]);
}

export function useWallets() {
  const { user } = useAuth();

  // Set up real-time subscription for instant wallet balance updates (e.g., USSD deposits)
  useWalletRealtimeSubscription();

  return useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: async (): Promise<Wallet[]> => {
      if (!user?.id) return [];
      return walletService.getWallets(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

export function useWallet(id: string) {
  return useQuery({
    queryKey: ['wallets', id],
    queryFn: () => walletService.getWallet(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function usePrimaryWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallets', 'primary', user?.id],
    queryFn: async (): Promise<Wallet | null> => {
      if (!user?.id) return null;
      return walletService.getWalletByUserId(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: CreateWalletRequest) => {
      if (!user?.id) throw new Error('User not authenticated');
      return walletService.createWallet(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DepositRequest) => walletService.deposit(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallets', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.walletId] });
    },
  });
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransferRequest) => walletService.transfer(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallets', variables.fromWalletId] });
    },
  });
}

export function useWalletTransactions(walletId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['transactions', walletId, page, limit],
    queryFn: () => walletService.getTransactions(walletId, { page, limit }),
    enabled: !!walletId,
    staleTime: 10000,
  });
}

export function useFreezeWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => walletService.freezeWallet(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallets', id] });
    },
  });
}

export function useUnfreezeWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => walletService.unfreezeWallet(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallets', id] });
    },
  });
}
