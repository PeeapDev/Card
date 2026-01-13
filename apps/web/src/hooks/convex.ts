/**
 * Convex Hooks - Re-export all Convex-related hooks for easy importing
 *
 * Usage:
 * import { useConvexChat, useConvexNotifications, useConvexPresence } from '@/hooks/convex';
 */

// Chat hooks
export {
  useConvexChat,
  useConvexConversations,
  useConvexSupportInbox,
} from "./useConvexChat";

// Notification hooks
export {
  useConvexNotifications,
  useConvexNotificationsByType,
  useConvexPaymentNotifications,
  useConvexSecurityNotifications,
  useConvexChatNotifications,
  useConvexKYCNotifications,
  useConvexStaffNotifications,
} from "./useConvexNotifications";

// Presence hooks
export {
  useConvexPresence,
  useConvexUserPresence,
  useConvexConversationPresence,
  useTypingIndicator,
} from "./useConvexPresence";
