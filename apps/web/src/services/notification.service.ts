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
  | 'pos_receipt'
  | 'refund_processed'
  | 'subscription_expiring'
  | 'feature_unlock'
  | 'event_reminder'
  | 'event_ticket_purchased'
  | 'event_staff_invitation'
  | 'event_starting_soon'
  | 'event_cancelled'
  | 'deposit_received'
  | 'deposit_completed'
  | 'deposit_failed'
  | 'withdrawal_initiated'
  | 'withdrawal_completed'
  | 'withdrawal_failed'
  | 'transfer_received'
  | 'transfer_sent';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type SourceService = 'pos' | 'wallet' | 'kyc' | 'payment' | 'auth' | 'system' | 'payout' | 'subscription' | 'events';

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

  /**
   * Send POS receipt notification to customer
   */
  async sendReceiptNotification(params: {
    recipientPhone: string;
    businessName: string;
    businessPhone?: string;
    saleNumber: string;
    totalAmount: number;
    currency: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    paymentMethod: string;
    saleId?: string;
    cashierName?: string;
  }): Promise<{ success: boolean; method: 'app' | 'sms'; error?: string }> {
    try {
      // Format receipt message
      const itemsList = params.items
        .map(item => `• ${item.name} x${item.quantity} - ${params.currency} ${(item.price * item.quantity).toLocaleString()}`)
        .join('\n');

      const receiptMessage = `Receipt from ${params.businessName}

Receipt #: ${params.saleNumber}
Date: ${new Date().toLocaleString()}
${params.cashierName ? `Served by: ${params.cashierName}` : ''}

Items:
${itemsList}

Total: ${params.currency} ${params.totalAmount.toLocaleString()}
Paid via: ${params.paymentMethod.replace('_', ' ')}

Thank you for your purchase!
${params.businessPhone ? `Contact: ${params.businessPhone}` : ''}`;

      // Try to find user by phone number
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, phone')
        .eq('phone', params.recipientPhone)
        .single();

      if (userProfile?.id) {
        // User exists - send in-app notification
        await this.create({
          userId: userProfile.id,
          type: 'pos_receipt',
          title: `Receipt from ${params.businessName}`,
          message: `Your purchase of ${params.currency} ${params.totalAmount.toLocaleString()} - Receipt #${params.saleNumber}`,
          icon: 'Receipt',
          actionData: {
            saleNumber: params.saleNumber,
            totalAmount: params.totalAmount,
            currency: params.currency,
            businessName: params.businessName,
            businessPhone: params.businessPhone,
            items: params.items,
            paymentMethod: params.paymentMethod,
            fullReceipt: receiptMessage,
          },
          sourceService: 'pos',
          sourceId: params.saleId,
          priority: 'normal',
        });

        return { success: true, method: 'app' };
      }

      // User not found - send via SMS API
      const smsResult = await this.sendSMS(params.recipientPhone, receiptMessage);
      return { success: smsResult.success, method: 'sms', error: smsResult.error };

    } catch (error) {
      console.error('[NotificationService] SendReceipt error:', error);
      return { success: false, method: 'sms', error: 'Failed to send receipt' };
    }
  }

  /**
   * Send SMS via API
   */
  private async sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Format phone number (Sierra Leone)
      let formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '232');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      // Call SMS API endpoint
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formattedPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'SMS sending failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('[NotificationService] SMS error:', error);
      return { success: false, error: 'SMS service unavailable' };
    }
  }

  // ============================================
  // Event notification helpers
  // ============================================

  /**
   * Send event reminder notification
   */
  async sendEventReminder(params: {
    userId: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    venueName?: string;
    hoursUntilEvent: number;
  }): Promise<Notification> {
    const timeLabel = params.hoursUntilEvent <= 1
      ? 'in 1 hour'
      : params.hoursUntilEvent <= 24
      ? `in ${params.hoursUntilEvent} hours`
      : `in ${Math.ceil(params.hoursUntilEvent / 24)} days`;

    return this.create({
      userId: params.userId,
      type: 'event_reminder',
      title: 'Event Reminder',
      message: `${params.eventTitle} starts ${timeLabel}${params.venueName ? ` at ${params.venueName}` : ''}`,
      icon: 'Calendar',
      actionUrl: `/events/${params.eventId}`,
      actionData: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        eventDate: params.eventDate,
        venueName: params.venueName,
        hoursUntilEvent: params.hoursUntilEvent,
      },
      sourceService: 'events',
      sourceId: params.eventId,
      priority: params.hoursUntilEvent <= 1 ? 'high' : 'normal',
    });
  }

  /**
   * Send event starting soon notification
   */
  async sendEventStartingSoon(params: {
    userId: string;
    eventId: string;
    eventTitle: string;
    venueName?: string;
    ticketNumber: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'event_starting_soon',
      title: 'Event Starting Soon!',
      message: `${params.eventTitle} is starting now${params.venueName ? ` at ${params.venueName}` : ''}. Your ticket: ${params.ticketNumber}`,
      icon: 'Clock',
      actionUrl: `/my-tickets`,
      actionData: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        venueName: params.venueName,
        ticketNumber: params.ticketNumber,
      },
      sourceService: 'events',
      sourceId: params.eventId,
      priority: 'high',
    });
  }

  /**
   * Send ticket purchased notification
   */
  async sendTicketPurchased(params: {
    userId: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    ticketCount: number;
    ticketType: string;
    totalAmount: number;
    currency: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'event_ticket_purchased',
      title: 'Tickets Purchased!',
      message: `You purchased ${params.ticketCount} ${params.ticketType} ticket${params.ticketCount > 1 ? 's' : ''} for ${params.eventTitle}`,
      icon: 'Ticket',
      actionUrl: `/my-tickets`,
      actionData: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        eventDate: params.eventDate,
        ticketCount: params.ticketCount,
        ticketType: params.ticketType,
        totalAmount: params.totalAmount,
        currency: params.currency,
      },
      sourceService: 'events',
      sourceId: params.eventId,
      priority: 'normal',
    });
  }

  /**
   * Send event staff invitation notification
   */
  async sendEventStaffInvitation(params: {
    userId: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    merchantName: string;
    staffId: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'event_staff_invitation',
      title: 'Event Staff Invitation',
      message: `You've been invited to scan tickets at ${params.eventTitle} by ${params.merchantName}`,
      icon: 'UserPlus',
      actionUrl: `/dashboard/pos`,
      actionData: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        eventDate: params.eventDate,
        merchantName: params.merchantName,
        staffId: params.staffId,
        responded: false,
      },
      sourceService: 'events',
      sourceId: params.staffId,
      priority: 'high',
    });
  }

  /**
   * Send event cancelled notification
   */
  async sendEventCancelled(params: {
    userId: string;
    eventId: string;
    eventTitle: string;
    refundInfo?: string;
  }): Promise<Notification> {
    return this.create({
      userId: params.userId,
      type: 'event_cancelled',
      title: 'Event Cancelled',
      message: `${params.eventTitle} has been cancelled.${params.refundInfo ? ` ${params.refundInfo}` : ''}`,
      icon: 'XCircle',
      actionUrl: `/my-tickets`,
      actionData: {
        eventId: params.eventId,
        eventTitle: params.eventTitle,
        refundInfo: params.refundInfo,
      },
      sourceService: 'events',
      sourceId: params.eventId,
      priority: 'high',
    });
  }

  /**
   * Schedule event reminders for a user's tickets
   * This should be called by a background job
   */
  async scheduleEventReminders(params: {
    userId: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    venueName?: string;
  }): Promise<void> {
    const eventTime = new Date(params.eventDate).getTime();
    const now = Date.now();

    // Define reminder intervals (24 hours, 2 hours, 1 hour before)
    const reminderIntervals = [
      { hours: 24, label: '24 hours' },
      { hours: 2, label: '2 hours' },
      { hours: 1, label: '1 hour' },
    ];

    for (const interval of reminderIntervals) {
      const reminderTime = eventTime - (interval.hours * 60 * 60 * 1000);

      // Only schedule if reminder time is in the future
      if (reminderTime > now) {
        // Store scheduled reminder in database
        await supabase
          .from('scheduled_notifications')
          .upsert({
            user_id: params.userId,
            event_id: params.eventId,
            reminder_type: `event_reminder_${interval.hours}h`,
            scheduled_for: new Date(reminderTime).toISOString(),
            notification_data: {
              userId: params.userId,
              eventId: params.eventId,
              eventTitle: params.eventTitle,
              eventDate: params.eventDate,
              venueName: params.venueName,
              hoursUntilEvent: interval.hours,
            },
            status: 'pending',
          }, {
            onConflict: 'user_id,event_id,reminder_type',
          });
      }
    }
  }

  // ============================================
  // Deposit/Withdrawal/Transfer notification helpers
  // ============================================

  /**
   * Send deposit notification
   */
  async sendDepositNotification(params: {
    userId: string;
    amount: number;
    currency: string;
    status: 'received' | 'completed' | 'failed';
    transactionId: string;
    method?: string;
    reason?: string;
  }): Promise<Notification> {
    const statusConfig = {
      received: {
        type: 'deposit_received' as NotificationType,
        title: 'Deposit Received',
        message: `Your deposit of ${params.currency} ${params.amount.toLocaleString()}${params.method ? ` via ${params.method}` : ''} is being processed.`,
        icon: 'ArrowDownLeft',
        priority: 'normal' as NotificationPriority,
      },
      completed: {
        type: 'deposit_completed' as NotificationType,
        title: 'Deposit Completed',
        message: `${params.currency} ${params.amount.toLocaleString()} has been added to your wallet.`,
        icon: 'CheckCircle',
        priority: 'normal' as NotificationPriority,
      },
      failed: {
        type: 'deposit_failed' as NotificationType,
        title: 'Deposit Failed',
        message: `Your deposit of ${params.currency} ${params.amount.toLocaleString()} failed.${params.reason ? ` Reason: ${params.reason}` : ''}`,
        icon: 'XCircle',
        priority: 'high' as NotificationPriority,
      },
    };

    const config = statusConfig[params.status];

    return this.create({
      userId: params.userId,
      type: config.type,
      title: config.title,
      message: config.message,
      icon: config.icon,
      actionUrl: '/dashboard/transactions',
      actionData: {
        amount: params.amount,
        currency: params.currency,
        status: params.status,
        transactionId: params.transactionId,
        method: params.method,
      },
      sourceService: 'wallet',
      sourceId: params.transactionId,
      priority: config.priority,
    });
  }

  /**
   * Send withdrawal notification
   */
  async sendWithdrawalNotification(params: {
    userId: string;
    amount: number;
    currency: string;
    status: 'initiated' | 'completed' | 'failed';
    transactionId: string;
    destination?: string;
    reason?: string;
  }): Promise<Notification> {
    const statusConfig = {
      initiated: {
        type: 'withdrawal_initiated' as NotificationType,
        title: 'Withdrawal Initiated',
        message: `Your withdrawal of ${params.currency} ${params.amount.toLocaleString()}${params.destination ? ` to ${params.destination}` : ''} is being processed.`,
        icon: 'ArrowUpRight',
        priority: 'normal' as NotificationPriority,
      },
      completed: {
        type: 'withdrawal_completed' as NotificationType,
        title: 'Withdrawal Completed',
        message: `${params.currency} ${params.amount.toLocaleString()} has been sent${params.destination ? ` to ${params.destination}` : ''}.`,
        icon: 'CheckCircle',
        priority: 'normal' as NotificationPriority,
      },
      failed: {
        type: 'withdrawal_failed' as NotificationType,
        title: 'Withdrawal Failed',
        message: `Your withdrawal of ${params.currency} ${params.amount.toLocaleString()} failed.${params.reason ? ` Reason: ${params.reason}` : ''}`,
        icon: 'XCircle',
        priority: 'high' as NotificationPriority,
      },
    };

    const config = statusConfig[params.status];

    return this.create({
      userId: params.userId,
      type: config.type,
      title: config.title,
      message: config.message,
      icon: config.icon,
      actionUrl: '/dashboard/transactions',
      actionData: {
        amount: params.amount,
        currency: params.currency,
        status: params.status,
        transactionId: params.transactionId,
        destination: params.destination,
      },
      sourceService: 'wallet',
      sourceId: params.transactionId,
      priority: config.priority,
    });
  }

  /**
   * Send transfer notification
   */
  async sendTransferNotification(params: {
    userId: string;
    amount: number;
    currency: string;
    direction: 'received' | 'sent';
    counterpartyName?: string;
    transactionId: string;
  }): Promise<Notification> {
    const directionConfig = {
      received: {
        type: 'transfer_received' as NotificationType,
        title: 'Transfer Received',
        message: `You received ${params.currency} ${params.amount.toLocaleString()}${params.counterpartyName ? ` from ${params.counterpartyName}` : ''}.`,
        icon: 'ArrowDownLeft',
      },
      sent: {
        type: 'transfer_sent' as NotificationType,
        title: 'Transfer Sent',
        message: `You sent ${params.currency} ${params.amount.toLocaleString()}${params.counterpartyName ? ` to ${params.counterpartyName}` : ''}.`,
        icon: 'ArrowUpRight',
      },
    };

    const config = directionConfig[params.direction];

    return this.create({
      userId: params.userId,
      type: config.type,
      title: config.title,
      message: config.message,
      icon: config.icon,
      actionUrl: '/dashboard/transactions',
      actionData: {
        amount: params.amount,
        currency: params.currency,
        direction: params.direction,
        counterpartyName: params.counterpartyName,
        transactionId: params.transactionId,
      },
      sourceService: 'wallet',
      sourceId: params.transactionId,
      priority: 'normal',
    });
  }
}

export const notificationService = new NotificationService();
