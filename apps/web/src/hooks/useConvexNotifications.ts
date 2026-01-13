import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";

/**
 * Hook for managing notifications using Convex
 * Provides real-time updates automatically via Convex subscriptions
 */
export function useConvexNotifications(userId: string | null) {
  // Queries - automatically subscribe to real-time updates
  const notifications = useQuery(
    api.notifications.getNotifications,
    userId ? { userId, limit: 50 } : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    userId ? { userId } : "skip"
  );

  const unreadChatCount = useQuery(
    api.notifications.getUnreadChatCount,
    userId ? { userId } : "skip"
  );

  // Mutations
  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);
  const deleteNotificationMutation = useMutation(
    api.notifications.deleteNotification
  );
  const archiveNotificationMutation = useMutation(
    api.notifications.archiveNotification
  );
  const deleteAllReadMutation = useMutation(api.notifications.deleteAllRead);
  const createNotificationMutation = useMutation(
    api.notifications.createNotification
  );

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      return await markAsReadMutation({
        notificationId: notificationId as Id<"notifications">,
      });
    },
    [markAsReadMutation]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!userId) return 0;
    return await markAllAsReadMutation({ userId });
  }, [userId, markAllAsReadMutation]);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      return await deleteNotificationMutation({
        notificationId: notificationId as Id<"notifications">,
      });
    },
    [deleteNotificationMutation]
  );

  /**
   * Archive a notification (soft delete)
   */
  const archiveNotification = useCallback(
    async (notificationId: string) => {
      return await archiveNotificationMutation({
        notificationId: notificationId as Id<"notifications">,
      });
    },
    [archiveNotificationMutation]
  );

  /**
   * Delete all read notifications
   */
  const deleteAllRead = useCallback(async () => {
    if (!userId) return 0;
    return await deleteAllReadMutation({ userId });
  }, [userId, deleteAllReadMutation]);

  /**
   * Create a notification (for local use)
   */
  const createNotification = useCallback(
    async (params: {
      type: string;
      title: string;
      message: string;
      icon?: string;
      actionUrl?: string;
      actionData?: any;
      sourceService?: string;
      priority?: "low" | "normal" | "high" | "urgent";
    }) => {
      if (!userId) throw new Error("No user ID");
      return await createNotificationMutation({
        userId,
        ...params,
      });
    },
    [userId, createNotificationMutation]
  );

  return {
    // Data
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    unreadChatCount: unreadChatCount ?? 0,

    // Loading state
    isLoading: notifications === undefined,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    archiveNotification,
    deleteAllRead,
    createNotification,
  };
}

/**
 * Hook for specific notification types
 */
export function useConvexNotificationsByType(
  userId: string | null,
  type: string
) {
  const notifications = useQuery(
    api.notifications.getNotificationsByType,
    userId ? { userId, type } : "skip"
  );

  return {
    notifications: notifications ?? [],
    isLoading: notifications === undefined,
  };
}

/**
 * Hook for payment notifications specifically
 */
export function useConvexPaymentNotifications(userId: string | null) {
  // Send payment notification mutation
  const sendPaymentNotificationMutation = useMutation(
    api.notifications.sendPaymentNotification
  );

  const sendPaymentNotification = useCallback(
    async (params: {
      type: "payment_received" | "payment_sent" | "payment_failed";
      amount: number;
      currency: string;
      fromOrTo?: string;
      transactionId?: string;
    }) => {
      if (!userId) throw new Error("No user ID");
      return await sendPaymentNotificationMutation({
        userId,
        ...params,
      });
    },
    [userId, sendPaymentNotificationMutation]
  );

  return { sendPaymentNotification };
}

/**
 * Hook for security alert notifications
 */
export function useConvexSecurityNotifications(userId: string | null) {
  const sendSecurityAlertMutation = useMutation(
    api.notifications.sendSecurityAlert
  );

  const sendSecurityAlert = useCallback(
    async (params: {
      alertType: "login_alert" | "password_changed" | "suspicious_activity";
      device?: string;
      location?: string;
      details?: string;
    }) => {
      if (!userId) throw new Error("No user ID");
      return await sendSecurityAlertMutation({
        userId,
        ...params,
      });
    },
    [userId, sendSecurityAlertMutation]
  );

  return { sendSecurityAlert };
}

/**
 * Hook for chat-related notifications
 */
export function useConvexChatNotifications(userId: string | null) {
  const sendChatMessageNotificationMutation = useMutation(
    api.notifications.sendChatMessageNotification
  );
  const sendChatMentionNotificationMutation = useMutation(
    api.notifications.sendChatMentionNotification
  );

  const sendChatMessageNotification = useCallback(
    async (params: {
      targetUserId: string;
      senderName: string;
      senderType: "user" | "merchant" | "admin" | "support";
      conversationId: string;
      messagePreview: string;
      conversationType?: string;
    }) => {
      return await sendChatMessageNotificationMutation({
        userId: params.targetUserId,
        senderName: params.senderName,
        senderType: params.senderType,
        conversationId: params.conversationId,
        messagePreview: params.messagePreview,
        conversationType: params.conversationType,
      });
    },
    [sendChatMessageNotificationMutation]
  );

  const sendChatMentionNotification = useCallback(
    async (params: {
      targetUserId: string;
      mentionedByName: string;
      conversationId: string;
      messagePreview: string;
    }) => {
      return await sendChatMentionNotificationMutation({
        userId: params.targetUserId,
        mentionedByName: params.mentionedByName,
        conversationId: params.conversationId,
        messagePreview: params.messagePreview,
      });
    },
    [sendChatMentionNotificationMutation]
  );

  return {
    sendChatMessageNotification,
    sendChatMentionNotification,
  };
}

/**
 * Hook for KYC notifications
 */
export function useConvexKYCNotifications(userId: string | null) {
  const sendKYCNotificationMutation = useMutation(
    api.notifications.sendKYCNotification
  );

  const sendKYCNotification = useCallback(
    async (params: {
      status: "kyc_submitted" | "kyc_approved" | "kyc_rejected" | "kyc_pending";
      reason?: string;
    }) => {
      if (!userId) throw new Error("No user ID");
      return await sendKYCNotificationMutation({
        userId,
        ...params,
      });
    },
    [userId, sendKYCNotificationMutation]
  );

  return { sendKYCNotification };
}

/**
 * Hook for staff invitation notifications
 */
export function useConvexStaffNotifications() {
  const sendStaffInvitationMutation = useMutation(
    api.notifications.sendStaffInvitation
  );

  const sendStaffInvitation = useCallback(
    async (params: {
      userId: string;
      businessName: string;
      businessId: string;
      role: string;
      invitedBy: string;
      invitationId: string;
    }) => {
      return await sendStaffInvitationMutation(params);
    },
    [sendStaffInvitationMutation]
  );

  return { sendStaffInvitation };
}
