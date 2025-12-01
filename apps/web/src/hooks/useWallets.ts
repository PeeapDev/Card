import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService, CreateWalletRequest, DepositRequest, TransferRequest } from '@/services/wallet.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Wallet } from '@/types';

// Check if we're in demo mode
const isDemoMode = () => {
  return localStorage.getItem('demoUser') !== null;
};

export function useWallets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: async (): Promise<Wallet[]> => {
      // If demo mode, fetch from Supabase or return empty array
      if (isDemoMode()) {
        if (!user?.id) return [];

        const { data, error } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching wallets:', error);
          return [];
        }

        return (data || []).map(w => ({
          id: w.id,
          userId: w.user_id,
          balance: w.balance || 0,
          currency: w.currency || 'USD',
          status: w.status || 'ACTIVE',
          dailyLimit: w.daily_limit || 5000,
          monthlyLimit: w.monthly_limit || 50000,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        }));
      }

      // Normal API mode
      return walletService.getWallets();
    },
    enabled: !!user?.id,
  });
}

export function useWallet(id: string) {
  return useQuery({
    queryKey: ['wallets', id],
    queryFn: () => walletService.getWallet(id),
    enabled: !!id,
  });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWalletRequest) => walletService.createWallet(data),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useWalletTransactions(walletId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['transactions', walletId, page, limit],
    queryFn: () => walletService.getTransactions(walletId, { page, limit }),
    enabled: !!walletId,
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
