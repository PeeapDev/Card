/**
 * Real-time Messaging Client
 * Handles WebSocket connections for live message updates
 */

import type { ChatMessage, TypingIndicator, RealtimeMessage } from './types';

export type MessageCallback = (message: ChatMessage) => void;
export type TypingCallback = (indicator: TypingIndicator) => void;
export type ConnectionCallback = (status: 'connected' | 'disconnected' | 'error') => void;

interface Subscription {
  conversationId: string;
  onMessage: MessageCallback;
  onTyping?: TypingCallback;
}

export class RealtimeClient {
  private apiBase: string;
  private sessionToken: string | null = null;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private connectionCallback?: ConnectionCallback;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastMessageId: Map<string, string> = new Map();

  constructor(apiBase: string) {
    this.apiBase = apiBase;
  }

  /**
   * Set the session token
   */
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  /**
   * Set connection status callback
   */
  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallback = callback;
  }

  /**
   * Subscribe to a conversation for real-time updates
   */
  subscribe(
    conversationId: string,
    onMessage: MessageCallback,
    onTyping?: TypingCallback
  ): () => void {
    const subscription: Subscription = { conversationId, onMessage, onTyping };
    this.subscriptions.set(conversationId, subscription);

    // Connect if not already connected
    this.ensureConnection();

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(conversationId);
      if (this.subscriptions.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Ensure WebSocket connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    // Try WebSocket first, fall back to polling
    try {
      await this.connectWebSocket();
    } catch {
      this.startPolling();
    }
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    if (!this.sessionToken) {
      throw new Error('No session token');
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      // Convert HTTP URL to WebSocket URL
      const wsUrl = this.apiBase
        .replace('https://', 'wss://')
        .replace('http://', 'ws://');

      const url = `${wsUrl}/widget/ws?session=${encodeURIComponent(this.sessionToken!)}`;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionCallback?.('connected');

          // Subscribe to all conversations
          this.subscriptions.forEach((_, conversationId) => {
            this.sendSubscribe(conversationId);
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as RealtimeMessage;
            this.handleMessage(data);
          } catch {
            // Ignore parse errors
          }
        };

        this.ws.onerror = () => {
          this.isConnecting = false;
          reject(new Error('WebSocket error'));
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.connectionCallback?.('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Send subscribe message to WebSocket
   */
  private sendSubscribe(conversationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        conversationId,
      }));
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: RealtimeMessage): void {
    if (data.event === 'new_message') {
      const message = data.payload as ChatMessage;
      const subscription = this.subscriptions.get(message.conversationId);
      if (subscription) {
        subscription.onMessage(message);
        this.lastMessageId.set(message.conversationId, message.id);
      }
    } else if (data.event === 'typing') {
      const indicator = data.payload as TypingIndicator;
      const subscription = this.subscriptions.get(indicator.conversationId);
      if (subscription?.onTyping) {
        subscription.onTyping(indicator);
      }
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.startPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.subscriptions.size > 0) {
        this.ensureConnection();
      }
    }, delay);
  }

  /**
   * Start polling fallback
   */
  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      this.pollForMessages();
    }, 3000); // Poll every 3 seconds

    // Initial poll
    this.pollForMessages();
  }

  /**
   * Poll for new messages
   */
  private async pollForMessages(): Promise<void> {
    if (!this.sessionToken) return;

    for (const [conversationId, subscription] of this.subscriptions) {
      try {
        const lastId = this.lastMessageId.get(conversationId);
        const params = new URLSearchParams();
        if (lastId) params.set('after', lastId);

        const response = await fetch(
          `${this.apiBase}/widget/conversations/${conversationId}/messages/poll?${params}`,
          {
            headers: {
              'X-API-Key': this.sessionToken,
              'X-Widget-Session': this.sessionToken,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const messages = data.messages as ChatMessage[];

          messages.forEach((message) => {
            subscription.onMessage(message);
            this.lastMessageId.set(conversationId, message.id);
          });
        }
      } catch {
        // Ignore poll errors
      }
    }
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        conversationId,
        isTyping,
      }));
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopPolling();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    this.lastMessageId.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || this.pollInterval !== null;
  }
}
