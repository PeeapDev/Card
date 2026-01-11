/**
 * Peeap Chat SDK
 * Embeddable chat widget for third-party websites
 *
 * @example
 * // Via CDN
 * <script src="https://cdn.peeap.com/chat-widget.js"></script>
 * <script>
 *   PeeapChat.init({
 *     apiKey: 'pk_live_xxx',
 *     welcomeMessage: 'Hi! How can we help?'
 *   });
 * </script>
 *
 * @example
 * // Via npm
 * import PeeapChat from '@peeap/chat-sdk';
 * PeeapChat.init({ apiKey: 'pk_live_xxx' });
 */

import type {
  PeeapChatConfig,
  RequiredConfig,
  PeeapUser,
  Conversation,
  ChatMessage,
  UserInfo,
  ChatError,
  WidgetView,
} from './types';
import { PeeapChatError } from './types';
import { SessionManager } from './session';
import { ApiClient } from './api';
import { RealtimeClient } from './realtime';
import { ChatWidget } from './widget';

// Default configuration
const defaultConfig: Omit<RequiredConfig, 'apiKey'> = {
  theme: 'light',
  position: 'bottom-right',
  offsetX: 20,
  offsetY: 20,
  zIndex: 9999,
  primaryColor: '#3b82f6',
  businessName: 'Chat with us',
  businessLogo: '',
  welcomeMessage: '',
  inputPlaceholder: 'Type a message...',
  collectEmail: false,
  collectName: false,
  preChatTitle: 'Before we start',
  soundEnabled: true,
};

// API base URL (production)
const API_BASE = 'https://api.peeap.com/api';

/**
 * Main PeeapChat class
 */
class PeeapChatSDK {
  public readonly version = '1.0.0';

  private initialized = false;
  private config: RequiredConfig | null = null;
  private sessionManager: SessionManager | null = null;
  private apiClient: ApiClient | null = null;
  private realtime: RealtimeClient | null = null;
  private widget: ChatWidget | null = null;
  private currentConversationId: string | null = null;
  private unsubscribeRealtime: (() => void) | null = null;

  /**
   * Initialize the chat widget
   */
  init(options: PeeapChatConfig): this {
    if (this.initialized) {
      console.warn('[PeeapChat] Already initialized. Call destroy() first to reinitialize.');
      return this;
    }

    // Validate API key
    if (!options.apiKey) {
      throw new PeeapChatError('invalid_config', 'apiKey is required');
    }
    if (!options.apiKey.startsWith('pk_')) {
      throw new PeeapChatError(
        'invalid_api_key',
        'Use your public API key (pk_live_xxx or pk_test_xxx)'
      );
    }

    // Merge config with defaults
    this.config = {
      ...defaultConfig,
      ...options,
    } as RequiredConfig;

    // Determine API base
    const apiBase = options.apiKey.startsWith('pk_test_')
      ? 'https://api.peeap.com/api' // Could be staging in future
      : API_BASE;

    // Initialize services
    this.sessionManager = new SessionManager(options.apiKey, apiBase);
    this.apiClient = new ApiClient(options.apiKey, apiBase);
    this.realtime = new RealtimeClient(apiBase);

    // Initialize widget
    this.widget = new ChatWidget(this.config);
    this.setupWidgetHandlers();

    this.initialized = true;

    // Initialize session asynchronously
    this.initSession();

    return this;
  }

  /**
   * Open the chat widget
   */
  open(): void {
    this.ensureInitialized();
    this.widget?.open();
  }

  /**
   * Close the chat widget
   */
  close(): void {
    this.ensureInitialized();
    this.widget?.close();
  }

  /**
   * Toggle the chat widget
   */
  toggle(): void {
    this.ensureInitialized();
    this.widget?.toggle();
  }

  /**
   * Search for Peeap users
   */
  async searchUsers(query: string): Promise<PeeapUser[]> {
    this.ensureInitialized();
    try {
      return await this.apiClient!.searchUsers(query);
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  /**
   * Start a conversation with a Peeap user
   */
  async startConversation(targetUserId: string, message?: string): Promise<Conversation | null> {
    this.ensureInitialized();
    try {
      const conversation = await this.apiClient!.startConversation({
        targetUserId,
        message,
      });
      await this.selectConversation(conversation.id);
      return conversation;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Send a message in the current conversation
   */
  async sendMessage(content: string): Promise<ChatMessage | null> {
    this.ensureInitialized();
    if (!this.currentConversationId) {
      throw new PeeapChatError('no_conversation', 'No active conversation');
    }

    try {
      const message = await this.apiClient!.sendMessage(this.currentConversationId, content);
      this.widget?.addMessage(message);
      this.config?.onMessage?.(message);
      return message;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Set user info for the anonymous session
   */
  async setUserInfo(info: UserInfo): Promise<void> {
    this.ensureInitialized();
    try {
      await this.sessionManager!.updateUserInfo(info);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get current conversations
   */
  async getConversations(): Promise<Conversation[]> {
    this.ensureInitialized();
    try {
      return await this.apiClient!.getConversations();
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  /**
   * Destroy the widget and cleanup
   */
  destroy(): void {
    this.unsubscribeRealtime?.();
    this.realtime?.disconnect();
    this.widget?.destroy();

    this.initialized = false;
    this.config = null;
    this.sessionManager = null;
    this.apiClient = null;
    this.realtime = null;
    this.widget = null;
    this.currentConversationId = null;
  }

  // ===========================================
  // Private Methods
  // ===========================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new PeeapChatError('not_initialized', 'Call init() first');
    }
  }

  private async initSession(): Promise<void> {
    try {
      this.widget?.setLoading(true);
      const session = await this.sessionManager!.getOrCreateSession();
      this.apiClient!.setSessionToken(session.sessionId);
      this.realtime!.setSessionToken(session.sessionId);
      this.widget?.setSession(session);

      // Load conversations if we have a target user
      if (this.config?.targetUserId) {
        await this.loadConversationsForTarget();
      } else {
        await this.loadConversations();
      }

      this.config?.onReady?.();
    } catch (error) {
      this.handleError(error);
    } finally {
      this.widget?.setLoading(false);
    }
  }

  private async loadConversations(): Promise<void> {
    try {
      const conversations = await this.apiClient!.getConversations();
      this.widget?.setConversations(conversations);
    } catch (error) {
      console.error('[PeeapChat] Failed to load conversations:', error);
    }
  }

  private async loadConversationsForTarget(): Promise<void> {
    try {
      const conversations = await this.apiClient!.getConversations();

      // Check if there's an existing conversation with target
      const existing = conversations.find(
        c => c.participantIds.includes(this.config!.targetUserId!)
      );

      if (existing) {
        await this.selectConversation(existing.id);
      } else {
        // Start a new conversation with target
        this.widget?.setConversations([]);
        this.widget?.showView('chat');
      }
    } catch (error) {
      console.error('[PeeapChat] Failed to load conversations:', error);
    }
  }

  private async selectConversation(conversationId: string): Promise<void> {
    try {
      this.widget?.setLoading(true);

      // Unsubscribe from previous conversation
      this.unsubscribeRealtime?.();

      // Load conversation and messages
      const [conversation, messagesResponse] = await Promise.all([
        this.apiClient!.getConversation(conversationId),
        this.apiClient!.getMessages(conversationId),
      ]);

      this.currentConversationId = conversationId;
      this.widget?.setCurrentConversation(conversation);
      this.widget?.setMessages(messagesResponse.messages);

      // Mark as read
      this.apiClient!.markAsRead(conversationId).catch(() => {});

      // Subscribe to real-time updates
      this.subscribeToConversation(conversationId);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.widget?.setLoading(false);
    }
  }

  private subscribeToConversation(conversationId: string): void {
    this.unsubscribeRealtime = this.realtime!.subscribe(
      conversationId,
      (message) => {
        // Don't duplicate messages we sent
        const session = this.sessionManager?.getSession();
        if (message.senderSessionId !== session?.sessionId) {
          this.widget?.addMessage(message);
          this.config?.onMessage?.(message);

          // Play sound if enabled
          if (this.config?.soundEnabled) {
            this.playNotificationSound();
          }
        }
      }
    );
  }

  private setupWidgetHandlers(): void {
    if (!this.widget) return;

    // Send message
    this.widget.onSend(async (content) => {
      if (!this.currentConversationId && this.config?.targetUserId) {
        // Start new conversation with first message
        await this.startConversation(this.config.targetUserId, content);
      } else {
        await this.sendMessage(content);
      }
    });

    // Search users
    this.widget.onSearch(async (query) => {
      this.widget?.setLoading(true);
      try {
        const users = await this.searchUsers(query);
        this.widget?.setSearchResults(users);
        this.config?.onUserSearch?.(users);
      } finally {
        this.widget?.setLoading(false);
      }
    });

    // Start conversation with user
    this.widget.onConversationStart(async (userId) => {
      this.widget?.setLoading(true);
      try {
        await this.startConversation(userId);
      } finally {
        this.widget?.setLoading(false);
      }
    });

    // Select existing conversation
    this.widget.onConversationSelect(async (conversationId) => {
      await this.selectConversation(conversationId);
    });

    // Pre-chat form
    this.widget.onPreChat(async (name, email) => {
      this.widget?.setLoading(true);
      try {
        await this.setUserInfo({ name, email });
        // Proceed to next view
        if (this.config?.targetUserId) {
          await this.loadConversationsForTarget();
        } else {
          this.widget?.showView('search');
        }
      } finally {
        this.widget?.setLoading(false);
      }
    });
  }

  private handleError(error: unknown): void {
    const chatError: ChatError = error instanceof PeeapChatError
      ? error
      : {
          code: 'unknown_error',
          message: error instanceof Error ? error.message : 'An error occurred',
        };

    console.error('[PeeapChat] Error:', chatError);
    this.widget?.setError(chatError);
    this.config?.onError?.(chatError);
  }

  private playNotificationSound(): void {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Ignore audio errors
    }
  }
}

// Create singleton instance
const instance = new PeeapChatSDK();

// Export for ESM/CJS
export default instance;
export { PeeapChatSDK, PeeapChatError };
export type {
  PeeapChatConfig,
  PeeapUser,
  Conversation,
  ChatMessage,
  UserInfo,
  ChatError,
};

// Browser global
if (typeof window !== 'undefined') {
  (window as any).PeeapChat = instance;
}
