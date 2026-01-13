import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// QUERIES - Real-time reactive queries
// ============================================================================

/**
 * Get all conversations for a user
 * Automatically updates in real-time when conversations change
 */
export const getConversations = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("closed"),
        v.literal("archived"),
        v.literal("flagged"),
        v.literal("blocked")
      )
    ),
    type: v.optional(
      v.union(
        v.literal("support"),
        v.literal("business_inquiry"),
        v.literal("b2b"),
        v.literal("sales"),
        v.literal("general")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, status, type, limit = 50 } = args;

    // Get all conversations where user is a participant
    let conversations = await ctx.db
      .query("conversations")
      .order("desc")
      .filter((q) => q.eq(q.field("participantIds"), userId))
      .take(limit);

    // If participantIds filter doesn't work directly, fetch all and filter
    if (conversations.length === 0) {
      const allConversations = await ctx.db
        .query("conversations")
        .order("desc")
        .take(500);

      conversations = allConversations.filter((conv) =>
        conv.participantIds.includes(userId)
      );
    }

    // Apply status filter
    if (status) {
      conversations = conversations.filter((conv) => conv.status === status);
    }

    // Apply type filter
    if (type) {
      conversations = conversations.filter((conv) => conv.type === type);
    }

    // Limit results
    conversations = conversations.slice(0, limit);

    // Get participant info for each conversation
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await ctx.db
          .query("conversationParticipants")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        return {
          ...conv,
          participants,
        };
      })
    );

    return conversationsWithParticipants;
  },
});

/**
 * Get support inbox conversations (for admin/support staff)
 */
export const getSupportConversations = query({
  args: {
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { status, priority, assignedTo, limit = 50 } = args;

    let conversations = await ctx.db
      .query("conversations")
      .withIndex("by_type", (q) => q.eq("type", "support"))
      .order("desc")
      .take(limit * 2); // Fetch more for filtering

    // Apply filters
    if (status) {
      conversations = conversations.filter((conv) => conv.status === status);
    }
    if (priority) {
      conversations = conversations.filter((conv) => conv.priority === priority);
    }
    if (assignedTo) {
      conversations = conversations.filter(
        (conv) => conv.assignedTo === assignedTo
      );
    }

    return conversations.slice(0, limit);
  },
});

/**
 * Get a single conversation by ID
 */
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return {
      ...conversation,
      participants,
    };
  },
});

/**
 * Get messages for a conversation with pagination
 * Automatically updates when new messages arrive
 */
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()), // For pagination
  },
  handler: async (ctx, args) => {
    const { conversationId, limit = 50 } = args;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("desc")
      .take(limit);

    // Filter out soft-deleted messages
    const visibleMessages = messages.filter((msg) => !msg.isDeleted);

    // Get reply-to messages for any replies
    const messagesWithReplies = await Promise.all(
      visibleMessages.map(async (msg) => {
        let replyTo = null;
        if (msg.replyToId) {
          replyTo = await ctx.db.get(msg.replyToId);
        }
        return {
          ...msg,
          replyTo,
        };
      })
    );

    // Return in chronological order (oldest first)
    return messagesWithReplies.reverse();
  },
});

/**
 * Get unread count for a user in a conversation
 */
export const getUnreadCount = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    return participant?.unreadCount ?? 0;
  },
});

/**
 * Get total unread count across all conversations for a user
 */
export const getTotalUnreadCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return participants.reduce((sum, p) => sum + p.unreadCount, 0);
  },
});

// ============================================================================
// MUTATIONS - Write operations
// ============================================================================

/**
 * Create a new conversation
 */
export const createConversation = mutation({
  args: {
    type: v.union(
      v.literal("support"),
      v.literal("business_inquiry"),
      v.literal("b2b"),
      v.literal("sales"),
      v.literal("general")
    ),
    participantIds: v.array(v.string()),
    subject: v.optional(v.string()),
    businessId: v.optional(v.string()),
    initialMessage: v.optional(v.string()),
    senderInfo: v.optional(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.union(
          v.literal("user"),
          v.literal("merchant"),
          v.literal("admin"),
          v.literal("support"),
          v.literal("system"),
          v.literal("ai")
        ),
        avatar: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the conversation
    const conversationId = await ctx.db.insert("conversations", {
      type: args.type,
      subject: args.subject,
      participantIds: args.participantIds,
      businessId: args.businessId,
      status: "open",
      priority: args.type === "support" ? "normal" : "low",
      aiFlagged: false,
      lastMessageAt: now,
      lastMessagePreview: args.initialMessage?.substring(0, 100),
    });

    // Create participant records
    for (const participantId of args.participantIds) {
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        userId: participantId,
        role: "user", // Will be updated based on actual user role
        isActive: true,
        muted: false,
        lastReadAt: now,
        unreadCount: 0,
        notificationsEnabled: true,
      });
    }

    // Create initial message if provided
    if (args.initialMessage && args.senderInfo) {
      await ctx.db.insert("messages", {
        conversationId,
        senderId: args.senderInfo.id,
        senderType: args.senderInfo.type,
        senderName: args.senderInfo.name,
        senderAvatar: args.senderInfo.avatar,
        content: args.initialMessage,
        messageType: "text",
        aiFlagged: false,
        isDeleted: false,
      });

      // Update unread counts for other participants
      for (const participantId of args.participantIds) {
        if (participantId !== args.senderInfo.id) {
          const participant = await ctx.db
            .query("conversationParticipants")
            .withIndex("by_conversation_user", (q) =>
              q.eq("conversationId", conversationId).eq("userId", participantId)
            )
            .first();

          if (participant) {
            await ctx.db.patch(participant._id, {
              unreadCount: participant.unreadCount + 1,
            });
          }
        }
      }
    }

    return conversationId;
  },
});

/**
 * Send a message in a conversation
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    senderType: v.union(
      v.literal("user"),
      v.literal("merchant"),
      v.literal("admin"),
      v.literal("support"),
      v.literal("system"),
      v.literal("ai")
    ),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    content: v.string(),
    messageType: v.optional(
      v.union(
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
      )
    ),
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
    replyToId: v.optional(v.id("messages")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.status === "closed" || conversation.status === "blocked") {
      throw new Error("Cannot send message to closed or blocked conversation");
    }

    // Check for AI moderation flags (simple keyword check)
    const aiFlagResult = await checkMessageContent(ctx, args.content);

    // If message is blocked by AI, don't insert it
    if (aiFlagResult.blocked) {
      throw new Error(`Message blocked: ${aiFlagResult.reason}`);
    }

    // Insert the message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      senderType: args.senderType,
      senderName: args.senderName,
      senderAvatar: args.senderAvatar,
      content: args.content,
      messageType: args.messageType ?? "text",
      attachments: args.attachments,
      replyToId: args.replyToId,
      aiFlagged: aiFlagResult.flagged,
      aiFlagReason: aiFlagResult.reason,
      aiFlagSeverity: aiFlagResult.severity,
      isDeleted: false,
      metadata: args.metadata,
    });

    // Create flag record if flagged
    if (aiFlagResult.flagged && aiFlagResult.severity) {
      await ctx.db.insert("flaggedMessages", {
        messageId,
        conversationId: args.conversationId,
        flagReason: aiFlagResult.reason ?? "Unknown",
        matchedKeywords: aiFlagResult.matchedKeywords,
        severity: aiFlagResult.severity,
        status: "pending",
      });
    }

    // Update conversation last message
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: args.content.substring(0, 100),
      aiFlagged: aiFlagResult.flagged ? true : conversation.aiFlagged,
    });

    // Update unread counts for other participants
    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const participant of participants) {
      if (participant.userId !== args.senderId) {
        await ctx.db.patch(participant._id, {
          unreadCount: participant.unreadCount + 1,
        });
      }
    }

    // Mark sender's read status as current
    const senderParticipant = participants.find(
      (p) => p.userId === args.senderId
    );
    if (senderParticipant) {
      await ctx.db.patch(senderParticipant._id, {
        lastReadAt: now,
        lastReadMessageId: messageId,
        unreadCount: 0,
      });
    }

    return messageId;
  },
});

/**
 * Mark messages as read
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    if (participant) {
      await ctx.db.patch(participant._id, {
        lastReadAt: now,
        lastReadMessageId: args.messageId,
        unreadCount: 0,
      });
    }

    // If specific message provided, update its readBy field
    if (args.messageId) {
      const message = await ctx.db.get(args.messageId);
      if (message) {
        const readBy = (message.readBy as Record<string, number>) ?? {};
        readBy[args.userId] = now;
        await ctx.db.patch(args.messageId, { readBy });
      }
    }

    return true;
  },
});

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Only sender or admin can delete
    if (message.senderId !== args.userId) {
      // TODO: Check if user is admin
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      deletedBy: args.userId,
      deletedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Update conversation status/assignment
 */
export const updateConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("closed"),
        v.literal("archived"),
        v.literal("flagged"),
        v.literal("blocked")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { conversationId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(conversationId, cleanUpdates);
    }

    return true;
  },
});

/**
 * Close a conversation with optional system message
 */
export const closeConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    closedBy: v.string(),
    closedByName: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Update conversation status
    await ctx.db.patch(args.conversationId, {
      status: "closed",
    });

    // Add system message
    const systemMessage = args.reason
      ? `Conversation closed by ${args.closedByName}: ${args.reason}`
      : `Conversation closed by ${args.closedByName}`;

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.closedBy,
      senderType: "system",
      senderName: "System",
      content: systemMessage,
      messageType: "system",
      aiFlagged: false,
      isDeleted: false,
    });

    return true;
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check message content against AI moderation rules
 */
async function checkMessageContent(
  ctx: any,
  content: string
): Promise<{
  flagged: boolean;
  blocked: boolean;
  reason?: string;
  severity?: "low" | "medium" | "high" | "critical";
  matchedKeywords?: string[];
}> {
  // Get active keywords from database
  const keywords = await ctx.db
    .query("aiFlagKeywords")
    .withIndex("by_active", (q: any) => q.eq("isActive", true))
    .collect();

  const contentLower = content.toLowerCase();
  const matchedKeywords: string[] = [];
  let highestSeverity: "low" | "medium" | "high" | "critical" | null = null;
  let shouldBlock = false;
  let flagReason = "";

  for (const keyword of keywords) {
    let matches = false;

    if (keyword.isRegex) {
      try {
        const regex = new RegExp(keyword.keyword, "i");
        matches = regex.test(content);
      } catch {
        // Invalid regex, skip
        continue;
      }
    } else {
      matches = contentLower.includes(keyword.keyword.toLowerCase());
    }

    if (matches) {
      matchedKeywords.push(keyword.keyword);

      // Track highest severity
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      if (
        !highestSeverity ||
        severityOrder[keyword.severity] > severityOrder[highestSeverity]
      ) {
        highestSeverity = keyword.severity;
        flagReason = `${keyword.category}: ${keyword.keyword}`;
      }

      // Check if should block
      if (keyword.action === "block" || keyword.action === "auto_delete") {
        shouldBlock = true;
      }
    }
  }

  return {
    flagged: matchedKeywords.length > 0,
    blocked: shouldBlock,
    reason: flagReason || undefined,
    severity: highestSeverity || undefined,
    matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : undefined,
  };
}

// ============================================================================
// CANNED RESPONSES
// ============================================================================

/**
 * Get canned responses
 */
export const getCannedResponses = query({
  args: {
    userId: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let responses = await ctx.db.query("cannedResponses").collect();

    // Filter by global or created by user
    if (args.userId) {
      responses = responses.filter(
        (r) => r.isGlobal || r.createdBy === args.userId
      );
    } else {
      responses = responses.filter((r) => r.isGlobal);
    }

    // Filter by category
    if (args.category) {
      responses = responses.filter((r) => r.category === args.category);
    }

    // Filter active only
    responses = responses.filter((r) => r.isActive);

    return responses;
  },
});

/**
 * Use a canned response (increments use count)
 */
export const useCannedResponse = mutation({
  args: {
    responseId: v.id("cannedResponses"),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (response) {
      await ctx.db.patch(args.responseId, {
        useCount: response.useCount + 1,
      });
    }
    return response;
  },
});

/**
 * Create a canned response
 */
export const createCannedResponse = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    shortcut: v.optional(v.string()),
    category: v.optional(v.string()),
    isGlobal: v.boolean(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cannedResponses", {
      ...args,
      useCount: 0,
      isActive: true,
    });
  },
});

// ============================================================================
// FLAGGED MESSAGES (Admin)
// ============================================================================

/**
 * Get flagged messages for review
 */
export const getFlaggedMessages = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("dismissed"),
        v.literal("action_taken")
      )
    ),
    severity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { status = "pending", severity, limit = 50 } = args;

    let flaggedMessages = await ctx.db
      .query("flaggedMessages")
      .withIndex("by_status", (q) => q.eq("status", status))
      .take(limit * 2);

    if (severity) {
      flaggedMessages = flaggedMessages.filter((f) => f.severity === severity);
    }

    // Get the actual message content for each flagged message
    const withMessages = await Promise.all(
      flaggedMessages.slice(0, limit).map(async (flagged) => {
        const message = await ctx.db.get(flagged.messageId);
        const conversation = await ctx.db.get(flagged.conversationId);
        return {
          ...flagged,
          message,
          conversation,
        };
      })
    );

    return withMessages;
  },
});

/**
 * Review a flagged message
 */
export const reviewFlaggedMessage = mutation({
  args: {
    flagId: v.id("flaggedMessages"),
    status: v.union(
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("action_taken")
    ),
    actionTaken: v.optional(
      v.union(
        v.literal("none"),
        v.literal("warning_sent"),
        v.literal("message_deleted"),
        v.literal("user_blocked"),
        v.literal("escalated")
      )
    ),
    reviewedBy: v.string(),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { flagId, ...updates } = args;

    await ctx.db.patch(flagId, {
      ...updates,
      reviewedAt: Date.now(),
    });

    // If action is to delete message, do so
    if (args.actionTaken === "message_deleted") {
      const flagged = await ctx.db.get(flagId);
      if (flagged) {
        await ctx.db.patch(flagged.messageId, {
          isDeleted: true,
          deletedBy: args.reviewedBy,
          deletedAt: Date.now(),
        });
      }
    }

    return true;
  },
});
