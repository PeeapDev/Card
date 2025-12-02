/**
 * Transactions Hook - Production Ready
 *
 * Fetches user transactions from Supabase via wallet_id
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Transaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  description: string;
  reference: string;
  metadata: any;
  createdAt: string;
}

export function useTransactions(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', user?.id, limit],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) return [];

      // First get user's wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (walletsError || !wallets?.length) {
        console.error('Error fetching wallets:', walletsError);
        return [];
      }

      const walletIds = wallets.map(w => w.id);

      // Then get transactions for those wallets
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('wallet_id', walletIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return (data || []).map(txn => ({
        id: txn.id,
        walletId: txn.wallet_id,
        type: txn.type?.toLowerCase() || 'transfer',
        amount: txn.amount,
        fee: txn.fee || 0,
        currency: txn.currency || 'USD',
        status: txn.status || 'COMPLETED',
        description: txn.description || txn.type,
        reference: txn.reference || '',
        metadata: txn.metadata || {},
        createdAt: txn.created_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: true,
  });
}
