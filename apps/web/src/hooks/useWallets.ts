/**
 * Wallet Hooks - Production Grade
 *
 * React Query hooks for wallet operations with Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService, CreateWalletRequest, DepositRequest, TransferRequest } from '@/services/wallet.service';
import { useAuth } from '@/context/AuthContext';
import type { Wallet } from '@/types';

export function useWallets() {
  const { user } = useAuth();

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
