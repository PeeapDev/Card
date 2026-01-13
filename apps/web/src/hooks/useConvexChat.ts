import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef } from "react";

/**
 * Hook for managing chat conversations and messages using Convex
 * Provides real-time updates automatically via Convex subscriptions
 */
export function useConvexChat(conversationId: string | null) {
  const convexConversationId = conversationId as Id<"conversations"> | null;

  // Queries - automatically subscribe to real-time updates
  const messages = useQuery(
    api.chat.getMessages,
    convexConversationId ? { conversationId: convexConversationId } : "skip"
  );

  const conversation = useQuery(
    api.chat.getConversation,
    convexConversationId ? { conversationId: convexConversationId } : "skip"
  );

  // Get typing users in this conversation
  const typingUsersQuery = useQuery(
    api.presence.getTypingUsers,
    convexConversationId ? { conversationId: convexConversationId } : "skip"
  );

  // Mutations
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const markAsReadMutation = useMutation(api.chat.markAsRead);
  const deleteMessageMutation = useMutation(api.chat.deleteMessage);
  const setTypingMutation = useMutation(api.presence.setTyping);

  // Typing debounce ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Send a message in the conversation
   */
  const sendMessage = useCallback(
    async (params: {
      senderId: string;
      senderType: "user" | "merchant" | "admin" | "support" | "system" | "ai";
      senderName: string;
      senderAvatar?: string;
      content: string;
      messageType?: "text" | "image" | "file" | "system";
      attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
      }>;
      replyToId?: string;
      metadata?: any;
    }) => {
      if (!convexConversationId) {
        throw new Error("No conversation selected");
      }

      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      await setTypingMutation({
        userId: params.senderId,
        conversationId: convexConversationId,
        isTyping: false,
      });

      return await sendMessageMutation({
        conversationId: convexConversationId,
        senderId: params.senderId,
        senderType: params.senderType,
        senderName: params.senderName,
        senderAvatar: params.senderAvatar,
        content: params.content,
        messageType: params.messageType,
        attachments: params.attachments,
        replyToId: params.replyToId as Id<"messages"> | undefined,
        metadata: params.metadata,
      });
    },
    [convexConversationId, sendMessageMutation, setTypingMutation]
  );

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(
    async (userId: string, messageId?: string) => {
      if (!convexConversationId) return;

      return await markAsReadMutation({
        conversationId: convexConversationId,
        userId,
        messageId: messageId as Id<"messages"> | undefined,
      });
    },
    [convexConversationId, markAsReadMutation]
  );

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(
    async (messageId: string, userId: string) => {
      return await deleteMessageMutation({
        messageId: messageId as Id<"messages">,
        userId,
      });
    },
    [deleteMessageMutation]
  );

  /**
   * Set typing status
   */
  const setTyping = useCallback(
    async (userId: string, isTyping: boolean) => {
      if (!convexConversationId) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTyping) {
        // Set typing
        await setTypingMutation({
          userId,
          conversationId: convexConversationId,
          isTyping: true,
        });

        // Auto-clear after 5 seconds
        typingTimeoutRef.current = setTimeout(async () => {
          await setTypingMutation({
            userId,
            conversationId: convexConversationId,
            isTyping: false,
          });
        }, 5000);
      } else {
        await setTypingMutation({
          userId,
          conversationId: convexConversationId,
          isTyping: false,
        });
      }
    },
    [convexConversationId, setTypingMutation]
  );

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    messages: messages ?? [],
    conversation,
    typingUsers: typingUsersQuery ?? [],

    // Loading states
    isLoading: messages === undefined,
    isConversationLoading: conversation === undefined,

    // Actions
    sendMessage,
    markAsRead,
    deleteMessage,
    setTyping,
  };
}

/**
 * Hook for managing conversation list
 */
export function useConvexConversations(userId: string | null) {
  // Query for user's conversations
  const conversations = useQuery(
    api.chat.getConversations,
    userId ? { userId } : "skip"
  );

  // Total unread count
  const totalUnreadCount = useQuery(
    api.chat.getTotalUnreadCount,
    userId ? { userId } : "skip"
  );

  // Mutations
  const createConversationMutation = useMutation(api.chat.createConversation);
  const updateConversationMutation = useMutation(api.chat.updateConversation);
  const closeConversationMutation = useMutation(api.chat.closeConversation);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (params: {
      type: "support" | "business_inquiry" | "b2b" | "sales" | "general";
      participantIds: string[];
      subject?: string;
      businessId?: string;
      initialMessage?: string;
      senderInfo?: {
        id: string;
        name: string;
        type: "user" | "merchant" | "admin" | "support" | "system" | "ai";
        avatar?: string;
      };
    }) => {
      return await createConversationMutation(params);
    },
    [createConversationMutation]
  );

  /**
   * Update a conversation
   */
  const updateConversation = useCallback(
    async (
      conversationId: string,
      updates: {
        status?: "open" | "closed" | "archived" | "flagged" | "blocked";
        priority?: "low" | "normal" | "high" | "urgent";
        assignedTo?: string;
      }
    ) => {
      return await updateConversationMutation({
        conversationId: conversationId as Id<"conversations">,
        ...updates,
      });
    },
    [updateConversationMutation]
  );

  /**
   * Close a conversation
   */
  const closeConversation = useCallback(
    async (
      conversationId: string,
      closedBy: string,
      closedByName: string,
      reason?: string
    ) => {
      return await closeConversationMutation({
        conversationId: conversationId as Id<"conversations">,
        closedBy,
        closedByName,
        reason,
      });
    },
    [closeConversationMutation]
  );

  return {
    // Data
    conversations: conversations ?? [],
    totalUnreadCount: totalUnreadCount ?? 0,

    // Loading state
    isLoading: conversations === undefined,

    // Actions
    createConversation,
    updateConversation,
    closeConversation,
  };
}

/**
 * Hook for support inbox (admin view)
 */
export function useConvexSupportInbox(params?: {
  status?: string;
  priority?: string;
  assignedTo?: string;
}) {
  const conversations = useQuery(api.chat.getSupportConversations, {
    status: params?.status,
    priority: params?.priority,
    assignedTo: params?.assignedTo,
  });

  const flaggedMessages = useQuery(api.chat.getFlaggedMessages, {
    status: "pending",
  });

  const cannedResponses = useQuery(api.chat.getCannedResponses, {});

  // Mutations
  const reviewFlaggedMutation = useMutation(api.chat.reviewFlaggedMessage);
  const createCannedResponseMutation = useMutation(
    api.chat.createCannedResponse
  );
  const useCannedResponseMutation = useMutation(api.chat.useCannedResponse);

  const reviewFlaggedMessage = useCallback(
    async (params: {
      flagId: string;
      status: "reviewed" | "dismissed" | "action_taken";
      actionTaken?:
        | "none"
        | "warning_sent"
        | "message_deleted"
        | "user_blocked"
        | "escalated";
      reviewedBy: string;
      reviewNotes?: string;
    }) => {
      return await reviewFlaggedMutation({
        flagId: params.flagId as Id<"flaggedMessages">,
        status: params.status,
        actionTaken: params.actionTaken,
        reviewedBy: params.reviewedBy,
        reviewNotes: params.reviewNotes,
      });
    },
    [reviewFlaggedMutation]
  );

  const createCannedResponse = useCallback(
    async (params: {
      title: string;
      content: string;
      shortcut?: string;
      category?: string;
      isGlobal: boolean;
      createdBy?: string;
    }) => {
      return await createCannedResponseMutation(params);
    },
    [createCannedResponseMutation]
  );

  const useCannedResponse = useCallback(
    async (responseId: string) => {
      return await useCannedResponseMutation({
        responseId: responseId as Id<"cannedResponses">,
      });
    },
    [useCannedResponseMutation]
  );

  return {
    // Data
    conversations: conversations ?? [],
    flaggedMessages: flaggedMessages ?? [],
    cannedResponses: cannedResponses ?? [],

    // Loading states
    isLoading: conversations === undefined,

    // Actions
    reviewFlaggedMessage,
    createCannedResponse,
    useCannedResponse,
  };
}
