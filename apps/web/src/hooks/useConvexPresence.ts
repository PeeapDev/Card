import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef } from "react";

// Heartbeat interval (20 seconds)
const HEARTBEAT_INTERVAL = 20 * 1000;

/**
 * Hook for managing user presence (online status, typing indicators)
 * Automatically sends heartbeats to maintain online status
 */
export function useConvexPresence(userId: string | null) {
  const heartbeatMutation = useMutation(api.presence.heartbeat);
  const setOfflineMutation = useMutation(api.presence.setOffline);
  const updatePresenceMutation = useMutation(api.presence.updatePresence);

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentConversationRef = useRef<string | null>(null);

  /**
   * Start heartbeat to maintain online status
   */
  const startHeartbeat = useCallback(() => {
    if (!userId) return;

    // Clear existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send initial heartbeat
    heartbeatMutation({
      userId,
      conversationId: currentConversationRef.current as Id<"conversations"> | undefined,
    });

    // Set up interval
    heartbeatIntervalRef.current = setInterval(() => {
      heartbeatMutation({
        userId,
        conversationId: currentConversationRef.current as Id<"conversations"> | undefined,
      });
    }, HEARTBEAT_INTERVAL);
  }, [userId, heartbeatMutation]);

  /**
   * Stop heartbeat and set offline
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (userId) {
      setOfflineMutation({ userId });
    }
  }, [userId, setOfflineMutation]);

  /**
   * Update current conversation (for typing context)
   */
  const setCurrentConversation = useCallback(
    (conversationId: string | null) => {
      currentConversationRef.current = conversationId;

      if (userId) {
        heartbeatMutation({
          userId,
          conversationId: conversationId as Id<"conversations"> | undefined,
        });
      }
    },
    [userId, heartbeatMutation]
  );

  /**
   * Set user status explicitly
   */
  const setStatus = useCallback(
    async (status: "online" | "idle" | "offline") => {
      if (!userId) return;

      return await updatePresenceMutation({
        userId,
        status,
        conversationId: currentConversationRef.current as Id<"conversations"> | undefined,
      });
    },
    [userId, updatePresenceMutation]
  );

  // Auto-start heartbeat when userId is available
  useEffect(() => {
    if (userId) {
      startHeartbeat();

      // Handle page visibility changes
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is hidden, set idle
          updatePresenceMutation({
            userId,
            status: "idle",
          });
        } else {
          // Page is visible, set online
          updatePresenceMutation({
            userId,
            status: "online",
          });
        }
      };

      // Handle before unload
      const handleBeforeUnload = () => {
        // Sync call to set offline (may not always work)
        navigator.sendBeacon?.(
          `/api/presence/offline?userId=${encodeURIComponent(userId)}`
        );
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        stopHeartbeat();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [userId, startHeartbeat, stopHeartbeat, updatePresenceMutation]);

  return {
    startHeartbeat,
    stopHeartbeat,
    setCurrentConversation,
    setStatus,
  };
}

/**
 * Hook for querying presence of specific users
 */
export function useConvexUserPresence(userIds: string[]) {
  const presence = useQuery(api.presence.getOnlineUsers, {
    userIds: userIds.length > 0 ? userIds : undefined,
  });

  // Create a map of userId -> presence status
  const presenceMap = new Map<string, { status: string; lastSeen: number }>();

  if (presence) {
    for (const p of presence) {
      presenceMap.set(p.userId, {
        status: p.status,
        lastSeen: p.lastSeen,
      });
    }
  }

  /**
   * Check if a user is online
   */
  const isOnline = useCallback(
    (userId: string) => {
      const p = presenceMap.get(userId);
      return p?.status === "online" || p?.status === "typing";
    },
    [presenceMap]
  );

  /**
   * Get presence status for a user
   */
  const getStatus = useCallback(
    (userId: string) => {
      return presenceMap.get(userId)?.status ?? "offline";
    },
    [presenceMap]
  );

  return {
    presence: presence ?? [],
    presenceMap,
    isOnline,
    getStatus,
    isLoading: presence === undefined,
  };
}

/**
 * Hook for conversation-specific presence (typing indicators, online status)
 */
export function useConvexConversationPresence(
  conversationId: string | null,
  currentUserId: string | null
) {
  const convexConversationId = conversationId as Id<"conversations"> | null;

  // Query presence for the conversation
  const presenceData = useQuery(
    api.presence.getConversationPresence,
    convexConversationId && currentUserId
      ? {
          conversationId: convexConversationId,
          excludeUserId: currentUserId,
        }
      : "skip"
  );

  // Typing mutation
  const setTypingMutation = useMutation(api.presence.setTyping);

  /**
   * Set typing status
   */
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!convexConversationId || !currentUserId) return;

      return await setTypingMutation({
        userId: currentUserId,
        conversationId: convexConversationId,
        isTyping,
      });
    },
    [convexConversationId, currentUserId, setTypingMutation]
  );

  return {
    // Users currently online in this conversation
    onlineUsers: presenceData?.online ?? [],
    // Users currently typing
    typingUsers: presenceData?.typing ?? [],
    // Loading state
    isLoading: presenceData === undefined,
    // Set typing status
    setTyping,
  };
}

/**
 * Hook for typing indicator with auto-clear
 */
export function useTypingIndicator(
  conversationId: string | null,
  userId: string | null
) {
  const setTypingMutation = useMutation(api.presence.setTyping);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Call this when user starts typing
   */
  const onTyping = useCallback(() => {
    if (!conversationId || !userId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing
    setTypingMutation({
      userId,
      conversationId: conversationId as Id<"conversations">,
      isTyping: true,
    });

    // Auto-clear after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setTypingMutation({
        userId,
        conversationId: conversationId as Id<"conversations">,
        isTyping: false,
      });
    }, 3000);
  }, [conversationId, userId, setTypingMutation]);

  /**
   * Call this when user stops typing (e.g., sends message)
   */
  const onStopTyping = useCallback(() => {
    if (!conversationId || !userId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setTypingMutation({
      userId,
      conversationId: conversationId as Id<"conversations">,
      isTyping: false,
    });
  }, [conversationId, userId, setTypingMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { onTyping, onStopTyping };
}
