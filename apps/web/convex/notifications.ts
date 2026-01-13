import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============================================================================
// NOTIFICATION TYPES (matching existing system)
// ============================================================================

export const NOTIFICATION_TYPES = [
  // Payment notifications
  "payment_received",
  "payment_sent",
  "payment_failed",
  "payout_completed",
  "payout_failed",
  "refund_processed",
  "refund_requested",

  // Transaction notifications
  "transaction_pending",
  "transaction_completed",
  "transaction_failed",
  "deposit_received",
  "withdrawal_completed",
  "transfer_completed",

  // Card notifications
  "card_transaction",
  "card_issued",
  "card_blocked",
  "card_activated",

  // Account notifications
  "low_balance",
  "balance_updated",
  "account_verified",
  "account_suspended",

  // Security notifications
  "login_alert",
  "password_changed",
  "two_factor_enabled",
  "two_factor_disabled",
  "session_expired",
  "suspicious_activity",

  // KYC notifications
  "kyc_submitted",
  "kyc_approved",
  "kyc_rejected",
  "kyc_pending",
  "document_uploaded",

  // Chat notifications
  "chat_message",
  "chat_mention",
  "support_reply",
  "conversation_assigned",

  // Business notifications
  "merchant_sale",
  "driver_payment",
  "invoice_paid",
  "invoice_overdue",
  "subscription_renewed",
  "subscription_cancelled",

  // Staff notifications
  "staff_invitation",
  "staff_removed",
  "role_changed",

  // Dispute notifications
  "dispute_filed",
  "dispute_updated",
  "dispute_resolved",

  // System notifications
  "system_maintenance",
  "feature_update",
  "promotional",
  "reminder",
  "event_reminder",

  // Float notifications (for agents)
  "float_request",
  "float_approved",
  "float_rejected",
] as const;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get notifications for a user
 * Automatically updates in real-time when notifications change
 */
export const getNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
    types: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 50, includeRead = true, types } = args;

    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit * 2); // Fetch more for filtering

    // Filter out archived
    notifications = notifications.filter((n) => !n.isArchived);

    // Filter by read status
    if (!includeRead) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    // Filter by types
    if (types && types.length > 0) {
      notifications = notifications.filter((n) => types.includes(n.type));
    }

    return notifications.slice(0, limit);
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    return notifications.filter((n) => !n.isArchived).length;
  },
});

/**
 * Get unread chat notification count
 */
export const getUnreadChatCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    return notifications.filter(
      (n) =>
        !n.isArchived &&
        (n.type === "chat_message" || n.type === "chat_mention")
    ).length;
  },
});

/**
 * Get notifications by type
 */
export const getNotificationsByType = query({
  args: {
    userId: v.string(),
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, type, limit = 20 } = args;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.eq(q.field("type"), type))
      .take(limit);

    return notifications;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a notification
 */
export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    icon: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    actionData: v.optional(v.any()),
    sourceService: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      icon: args.icon,
      actionUrl: args.actionUrl,
      actionData: args.actionData,
      sourceService: args.sourceService,
      priority: args.priority ?? "normal",
      isRead: false,
      isArchived: false,
    });
  },
});

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return true;
  },
});

/**
 * Mark multiple notifications as read
 */
export const markMultipleAsRead = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    for (const id of args.notificationIds) {
      await ctx.db.patch(id, { isRead: true });
    }
    return true;
  },
});

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return notifications.length;
  },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
    return true;
  },
});

/**
 * Archive a notification (soft delete)
 */
export const archiveNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isArchived: true });
    return true;
  },
});

/**
 * Delete all read notifications for a user
 */
export const deleteAllRead = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isRead"), true))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return notifications.length;
  },
});

// ============================================================================
// HELPER MUTATIONS (for common notification types)
// ============================================================================

/**
 * Send chat message notification
 */
export const sendChatMessageNotification = mutation({
  args: {
    userId: v.string(),
    senderName: v.string(),
    senderType: v.union(
      v.literal("user"),
      v.literal("merchant"),
      v.literal("admin"),
      v.literal("support")
    ),
    conversationId: v.string(),
    messagePreview: v.string(),
    conversationType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title =
      args.senderType === "support"
        ? "Support Reply"
        : `New message from ${args.senderName}`;

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "chat_message",
      title,
      message: args.messagePreview.substring(0, 100),
      actionUrl: `/messages/${args.conversationId}`,
      actionData: {
        conversationId: args.conversationId,
        senderName: args.senderName,
        senderType: args.senderType,
      },
      sourceService: "chat",
      priority: "normal",
      isRead: false,
    });
  },
});

/**
 * Send chat mention notification
 */
export const sendChatMentionNotification = mutation({
  args: {
    userId: v.string(),
    mentionedByName: v.string(),
    conversationId: v.string(),
    messagePreview: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "chat_mention",
      title: `${args.mentionedByName} mentioned you`,
      message: args.messagePreview.substring(0, 100),
      actionUrl: `/messages/${args.conversationId}`,
      actionData: {
        conversationId: args.conversationId,
        mentionedBy: args.mentionedByName,
      },
      sourceService: "chat",
      priority: "high",
      isRead: false,
    });
  },
});

/**
 * Send payment notification
 */
export const sendPaymentNotification = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("payment_received"),
      v.literal("payment_sent"),
      v.literal("payment_failed")
    ),
    amount: v.number(),
    currency: v.string(),
    fromOrTo: v.optional(v.string()),
    transactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const formattedAmount = `${args.currency} ${args.amount.toLocaleString()}`;

    let title = "";
    let message = "";

    switch (args.type) {
      case "payment_received":
        title = "Payment Received";
        message = args.fromOrTo
          ? `You received ${formattedAmount} from ${args.fromOrTo}`
          : `You received ${formattedAmount}`;
        break;
      case "payment_sent":
        title = "Payment Sent";
        message = args.fromOrTo
          ? `You sent ${formattedAmount} to ${args.fromOrTo}`
          : `You sent ${formattedAmount}`;
        break;
      case "payment_failed":
        title = "Payment Failed";
        message = `Payment of ${formattedAmount} failed. Please try again.`;
        break;
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title,
      message,
      actionUrl: args.transactionId
        ? `/dashboard/transactions/${args.transactionId}`
        : "/dashboard/transactions",
      actionData: {
        amount: args.amount,
        currency: args.currency,
        transactionId: args.transactionId,
      },
      sourceService: "payments",
      priority: args.type === "payment_failed" ? "high" : "normal",
      isRead: false,
    });
  },
});

/**
 * Send security alert notification
 */
export const sendSecurityAlert = mutation({
  args: {
    userId: v.string(),
    alertType: v.union(
      v.literal("login_alert"),
      v.literal("password_changed"),
      v.literal("suspicious_activity")
    ),
    device: v.optional(v.string()),
    location: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let title = "";
    let message = "";

    switch (args.alertType) {
      case "login_alert":
        title = "New Login Detected";
        message = args.device
          ? `New login from ${args.device}${args.location ? ` in ${args.location}` : ""}`
          : "A new login was detected on your account";
        break;
      case "password_changed":
        title = "Password Changed";
        message = "Your password was successfully changed";
        break;
      case "suspicious_activity":
        title = "Suspicious Activity";
        message =
          args.details ?? "Suspicious activity detected on your account";
        break;
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.alertType,
      title,
      message,
      actionUrl: "/dashboard/settings/security",
      actionData: {
        device: args.device,
        location: args.location,
      },
      sourceService: "security",
      priority: "urgent",
      isRead: false,
    });
  },
});

/**
 * Send staff invitation notification
 */
export const sendStaffInvitation = mutation({
  args: {
    userId: v.string(),
    businessName: v.string(),
    businessId: v.string(),
    role: v.string(),
    invitedBy: v.string(),
    invitationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "staff_invitation",
      title: "Staff Invitation",
      message: `${args.invitedBy} invited you to join ${args.businessName} as ${args.role}`,
      actionUrl: `/invitations/${args.invitationId}`,
      actionData: {
        businessId: args.businessId,
        businessName: args.businessName,
        role: args.role,
        invitedBy: args.invitedBy,
        invitationId: args.invitationId,
      },
      sourceService: "business",
      priority: "high",
      isRead: false,
    });
  },
});

/**
 * Send KYC status notification
 */
export const sendKYCNotification = mutation({
  args: {
    userId: v.string(),
    status: v.union(
      v.literal("kyc_submitted"),
      v.literal("kyc_approved"),
      v.literal("kyc_rejected"),
      v.literal("kyc_pending")
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let title = "";
    let message = "";

    switch (args.status) {
      case "kyc_submitted":
        title = "KYC Submitted";
        message = "Your documents have been submitted for verification";
        break;
      case "kyc_approved":
        title = "KYC Approved";
        message = "Your identity has been verified successfully";
        break;
      case "kyc_rejected":
        title = "KYC Rejected";
        message = args.reason ?? "Your verification was not successful";
        break;
      case "kyc_pending":
        title = "KYC Pending";
        message = "Your verification is being processed";
        break;
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.status,
      title,
      message,
      actionUrl: "/dashboard/settings/kyc",
      actionData: {
        reason: args.reason,
      },
      sourceService: "kyc",
      priority: args.status === "kyc_rejected" ? "high" : "normal",
      isRead: false,
    });
  },
});
