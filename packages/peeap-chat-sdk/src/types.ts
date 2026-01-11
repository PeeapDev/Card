/**
 * Peeap Chat SDK Types
 */

// ===========================================
// Configuration Types
// ===========================================

export interface PeeapChatConfig {
  /** Required: Your public API key (pk_live_xxx or pk_test_xxx) */
  apiKey: string;

  /** Specific Peeap user ID to chat with (merchant/support) */
  targetUserId?: string;

  /** Search for target by username instead of ID */
  targetUsername?: string;

  /** Widget theme */
  theme?: 'light' | 'dark' | 'auto';

  /** Widget position on screen */
  position?: 'bottom-right' | 'bottom-left';

  /** Horizontal offset from screen edge (pixels) */
  offsetX?: number;

  /** Vertical offset from screen edge (pixels) */
  offsetY?: number;

  /** CSS z-index for widget (default: 9999) */
  zIndex?: number;

  /** Primary brand color (hex) */
  primaryColor?: string;

  /** Business/brand name shown in header */
  businessName?: string;

  /** Business logo URL */
  businessLogo?: string;

  /** Welcome message shown when chat opens */
  welcomeMessage?: string;

  /** Placeholder text for message input */
  inputPlaceholder?: string;

  /** Ask for email before starting chat */
  collectEmail?: boolean;

  /** Ask for name before starting chat */
  collectName?: boolean;

  /** Custom text for pre-chat form */
  preChatTitle?: string;

  /** Enable sound notifications */
  soundEnabled?: boolean;

  // Callbacks
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: ChatError) => void;
  onUserSearch?: (users: PeeapUser[]) => void;
}

export type RequiredConfig = Required<Omit<PeeapChatConfig,
  'targetUserId' | 'targetUsername' | 'onReady' | 'onOpen' | 'onClose' |
  'onMessage' | 'onError' | 'onUserSearch'
>> & Pick<PeeapChatConfig,
  'targetUserId' | 'targetUsername' | 'onReady' | 'onOpen' | 'onClose' |
  'onMessage' | 'onError' | 'onUserSearch'
>;

// ===========================================
// User & Session Types
// ===========================================

export interface AnonymousSession {
  sessionId: string;
  fingerprint: string;
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export interface PeeapUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface UserInfo {
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

// ===========================================
// Conversation Types
// ===========================================

export interface Conversation {
  id: string;
  type: 'general' | 'support' | 'b2b' | 'sales';
  subject?: string;
  status: 'open' | 'closed' | 'archived';
  participantIds: string[];
  participants?: ConversationParticipant[];
  lastMessage?: ChatMessage;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  userId?: string;
  sessionId?: string;
  name: string;
  avatar?: string;
  role: 'user' | 'merchant' | 'support' | 'anonymous';
  isOnline?: boolean;
}

// ===========================================
// Message Types
// ===========================================

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  senderType: 'user' | 'merchant' | 'support' | 'anonymous' | 'system';
  senderId?: string;
  senderSessionId?: string;
  senderName?: string;
  senderAvatar?: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachments?: Attachment[];
  replyToId?: string;
  replyTo?: ChatMessage;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface SendMessageRequest {
  content: string;
  attachments?: File[];
  replyToId?: string;
}

// ===========================================
// Error Types
// ===========================================

export interface ChatError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class PeeapChatError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PeeapChatError';
    this.code = code;
    this.details = details;
  }
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SessionResponse {
  sessionId: string;
  name?: string;
  email?: string;
  createdAt: string;
  expiresAt: string;
}

export interface UsersSearchResponse {
  users: PeeapUser[];
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  cursor?: string;
}

// ===========================================
// Widget State Types
// ===========================================

export type WidgetView =
  | 'closed'
  | 'prechat'
  | 'search'
  | 'conversations'
  | 'chat';

export interface WidgetState {
  isOpen: boolean;
  view: WidgetView;
  isLoading: boolean;
  error?: ChatError;
  session?: AnonymousSession;
  conversations: Conversation[];
  currentConversation?: Conversation;
  messages: ChatMessage[];
  searchResults: PeeapUser[];
  unreadCount: number;
}

// ===========================================
// Event Types
// ===========================================

export type ChatEventType =
  | 'ready'
  | 'open'
  | 'close'
  | 'message'
  | 'message:sent'
  | 'message:received'
  | 'conversation:created'
  | 'conversation:updated'
  | 'error'
  | 'session:created'
  | 'session:expired';

export interface ChatEvent<T = unknown> {
  type: ChatEventType;
  data: T;
  timestamp: number;
}

// ===========================================
// Real-time Types
// ===========================================

export interface RealtimeMessage {
  event: 'new_message' | 'typing' | 'read';
  payload: ChatMessage | TypingIndicator | ReadReceipt;
}

export interface TypingIndicator {
  conversationId: string;
  userId?: string;
  sessionId?: string;
  name: string;
  isTyping: boolean;
}

export interface ReadReceipt {
  conversationId: string;
  messageId: string;
  readBy: string;
  readAt: string;
}
