import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Conversations table - chat threads between users, support, merchants
  conversations: defineTable({
    // Type of conversation
    type: v.union(
      v.literal("support"),
      v.literal("business_inquiry"),
      v.literal("b2b"),
      v.literal("sales"),
      v.literal("general")
    ),
    // Optional subject line
    subject: v.optional(v.string()),
    // Array of Supabase user IDs participating in the conversation
    participantIds: v.array(v.string()),
    // Business ID if this is a business-related conversation
    businessId: v.optional(v.string()),
    // Conversation status
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("archived"),
      v.literal("flagged"),
      v.literal("blocked")
    ),
    // Priority level
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    ),
    // Support staff assigned to this conversation
    assignedTo: v.optional(v.string()),
    // Whether AI flagged this conversation for review
    aiFlagged: v.boolean(),
    // AI risk score (0-100)
    aiRiskScore: v.optional(v.number()),
    // Timestamp of last message
    lastMessageAt: v.number(),
    // Preview of last message
    lastMessagePreview: v.optional(v.string()),
    // Additional metadata
    metadata: v.optional(v.any()),
    // Original Supabase conversation ID for migration
    supabaseId: v.optional(v.string()),
  })
    .index("by_participant", ["participantIds"])
    .index("by_status", ["status"])
    .index("by_business", ["businessId"])
    .index("by_assigned", ["assignedTo"])
    .index("by_type", ["type"])
    .index("by_last_message", ["lastMessageAt"])
    .index("by_supabase_id", ["supabaseId"]),

  // Messages table - individual messages within conversations
  messages: defineTable({
    // Reference to the conversation
    conversationId: v.id("conversations"),
    // Supabase user ID of sender (null for system messages)
    senderId: v.optional(v.string()),
    // Type of sender
    senderType: v.union(
      v.literal("user"),
      v.literal("merchant"),
      v.literal("admin"),
      v.literal("support"),
      v.literal("system"),
      v.literal("ai")
    ),
    // Sender display name (cached for performance)
    senderName: v.optional(v.string()),
    // Sender avatar URL (cached for performance)
    senderAvatar: v.optional(v.string()),
    // Message content
    content: v.string(),
    // Type of message
    messageType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("file"),
      v.literal("system"),
      v.literal("ai_warning"),
      v.literal("product_inquiry"),
      v.literal("quote_request"),
      v.literal("invoice"),
      v.literal("receipt"),
      v.literal("payment_link")
    ),
    // File attachments
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          url: v.string(),
          type: v.string(),
          size: v.number(),
        })
      )
    ),
    // Reply to another message
    replyToId: v.optional(v.id("messages")),
    // AI moderation flag
    aiFlagged: v.boolean(),
    // Reason for AI flag
    aiFlagReason: v.optional(v.string()),
    // AI flag severity
    aiFlagSeverity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    // Soft delete
    isDeleted: v.boolean(),
    // Who deleted it
    deletedBy: v.optional(v.string()),
    // When deleted
    deletedAt: v.optional(v.number()),
    // Read receipts: { oderId: timestamp }
    readBy: v.optional(v.any()),
    // Additional metadata (mentions, inline cards, etc.)
    metadata: v.optional(v.any()),
    // Original Supabase message ID for migration
    supabaseId: v.optional(v.string()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_time", ["conversationId", "_creationTime"])
    .index("by_sender", ["senderId"])
    .index("by_flagged", ["aiFlagged"])
    .index("by_supabase_id", ["supabaseId"]),

  // Conversation participants - tracking read status and preferences
  conversationParticipants: defineTable({
    // Reference to the conversation
    conversationId: v.id("conversations"),
    // Supabase user ID
    userId: v.string(),
    // Role in this conversation
    role: v.union(
      v.literal("user"),
      v.literal("merchant"),
      v.literal("admin"),
      v.literal("support"),
      v.literal("system")
    ),
    // Whether still active in conversation
    isActive: v.boolean(),
    // Muted notifications
    muted: v.boolean(),
    // Last time user read messages
    lastReadAt: v.optional(v.number()),
    // Last message ID read
    lastReadMessageId: v.optional(v.id("messages")),
    // Unread count (denormalized for performance)
    unreadCount: v.number(),
    // Notification preferences
    notificationsEnabled: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  // Notifications table - in-app notifications (not push)
  notifications: defineTable({
    // Supabase user ID receiving the notification
    userId: v.string(),
    // Notification type (50+ types supported)
    type: v.string(),
    // Display title
    title: v.string(),
    // Notification message
    message: v.string(),
    // Icon identifier
    icon: v.optional(v.string()),
    // URL to navigate to when clicked
    actionUrl: v.optional(v.string()),
    // Additional action data (transaction ID, conversation ID, etc.)
    actionData: v.optional(v.any()),
    // Which service generated this notification
    sourceService: v.optional(v.string()),
    // Priority level
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    ),
    // Read status
    isRead: v.boolean(),
    // Archived status
    isArchived: v.optional(v.boolean()),
    // Original Supabase notification ID for migration
    supabaseId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_time", ["userId", "_creationTime"])
    .index("by_type", ["type"])
    .index("by_supabase_id", ["supabaseId"]),

  // Presence table - online status and typing indicators
  presence: defineTable({
    // Supabase user ID
    userId: v.string(),
    // Conversation they're currently in (for typing indicator)
    conversationId: v.optional(v.id("conversations")),
    // Current status
    status: v.union(
      v.literal("online"),
      v.literal("typing"),
      v.literal("idle"),
      v.literal("offline")
    ),
    // Last activity timestamp
    lastSeen: v.number(),
    // Device/client identifier
    deviceId: v.optional(v.string()),
    // User agent for debugging
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_last_seen", ["lastSeen"]),

  // Flagged messages - for admin review
  flaggedMessages: defineTable({
    // Reference to the message
    messageId: v.id("messages"),
    // Reference to the conversation
    conversationId: v.id("conversations"),
    // Why it was flagged
    flagReason: v.string(),
    // Keywords that triggered the flag
    matchedKeywords: v.optional(v.array(v.string())),
    // Severity level
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    // Review status
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("action_taken")
    ),
    // What action was taken
    actionTaken: v.optional(
      v.union(
        v.literal("none"),
        v.literal("warning_sent"),
        v.literal("message_deleted"),
        v.literal("user_blocked"),
        v.literal("escalated")
      )
    ),
    // Who reviewed it
    reviewedBy: v.optional(v.string()),
    // When reviewed
    reviewedAt: v.optional(v.number()),
    // Review notes
    reviewNotes: v.optional(v.string()),
  })
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"]),

  // Canned responses - pre-written support responses
  cannedResponses: defineTable({
    // Response title
    title: v.string(),
    // Response content
    content: v.string(),
    // Keyboard shortcut (e.g., "/refund")
    shortcut: v.optional(v.string()),
    // Category for organization
    category: v.optional(v.string()),
    // Global = available to all support, otherwise created by specific user
    isGlobal: v.boolean(),
    // Who created it (if not global)
    createdBy: v.optional(v.string()),
    // Usage count for analytics
    useCount: v.number(),
    // Active status
    isActive: v.boolean(),
  })
    .index("by_shortcut", ["shortcut"])
    .index("by_category", ["category"])
    .index("by_global", ["isGlobal"])
    .index("by_creator", ["createdBy"]),

  // AI flag keywords - configurable moderation rules
  aiFlagKeywords: defineTable({
    // The keyword or phrase
    keyword: v.string(),
    // Category of concern
    category: v.union(
      v.literal("fraud"),
      v.literal("scam"),
      v.literal("harassment"),
      v.literal("spam"),
      v.literal("suspicious"),
      v.literal("prohibited")
    ),
    // Severity level
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    // What action to take
    action: v.union(
      v.literal("flag"),
      v.literal("block"),
      v.literal("notify_admin"),
      v.literal("auto_delete")
    ),
    // Whether this is a regex pattern
    isRegex: v.boolean(),
    // Active status
    isActive: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_severity", ["severity"])
    .index("by_active", ["isActive"]),
});
