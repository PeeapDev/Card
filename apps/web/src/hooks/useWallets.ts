import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService, CreateWalletRequest, DepositRequest, TransferRequest } from '@/services/wallet.service';

export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: walletService.getWallets,
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
