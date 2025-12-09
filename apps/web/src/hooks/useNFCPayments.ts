/**
 * Secure NFC Payments Hooks
 *
 * Production-grade hooks for NFC payment operations
 * with cryptographic security and fraud prevention
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export interface NFCPaymentLink {
  id: string;
  link_id: string;
  short_code: string;
  user_id: string;
  wallet_id: string;
  card_id?: string;
  name: string;
  description?: string;
  pin_required_above: number;
  single_transaction_limit: number;
  daily_limit: number;
  monthly_limit: number;
  daily_amount_used: number;
  daily_transaction_count: number;
  total_transactions: number;
  total_amount_received: number;
  total_failed_attempts: number;
  status: 'active' | 'suspended' | 'blocked' | 'inactive';
  suspension_reason?: string;
  fraud_score: number;
  requires_review: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NFCPaymentToken {
  token: string;
  expires_at: string;
}

export interface CreatePaymentLinkParams {
  wallet_id: string;
  card_id?: string;
  name: string;
  description?: string;
  single_limit?: number;
  daily_limit?: number;
  pin?: string;
}

export interface ProcessPaymentParams {
  token: string;
  amount: number;
  pin?: string;
}

export interface PaymentLinkValidation {
  valid: boolean;
  recipient_name: string;
  recipient_user_id: string;
  status: string;
  single_limit: number;
  requires_pin_above: number;
}

export interface NFCPaymentAudit {
  id: string;
  event_type: string;
  severity: string;
  payment_link_id?: string;
  transaction_id?: string;
  event_data: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get all NFC payment links for the current user
 */
export function useNFCPaymentLinks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nfc-payment-links', user?.id],
    queryFn: async (): Promise<NFCPaymentLink[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('nfc_payment_links')
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
 * Get a single NFC payment link by ID
 */
export function useNFCPaymentLink(id: string) {
  return useQuery({
    queryKey: ['nfc-payment-links', id],
    queryFn: async (): Promise<NFCPaymentLink | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('nfc_payment_links')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new secure NFC payment link
 */
export function useCreateNFCPaymentLink() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreatePaymentLinkParams): Promise<{
      link_id: string;
      short_code: string;
      payment_url: string;
    }> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('create_nfc_payment_link', {
        p_user_id: user.id,
        p_wallet_id: params.wallet_id,
        p_card_id: params.card_id || null,
        p_name: params.name,
        p_description: params.description || null,
        p_single_limit: params.single_limit || 1000,
        p_daily_limit: params.daily_limit || 5000,
        p_pin: params.pin || null,
      });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Failed to create payment link');

      const result = data[0];
      return {
        link_id: result.link_id,
        short_code: result.short_code,
        payment_url: `${window.location.origin}${result.payment_url}`,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfc-payment-links'] });
    },
  });
}

/**
 * Validate a payment link (public - for payment page)
 */
export function useValidatePaymentLink(shortCode: string) {
  return useQuery({
    queryKey: ['nfc-validate-link', shortCode],
    queryFn: async (): Promise<PaymentLinkValidation | null> => {
      if (!shortCode) return null;

      const { data, error } = await supabase.rpc('validate_nfc_payment_link', {
        p_short_code: shortCode,
      });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return null;

      return data[0];
    },
    enabled: !!shortCode,
    staleTime: 10000, // Refresh every 10 seconds
  });
}

/**
 * Generate a one-time payment token
 */
export function useGeneratePaymentToken() {
  return useMutation({
    mutationFn: async (params: {
      short_code: string;
      amount?: number;
      expiry_minutes?: number;
    }): Promise<NFCPaymentToken> => {
      const { data, error } = await supabase.rpc('generate_nfc_payment_token', {
        p_short_code: params.short_code,
        p_amount: params.amount || null,
        p_expiry_minutes: params.expiry_minutes || 5,
        p_ip_address: null, // Would need server-side to get real IP
        p_device_info: navigator.userAgent,
      });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Failed to generate token');

      const result = data[0];
      if (!result.success) {
        throw new Error(result.error_message || 'Failed to generate token');
      }

      return {
        token: result.token,
        expires_at: result.expires_at,
      };
    },
  });
}

/**
 * Process a payment using a token
 */
export function useProcessNFCPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ProcessPaymentParams & { wallet_id: string }): Promise<{
      transaction_id: string;
    }> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('process_nfc_payment', {
        p_token: params.token,
        p_payer_user_id: user.id,
        p_payer_wallet_id: params.wallet_id,
        p_amount: params.amount,
        p_pin: params.pin || null,
        p_ip_address: null,
        p_device_info: navigator.userAgent,
      });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Payment processing failed');

      const result = data[0];
      if (!result.success) {
        const err = new Error(result.error_message || 'Payment failed');
        (err as any).code = result.error_code;
        throw err;
      }

      return {
        transaction_id: result.transaction_id,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/**
 * Update payment link settings
 */
export function useUpdatePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      description?: string;
      single_transaction_limit?: number;
      daily_limit?: number;
      status?: 'active' | 'inactive';
    }): Promise<NFCPaymentLink> => {
      const { data, error } = await supabase
        .from('nfc_payment_links')
        .update({
          name: params.name,
          description: params.description,
          single_transaction_limit: params.single_transaction_limit,
          daily_limit: params.daily_limit,
          status: params.status,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['nfc-payment-links'] });
      queryClient.invalidateQueries({ queryKey: ['nfc-payment-links', params.id] });
    },
  });
}

/**
 * Deactivate a payment link
 */
export function useDeactivatePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('nfc_payment_links')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfc-payment-links'] });
    },
  });
}

/**
 * Get audit logs for a payment link
 */
export function usePaymentLinkAudit(paymentLinkId: string) {
  return useQuery({
    queryKey: ['nfc-payment-audit', paymentLinkId],
    queryFn: async (): Promise<NFCPaymentAudit[]> => {
      if (!paymentLinkId) return [];

      const { data, error } = await supabase
        .from('nfc_payment_audit')
        .select('*')
        .eq('payment_link_id', paymentLinkId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!paymentLinkId,
  });
}

/**
 * Get recent transactions for a payment link
 */
export function usePaymentLinkTransactions(paymentLinkId: string) {
  return useQuery({
    queryKey: ['nfc-payment-transactions', paymentLinkId],
    queryFn: async () => {
      if (!paymentLinkId) return [];

      const { data, error } = await supabase
        .from('nfc_payment_tokens')
        .select('*')
        .eq('payment_link_id', paymentLinkId)
        .eq('status', 'used')
        .order('used_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!paymentLinkId,
  });
}
