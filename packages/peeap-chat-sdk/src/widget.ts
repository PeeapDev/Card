/**
 * Chat Widget UI
 * Renders the floating button and chat modal
 */

import type {
  RequiredConfig,
  WidgetState,
  WidgetView,
  ChatMessage,
  Conversation,
  PeeapUser,
  AnonymousSession,
} from './types';
import { getStyles, icons } from './styles';

export class ChatWidget {
  private config: RequiredConfig;
  private container: HTMLDivElement | null = null;
  private state: WidgetState = {
    isOpen: false,
    view: 'closed',
    isLoading: false,
    conversations: [],
    messages: [],
    searchResults: [],
    unreadCount: 0,
  };

  // Event callbacks
  private onSendMessage?: (content: string) => Promise<void>;
  private onSearchUsers?: (query: string) => Promise<void>;
  private onStartConversation?: (userId: string) => Promise<void>;
  private onSelectConversation?: (conversationId: string) => Promise<void>;
  private onPreChatSubmit?: (name: string, email: string) => Promise<void>;
  private onLoadMore?: () => Promise<void>;

  constructor(config: RequiredConfig) {
    this.config = config;
    this.injectStyles();
    this.render();
  }

  // ===========================================
  // Public Methods
  // ===========================================

  open(): void {
    this.state.isOpen = true;
    this.updateView();
    this.config.onOpen?.();
  }

  close(): void {
    this.state.isOpen = false;
    this.updateView();
    this.config.onClose?.();
  }

  toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  setSession(session: AnonymousSession): void {
    this.state.session = session;
    this.determineInitialView();
    this.updateView();
  }

  setConversations(conversations: Conversation[]): void {
    this.state.conversations = conversations;
    this.state.unreadCount = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );
    this.updateView();
  }

  setCurrentConversation(conversation: Conversation | undefined): void {
    this.state.currentConversation = conversation;
    if (conversation) {
      this.state.view = 'chat';
    }
    this.updateView();
  }

  setMessages(messages: ChatMessage[]): void {
    this.state.messages = messages;
    this.updateView();
    this.scrollToBottom();
  }

  addMessage(message: ChatMessage): void {
    this.state.messages = [...this.state.messages, message];
    this.updateView();
    this.scrollToBottom();
  }

  setSearchResults(users: PeeapUser[]): void {
    this.state.searchResults = users;
    this.updateView();
  }

  setLoading(loading: boolean): void {
    this.state.isLoading = loading;
    this.updateView();
  }

  setError(error: { code: string; message: string } | undefined): void {
    this.state.error = error;
    this.updateView();
  }

  showView(view: WidgetView): void {
    this.state.view = view;
    this.updateView();
  }

  // Event handlers
  onSend(handler: (content: string) => Promise<void>): void {
    this.onSendMessage = handler;
  }

  onSearch(handler: (query: string) => Promise<void>): void {
    this.onSearchUsers = handler;
  }

  onConversationStart(handler: (userId: string) => Promise<void>): void {
    this.onStartConversation = handler;
  }

  onConversationSelect(handler: (conversationId: string) => Promise<void>): void {
    this.onSelectConversation = handler;
  }

  onPreChat(handler: (name: string, email: string) => Promise<void>): void {
    this.onPreChatSubmit = handler;
  }

  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    const style = document.getElementById('peeap-chat-styles');
    if (style) {
      style.remove();
    }
  }

  // ===========================================
  // Private Methods
  // ===========================================

  private injectStyles(): void {
    if (document.getElementById('peeap-chat-styles')) return;

    const style = document.createElement('style');
    style.id = 'peeap-chat-styles';
    style.textContent = getStyles({
      primaryColor: this.config.primaryColor,
      position: this.config.position,
      offsetX: this.config.offsetX,
      offsetY: this.config.offsetY,
      zIndex: this.config.zIndex,
      theme: this.config.theme === 'auto' ? this.getSystemTheme() : this.config.theme,
    });
    document.head.appendChild(style);
  }

  private getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }

  private determineInitialView(): void {
    const { collectName, collectEmail, targetUserId } = this.config;
    const { session } = this.state;

    // If pre-chat form is required and user hasn't provided info
    if ((collectName || collectEmail) && (!session?.name && !session?.email)) {
      this.state.view = 'prechat';
    }
    // If targeting a specific user, go to search/chat
    else if (targetUserId) {
      this.state.view = 'conversations';
    }
    // Otherwise show search
    else {
      this.state.view = 'search';
    }
  }

  private render(): void {
    this.container = document.createElement('div');
    this.container.className = 'peeap-chat-widget';
    this.container.innerHTML = this.getHTML();
    document.body.appendChild(this.container);
    this.attachEventListeners();
  }

  private updateView(): void {
    if (!this.container) return;
    this.container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  private getHTML(): string {
    return `
      ${this.getButtonHTML()}
      ${this.getContainerHTML()}
    `;
  }

  private getButtonHTML(): string {
    const { unreadCount } = this.state;
    return `
      <button class="peeap-chat-button" aria-label="Open chat">
        ${icons.chat}
        ${unreadCount > 0 ? `<span class="peeap-chat-button-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
      </button>
    `;
  }

  private getContainerHTML(): string {
    const { isOpen, view } = this.state;

    return `
      <div class="peeap-chat-container ${isOpen ? 'open' : ''}">
        ${this.getHeaderHTML()}
        ${view === 'prechat' ? this.getPreChatHTML() : ''}
        ${view === 'search' ? this.getSearchHTML() : ''}
        ${view === 'conversations' ? this.getConversationsHTML() : ''}
        ${view === 'chat' ? this.getChatHTML() : ''}
        ${this.getPoweredByHTML()}
      </div>
    `;
  }

  private getHeaderHTML(): string {
    const { view, currentConversation } = this.state;
    const { businessName, businessLogo, primaryColor } = this.config;
    const showBack = view === 'chat' || view === 'search';

    let title = businessName || 'Chat with us';
    let subtitle = 'We typically reply within minutes';

    if (view === 'chat' && currentConversation) {
      title = currentConversation.subject || 'Conversation';
      subtitle = 'Online';
    } else if (view === 'search') {
      title = 'Start a conversation';
      subtitle = 'Search for someone to chat with';
    }

    return `
      <div class="peeap-chat-header">
        ${showBack ? `
          <button class="peeap-chat-back-btn" data-action="back" aria-label="Go back">
            ${icons.back}
          </button>
        ` : ''}
        ${businessLogo ? `
          <img class="peeap-chat-header-logo" src="${businessLogo}" alt="${businessName || 'Logo'}" />
        ` : `
          <div class="peeap-chat-header-logo" style="background: ${primaryColor}40;">
            ${icons.message}
          </div>
        `}
        <div class="peeap-chat-header-info">
          <div class="peeap-chat-header-title">${this.escapeHtml(title)}</div>
          <div class="peeap-chat-header-subtitle">${this.escapeHtml(subtitle)}</div>
        </div>
        <button class="peeap-chat-header-close" data-action="close" aria-label="Close chat">
          ${icons.close}
        </button>
      </div>
    `;
  }

  private getPreChatHTML(): string {
    const { collectName, collectEmail, preChatTitle, welcomeMessage } = this.config;
    const { isLoading } = this.state;

    return `
      <div class="peeap-chat-prechat">
        <div class="peeap-chat-prechat-title">${this.escapeHtml(preChatTitle || 'Before we start')}</div>
        <div class="peeap-chat-prechat-subtitle">${this.escapeHtml(welcomeMessage || 'Please provide your details so we can assist you better.')}</div>

        <form class="peeap-chat-prechat-form" data-form="prechat">
          ${collectName ? `
            <div class="peeap-chat-form-group">
              <label class="peeap-chat-form-label" for="peeap-name">Your name</label>
              <input
                class="peeap-chat-form-input"
                type="text"
                id="peeap-name"
                name="name"
                placeholder="Enter your name"
                required
              />
            </div>
          ` : ''}
          ${collectEmail ? `
            <div class="peeap-chat-form-group">
              <label class="peeap-chat-form-label" for="peeap-email">Email address</label>
              <input
                class="peeap-chat-form-input"
                type="email"
                id="peeap-email"
                name="email"
                placeholder="Enter your email"
                required
              />
            </div>
          ` : ''}
          <button
            type="submit"
            class="peeap-chat-form-submit"
            ${isLoading ? 'disabled' : ''}
          >
            ${isLoading ? 'Starting...' : 'Start chatting'}
          </button>
        </form>
      </div>
    `;
  }

  private getSearchHTML(): string {
    const { searchResults, isLoading } = this.state;
    const { inputPlaceholder } = this.config;

    return `
      <div class="peeap-chat-search">
        <input
          class="peeap-chat-search-input"
          type="text"
          placeholder="${inputPlaceholder || 'Search for someone...'}"
          data-input="search"
        />
      </div>
      <div class="peeap-chat-search-results">
        ${isLoading ? `
          <div class="peeap-chat-loading">
            <div class="peeap-chat-spinner"></div>
          </div>
        ` : ''}
        ${!isLoading && searchResults.length === 0 ? `
          <div class="peeap-chat-empty">
            ${icons.search}
            <p>Search for Peeap users to start a conversation</p>
          </div>
        ` : ''}
        ${searchResults.map(user => this.getUserItemHTML(user)).join('')}
      </div>
    `;
  }

  private getUserItemHTML(user: PeeapUser): string {
    const initials = this.getInitials(user.name);
    return `
      <div class="peeap-chat-user-item" data-user-id="${user.id}">
        <div class="peeap-chat-user-avatar">
          ${user.avatar ? `<img src="${user.avatar}" alt="${this.escapeHtml(user.name)}" />` : initials}
        </div>
        <div class="peeap-chat-user-info">
          <div class="peeap-chat-user-name">${this.escapeHtml(user.name)}</div>
        </div>
      </div>
    `;
  }

  private getConversationsHTML(): string {
    const { conversations, isLoading } = this.state;

    if (isLoading) {
      return `
        <div class="peeap-chat-conversations">
          <div class="peeap-chat-loading">
            <div class="peeap-chat-spinner"></div>
          </div>
        </div>
      `;
    }

    if (conversations.length === 0) {
      return `
        <div class="peeap-chat-conversations">
          <div class="peeap-chat-empty">
            ${icons.message}
            <p>No conversations yet</p>
            <p>Start a new conversation to get started</p>
          </div>
          ${!this.config.targetUserId ? `
            <div style="padding: 16px;">
              <button class="peeap-chat-form-submit" data-action="new-chat">
                Start new conversation
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="peeap-chat-conversations">
        ${conversations.map(conv => this.getConversationItemHTML(conv)).join('')}
      </div>
    `;
  }

  private getConversationItemHTML(conv: Conversation): string {
    const participant = conv.participants?.[0];
    const name = participant?.name || conv.subject || 'Conversation';
    const initials = this.getInitials(name);
    const preview = conv.lastMessage?.content || 'No messages yet';
    const time = conv.lastMessageAt ? this.formatTime(conv.lastMessageAt) : '';

    return `
      <div class="peeap-chat-conv-item" data-conversation-id="${conv.id}">
        <div class="peeap-chat-conv-avatar">
          ${participant?.avatar ? `<img src="${participant.avatar}" alt="" />` : initials}
        </div>
        <div class="peeap-chat-conv-content">
          <div class="peeap-chat-conv-header">
            <span class="peeap-chat-conv-name">${this.escapeHtml(name)}</span>
            <span class="peeap-chat-conv-time">${time}</span>
          </div>
          <div class="peeap-chat-conv-preview">${this.escapeHtml(preview)}</div>
        </div>
        ${conv.unreadCount ? `
          <span class="peeap-chat-conv-unread">${conv.unreadCount}</span>
        ` : ''}
      </div>
    `;
  }

  private getChatHTML(): string {
    const { messages, isLoading, currentConversation } = this.state;
    const { welcomeMessage, inputPlaceholder, session } = this.config;

    return `
      <div class="peeap-chat-messages" data-messages>
        ${messages.length === 0 && welcomeMessage ? `
          <div class="peeap-chat-welcome">
            <div class="peeap-chat-welcome-icon">
              ${icons.chat}
            </div>
            <div class="peeap-chat-welcome-text">${this.escapeHtml(welcomeMessage)}</div>
            <div class="peeap-chat-welcome-subtext">Send us a message to get started</div>
          </div>
        ` : ''}
        ${messages.map(msg => this.getMessageHTML(msg)).join('')}
        ${isLoading ? `
          <div class="peeap-chat-typing">
            <span class="peeap-chat-typing-dot"></span>
            <span class="peeap-chat-typing-dot"></span>
            <span class="peeap-chat-typing-dot"></span>
          </div>
        ` : ''}
      </div>
      <div class="peeap-chat-input-area">
        <div class="peeap-chat-input-wrapper">
          <textarea
            class="peeap-chat-input"
            placeholder="${inputPlaceholder || 'Type a message...'}"
            rows="1"
            data-input="message"
          ></textarea>
        </div>
        <button class="peeap-chat-send-btn" data-action="send" aria-label="Send message">
          ${icons.send}
        </button>
      </div>
    `;
  }

  private getMessageHTML(message: ChatMessage): string {
    if (message.messageType === 'system') {
      return `
        <div class="peeap-chat-message-system">
          ${this.escapeHtml(message.content)}
        </div>
      `;
    }

    const isSent = message.senderType === 'anonymous' ||
                   message.senderSessionId === this.state.session?.sessionId;
    const time = this.formatTime(message.createdAt);

    return `
      <div class="peeap-chat-message ${isSent ? 'sent' : 'received'}">
        ${!isSent && message.senderName ? `
          <div class="peeap-chat-message-sender">${this.escapeHtml(message.senderName)}</div>
        ` : ''}
        <div class="peeap-chat-message-bubble">
          ${this.escapeHtml(message.content)}
        </div>
        <div class="peeap-chat-message-time">${time}</div>
      </div>
    `;
  }

  private getPoweredByHTML(): string {
    return `
      <div class="peeap-chat-powered">
        Powered by <a href="https://peeap.com" target="_blank" rel="noopener">Peeap</a>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Chat button
    const button = this.container.querySelector('.peeap-chat-button');
    button?.addEventListener('click', () => this.toggle());

    // Close button
    const closeBtn = this.container.querySelector('[data-action="close"]');
    closeBtn?.addEventListener('click', () => this.close());

    // Back button
    const backBtn = this.container.querySelector('[data-action="back"]');
    backBtn?.addEventListener('click', () => this.handleBack());

    // New chat button
    const newChatBtn = this.container.querySelector('[data-action="new-chat"]');
    newChatBtn?.addEventListener('click', () => this.showView('search'));

    // Pre-chat form
    const preChatForm = this.container.querySelector('[data-form="prechat"]');
    preChatForm?.addEventListener('submit', (e) => this.handlePreChatSubmit(e));

    // Search input
    const searchInput = this.container.querySelector('[data-input="search"]') as HTMLInputElement;
    if (searchInput) {
      let debounceTimer: ReturnType<typeof setTimeout>;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const query = searchInput.value.trim();
          if (query.length >= 2) {
            this.onSearchUsers?.(query);
          } else {
            this.setSearchResults([]);
          }
        }, 300);
      });
    }

    // User items (search results)
    const userItems = this.container.querySelectorAll('[data-user-id]');
    userItems.forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.getAttribute('data-user-id');
        if (userId) {
          this.onStartConversation?.(userId);
        }
      });
    });

    // Conversation items
    const convItems = this.container.querySelectorAll('[data-conversation-id]');
    convItems.forEach(item => {
      item.addEventListener('click', () => {
        const convId = item.getAttribute('data-conversation-id');
        if (convId) {
          this.onSelectConversation?.(convId);
        }
      });
    });

    // Message input
    const messageInput = this.container.querySelector('[data-input="message"]') as HTMLTextAreaElement;
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage(messageInput);
        }
      });

      // Auto-resize textarea
      messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
      });
    }

    // Send button
    const sendBtn = this.container.querySelector('[data-action="send"]');
    sendBtn?.addEventListener('click', () => {
      const input = this.container?.querySelector('[data-input="message"]') as HTMLTextAreaElement;
      if (input) {
        this.handleSendMessage(input);
      }
    });
  }

  private handleBack(): void {
    const { view } = this.state;
    if (view === 'chat') {
      this.state.currentConversation = undefined;
      this.state.messages = [];
      this.showView('conversations');
    } else if (view === 'search') {
      this.showView('conversations');
    }
  }

  private handlePreChatSubmit(e: Event): void {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get('name') as string || '';
    const email = formData.get('email') as string || '';
    this.onPreChatSubmit?.(name, email);
  }

  private handleSendMessage(input: HTMLTextAreaElement): void {
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    input.style.height = 'auto';
    this.onSendMessage?.(content);
  }

  private scrollToBottom(): void {
    const messagesEl = this.container?.querySelector('[data-messages]');
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  private formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
