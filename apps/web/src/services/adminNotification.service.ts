/**
 * Admin Notification Service
 *
 * Handles admin notifications for the superadmin dashboard
 * Includes card orders, KYC requests, disputes, etc.
 */

import { supabase } from '@/lib/supabase';

export type AdminNotificationType =
  | 'card_order'
  | 'kyc_request'
  | 'dispute'
  | 'system'
  | 'user_registration'
  | 'transaction_flagged'
  | 'support_ticket';

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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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
const mapAdminNotification = (row: any): AdminNotification => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  priority: row.priority || 'medium',
  status: row.status || 'unread',
  relatedEntityType: row.related_entity_type,
  relatedEntityId: row.related_entity_id,
  metadata: row.metadata,
  actionUrl: row.action_url,
  readBy: row.read_by,
  readAt: row.read_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const adminNotificationService = {
  /**
   * Get all admin notifications with optional filters
   */
  async getNotifications(filters: AdminNotificationFilters = {}): Promise<AdminNotification[]> {

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
      // Don't throw - return empty array to avoid breaking the UI
      return [];
    }

    return (data || []).map(mapAdminNotification);
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread');

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Get notification counts by type
   */
  async getCountsByType(): Promise<Record<AdminNotificationType, number>> {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('type')
      .eq('status', 'unread');

    if (error) {
      console.error('Error fetching notification counts:', error);
      return {} as Record<AdminNotificationType, number>;
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((item) => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });

    return counts as Record<AdminNotificationType, number>;
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
   */
  async markAsRead(id: string, adminId: string): Promise<AdminNotification> {
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

    return mapAdminNotification(data);
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
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
   * Create a new admin notification (manual creation if needed)
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

    return mapAdminNotification(notification);
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
        (payload) => {
          callback(mapAdminNotification(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
