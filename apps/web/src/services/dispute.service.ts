/**
 * Dispute Service
 *
 * Handles 3-way dispute resolution system:
 * - Customer files dispute
 * - Merchant responds
 * - Admin mediates
 * - AI assists with fraud detection
 */

import { supabase } from '@/lib/supabase';
import { aiService } from './ai.service';
import { notificationService } from './notification.service';

// Types
export interface Dispute {
  id: string;
  transaction_id?: string;
  payment_id?: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  business_id?: string;
  merchant_id?: string;
  reason: DisputeReason;
  description?: string;
  amount: number;
  currency: string;
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string;
  resolution_amount?: number;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  merchant_response?: string;
  merchant_responded_at?: string;
  customer_evidence: Evidence[];
  merchant_evidence: Evidence[];
  due_date?: string;
  merchant_deadline?: string;
  ai_analysis_id?: string;
  fraud_risk_score?: number;
  assigned_to?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined fields
  business_name?: string;
  customer_full_name?: string;
  merchant_full_name?: string;
  message_count?: number;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id?: string;
  sender_type: SenderType;
  sender_name?: string;
  content: string;
  message_type: MessageType;
  attachments: Attachment[];
  is_internal: boolean;
  visible_to: string[];
  read_by: Record<string, string>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DisputeEvent {
  id: string;
  dispute_id: string;
  event_type: EventType;
  actor_id?: string;
  actor_type?: SenderType;
  description?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  created_at: string;
}

export interface Evidence {
  url: string;
  type: string;
  name: string;
  size?: number;
  uploaded_at: string;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
  size?: number;
}

export type DisputeReason =
  | 'duplicate'
  | 'fraudulent'
  | 'product_not_received'
  | 'product_unacceptable'
  | 'subscription_canceled'
  | 'unrecognized'
  | 'credit_not_processed'
  | 'general'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'pending_merchant'
  | 'pending_customer'
  | 'under_review'
  | 'evidence_required'
  | 'resolved'
  | 'won'
  | 'lost'
  | 'closed'
  | 'escalated';

export type SenderType = 'customer' | 'merchant' | 'admin' | 'system' | 'ai';
export type MessageType = 'message' | 'evidence' | 'status_change' | 'resolution' | 'ai_analysis' | 'internal_note';
export type EventType = 'created' | 'status_changed' | 'message_sent' | 'evidence_uploaded' | 'assigned' | 'escalated' | 'resolved' | 'ai_analyzed';

// Dispute reason labels
export const DISPUTE_REASONS: Record<DisputeReason, string> = {
  duplicate: 'Duplicate Charge',
  fraudulent: 'Fraudulent Transaction',
  product_not_received: 'Product Not Received',
  product_unacceptable: 'Product Unacceptable',
  subscription_canceled: 'Subscription Canceled',
  unrecognized: 'Unrecognized Charge',
  credit_not_processed: 'Credit Not Processed',
  general: 'General Dispute',
  other: 'Other',
};

// Status labels and colors
export const DISPUTE_STATUSES: Record<DisputeStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'yellow' },
  pending_merchant: { label: 'Awaiting Merchant', color: 'orange' },
  pending_customer: { label: 'Awaiting Customer', color: 'blue' },
  under_review: { label: 'Under Review', color: 'purple' },
  evidence_required: { label: 'Evidence Required', color: 'orange' },
  resolved: { label: 'Resolved', color: 'green' },
  won: { label: 'Won', color: 'green' },
  lost: { label: 'Lost', color: 'red' },
  closed: { label: 'Closed', color: 'gray' },
  escalated: { label: 'Escalated', color: 'red' },
};

class DisputeService {
  // ==========================================
  // DISPUTE CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new dispute
   */
  async createDispute(data: {
    transaction_id?: string;
    payment_id?: string;
    business_id?: string;
    merchant_id?: string;
    reason: DisputeReason;
    description: string;
    amount: number;
    currency?: string;
    customer_name?: string;
    customer_email?: string;
    evidence?: Evidence[];
  }): Promise<{ dispute: Dispute | null; error: string | null }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');

      const { data: dispute, error } = await supabase
        .from('disputes')
        .insert({
          customer_id: user.user.id,
          customer_name: data.customer_name,
          customer_email: data.customer_email || user.user.email,
          transaction_id: data.transaction_id,
          payment_id: data.payment_id,
          business_id: data.business_id,
          merchant_id: data.merchant_id,
          reason: data.reason,
          description: data.description,
          amount: data.amount,
          currency: data.currency || 'SLE',
          status: 'open',
          priority: this.calculatePriority(data.amount),
          customer_evidence: data.evidence || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial event
      await this.createEvent(dispute.id, 'created', 'Dispute filed', 'customer');

      // Create initial system message
      await this.sendMessage({
        dispute_id: dispute.id,
        sender_type: 'system',
        content: `Dispute filed for ${DISPUTE_REASONS[data.reason]}. Amount: ${data.currency || 'SLE'} ${data.amount.toLocaleString()}. The merchant has 7 days to respond.`,
        message_type: 'status_change',
      });

      // Notify merchant about new dispute
      if (data.merchant_id) {
        try {
          await notificationService.sendDisputeFiledNotification({
            merchantId: data.merchant_id,
            disputeId: dispute.id,
            customerName: data.customer_name || 'Customer',
            amount: data.amount,
            currency: data.currency || 'SLE',
            reason: DISPUTE_REASONS[data.reason],
          });
        } catch (err) {
          console.error('Failed to send dispute notification:', err);
        }
      }

      // Run AI fraud analysis in background
      this.runAIAnalysis(dispute);

      return { dispute, error: null };
    } catch (err: any) {
      console.error('Failed to create dispute:', err);
      return { dispute: null, error: err.message };
    }
  }

  /**
   * Get dispute by ID with messages
   */
  async getDispute(disputeId: string): Promise<Dispute | null> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          merchant_businesses(name),
          profiles!disputes_customer_id_fkey(full_name, email)
        `)
        .eq('id', disputeId)
        .single();

      if (error) throw error;

      return {
        ...data,
        business_name: data.merchant_businesses?.name,
        customer_full_name: data.profiles?.full_name,
        customer_email: data.customer_email || data.profiles?.email,
      };
    } catch (err) {
      console.error('Failed to get dispute:', err);
      return null;
    }
  }

  /**
   * Get disputes for customer
   */
  async getCustomerDisputes(customerId: string): Promise<Dispute[]> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          merchant_businesses(name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        ...d,
        business_name: d.merchant_businesses?.name,
      }));
    } catch (err) {
      console.error('Failed to get customer disputes:', err);
      return [];
    }
  }

  /**
   * Get disputes for merchant/business
   */
  async getBusinessDisputes(businessId: string): Promise<Dispute[]> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          profiles!disputes_customer_id_fkey(full_name, email)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        ...d,
        customer_full_name: d.profiles?.full_name,
      }));
    } catch (err) {
      console.error('Failed to get business disputes:', err);
      return [];
    }
  }

  /**
   * Get all disputes (admin)
   */
  async getAllDisputes(filters?: {
    status?: DisputeStatus;
    priority?: string;
    assigned_to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ disputes: Dispute[]; total: number }> {
    try {
      let query = supabase
        .from('disputes')
        .select(`
          *,
          merchant_businesses(name),
          profiles!disputes_customer_id_fkey(full_name, email)
        `, { count: 'exact' });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
      if (filters?.search) {
        query = query.or(`id.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit) query = query.limit(filters.limit);
      if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const disputes = (data || []).map(d => ({
        ...d,
        business_name: d.merchant_businesses?.name,
        customer_full_name: d.profiles?.full_name,
      }));

      return { disputes, total: count || 0 };
    } catch (err) {
      console.error('Failed to get all disputes:', err);
      return { disputes: [], total: 0 };
    }
  }

  /**
   * Update dispute status
   */
  async updateStatus(disputeId: string, status: DisputeStatus, notes?: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user?.user?.id)
        .single();

      const senderType: SenderType = profile?.role === 'admin' || profile?.role === 'superadmin' ? 'admin' : 'system';

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // If resolving, set resolution info
      if (['resolved', 'won', 'lost', 'closed'].includes(status)) {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.user?.id;
        if (notes) updateData.resolution_notes = notes;
      }

      const { error } = await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', disputeId);

      if (error) throw error;

      // Send status change message
      await this.sendMessage({
        dispute_id: disputeId,
        sender_type: senderType,
        sender_name: profile?.full_name || 'System',
        content: `Dispute status updated to: ${DISPUTE_STATUSES[status].label}${notes ? `. ${notes}` : ''}`,
        message_type: 'status_change',
      });

      return true;
    } catch (err) {
      console.error('Failed to update status:', err);
      return false;
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(disputeId: string, resolution: {
    outcome: 'full_refund' | 'partial_refund' | 'favor_merchant' | 'favor_customer' | 'no_action';
    amount?: number;
    notes: string;
  }): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();

      // Get dispute details for notifications
      const dispute = await this.getDispute(disputeId);
      if (!dispute) throw new Error('Dispute not found');

      const status: DisputeStatus = resolution.outcome === 'favor_customer' || resolution.outcome === 'full_refund' ? 'won' :
                                    resolution.outcome === 'favor_merchant' || resolution.outcome === 'no_action' ? 'lost' : 'resolved';

      const { error } = await supabase
        .from('disputes')
        .update({
          status,
          resolution: resolution.outcome,
          resolution_amount: resolution.amount,
          resolution_notes: resolution.notes,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (error) throw error;

      // Send resolution message
      const outcomeLabels: Record<string, string> = {
        full_refund: 'Full refund to customer',
        partial_refund: `Partial refund of ${resolution.amount}`,
        favor_merchant: 'Resolved in favor of merchant',
        favor_customer: 'Resolved in favor of customer',
        no_action: 'No action taken',
      };

      await this.sendMessage({
        dispute_id: disputeId,
        sender_type: 'admin',
        content: `**Dispute Resolved**\n\nOutcome: ${outcomeLabels[resolution.outcome]}\n\n${resolution.notes}`,
        message_type: 'resolution',
      });

      await this.createEvent(disputeId, 'resolved', `Dispute resolved: ${resolution.outcome}`, 'admin');

      // Send notifications to both parties
      try {
        // Notify customer
        if (dispute.customer_id) {
          await notificationService.sendDisputeResolvedNotification({
            userId: dispute.customer_id,
            disputeId,
            outcome: status as 'won' | 'lost' | 'resolved',
            resolution: outcomeLabels[resolution.outcome],
            amount: dispute.amount,
            currency: dispute.currency,
            refundAmount: resolution.outcome === 'full_refund' ? dispute.amount : resolution.amount,
            userType: 'customer',
          });
        }

        // Notify merchant
        if (dispute.merchant_id) {
          await notificationService.sendDisputeResolvedNotification({
            userId: dispute.merchant_id,
            disputeId,
            outcome: status as 'won' | 'lost' | 'resolved',
            resolution: outcomeLabels[resolution.outcome],
            amount: dispute.amount,
            currency: dispute.currency,
            refundAmount: resolution.outcome === 'full_refund' ? dispute.amount : resolution.amount,
            userType: 'merchant',
          });
        }
      } catch (err) {
        console.error('Failed to send resolution notifications:', err);
      }

      return true;
    } catch (err) {
      console.error('Failed to resolve dispute:', err);
      return false;
    }
  }

  // ==========================================
  // MESSAGING SYSTEM
  // ==========================================

  /**
   * Send a message in dispute thread
   */
  async sendMessage(data: {
    dispute_id: string;
    sender_type: SenderType;
    sender_name?: string;
    content: string;
    message_type?: MessageType;
    attachments?: Attachment[];
    is_internal?: boolean;
    visible_to?: string[];
  }): Promise<DisputeMessage | null> {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data: message, error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: data.dispute_id,
          sender_id: user?.user?.id,
          sender_type: data.sender_type,
          sender_name: data.sender_name,
          content: data.content,
          message_type: data.message_type || 'message',
          attachments: data.attachments || [],
          is_internal: data.is_internal || false,
          visible_to: data.visible_to || ['customer', 'merchant', 'admin'],
        })
        .select()
        .single();

      if (error) throw error;

      // Update dispute status based on who sent the message
      if (data.message_type === 'message') {
        await this.updateDisputeAfterMessage(data.dispute_id, data.sender_type);
      }

      return message;
    } catch (err) {
      console.error('Failed to send message:', err);
      return null;
    }
  }

  /**
   * Get messages for a dispute
   */
  async getMessages(disputeId: string, includeInternal: boolean = false): Promise<DisputeMessage[]> {
    try {
      let query = supabase
        .from('dispute_messages')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (!includeInternal) {
        query = query.eq('is_internal', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get messages:', err);
      return [];
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesRead(disputeId: string, userId: string): Promise<boolean> {
    try {
      const { data: messages } = await supabase
        .from('dispute_messages')
        .select('id, read_by')
        .eq('dispute_id', disputeId);

      if (!messages) return false;

      const now = new Date().toISOString();
      const updates = messages.map(msg => ({
        id: msg.id,
        read_by: { ...msg.read_by, [userId]: now },
      }));

      for (const update of updates) {
        await supabase
          .from('dispute_messages')
          .update({ read_by: update.read_by })
          .eq('id', update.id);
      }

      return true;
    } catch (err) {
      console.error('Failed to mark messages read:', err);
      return false;
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(disputeId: string, userId: string): Promise<number> {
    try {
      const { data: messages } = await supabase
        .from('dispute_messages')
        .select('id, read_by')
        .eq('dispute_id', disputeId);

      if (!messages) return 0;

      return messages.filter(msg => !msg.read_by?.[userId]).length;
    } catch (err) {
      console.error('Failed to get unread count:', err);
      return 0;
    }
  }

  /**
   * Subscribe to new messages (real-time)
   */
  subscribeToMessages(disputeId: string, callback: (message: DisputeMessage) => void) {
    const subscription = supabase
      .channel(`dispute_messages:${disputeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${disputeId}`,
        },
        (payload) => {
          callback(payload.new as DisputeMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }

  // ==========================================
  // EVIDENCE HANDLING
  // ==========================================

  /**
   * Upload evidence file
   */
  async uploadEvidence(disputeId: string, file: File, uploaderType: 'customer' | 'merchant'): Promise<Evidence | null> {
    try {
      const fileName = `${disputeId}/${uploaderType}/${Date.now()}_${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dispute-evidence')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dispute-evidence')
        .getPublicUrl(fileName);

      const evidence: Evidence = {
        url: publicUrl,
        type: file.type,
        name: file.name,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      };

      // Update dispute with new evidence
      const { data: dispute } = await supabase
        .from('disputes')
        .select(uploaderType === 'customer' ? 'customer_evidence' : 'merchant_evidence')
        .eq('id', disputeId)
        .single();

      const existingEvidence = uploaderType === 'customer'
        ? (dispute as { customer_evidence?: any[] } | null)?.customer_evidence || []
        : (dispute as { merchant_evidence?: any[] } | null)?.merchant_evidence || [];

      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          [uploaderType === 'customer' ? 'customer_evidence' : 'merchant_evidence']: [...existingEvidence, evidence],
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (updateError) throw updateError;

      // Send evidence notification message
      await this.sendMessage({
        dispute_id: disputeId,
        sender_type: uploaderType,
        content: `New evidence uploaded: ${file.name}`,
        message_type: 'evidence',
        attachments: [evidence],
      });

      await this.createEvent(disputeId, 'evidence_uploaded', `${uploaderType} uploaded evidence: ${file.name}`, uploaderType);

      return evidence;
    } catch (err) {
      console.error('Failed to upload evidence:', err);
      return null;
    }
  }

  // ==========================================
  // AI INTEGRATION
  // ==========================================

  /**
   * Run AI fraud analysis on dispute
   */
  async runAIAnalysis(dispute: Dispute): Promise<void> {
    try {
      await aiService.initialize();
      if (!aiService.isConfigured()) return;

      const analysis = await aiService.analyzeDisputeFull({
        id: dispute.id,
        transaction_id: dispute.transaction_id || '',
        amount: dispute.amount,
        currency: dispute.currency,
        transaction_date: dispute.created_at,
        reason: dispute.reason,
        customer_statement: dispute.description || '',
        merchant_response: dispute.merchant_response,
        merchant_name: dispute.business_name || 'Unknown',
        business_name: dispute.business_name || 'Unknown',
      });

      // Update dispute with AI analysis
      await supabase
        .from('disputes')
        .update({
          fraud_risk_score: analysis.fraud_risk_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dispute.id);

      // Send AI analysis message (internal only)
      await this.sendMessage({
        dispute_id: dispute.id,
        sender_type: 'ai',
        sender_name: 'AI Analysis',
        content: `**AI Fraud Analysis Complete**\n\nFraud Risk: ${analysis.fraud_risk_score}%\nRecommendation: ${analysis.recommendation}\nConfidence: ${analysis.confidence_score}%\n\n${analysis.reasoning}`,
        message_type: 'ai_analysis',
        is_internal: true,
        visible_to: ['admin'],
      });

      await this.createEvent(dispute.id, 'ai_analyzed', `AI analysis complete. Fraud risk: ${analysis.fraud_risk_score}%`, 'ai');
    } catch (err) {
      console.error('AI analysis failed:', err);
    }
  }

  /**
   * Get AI suggested response for merchant
   */
  async getAISuggestedResponse(dispute: Dispute): Promise<{
    suggested_response: string;
    evidence_to_include: string[];
    strength_assessment: 'strong' | 'moderate' | 'weak';
    tips: string[];
  } | null> {
    try {
      await aiService.initialize();
      if (!aiService.isConfigured()) return null;

      return await aiService.generateMerchantResponse({
        reason: dispute.reason,
        customer_statement: dispute.description || '',
        amount: dispute.amount,
        currency: dispute.currency,
        transaction_date: dispute.created_at,
        business_name: dispute.business_name || 'Your Business',
      });
    } catch (err) {
      console.error('Failed to get AI suggestion:', err);
      return null;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private calculatePriority(amount: number): 'low' | 'medium' | 'high' | 'urgent' {
    if (amount >= 1000000) return 'urgent';
    if (amount >= 500000) return 'high';
    if (amount >= 100000) return 'medium';
    return 'low';
  }

  private async updateDisputeAfterMessage(disputeId: string, senderType: SenderType): Promise<void> {
    try {
      let newStatus: DisputeStatus | null = null;

      if (senderType === 'merchant') {
        // Merchant responded, now pending customer or under review
        newStatus = 'under_review';
      } else if (senderType === 'customer') {
        // Customer sent message, waiting for response
        newStatus = 'pending_merchant';
      }

      if (newStatus) {
        await supabase
          .from('disputes')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
            ...(senderType === 'merchant' ? { merchant_responded_at: new Date().toISOString() } : {}),
          })
          .eq('id', disputeId)
          // Only update if status hasn't progressed beyond open/pending states
          .in('status', ['open', 'pending_merchant', 'pending_customer']);
      }
    } catch (err) {
      console.error('Failed to update dispute after message:', err);
    }
  }

  private async createEvent(
    disputeId: string,
    eventType: EventType,
    description: string,
    actorType: SenderType
  ): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();

      await supabase.from('dispute_events').insert({
        dispute_id: disputeId,
        event_type: eventType,
        actor_id: user?.user?.id,
        actor_type: actorType,
        description,
      });
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  }

  /**
   * Get dispute events/activity log
   */
  async getEvents(disputeId: string): Promise<DisputeEvent[]> {
    try {
      const { data, error } = await supabase
        .from('dispute_events')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get events:', err);
      return [];
    }
  }

  /**
   * Assign dispute to admin
   */
  async assignToAdmin(disputeId: string, adminId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          assigned_to: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (error) throw error;

      await this.createEvent(disputeId, 'assigned', 'Dispute assigned to admin', 'admin');
      return true;
    } catch (err) {
      console.error('Failed to assign dispute:', err);
      return false;
    }
  }

  /**
   * Escalate dispute
   */
  async escalate(disputeId: string, reason: string): Promise<boolean> {
    try {
      // Get dispute details for notifications
      const dispute = await this.getDispute(disputeId);

      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'escalated',
          priority: 'urgent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (error) throw error;

      await this.sendMessage({
        dispute_id: disputeId,
        sender_type: 'system',
        content: `**Dispute Escalated**\n\nReason: ${reason}\n\nThis dispute has been marked as urgent and escalated for immediate review.`,
        message_type: 'status_change',
      });

      await this.createEvent(disputeId, 'escalated', reason, 'admin');

      // Notify both parties about escalation
      if (dispute) {
        try {
          if (dispute.customer_id) {
            await notificationService.sendDisputeEscalatedNotification({
              userId: dispute.customer_id,
              disputeId,
              reason,
              userType: 'customer',
            });
          }
          if (dispute.merchant_id) {
            await notificationService.sendDisputeEscalatedNotification({
              userId: dispute.merchant_id,
              disputeId,
              reason,
              userType: 'merchant',
            });
          }
        } catch (err) {
          console.error('Failed to send escalation notifications:', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to escalate dispute:', err);
      return false;
    }
  }

  /**
   * Reopen a closed dispute (Admin only)
   */
  async reopenDispute(disputeId: string, reason: string): Promise<boolean> {
    try {
      const dispute = await this.getDispute(disputeId);
      if (!dispute) throw new Error('Dispute not found');

      // Only allow reopening closed disputes
      if (!['resolved', 'won', 'lost', 'closed'].includes(dispute.status)) {
        throw new Error('Dispute is not closed');
      }

      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'under_review',
          resolved_at: null,
          resolved_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (error) throw error;

      await this.sendMessage({
        dispute_id: disputeId,
        sender_type: 'admin',
        content: `**Dispute Reopened**\n\nReason: ${reason}\n\nThis dispute has been reopened for further review.`,
        message_type: 'status_change',
      });

      await this.createEvent(disputeId, 'status_changed', `Dispute reopened: ${reason}`, 'admin');

      // Notify both parties
      try {
        if (dispute.customer_id) {
          await notificationService.create({
            userId: dispute.customer_id,
            type: 'system_announcement',
            title: 'Dispute Reopened',
            message: `Your dispute for ${dispute.currency} ${dispute.amount.toLocaleString()} has been reopened for further review.`,
            actionUrl: `/disputes/${disputeId}`,
            sourceService: 'dispute',
            sourceId: disputeId,
            priority: 'high',
          });
        }
        if (dispute.merchant_id) {
          await notificationService.create({
            userId: dispute.merchant_id,
            type: 'system_announcement',
            title: 'Dispute Reopened',
            message: `A dispute for ${dispute.currency} ${dispute.amount.toLocaleString()} has been reopened for further review.`,
            actionUrl: `/merchant/disputes/${disputeId}`,
            sourceService: 'dispute',
            sourceId: disputeId,
            priority: 'high',
          });
        }
      } catch (err) {
        console.error('Failed to send reopen notifications:', err);
      }

      return true;
    } catch (err) {
      console.error('Failed to reopen dispute:', err);
      return false;
    }
  }

  /**
   * Get dispute statistics
   */
  async getStats(): Promise<{
    total: number;
    open: number;
    pending_merchant: number;
    under_review: number;
    resolved: number;
    avg_resolution_time_days: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('status, created_at, resolved_at');

      if (error) throw error;

      const disputes = data || [];

      const stats = {
        total: disputes.length,
        open: disputes.filter(d => d.status === 'open').length,
        pending_merchant: disputes.filter(d => d.status === 'pending_merchant').length,
        under_review: disputes.filter(d => d.status === 'under_review').length,
        resolved: disputes.filter(d => ['resolved', 'won', 'lost', 'closed'].includes(d.status)).length,
        avg_resolution_time_days: 0,
      };

      // Calculate average resolution time
      const resolvedDisputes = disputes.filter(d => d.resolved_at);
      if (resolvedDisputes.length > 0) {
        const totalDays = resolvedDisputes.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const resolved = new Date(d.resolved_at);
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        stats.avg_resolution_time_days = Math.round(totalDays / resolvedDisputes.length);
      }

      return stats;
    } catch (err) {
      console.error('Failed to get stats:', err);
      return {
        total: 0,
        open: 0,
        pending_merchant: 0,
        under_review: 0,
        resolved: 0,
        avg_resolution_time_days: 0,
      };
    }
  }
}

export const disputeService = new DisputeService();
