import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Presence timeout in milliseconds (30 seconds)
const PRESENCE_TIMEOUT = 30 * 1000;
// Typing timeout in milliseconds (5 seconds)
const TYPING_TIMEOUT = 5 * 1000;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all online users
 */
export const getOnlineUsers = query({
  args: {
    userIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - PRESENCE_TIMEOUT;

    let presence = await ctx.db
      .query("presence")
      .withIndex("by_last_seen", (q) => q.gt("lastSeen", cutoff))
      .collect();

    // Filter to only online/typing users (not idle/offline)
    presence = presence.filter(
      (p) => p.status === "online" || p.status === "typing"
    );

    // Filter to specific users if provided
    if (args.userIds && args.userIds.length > 0) {
      presence = presence.filter((p) => args.userIds!.includes(p.userId));
    }

    return presence;
  },
});

/**
 * Get presence for a specific user
 */
export const getUserPresence = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - PRESENCE_TIMEOUT;

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!presence) {
      return { status: "offline" as const, lastSeen: null };
    }

    // Check if presence is stale
    if (presence.lastSeen < cutoff) {
      return { status: "offline" as const, lastSeen: presence.lastSeen };
    }

    return presence;
  },
});

/**
 * Get users currently typing in a conversation
 */
export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    excludeUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - TYPING_TIMEOUT;

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Filter to only typing users with recent activity
    let typingUsers = presence.filter(
      (p) => p.status === "typing" && p.lastSeen > cutoff
    );

    // Exclude current user
    if (args.excludeUserId) {
      typingUsers = typingUsers.filter((p) => p.userId !== args.excludeUserId);
    }

    return typingUsers;
  },
});

/**
 * Get online status for conversation participants
 */
export const getConversationPresence = query({
  args: {
    conversationId: v.id("conversations"),
    excludeUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const presenceCutoff = now - PRESENCE_TIMEOUT;
    const typingCutoff = now - TYPING_TIMEOUT;

    // Get conversation to get participant IDs
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return { online: [], typing: [] };
    }

    // Get presence for all participants
    const allPresence = await Promise.all(
      conversation.participantIds.map(async (userId) => {
        const presence = await ctx.db
          .query("presence")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
        return { userId, presence };
      })
    );

    // Filter by status
    const online = allPresence
      .filter(
        ({ userId, presence }) =>
          presence &&
          presence.lastSeen > presenceCutoff &&
          (presence.status === "online" || presence.status === "typing") &&
          userId !== args.excludeUserId
      )
      .map(({ userId, presence }) => ({
        userId,
        status: presence!.status,
        lastSeen: presence!.lastSeen,
      }));

    const typing = allPresence
      .filter(
        ({ userId, presence }) =>
          presence &&
          presence.lastSeen > typingCutoff &&
          presence.status === "typing" &&
          presence.conversationId?.toString() === args.conversationId.toString() &&
          userId !== args.excludeUserId
      )
      .map(({ userId }) => userId);

    return { online, typing };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update user presence (call periodically to stay online)
 */
export const updatePresence = mutation({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("online"),
        v.literal("typing"),
        v.literal("idle"),
        v.literal("offline")
      )
    ),
    conversationId: v.optional(v.id("conversations")),
    deviceId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const status = args.status ?? "online";

    // Check if presence record exists
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing presence
      await ctx.db.patch(existing._id, {
        status,
        lastSeen: now,
        conversationId: args.conversationId,
        deviceId: args.deviceId ?? existing.deviceId,
        userAgent: args.userAgent ?? existing.userAgent,
      });
      return existing._id;
    } else {
      // Create new presence record
      return await ctx.db.insert("presence", {
        userId: args.userId,
        status,
        lastSeen: now,
        conversationId: args.conversationId,
        deviceId: args.deviceId,
        userAgent: args.userAgent,
      });
    }
  },
});

/**
 * Set typing status for a conversation
 */
export const setTyping = mutation({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const newStatus = args.isTyping ? "typing" : "online";

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: newStatus,
        lastSeen: now,
        conversationId: args.isTyping ? args.conversationId : undefined,
      });
    } else {
      await ctx.db.insert("presence", {
        userId: args.userId,
        status: newStatus,
        lastSeen: now,
        conversationId: args.isTyping ? args.conversationId : undefined,
      });
    }

    return true;
  },
});

/**
 * Set user as offline
 */
export const setOffline = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "offline",
        lastSeen: Date.now(),
        conversationId: undefined,
      });
    }

    return true;
  },
});

/**
 * Heartbeat - call every 15-20 seconds to maintain online status
 */
export const heartbeat = mutation({
  args: {
    userId: v.string(),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Only update lastSeen and optionally conversationId
      // Don't change status if currently typing
      const updates: {
        lastSeen: number;
        conversationId?: Id<"conversations">;
        status?: "online" | "typing" | "idle" | "offline";
      } = {
        lastSeen: now,
      };

      if (args.conversationId) {
        updates.conversationId = args.conversationId;
      }

      // If was typing but no conversation update, switch to online
      if (existing.status === "typing" && !args.conversationId) {
        updates.status = "online";
      }

      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("presence", {
        userId: args.userId,
        status: "online",
        lastSeen: now,
        conversationId: args.conversationId,
      });
    }

    return true;
  },
});

/**
 * Clean up stale presence records (run periodically via cron)
 */
export const cleanupStalePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Consider presence stale after 5 minutes
    const staleCutoff = now - 5 * 60 * 1000;

    const staleRecords = await ctx.db
      .query("presence")
      .withIndex("by_last_seen", (q) => q.lt("lastSeen", staleCutoff))
      .collect();

    // Mark as offline instead of deleting (for historical tracking)
    for (const record of staleRecords) {
      if (record.status !== "offline") {
        await ctx.db.patch(record._id, {
          status: "offline",
        });
      }
    }

    return staleRecords.length;
  },
});
