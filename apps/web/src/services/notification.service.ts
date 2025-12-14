/**
 * Notification Service
 *
 * Cross-service notification system for all Peeap applications.
 * Supports various notification types and can be used by any service.
 */

import { supabase } from '@/lib/supabase';

// Notification types
export type NotificationType =
  | 'staff_invitation'
  | 'payment_received'
  | 'payment_sent'
  | 'kyc_update'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'transaction_alert'
  | 'low_balance'
  | 'system_announcement'
  | 'promotion'
  | 'security_alert'
  | 'login_alert'
  | 'payout_completed'
  | 'payout_failed'
  | 'pos_sale'
  | 'refund_processed'
  | 'subscription_expiring'
  | 'feature_unlock';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type SourceService = 'pos' | 'wallet' | 'kyc' | 'payment' | 'auth' | 'system' | 'payout' | 'subscription';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  action_url?: string;
  action_data?: Record<string, any>;
  source_service?: SourceService;
  source_id?: string;
  is_read: boolean;
  read_at?: string;
  priority: NotificationPriority;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  actionData?: Record<string, any>;
  sourceService?: SourceService;
  sourceId?: string;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  sourceService?: SourceService;
  priority?: NotificationPriority;
}

class NotificationService {
  /**
   * Create a new notification for a user
   */
  async create(params: CreateNotificationParams): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        icon: params.icon,
        action_url: params.actionUrl,
        action_data: params.actionData,
        source_service: params.sourceService,
        source_id: params.sourceId,
        priority: params.priority || 'normal',
        expires_at: params.expiresAt?.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[NotificationService] Create error:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get notifications for a user
   */
  async getForUser(
    userId: string,
    filters?: NotificationFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: Notification[]; total: number }> {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }
    if (filters?.sourceService) {
      query = query.eq('source_service', filters.sourceService);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[NotificationService] GetForUser error:', error);
      throw error;
    }

    return {
      notifications: data || [],
      total: count || 0,
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[NotificationService] GetUnreadCount error:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] MarkAsRead error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[NotificationService] MarkAllAsRead error:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] Delete error:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) {
      console.error('[NotificationService] DeleteAllRead error:', error);
      throw error;
    }
  }

  /**
   * Update a notification
   */
  async update(notificationId: string, updates: Partial<Pick<Notification, 'is_read' | 'action_data'>>): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] Update error:', error);
      throw error;
    }
  }

  // ============================================
  // Helper methods for common notification types
  // ============================================

  /**
   * Send staff invitation notification
   */
  async sendStaffInvitation(params: {
    userId: string;
    merchantName: string;
    role: string;
    merchantId: string;
    staffId: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'staff_invitation',
      title: 'Staff Invitation',
      message: `You've been invited to join ${params.merchantName} as a ${params.role}. Accept or decline the invitation below.`,
      icon: 'UserPlus',
      actionUrl: `/dashboard/staff/setup-pin?merchant=${params.merchantId}`,
      actionData: {
        staffId: params.staffId,
        merchantId: params.merchantId,
        merchantName: params.merchantName,
        role: params.role,
        responded: false,
      },
      sourceService: 'pos',
      sourceId: params.staffId,
      priority: 'high',
    });
  }

  /**
   * Send payment received notification
   */
  async sendPaymentReceived(params: {
    userId: string;
    amount: number;
    currency: string;
    senderName: string;
    transactionId: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `You received ${params.currency} ${params.amount.toLocaleString()} from ${params.senderName}`,
      icon: 'ArrowDownLeft',
      actionUrl: `/dashboard/transactions/${params.transactionId}`,
      actionData: {
        amount: params.amount,
        currency: params.currency,
        senderName: params.senderName,
        transactionId: params.transactionId,
      },
      sourceService: 'wallet',
      sourceId: params.transactionId,
      priority: 'normal',
    });
  }

  /**
   * Send payment sent notification
   */
  async sendPaymentSent(params: {
    userId: string;
    amount: number;
    currency: string;
    recipientName: string;
    transactionId: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'payment_sent',
      title: 'Payment Sent',
      message: `You sent ${params.currency} ${params.amount.toLocaleString()} to ${params.recipientName}`,
      icon: 'ArrowUpRight',
      actionUrl: `/dashboard/transactions/${params.transactionId}`,
      actionData: {
        amount: params.amount,
        currency: params.currency,
        recipientName: params.recipientName,
        transactionId: params.transactionId,
      },
      sourceService: 'wallet',
      sourceId: params.transactionId,
      priority: 'normal',
    });
  }

  /**
   * Send KYC status update notification
   */
  async sendKycUpdate(params: {
    userId: string;
    status: 'approved' | 'rejected' | 'pending_review';
    tier?: number;
    reason?: string;
  }): Promise<Notification> {
    const statusMessages = {
      approved: `Your KYC verification has been approved${params.tier ? `. You are now Tier ${params.tier}` : ''}.`,
      rejected: `Your KYC verification was not approved.${params.reason ? ` Reason: ${params.reason}` : ''}`,
      pending_review: 'Your KYC documents are being reviewed. We\'ll notify you once complete.',
    };

    return this.create({
      userId: params.userId,
      type: params.status === 'approved' ? 'kyc_approved' : params.status === 'rejected' ? 'kyc_rejected' : 'kyc_update',
      title: 'KYC Verification Update',
      message: statusMessages[params.status],
      icon: params.status === 'approved' ? 'CheckCircle' : params.status === 'rejected' ? 'XCircle' : 'Clock',
      actionUrl: '/dashboard/settings/kyc',
      actionData: {
        status: params.status,
        tier: params.tier,
        reason: params.reason,
      },
      sourceService: 'kyc',
      priority: params.status === 'approved' ? 'high' : 'normal',
    });
  }

  /**
   * Send security alert notification
   */
  async sendSecurityAlert(params: {
    userId: string;
    alertType: 'new_login' | 'password_changed' | 'suspicious_activity';
    details?: string;
    ipAddress?: string;
    location?: string;
  }): Promise<Notification> {
    const alertMessages = {
      new_login: `New login detected${params.location ? ` from ${params.location}` : ''}${params.ipAddress ? ` (IP: ${params.ipAddress})` : ''}`,
      password_changed: 'Your password was changed. If this wasn\'t you, contact support immediately.',
      suspicious_activity: `Suspicious activity detected on your account.${params.details ? ` ${params.details}` : ''}`,
    };

    return this.create({
      userId: params.userId,
      type: 'security_alert',
      title: 'Security Alert',
      message: alertMessages[params.alertType],
      icon: 'Shield',
      actionUrl: '/dashboard/settings/security',
      actionData: {
        alertType: params.alertType,
        ipAddress: params.ipAddress,
        location: params.location,
      },
      sourceService: 'auth',
      priority: 'urgent',
    });
  }

  /**
   * Send system announcement
   */
  async sendSystemAnnouncement(params: {
    userId: string;
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'system_announcement',
      title: params.title,
      message: params.message,
      icon: 'Megaphone',
      actionUrl: params.actionUrl,
      sourceService: 'system',
      priority: 'normal',
    });
  }

  /**
   * Send payout notification
   */
  async sendPayoutNotification(params: {
    userId: string;
    status: 'completed' | 'failed';
    amount: number;
    currency: string;
    accountInfo?: string;
    reason?: string;
    transactionId: string;
  }): Promise<Notification> {
    const message = params.status === 'completed'
      ? `Your payout of ${params.currency} ${params.amount.toLocaleString()}${params.accountInfo ? ` to ${params.accountInfo}` : ''} was successful.`
      : `Your payout of ${params.currency} ${params.amount.toLocaleString()} failed.${params.reason ? ` Reason: ${params.reason}` : ''}`;

    return this.create({
      userId: params.userId,
      type: params.status === 'completed' ? 'payout_completed' : 'payout_failed',
      title: params.status === 'completed' ? 'Payout Successful' : 'Payout Failed',
      message,
      icon: params.status === 'completed' ? 'CheckCircle' : 'XCircle',
      actionUrl: `/merchant/payouts/${params.transactionId}`,
      actionData: {
        status: params.status,
        amount: params.amount,
        currency: params.currency,
        accountInfo: params.accountInfo,
        reason: params.reason,
      },
      sourceService: 'payout',
      sourceId: params.transactionId,
      priority: params.status === 'failed' ? 'high' : 'normal',
    });
  }
}

export const notificationService = new NotificationService();
