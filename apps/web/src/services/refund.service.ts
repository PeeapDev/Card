/**
 * Refund Service
 *
 * Handles refund operations with a 5-day holding period.
 *
 * Flow:
 * 1. Sender initiates refund → money deducted immediately, shows as "completed" for sender
 * 2. Recipient sees pending refund → can cancel within 5 days
 * 3. If not cancelled after 5 days → money credited to recipient
 * 4. If recipient cancels → money returned to sender
 */

import { supabase } from '@/lib/supabase';

export interface RefundRequest {
  id: string;
  reference: string;
  originalTransactionId?: string;
  senderId: string;
  senderWalletId: string;
  recipientId: string;
  recipientWalletId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  senderStatus: string;
  recipientStatus: string;
  createdAt: string;
  releaseAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  // Joined data
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profilePicture?: string;
  };
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profilePicture?: string;
  };
}

export interface CreateRefundRequest {
  recipientId: string;
  amount: number;
  reason?: string;
  originalTransactionId?: string;
}

export interface CancelRefundRequest {
  refundId: string;
  reason?: string;
}

// Map database row to RefundRequest type
const mapRefundRequest = (row: any): RefundRequest => ({
  id: row.id,
  reference: row.reference,
  originalTransactionId: row.original_transaction_id,
  senderId: row.sender_id,
  senderWalletId: row.sender_wallet_id,
  recipientId: row.recipient_id,
  recipientWalletId: row.recipient_wallet_id,
  amount: parseFloat(row.amount) || 0,
  currency: row.currency || 'SLE',
  reason: row.reason,
  status: row.status,
  senderStatus: row.sender_status,
  recipientStatus: row.recipient_status,
  createdAt: row.created_at,
  releaseAt: row.release_at,
  completedAt: row.completed_at,
  cancelledAt: row.cancelled_at,
  cancelledBy: row.cancelled_by,
  cancellationReason: row.cancellation_reason,
  sender: row.sender ? {
    id: row.sender.id,
    firstName: row.sender.first_name,
    lastName: row.sender.last_name,
    email: row.sender.email,
    phone: row.sender.phone,
    profilePicture: row.sender.profile_picture,
  } : undefined,
  recipient: row.recipient ? {
    id: row.recipient.id,
    firstName: row.recipient.first_name,
    lastName: row.recipient.last_name,
    email: row.recipient.email,
    phone: row.recipient.phone,
    profilePicture: row.recipient.profile_picture,
  } : undefined,
});

export const refundService = {
  /**
   * Create a new refund request
   * Money is deducted from sender immediately, recipient gets it after 5 days
   */
  async createRefund(
    senderId: string,
    data: CreateRefundRequest
  ): Promise<{ success: boolean; refund?: RefundRequest; error?: string }> {
    try {
      const { data: result, error } = await supabase.rpc('create_refund_request', {
        p_sender_id: senderId,
        p_recipient_id: data.recipientId,
        p_amount: data.amount,
        p_reason: data.reason || null,
        p_original_transaction_id: data.originalTransactionId || null,
      });

      if (error) {
        console.error('Error creating refund:', error);
        return { success: false, error: error.message };
      }

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Fetch the created refund request
      const refund = await this.getRefundById(result.refund_id);

      return {
        success: true,
        refund: refund || undefined,
      };
    } catch (err: any) {
      console.error('Error in createRefund:', err);
      return { success: false, error: err.message || 'Failed to create refund' };
    }
  },

  /**
   * Cancel a refund request (by recipient)
   * Money is returned to sender
   */
  async cancelRefund(
    userId: string,
    data: CancelRefundRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: result, error } = await supabase.rpc('cancel_refund_request', {
        p_refund_id: data.refundId,
        p_cancelled_by: userId,
        p_reason: data.reason || null,
      });

      if (error) {
        console.error('Error cancelling refund:', error);
        return { success: false, error: error.message };
      }

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error in cancelRefund:', err);
      return { success: false, error: err.message || 'Failed to cancel refund' };
    }
  },

  /**
   * Get a refund request by ID
   */
  async getRefundById(refundId: string): Promise<RefundRequest | null> {
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture),
        recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .eq('id', refundId)
      .single();

    if (error) {
      console.error('Error fetching refund:', error);
      return null;
    }

    return mapRefundRequest(data);
  },

  /**
   * Get refund request by reference
   */
  async getRefundByReference(reference: string): Promise<RefundRequest | null> {
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture),
        recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .eq('reference', reference)
      .single();

    if (error) {
      console.error('Error fetching refund by reference:', error);
      return null;
    }

    return mapRefundRequest(data);
  },

  /**
   * Get all refunds sent by user
   */
  async getSentRefunds(userId: string): Promise<RefundRequest[]> {
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sent refunds:', error);
      return [];
    }

    return (data || []).map(mapRefundRequest);
  },

  /**
   * Get all refunds received by user (including pending)
   */
  async getReceivedRefunds(userId: string): Promise<RefundRequest[]> {
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching received refunds:', error);
      return [];
    }

    return (data || []).map(mapRefundRequest);
  },

  /**
   * Get pending refunds for user (both sent and received)
   */
  async getPendingRefunds(userId: string): Promise<{
    sent: RefundRequest[];
    received: RefundRequest[];
  }> {
    const [sentResult, receivedResult] = await Promise.all([
      supabase
        .from('refund_requests')
        .select(`
          *,
          recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
        `)
        .eq('sender_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('refund_requests')
        .select(`
          *,
          sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture)
        `)
        .eq('recipient_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    return {
      sent: (sentResult.data || []).map(mapRefundRequest),
      received: (receivedResult.data || []).map(mapRefundRequest),
    };
  },

  /**
   * Get all refunds for user (both sent and received)
   */
  async getAllRefunds(userId: string): Promise<RefundRequest[]> {
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture),
        recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all refunds:', error);
      return [];
    }

    return (data || []).map(mapRefundRequest);
  },

  /**
   * Calculate time remaining until refund is released
   */
  getTimeRemaining(releaseAt: string): {
    days: number;
    hours: number;
    minutes: number;
    isReleased: boolean;
  } {
    const now = new Date();
    const release = new Date(releaseAt);
    const diff = release.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, isReleased: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, isReleased: false };
  },

  /**
   * Format time remaining as human readable string
   */
  formatTimeRemaining(releaseAt: string): string {
    const { days, hours, minutes, isReleased } = this.getTimeRemaining(releaseAt);

    if (isReleased) {
      return 'Processing...';
    }

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours}h remaining`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }

    return `${minutes} minutes remaining`;
  },
};

export default refundService;
