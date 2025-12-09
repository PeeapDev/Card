/**
 * NFC Tags Hooks
 *
 * React Query hooks for NFC tag operations with Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface NFCTag {
  id: string;
  tag_id: string;
  user_id: string;
  wallet_id: string;
  card_id?: string;
  name: string;
  payment_url: string;
  is_active: boolean;
  total_transactions: number;
  total_amount: number;
  scan_count: number;
  hardware_written_at?: string;
  last_scanned_at?: string;
  last_transaction_at?: string;
  daily_limit?: number;
  single_transaction_limit?: number;
  requires_pin: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateNFCTagRequest {
  wallet_id: string;
  card_id?: string;
  name: string;
  daily_limit?: number;
  single_transaction_limit?: number;
  requires_pin?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateNFCTagRequest {
  name?: string;
  is_active?: boolean;
  daily_limit?: number;
  single_transaction_limit?: number;
  requires_pin?: boolean;
  metadata?: Record<string, any>;
}

export interface NFCTagTransaction {
  id: string;
  nfc_tag_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  sender_id?: string;
  sender_name?: string;
  status: 'completed' | 'failed' | 'refunded';
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Get all NFC tags for the current user
 */
export function useNFCTags() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nfc-tags', user?.id],
    queryFn: async (): Promise<NFCTag[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

/**
 * Get a single NFC tag by ID
 */
export function useNFCTag(id: string) {
  return useQuery({
    queryKey: ['nfc-tags', id],
    queryFn: async (): Promise<NFCTag | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Get NFC tag by tag_id (for payment lookup)
 */
export function useNFCTagByTagId(tagId: string) {
  return useQuery({
    queryKey: ['nfc-tags', 'tag_id', tagId],
    queryFn: async (): Promise<NFCTag | null> => {
      if (!tagId) return null;

      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('tag_id', tagId)
        .eq('is_active', true)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!tagId,
    staleTime: 30000,
  });
}

/**
 * Get NFC tags for a specific card
 */
export function useNFCTagsByCard(cardId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nfc-tags', 'card', cardId],
    queryFn: async (): Promise<NFCTag[]> => {
      if (!cardId || !user?.id) return [];

      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('card_id', cardId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!cardId && !!user?.id,
    staleTime: 30000,
  });
}

/**
 * Create a new NFC tag
 */
export function useCreateNFCTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateNFCTagRequest): Promise<NFCTag> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Generate unique tag ID
      const tagId = `NFC_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 8)}`.toUpperCase();
      const paymentUrl = `${window.location.origin}/pay/nfc/${tagId}`;

      const { data: newTag, error } = await supabase
        .from('nfc_tags')
        .insert({
          tag_id: tagId,
          user_id: user.id,
          wallet_id: data.wallet_id,
          card_id: data.card_id,
          name: data.name,
          payment_url: paymentUrl,
          daily_limit: data.daily_limit,
          single_transaction_limit: data.single_transaction_limit,
          requires_pin: data.requires_pin || false,
          metadata: data.metadata || {},
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return newTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfc-tags'] });
    },
  });
}

/**
 * Update an NFC tag
 */
export function useUpdateNFCTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateNFCTagRequest }): Promise<NFCTag> => {
      const { data: updatedTag, error } = await supabase
        .from('nfc_tags')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updatedTag;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['nfc-tags'] });
      queryClient.invalidateQueries({ queryKey: ['nfc-tags', id] });
    },
  });
}

/**
 * Deactivate an NFC tag
 */
export function useDeactivateNFCTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('nfc_tags')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['nfc-tags'] });
      queryClient.invalidateQueries({ queryKey: ['nfc-tags', id] });
    },
  });
}

/**
 * Delete an NFC tag
 */
export function useDeleteNFCTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('nfc_tags')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfc-tags'] });
    },
  });
}

/**
 * Get transactions for an NFC tag
 */
export function useNFCTagTransactions(tagId: string) {
  return useQuery({
    queryKey: ['nfc-tag-transactions', tagId],
    queryFn: async (): Promise<NFCTagTransaction[]> => {
      if (!tagId) return [];

      const { data, error } = await supabase
        .from('nfc_tag_transactions')
        .select('*')
        .eq('nfc_tag_id', tagId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!tagId,
    staleTime: 30000,
  });
}

/**
 * Record hardware write timestamp
 */
export function useRecordNFCTagWrite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('nfc_tags')
        .update({
          hardware_written_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['nfc-tags'] });
      queryClient.invalidateQueries({ queryKey: ['nfc-tags', id] });
    },
  });
}
