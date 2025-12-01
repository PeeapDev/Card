import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

export function useTransactions(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', user?.id, limit],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return (data || []).map(txn => ({
        id: txn.id,
        type: txn.type || 'transfer',
        amount: txn.amount,
        currency: txn.currency || 'USD',
        status: txn.status || 'completed',
        description: txn.description || txn.type,
        createdAt: txn.created_at,
      }));
    },
    enabled: !!user?.id,
  });
}
