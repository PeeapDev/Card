/**
 * Conversation Service
 *
 * General messaging system for:
 * - Business to Business (B2B)
 * - Business to User (B2C)
 * - Support to User
 * - Admin broadcasts
 *
 * Features:
 * - Real-time messaging
 * - AI moderation for fraud/scam detection
 * - Canned responses for support
 * - Read receipts
 * - File attachments
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { notificationService } from './notification.service';
import { sessionService } from './session.service';

// Types
export interface Conversation {
  id: string;
  type: ConversationType;
  subject?: string;
  participant_ids: string[];
  business_id?: string;
  status: ConversationStatus;
  priority: Priority;
  assigned_to?: string;
  department?: string;
  ai_flagged: boolean;
  ai_flag_reason?: string;
  ai_risk_score: number;
  metadata: Record<string, any>;
  last_message_at?: string;
  last_message_preview?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  participants?: ConversationParticipant[];
  business_name?: string;
  assigned_to_name?: string;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id?: string;
  business_id?: string;
  role: ParticipantRole;
  display_name?: string;
  is_active: boolean;
  muted: boolean;
  last_read_at?: string;
  unread_count: number;
  notifications_enabled: boolean;
  joined_at: string;
  left_at?: string;
  // Joined
  user_name?: string;
  user_avatar?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id?: string;
  sender_type: SenderType;
  sender_name?: string;
  sender_business_id?: string;
  content: string;
  message_type: MessageType;
  attachments: Attachment[];
  reply_to_id?: string;
  ai_flagged: boolean;
  ai_flag_reason?: string;
  ai_analyzed: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  read_by: Record<string, string>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  reply_to?: Message;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
  size?: number;
}

export interface FlaggedMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  flag_reason: string;
  matched_keywords: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  action_taken?: string;
  created_at: string;
  // Joined
  message?: Message;
  conversation?: Conversation;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
  is_global: boolean;
  created_by?: string;
  business_id?: string;
  use_count: number;
  is_active: boolean;
}

export interface AIFlagKeyword {
  id: string;
  keyword: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'flag' | 'block' | 'notify_admin' | 'auto_delete';
  is_regex: boolean;
  is_active: boolean;
}

export type ConversationType = 'support' | 'business_inquiry' | 'b2b' | 'sales' | 'general';
export type ConversationStatus = 'open' | 'closed' | 'archived' | 'flagged' | 'blocked';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type ParticipantRole = 'user' | 'merchant' | 'admin' | 'support' | 'system';
export type SenderType = 'user' | 'merchant' | 'admin' | 'support' | 'system' | 'ai';
export type MessageType = 'text' | 'image' | 'file' | 'system' | 'ai_warning' | 'product_inquiry' | 'quote_request' | 'invoice' | 'receipt' | 'payment_link';

// Labels
export const CONVERSATION_TYPES: Record<ConversationType, string> = {
  support: 'Support',
  business_inquiry: 'Business Inquiry',
  b2b: 'Business to Business',
  sales: 'Sales',
  general: 'General',
};

export const CONVERSATION_STATUSES: Record<ConversationStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'green' },
  closed: { label: 'Closed', color: 'gray' },
  archived: { label: 'Archived', color: 'gray' },
  flagged: { label: 'Flagged', color: 'red' },
  blocked: { label: 'Blocked', color: 'red' },
};

class ConversationService {
  private flagKeywords: AIFlagKeyword[] = [];
  private keywordsLoaded = false;

  // ==========================================
  // CONVERSATION CRUD
  // ==========================================

  /**
   * Start a new conversation
   */
  async startConversation(data: {
    type: ConversationType;
    subject?: string;
    participantIds: string[];
    businessId?: string;
    initialMessage?: string;
    department?: string;
  }): Promise<{ conversation: Conversation | null; error: string | null }> {
    try {
      const user = await sessionService.validateSession();
      if (!user) throw new Error('Not authenticated');

      // Include current user in participants
      const allParticipants = [...new Set([user.id, ...data.participantIds])];

      const { data: conversation, error } = await supabaseAdmin
        .from('conversations')
        .insert({
          type: data.type,
          subject: data.subject,
          participant_ids: allParticipants,
          business_id: data.businessId,
          department: data.department,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants
      const participantRecords = allParticipants.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: userId === user.id ? 'user' : 'user',
      }));

      await supabaseAdmin.from('conversation_participants').insert(participantRecords);

      // Send initial message if provided
      if (data.initialMessage) {
        await this.sendMessage({
          conversationId: conversation.id,
          content: data.initialMessage,
          senderType: 'user',
        });
      }

      return { conversation, error: null };
    } catch (err: any) {
      console.error('Failed to start conversation:', err);
      return { conversation: null, error: err.message };
    }
  }

  /**
   * Start a support conversation
   */
  async startSupportConversation(data: {
    subject: string;
    message: string;
    department?: string;
  }): Promise<{ conversation: Conversation | null; error: string | null }> {
    try {
      const user = await sessionService.validateSession();
      if (!user) throw new Error('Not authenticated');

      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

      const { data: conversation, error } = await supabaseAdmin
        .from('conversations')
        .insert({
          type: 'support',
          subject: data.subject,
          participant_ids: [user.id],
          department: data.department || 'support',
          status: 'open',
          priority: 'normal',
        })
        .select()
        .single();

      if (error) throw error;

      // Add user as participant
      await supabaseAdmin.from('conversation_participants').insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role: 'user',
        display_name: fullName,
      });

      // Send initial message
      await this.sendMessage({
        conversationId: conversation.id,
        content: data.message,
        senderType: 'user',
        senderName: fullName,
      });

      return { conversation, error: null };
    } catch (err: any) {
      console.error('Failed to start support conversation:', err);
      return { conversation: null, error: err.message };
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      // Get business name if business_id exists
      let businessName: string | undefined;
      if (data.business_id) {
        const { data: business } = await supabaseAdmin
          .from('merchant_businesses')
          .select('name')
          .eq('id', data.business_id)
          .single();
        businessName = business?.name;
      }

      return {
        ...data,
        business_name: businessName,
      };
    } catch (err) {
      console.error('Failed to get conversation:', err);
      return null;
    }
  }

  /**
   * Get user's conversations
   */
  async getMyConversations(filters?: {
    type?: ConversationType;
    status?: ConversationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: Conversation[]; total: number }> {
    try {
      const user = await sessionService.validateSession();
      if (!user) return { conversations: [], total: 0 };

      let query = supabaseAdmin
        .from('conversations')
        .select('*', { count: 'exact' })
        .contains('participant_ids', [user.id]);

      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.status) query = query.eq('status', filters.status);

      query = query.order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.limit) query = query.limit(filters.limit);
      if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Get participants and unread counts for each conversation
      const conversations = await Promise.all((data || []).map(async (c) => {
        // Get all participants
        const { data: participantRecords } = await supabaseAdmin
          .from('conversation_participants')
          .select('id, user_id, business_id, role, display_name, is_active, unread_count')
          .eq('conversation_id', c.id);

        // Get user info for all participants from users table (has profile_picture)
        const userIds = (participantRecords || []).map(p => p.user_id).filter(Boolean);
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, first_name, last_name, profile_picture')
          .in('id', userIds);

        // Create a map of user info
        const userMap = new Map<string, { name: string; avatar?: string }>();
        (users || []).forEach(u => {
          userMap.set(u.id, {
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown',
            avatar: u.profile_picture,
          });
        });

        // Map participants with user info
        const mappedParticipants = (participantRecords || []).map(p => {
          const userInfo = userMap.get(p.user_id || '');
          return {
            ...p,
            user_name: userInfo?.name || p.display_name,
            user_avatar: userInfo?.avatar,
          };
        });

        // Get current user's unread count
        const myParticipant = mappedParticipants.find(p => p.user_id === user.id);

        return {
          ...c,
          participants: mappedParticipants,
          unread_count: myParticipant?.unread_count || 0,
        };
      }));

      return { conversations, total: count || 0 };
    } catch (err) {
      console.error('Failed to get conversations:', err);
      return { conversations: [], total: 0 };
    }
  }

  /**
   * Get all support conversations (for admin/support staff)
   */
  async getSupportConversations(filters?: {
    status?: ConversationStatus;
    priority?: Priority;
    department?: string;
    assignedTo?: string;
    flaggedOnly?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: Conversation[]; total: number }> {
    try {
      let query = supabaseAdmin
        .from('conversations')
        .select('*', { count: 'exact' })
        .eq('type', 'support');

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.department) query = query.eq('department', filters.department);
      if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
      if (filters?.flaggedOnly) query = query.eq('ai_flagged', true);
      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,last_message_preview.ilike.%${filters.search}%`);
      }

      query = query.order('priority', { ascending: false })
                   .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.limit) query = query.limit(filters.limit);
      if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return { conversations: data || [], total: count || 0 };
    } catch (err) {
      console.error('Failed to get support conversations:', err);
      return { conversations: [], total: 0 };
    }
  }

  /**
   * Get participants info for a conversation
   */
  async getParticipants(conversationId: string): Promise<Map<string, { id: string; name: string; profilePicture?: string; businessName?: string }>> {
    try {
      const { data: conversation } = await supabaseAdmin
        .from('conversations')
        .select('participant_ids, business_id')
        .eq('id', conversationId)
        .single();

      if (!conversation?.participant_ids) return new Map();

      // Get user info for all participants
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, profile_picture')
        .in('id', conversation.participant_ids);

      // Get business info if exists
      let businessName: string | undefined;
      if (conversation.business_id) {
        const { data: business } = await supabaseAdmin
          .from('merchant_businesses')
          .select('name, logo')
          .eq('id', conversation.business_id)
          .single();
        businessName = business?.name;
      }

      const participantsMap = new Map();
      (users || []).forEach(u => {
        participantsMap.set(u.id, {
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown',
          profilePicture: u.profile_picture,
          businessName,
        });
      });

      return participantsMap;
    } catch (err) {
      console.error('Failed to get participants:', err);
      return new Map();
    }
  }

  /**
   * Update conversation status
   */
  async updateConversation(conversationId: string, updates: {
    status?: ConversationStatus;
    priority?: Priority;
    assignedTo?: string;
  }): Promise<boolean> {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.status) updateData.status = updates.status;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;

      const { error } = await supabaseAdmin
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update conversation:', err);
      return false;
    }
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string): Promise<boolean> {
    try {
      await this.sendMessage({
        conversationId,
        content: 'This conversation has been closed.',
        senderType: 'system',
        messageType: 'system',
      });

      return this.updateConversation(conversationId, { status: 'closed' });
    } catch (err) {
      console.error('Failed to close conversation:', err);
      return false;
    }
  }

  // ==========================================
  // MESSAGING
  // ==========================================

  /**
   * Send a message
   */
  async sendMessage(data: {
    conversationId: string;
    content: string;
    senderType?: SenderType;
    senderName?: string;
    senderBusinessId?: string;
    messageType?: MessageType;
    attachments?: Attachment[];
    replyToId?: string;
    metadata?: Record<string, any>;
  }): Promise<Message | null> {
    try {
      const user = await sessionService.validateSession();

      // Check for flagged content before sending
      const flagCheck = await this.checkMessageForFlags(data.content);

      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: data.conversationId,
          sender_id: user?.id,
          sender_type: data.senderType || 'user',
          sender_name: data.senderName,
          sender_business_id: data.senderBusinessId,
          content: data.content,
          message_type: data.messageType || 'text',
          attachments: data.attachments || [],
          reply_to_id: data.replyToId,
          metadata: data.metadata || {},
          ai_flagged: flagCheck.flagged,
          ai_flag_reason: flagCheck.reason,
          ai_analyzed: true,
        })
        .select()
        .single();

      if (error) throw error;

      // If flagged, create flag record and optionally block
      if (flagCheck.flagged) {
        await this.createFlagRecord(message, flagCheck);

        // If severity is critical, block the message
        if (flagCheck.severity === 'critical') {
          await supabaseAdmin
            .from('messages')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', message.id);

          // Flag the conversation
          await supabaseAdmin
            .from('conversations')
            .update({
              ai_flagged: true,
              ai_flag_reason: flagCheck.reason,
              status: 'flagged',
            })
            .eq('id', data.conversationId);
        }
      }

      // Broadcast message for real-time delivery to other participants
      this.broadcastMessage(data.conversationId, message);

      // Send notifications to other participants (don't await to not block message send)
      this.notifyParticipants(data.conversationId, message, user?.id);

      return message;
    } catch (err) {
      console.error('Failed to send message:', err);
      return null;
    }
  }

  /**
   * Send notifications to conversation participants
   */
  private async notifyParticipants(conversationId: string, message: Message, senderId?: string) {
    try {
      // Get conversation to find participants
      const { data: conversation } = await supabaseAdmin
        .from('conversations')
        .select('participant_ids, type, subject, business_id')
        .eq('id', conversationId)
        .single();

      if (!conversation?.participant_ids) return;

      // Filter out the sender
      const recipientIds = conversation.participant_ids.filter((id: string) => id !== senderId);

      // Send notification to each recipient
      for (const recipientId of recipientIds) {
        try {
          await notificationService.sendChatMessageNotification({
            userId: recipientId,
            senderName: message.sender_name || 'Someone',
            senderType: message.sender_type as 'user' | 'merchant' | 'admin' | 'support',
            conversationId,
            messagePreview: message.content,
            conversationType: conversation.type,
          });
        } catch (err) {
          console.error('Failed to send notification to:', recipientId, err);
        }
      }
    } catch (err) {
      console.error('Failed to notify participants:', err);
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get messages:', err);
      return [];
    }
  }

  /**
   * Subscribe to new messages (real-time)
   * Uses broadcast for reliable delivery (bypasses RLS issues with custom auth)
   */
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    console.log('[Realtime] Subscribing to messages for conversation:', conversationId);

    const channelName = `chat-${conversationId}`;

    const subscription = supabase
      .channel(channelName)
      // Listen for broadcast messages (from other users)
      .on('broadcast', { event: 'new_message' }, (payload) => {
        console.log('[Realtime] Broadcast message received:', payload.payload);
        callback(payload.payload as Message);
      })
      // Also try postgres_changes as fallback
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[Realtime] DB change received:', payload.new);
          callback(payload.new as Message);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to channel:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error');
        }
      });

    return () => {
      console.log('[Realtime] Unsubscribing from channel:', channelName);
      supabase.removeChannel(subscription);
    };
  }

  /**
   * Broadcast a message to all subscribers (for real-time delivery)
   */
  private async broadcastMessage(conversationId: string, message: Message) {
    try {
      const channelName = `chat-${conversationId}`;
      const channel = supabase.channel(channelName);

      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: message,
      });

      console.log('[Realtime] Message broadcasted to channel:', channelName);
    } catch (err) {
      console.error('[Realtime] Failed to broadcast message:', err);
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<boolean> {
    try {
      const user = await sessionService.validateSession();
      if (!user) return false;

      // Update participant's last read and reset unread count
      await supabaseAdmin
        .from('conversation_participants')
        .update({
          last_read_at: new Date().toISOString(),
          unread_count: 0,
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      return true;
    } catch (err) {
      console.error('Failed to mark as read:', err);
      return false;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const user = await sessionService.validateSession();

      const { error } = await supabaseAdmin
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete message:', err);
      return false;
    }
  }

  // ==========================================
  // AI MODERATION
  // ==========================================

  /**
   * Load flag keywords from database
   */
  private async loadFlagKeywords(): Promise<void> {
    if (this.keywordsLoaded) return;

    try {
      const { data } = await supabaseAdmin
        .from('ai_flag_keywords')
        .select('*')
        .eq('is_active', true);

      this.flagKeywords = data || [];
      this.keywordsLoaded = true;
    } catch (err) {
      console.error('Failed to load flag keywords:', err);
    }
  }

  /**
   * Check message content for flagged keywords
   */
  async checkMessageForFlags(content: string): Promise<{
    flagged: boolean;
    reason?: string;
    matchedKeywords: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: 'flag' | 'block' | 'notify_admin' | 'auto_delete';
  }> {
    await this.loadFlagKeywords();

    const lowerContent = content.toLowerCase();
    const matchedKeywords: string[] = [];
    let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let action: 'flag' | 'block' | 'notify_admin' | 'auto_delete' = 'flag';

    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };

    for (const keyword of this.flagKeywords) {
      let matched = false;

      if (keyword.is_regex) {
        try {
          const regex = new RegExp(keyword.keyword, 'i');
          matched = regex.test(content);
        } catch {
          // Invalid regex, skip
        }
      } else {
        matched = lowerContent.includes(keyword.keyword.toLowerCase());
      }

      if (matched) {
        matchedKeywords.push(keyword.keyword);
        if (severityOrder[keyword.severity] > severityOrder[highestSeverity]) {
          highestSeverity = keyword.severity;
          action = keyword.action;
        }
      }
    }

    return {
      flagged: matchedKeywords.length > 0,
      reason: matchedKeywords.length > 0
        ? `Matched keywords: ${matchedKeywords.join(', ')}`
        : undefined,
      matchedKeywords,
      severity: highestSeverity,
      action,
    };
  }

  /**
   * Create a flag record for review
   */
  private async createFlagRecord(message: Message, flagCheck: {
    reason?: string;
    matchedKeywords: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    try {
      await supabaseAdmin.from('flagged_messages').insert({
        message_id: message.id,
        conversation_id: message.conversation_id,
        flag_reason: flagCheck.reason || 'Suspicious content detected',
        matched_keywords: flagCheck.matchedKeywords,
        severity: flagCheck.severity,
        status: 'pending',
      });
    } catch (err) {
      console.error('Failed to create flag record:', err);
    }
  }

  /**
   * Get flagged messages for review
   */
  async getFlaggedMessages(filters?: {
    status?: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
  }): Promise<FlaggedMessage[]> {
    try {
      let query = supabaseAdmin
        .from('flagged_messages')
        .select(`
          *,
          messages(*),
          conversations(id, subject, type, participant_ids)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(f => ({
        ...f,
        message: f.messages,
        conversation: f.conversations,
      }));
    } catch (err) {
      console.error('Failed to get flagged messages:', err);
      return [];
    }
  }

  /**
   * Review a flagged message
   */
  async reviewFlaggedMessage(flagId: string, review: {
    status: 'reviewed' | 'dismissed' | 'action_taken';
    notes?: string;
    action?: 'none' | 'warning_sent' | 'message_deleted' | 'user_blocked' | 'escalated';
  }): Promise<boolean> {
    try {
      const user = await sessionService.validateSession();

      const { error } = await supabaseAdmin
        .from('flagged_messages')
        .update({
          status: review.status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: review.notes,
          action_taken: review.action,
        })
        .eq('id', flagId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to review flagged message:', err);
      return false;
    }
  }

  // ==========================================
  // CANNED RESPONSES
  // ==========================================

  /**
   * Get canned responses
   */
  async getCannedResponses(category?: string): Promise<CannedResponse[]> {
    try {
      let query = supabaseAdmin
        .from('canned_responses')
        .select('*')
        .eq('is_active', true)
        .order('use_count', { ascending: false });

      if (category) query = query.eq('category', category);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get canned responses:', err);
      return [];
    }
  }

  /**
   * Use a canned response (increments counter)
   */
  async useCannedResponse(responseId: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('canned_responses')
        .select('content, use_count')
        .eq('id', responseId)
        .single();

      if (error) throw error;

      // Increment use count
      await supabaseAdmin
        .from('canned_responses')
        .update({ use_count: (data.use_count || 0) + 1 })
        .eq('id', responseId);

      return data.content;
    } catch (err) {
      console.error('Failed to use canned response:', err);
      return null;
    }
  }

  /**
   * Create a canned response
   */
  async createCannedResponse(data: {
    title: string;
    content: string;
    shortcut?: string;
    category?: string;
    isGlobal?: boolean;
    businessId?: string;
  }): Promise<CannedResponse | null> {
    try {
      const user = await sessionService.validateSession();

      const { data: response, error } = await supabaseAdmin
        .from('canned_responses')
        .insert({
          title: data.title,
          content: data.content,
          shortcut: data.shortcut,
          category: data.category,
          is_global: data.isGlobal ?? true,
          business_id: data.businessId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return response;
    } catch (err) {
      console.error('Failed to create canned response:', err);
      return null;
    }
  }

  // ==========================================
  // AI KEYWORD MANAGEMENT
  // ==========================================

  /**
   * Get AI flag keywords (admin)
   */
  async getAIKeywords(): Promise<AIFlagKeyword[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_flag_keywords')
        .select('*')
        .order('severity', { ascending: false })
        .order('keyword');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get AI keywords:', err);
      return [];
    }
  }

  /**
   * Add AI flag keyword
   */
  async addAIKeyword(data: {
    keyword: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: 'flag' | 'block' | 'notify_admin' | 'auto_delete';
    isRegex?: boolean;
  }): Promise<AIFlagKeyword | null> {
    try {
      const user = await sessionService.validateSession();

      const { data: keyword, error } = await supabaseAdmin
        .from('ai_flag_keywords')
        .insert({
          keyword: data.keyword,
          category: data.category,
          severity: data.severity,
          action: data.action,
          is_regex: data.isRegex || false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Reload keywords cache
      this.keywordsLoaded = false;
      await this.loadFlagKeywords();

      return keyword;
    } catch (err) {
      console.error('Failed to add AI keyword:', err);
      return null;
    }
  }

  /**
   * Toggle AI keyword active status
   */
  async toggleAIKeyword(keywordId: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('ai_flag_keywords')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', keywordId);

      if (error) throw error;

      // Reload keywords cache
      this.keywordsLoaded = false;
      await this.loadFlagKeywords();

      return true;
    } catch (err) {
      console.error('Failed to toggle AI keyword:', err);
      return false;
    }
  }

  /**
   * Delete AI keyword
   */
  async deleteAIKeyword(keywordId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('ai_flag_keywords')
        .delete()
        .eq('id', keywordId);

      if (error) throw error;

      // Reload keywords cache
      this.keywordsLoaded = false;
      await this.loadFlagKeywords();

      return true;
    } catch (err) {
      console.error('Failed to delete AI keyword:', err);
      return false;
    }
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Get support statistics
   */
  async getSupportStats(): Promise<{
    total: number;
    open: number;
    flagged: number;
    avgResponseTime: number;
    byDepartment: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('status, department, ai_flagged, created_at, last_message_at')
        .eq('type', 'support');

      if (error) throw error;

      const conversations = data || [];

      return {
        total: conversations.length,
        open: conversations.filter(c => c.status === 'open').length,
        flagged: conversations.filter(c => c.ai_flagged).length,
        avgResponseTime: 0, // TODO: Calculate from first response
        byDepartment: conversations.reduce((acc, c) => {
          const dept = c.department || 'general';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (err) {
      console.error('Failed to get support stats:', err);
      return { total: 0, open: 0, flagged: 0, avgResponseTime: 0, byDepartment: {} };
    }
  }
}

export const conversationService = new ConversationService();
