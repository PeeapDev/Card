/**
 * Admin Notification Service
 *
 * Handles admin notifications for the superadmin dashboard
 * Includes card orders, KYC requests, disputes, business verification, etc.
 *
 * Uses IndexedDB for offline-first support with background sync to Supabase
 */

import { supabase } from '@/lib/supabase';
import {
  saveAdminNotifications,
  getAdminNotifications as getOfflineNotifications,
  getUnreadAdminNotifications,
  saveAdminNotification as saveOfflineNotification,
  markAdminNotificationAsRead as markOfflineAsRead,
  markAllAdminNotificationsAsRead,
  deleteAdminNotification as deleteOfflineNotification,
  getAdminNotificationUnreadCount,
  OfflineAdminNotification,
} from './indexeddb.service';

export type AdminNotificationType =
  | 'card_order'
  | 'kyc_request'
  | 'dispute'
  | 'system'
  | 'user_registration'
  | 'transaction_flagged'
  | 'support_ticket'
  | 'business_verification'
  | 'deposit'
  | 'payout'
  | 'withdrawal'
  | 'transfer'
  | 'cashout';

export type AdminNotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AdminNotificationStatus = 'unread' | 'read' | 'archived';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  priority: AdminNotificationPriority;
  status: AdminNotificationStatus;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  readBy?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminNotificationRequest {
  type: AdminNotificationType;
  title: string;
  message: string;
  priority?: AdminNotificationPriority;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}

export interface AdminNotificationFilters {
  type?: AdminNotificationType;
  status?: AdminNotificationStatus;
  priority?: AdminNotificationPriority;
  limit?: number;
  offset?: number;
}

// Map database row to AdminNotification type
const mapAdminNotification = (row: Record<string, unknown>): AdminNotification => ({
  id: row.id as string,
  type: row.type as AdminNotificationType,
  title: row.title as string,
  message: row.message as string,
  priority: (row.priority as AdminNotificationPriority) || 'medium',
  status: (row.status as AdminNotificationStatus) || 'unread',
  relatedEntityType: row.related_entity_type as string | undefined,
  relatedEntityId: row.related_entity_id as string | undefined,
  metadata: row.metadata as Record<string, unknown> | undefined,
  actionUrl: row.action_url as string | undefined,
  readBy: row.read_by as string | undefined,
  readAt: row.read_at as string | undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

// Map AdminNotification to offline format
const toOfflineFormat = (notification: AdminNotification): OfflineAdminNotification => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  priority: notification.priority,
  status: notification.status,
  related_entity_type: notification.relatedEntityType,
  related_entity_id: notification.relatedEntityId,
  metadata: notification.metadata,
  action_url: notification.actionUrl,
  read_by: notification.readBy,
  read_at: notification.readAt,
  created_at: notification.createdAt,
  updated_at: notification.updatedAt,
});

// Map offline format to AdminNotification
const fromOfflineFormat = (offline: OfflineAdminNotification): AdminNotification => ({
  id: offline.id,
  type: offline.type,
  title: offline.title,
  message: offline.message,
  priority: offline.priority,
  status: offline.status,
  relatedEntityType: offline.related_entity_type,
  relatedEntityId: offline.related_entity_id,
  metadata: offline.metadata,
  actionUrl: offline.action_url,
  readBy: offline.read_by,
  readAt: offline.read_at,
  createdAt: offline.created_at,
  updatedAt: offline.updated_at,
});

export const adminNotificationService = {
  /**
   * Get all admin notifications with optional filters
   * Uses IndexedDB first, then syncs with Supabase
   */
  async getNotifications(filters: AdminNotificationFilters = {}): Promise<AdminNotification[]> {
    try {
      // First try to get from IndexedDB (offline-first)
      let offlineNotifications = await getOfflineNotifications();

      // Apply filters
      if (filters.type) {
        offlineNotifications = offlineNotifications.filter(n => n.type === filters.type);
      }
      if (filters.status) {
        offlineNotifications = offlineNotifications.filter(n => n.status === filters.status);
      }
      if (filters.priority) {
        offlineNotifications = offlineNotifications.filter(n => n.priority === filters.priority);
      }

      // Apply limit and offset
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      offlineNotifications = offlineNotifications.slice(offset, offset + limit);

      // If we have offline data, return it immediately
      if (offlineNotifications.length > 0) {
        // Trigger background sync
        this.syncFromServer().catch(console.error);
        return offlineNotifications.map(fromOfflineFormat);
      }

      // Otherwise, fetch from server
      return this.fetchFromServer(filters);
    } catch (error) {
      console.error('Error getting notifications:', error);
      // Fallback to server
      return this.fetchFromServer(filters);
    }
  },

  /**
   * Fetch notifications from Supabase server
   */
  async fetchFromServer(filters: AdminNotificationFilters = {}): Promise<AdminNotification[]> {
    let query = supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin notifications:', error);
      return [];
    }

    const notifications = (data || []).map(mapAdminNotification);

    // Save to IndexedDB for offline access
    try {
      await saveAdminNotifications(notifications.map(toOfflineFormat));
    } catch (e) {
      console.error('Error saving to IndexedDB:', e);
    }

    return notifications;
  },

  /**
   * Sync notifications from server to IndexedDB
   */
  async syncFromServer(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error syncing from server:', error);
        return;
      }

      const notifications = (data || []).map(mapAdminNotification);
      await saveAdminNotifications(notifications.map(toOfflineFormat));
    } catch (error) {
      console.error('Error syncing notifications:', error);
    }
  },

  /**
   * Get unread notification count
   * Uses IndexedDB first for instant response
   */
  async getUnreadCount(): Promise<number> {
    try {
      // First get from IndexedDB for instant response
      const offlineCount = await getAdminNotificationUnreadCount();

      // Trigger background sync
      this.syncFromServer().catch(console.error);

      // If we have offline data, return it
      if (offlineCount > 0) {
        return offlineCount;
      }

      // Otherwise get from server
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unread');

      if (error) {
        console.error('Error fetching unread count:', error);
        return offlineCount;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  /**
   * Get notification counts by type
   */
  async getCountsByType(): Promise<Record<AdminNotificationType, number>> {
    try {
      // Get from IndexedDB first
      const offlineNotifications = await getUnreadAdminNotifications();
      const counts: Record<string, number> = {};

      offlineNotifications.forEach((item) => {
        counts[item.type] = (counts[item.type] || 0) + 1;
      });

      // Trigger background sync
      this.syncFromServer().catch(console.error);

      return counts as Record<AdminNotificationType, number>;
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      return {} as Record<AdminNotificationType, number>;
    }
  },

  /**
   * Get a single notification by ID
   */
  async getNotification(id: string): Promise<AdminNotification> {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching notification:', error);
      throw new Error(error.message);
    }

    return mapAdminNotification(data);
  },

  /**
   * Mark a notification as read
   * Updates both IndexedDB and Supabase
   */
  async markAsRead(id: string, adminId: string): Promise<AdminNotification> {
    // Update IndexedDB first (optimistic update)
    try {
      await markOfflineAsRead(id, adminId);
    } catch (e) {
      console.error('Error updating IndexedDB:', e);
    }

    // Then update server
    const { data, error } = await supabase
      .from('admin_notifications')
      .update({
        status: 'read',
        read_by: adminId,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message);
    }

    return mapAdminNotification(data);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(adminId: string): Promise<void> {
    // Update IndexedDB first
    try {
      await markAllAdminNotificationsAsRead(adminId);
    } catch (e) {
      console.error('Error updating IndexedDB:', e);
    }

    // Then update server
    const { error } = await supabase
      .from('admin_notifications')
      .update({
        status: 'read',
        read_by: adminId,
        read_at: new Date().toISOString(),
      })
      .eq('status', 'unread');

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Archive a notification
   */
  async archiveNotification(id: string): Promise<AdminNotification> {
    const { data, error } = await supabase
      .from('admin_notifications')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving notification:', error);
      throw new Error(error.message);
    }

    // Update IndexedDB
    try {
      await saveOfflineNotification(toOfflineFormat(mapAdminNotification(data)));
    } catch (e) {
      console.error('Error updating IndexedDB:', e);
    }

    return mapAdminNotification(data);
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    // Delete from IndexedDB first
    try {
      await deleteOfflineNotification(id);
    } catch (e) {
      console.error('Error deleting from IndexedDB:', e);
    }

    // Then delete from server
    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Create a new admin notification
   */
  async createNotification(data: CreateAdminNotificationRequest): Promise<AdminNotification> {
    const { data: notification, error } = await supabase
      .from('admin_notifications')
      .insert({
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'medium',
        related_entity_type: data.relatedEntityType,
        related_entity_id: data.relatedEntityId,
        metadata: data.metadata,
        action_url: data.actionUrl,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error(error.message);
    }

    const mapped = mapAdminNotification(notification);

    // Save to IndexedDB
    try {
      await saveOfflineNotification(toOfflineFormat(mapped));
    } catch (e) {
      console.error('Error saving to IndexedDB:', e);
    }

    return mapped;
  },

  /**
   * Create a business verification notification
   */
  async createBusinessVerificationNotification(params: {
    businessId: string;
    businessName: string;
    ownerName: string;
  }): Promise<AdminNotification> {
    return this.createNotification({
      type: 'business_verification',
      title: 'New Business Verification Request',
      message: `${params.businessName} by ${params.ownerName} needs verification`,
      priority: 'high',
      relatedEntityType: 'business',
      relatedEntityId: params.businessId,
      actionUrl: `/admin/businesses/${params.businessId}`,
      metadata: {
        businessName: params.businessName,
        ownerName: params.ownerName,
      },
    });
  },

  /**
   * Subscribe to new admin notifications (real-time)
   */
  subscribeToNotifications(callback: (notification: AdminNotification) => void) {
    const channel = supabase
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        async (payload) => {
          const notification = mapAdminNotification(payload.new as Record<string, unknown>);

          // Save to IndexedDB
          try {
            await saveOfflineNotification(toOfflineFormat(notification));
          } catch (e) {
            console.error('Error saving to IndexedDB:', e);
          }

          callback(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get pending business verifications count
   */
  async getPendingBusinessVerificationsCount(): Promise<number> {
    try {
      // Try IndexedDB first
      const offlineNotifications = await getUnreadAdminNotifications();
      const businessVerifications = offlineNotifications.filter(
        n => n.type === 'business_verification'
      );

      if (businessVerifications.length > 0) {
        return businessVerifications.length;
      }

      // Fallback to server
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'business_verification')
        .eq('status', 'unread');

      if (error) {
        console.error('Error fetching business verification count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting business verification count:', error);
      return 0;
    }
  },

  /**
   * Create a deposit notification for admin
   */
  async createDepositNotification(params: {
    transactionId: string;
    userId: string;
    userName: string;
    amount: number;
    currency: string;
    method?: string;
  }): Promise<AdminNotification> {
    return this.createNotification({
      type: 'deposit',
      title: 'New Deposit Received',
      message: `${params.userName} deposited ${params.currency} ${params.amount.toLocaleString()}${params.method ? ` via ${params.method}` : ''}`,
      priority: params.amount >= 10000 ? 'high' : 'medium',
      relatedEntityType: 'transaction',
      relatedEntityId: params.transactionId,
      actionUrl: `/admin/transactions?id=${params.transactionId}`,
      metadata: {
        userId: params.userId,
        userName: params.userName,
        amount: params.amount,
        currency: params.currency,
        method: params.method,
      },
    });
  },

  /**
   * Create a payout/withdrawal notification for admin
   */
  async createPayoutNotification(params: {
    transactionId: string;
    userId: string;
    userName: string;
    amount: number;
    currency: string;
    method?: string;
    destination?: string;
  }): Promise<AdminNotification> {
    return this.createNotification({
      type: 'payout',
      title: 'New Payout Request',
      message: `${params.userName} requested ${params.currency} ${params.amount.toLocaleString()} payout${params.destination ? ` to ${params.destination}` : ''}`,
      priority: params.amount >= 10000 ? 'high' : 'medium',
      relatedEntityType: 'transaction',
      relatedEntityId: params.transactionId,
      actionUrl: `/admin/transactions?id=${params.transactionId}`,
      metadata: {
        userId: params.userId,
        userName: params.userName,
        amount: params.amount,
        currency: params.currency,
        method: params.method,
        destination: params.destination,
      },
    });
  },

  /**
   * Create a P2P transfer notification for admin
   */
  async createTransferNotification(params: {
    transactionId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    recipientName: string;
    amount: number;
    currency: string;
  }): Promise<AdminNotification> {
    return this.createNotification({
      type: 'transfer',
      title: 'P2P Transfer',
      message: `${params.senderName} sent ${params.currency} ${params.amount.toLocaleString()} to ${params.recipientName}`,
      priority: params.amount >= 10000 ? 'high' : 'low',
      relatedEntityType: 'transaction',
      relatedEntityId: params.transactionId,
      actionUrl: `/admin/transactions?id=${params.transactionId}`,
      metadata: {
        senderId: params.senderId,
        senderName: params.senderName,
        recipientId: params.recipientId,
        recipientName: params.recipientName,
        amount: params.amount,
        currency: params.currency,
      },
    });
  },

  /**
   * Subscribe to transaction changes for deposits and payouts
   * Uses the actual 'transactions' table with correct types
   */
  subscribeToTransactions(callback: (notification: AdminNotification) => void) {
    const channel = supabase
      .channel('admin_transaction_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        async (payload) => {
          const tx = payload.new as Record<string, unknown>;
          const type = tx.type as string;
          const userId = tx.user_id as string;

          if (!userId) return;

          // Get user info from users table
          let userName = 'Unknown User';
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name, phone')
            .eq('id', userId)
            .single();
          if (userData) {
            userName = userData.first_name
              ? `${userData.first_name} ${userData.last_name || ''}`.trim()
              : userData.phone || 'Unknown User';
          }

          const amount = Math.abs((tx.amount as number) || 0);
          const currency = (tx.currency as string) || 'SLE';
          const transactionId = tx.id as string;

          let notification: AdminNotification;

          // Handle different transaction types
          if (type === 'PAYMENT_RECEIVED') {
            notification = await this.createDepositNotification({
              transactionId,
              userId,
              userName,
              amount,
              currency,
              method: 'Payment',
            });
            callback(notification);
          } else if (type === 'MOBILE_MONEY_SEND') {
            notification = await this.createPayoutNotification({
              transactionId,
              userId,
              userName,
              amount,
              currency,
              method: 'Mobile Money',
              destination: 'Mobile Money',
            });
            callback(notification);
          } else if (type === 'TRANSFER') {
            // Get sender/recipient info from metadata
            const metadata = tx.metadata as Record<string, unknown> || {};
            const senderName = (metadata.sender_name as string) || userName;
            const recipientName = (metadata.recipient_name as string) || 'Unknown';
            const senderId = (metadata.sender_id as string) || userId;
            const recipientId = (metadata.recipient_id as string) || '';

            // Only create notification for outgoing transfers (negative amount)
            const txAmount = tx.amount as number;
            if (txAmount < 0) {
              notification = await this.createTransferNotification({
                transactionId,
                senderId,
                senderName,
                recipientId,
                recipientName,
                amount,
                currency,
              });
              callback(notification);
            }
          } else if (type === 'DEPOSIT') {
            // Handle deposit transactions
            notification = await this.createDepositNotification({
              transactionId,
              userId,
              userName,
              amount,
              currency,
              method: 'Mobile Money',
            });
            callback(notification);
          } else if (type === 'CASHOUT') {
            // User cashout/withdrawal
            notification = await this.createPayoutNotification({
              transactionId,
              userId,
              userName,
              amount,
              currency,
              method: 'Cashout',
              destination: 'Mobile Money',
            });
            callback(notification);
          } else if (type === 'MERCHANT_WITHDRAWAL') {
            // Merchant withdrawal
            notification = await this.createPayoutNotification({
              transactionId,
              userId,
              userName,
              amount,
              currency,
              method: 'Merchant Withdrawal',
              destination: 'Bank/Mobile Money',
            });
            callback(notification);
          } else if (type === 'CARD_PURCHASE') {
            // Card purchase - create a simple notification
            notification = {
              id: `card-${transactionId}`,
              type: 'card_order',
              title: 'Card Purchased',
              message: `${userName} purchased a virtual card for ${currency} ${amount.toLocaleString()}`,
              priority: 'low',
              status: 'unread',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {
                transactionId,
                userId,
                amount,
                currency,
              },
            };
            callback(notification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get pending businesses that need verification (direct query)
   */
  async getPendingBusinesses(): Promise<Array<{id: string; name: string; ownerName: string; createdAt: string}>> {
    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('id, name, merchant_id, created_at')
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching pending businesses:', error);
        return [];
      }

      return (data || []).map(b => ({
        id: b.id,
        name: b.name,
        ownerName: 'Merchant',
        createdAt: b.created_at,
      }));
    } catch (error) {
      console.error('Error fetching pending businesses:', error);
      return [];
    }
  },

  /**
   * Get count of pending business verifications (unverified businesses)
   */
  async getPendingBusinessCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('merchant_businesses')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false);

      if (error) {
        console.error('Error fetching pending business count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching pending business count:', error);
      return 0;
    }
  },

  /**
   * Get recent deposits for admin dashboard
   */
  async getRecentDeposits(limit: number = 10): Promise<Array<{id: string; amount: number; currency: string; userName: string; createdAt: string}>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, currency, user_id, created_at')
        .eq('type', 'PAYMENT_RECEIVED')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching deposits:', error);
        return [];
      }

      // Get user names
      const results = [];
      for (const tx of data || []) {
        let userName = 'Unknown';
        if (tx.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', tx.user_id)
            .single();
          if (profile) userName = profile.full_name || 'Unknown';
        }
        results.push({
          id: tx.id,
          amount: Math.abs(tx.amount),
          currency: tx.currency || 'SLE',
          userName,
          createdAt: tx.created_at,
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching deposits:', error);
      return [];
    }
  },

  /**
   * Get recent payouts/withdrawals for admin dashboard
   */
  async getRecentPayouts(limit: number = 10): Promise<Array<{id: string; amount: number; currency: string; userName: string; createdAt: string}>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, currency, user_id, created_at')
        .eq('type', 'MOBILE_MONEY_SEND')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching payouts:', error);
        return [];
      }

      // Get user names
      const results = [];
      for (const tx of data || []) {
        let userName = 'Unknown';
        if (tx.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', tx.user_id)
            .single();
          if (profile) userName = profile.full_name || 'Unknown';
        }
        results.push({
          id: tx.id,
          amount: Math.abs(tx.amount),
          currency: tx.currency || 'SLE',
          userName,
          createdAt: tx.created_at,
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching payouts:', error);
      return [];
    }
  },

  /**
   * Subscribe to new business registrations
   */
  subscribeToBusinesses(callback: (business: {id: string; name: string; ownerName: string}) => void) {
    const channel = supabase
      .channel('admin_business_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'merchant_businesses',
        },
        async (payload) => {
          const business = payload.new as Record<string, unknown>;
          callback({
            id: business.id as string,
            name: business.name as string,
            ownerName: 'Merchant',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
