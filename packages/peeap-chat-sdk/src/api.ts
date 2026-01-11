/**
 * API Client for Chat Widget
 * Handles all HTTP requests to the widget endpoints
 */

import type {
  PeeapUser,
  Conversation,
  ChatMessage,
  Attachment,
  ApiResponse,
  SessionResponse,
  UsersSearchResponse,
  ConversationsResponse,
  MessagesResponse,
  PeeapChatError,
} from './types';

export class ApiClient {
  private apiKey: string;
  private apiBase: string;
  private sessionToken: string | null = null;

  constructor(apiKey: string, apiBase: string) {
    this.apiKey = apiKey;
    this.apiBase = apiBase;
  }

  /**
   * Set the session token for authenticated requests
   */
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    if (this.sessionToken) {
      headers['X-Widget-Session'] = this.sessionToken;
    }

    return headers;
  }

  /**
   * Make an API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.apiBase}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw {
        code: data.error || 'api_error',
        message: data.error_description || data.message || 'API request failed',
        details: data,
      } as PeeapChatError;
    }

    return data;
  }

  // ===========================================
  // Session Methods
  // ===========================================

  /**
   * Create an anonymous session
   */
  async createSession(params: {
    fingerprint: string;
    domain: string;
    origin?: string;
    referrer?: string;
    name?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SessionResponse> {
    return this.request('POST', '/widget/session', params);
  }

  /**
   * Validate an existing session
   */
  async validateSession(): Promise<{ valid: boolean }> {
    return this.request('POST', '/widget/session/validate');
  }

  /**
   * Update session user info
   */
  async updateSession(params: {
    name?: string;
    email?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SessionResponse> {
    return this.request('PATCH', '/widget/session', params);
  }

  // ===========================================
  // User Search Methods
  // ===========================================

  /**
   * Search for Peeap users
   */
  async searchUsers(query: string, limit = 10): Promise<PeeapUser[]> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    const response = await this.request<UsersSearchResponse>(
      'GET',
      `/widget/users/search?${params}`
    );
    return response.users;
  }

  /**
   * Get a specific user by ID
   */
  async getUser(userId: string): Promise<PeeapUser> {
    return this.request('GET', `/widget/users/${userId}`);
  }

  // ===========================================
  // Conversation Methods
  // ===========================================

  /**
   * Get all conversations for this session
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await this.request<ConversationsResponse>(
      'GET',
      '/widget/conversations'
    );
    return response.conversations;
  }

  /**
   * Start a new conversation
   */
  async startConversation(params: {
    targetUserId: string;
    subject?: string;
    message?: string;
  }): Promise<Conversation> {
    const response = await this.request<{ conversation: Conversation }>(
      'POST',
      '/widget/conversations',
      params
    );
    return response.conversation;
  }

  /**
   * Get a specific conversation
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    return this.request('GET', `/widget/conversations/${conversationId}`);
  }

  /**
   * Close/archive a conversation
   */
  async closeConversation(conversationId: string): Promise<void> {
    await this.request('PATCH', `/widget/conversations/${conversationId}`, {
      status: 'closed',
    });
  }

  // ===========================================
  // Message Methods
  // ===========================================

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    params?: { cursor?: string; limit?: number }
  ): Promise<MessagesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const endpoint = `/widget/conversations/${conversationId}/messages${query ? `?${query}` : ''}`;

    return this.request('GET', endpoint);
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    attachments?: string[]
  ): Promise<ChatMessage> {
    const response = await this.request<{ message: ChatMessage }>(
      'POST',
      `/widget/conversations/${conversationId}/messages`,
      {
        content,
        attachments,
      }
    );
    return response.message;
  }

  /**
   * Delete a message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await this.request(
      'DELETE',
      `/widget/conversations/${conversationId}/messages/${messageId}`
    );
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await this.request('POST', `/widget/conversations/${conversationId}/read`);
  }

  // ===========================================
  // File Upload Methods
  // ===========================================

  /**
   * Upload a file attachment
   */
  async uploadFile(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.apiBase}/widget/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'X-Widget-Session': this.sessionToken || '',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        code: 'upload_error',
        message: error.message || 'File upload failed',
      };
    }

    return response.json();
  }

  // ===========================================
  // Typing Indicator
  // ===========================================

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    await this.request('POST', `/widget/conversations/${conversationId}/typing`, {
      isTyping,
    });
  }
}
