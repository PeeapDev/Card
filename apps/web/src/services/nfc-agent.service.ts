/**
 * NFC Agent Service
 *
 * Connects to a local NFC Agent running on the user's computer.
 * The agent uses native PC/SC libraries to communicate with the NFC reader,
 * which works reliably across all operating systems without requiring
 * users to disable system services.
 *
 * Communication flow:
 * 1. Web app connects to local agent via WebSocket (ws://localhost:9876)
 * 2. Agent detects NFC cards using native PC/SC
 * 3. Agent sends card data to web app
 * 4. Web app can request writes via WebSocket
 */

export interface NFCAgentStatus {
  connected: boolean;
  readerName: string | null;
  cardPresent: boolean;
  lastError: string | null;
  version: string | null;
}

export interface NFCAgentCardData {
  uid: string;
  atr: string;
  data: string | null;
  type: 'mifare' | 'ntag' | 'desfire' | 'unknown';
}

export interface NFCAgentMessage {
  type: 'status' | 'card_detected' | 'card_removed' | 'write_result' | 'error' | 'pong';
  payload: any;
}

type CardCallback = (card: NFCAgentCardData) => void;
type StatusCallback = (status: NFCAgentStatus) => void;
type ErrorCallback = (error: string) => void;

class NFCAgentService {
  private ws: WebSocket | null = null;
  private readonly AGENT_URL = 'ws://localhost:9876';
  private readonly RECONNECT_INTERVAL = 3000;
  private readonly PING_INTERVAL = 10000;

  private status: NFCAgentStatus = {
    connected: false,
    readerName: null,
    cardPresent: false,
    lastError: null,
    version: null,
  };

  private cardCallbacks: Set<CardCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isManuallyDisconnected = false;

  /**
   * Check if the NFC Agent is available
   */
  async isAgentAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const testWs = new WebSocket(this.AGENT_URL);
        const timeout = setTimeout(() => {
          testWs.close();
          resolve(false);
        }, 2000);

        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve(true);
        };

        testWs.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Connect to the local NFC Agent
   */
  async connect(): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    this.isManuallyDisconnected = false;

    return new Promise((resolve) => {
      try {
        console.log('[NFC Agent] Connecting to local agent...');
        this.ws = new WebSocket(this.AGENT_URL);

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            this.updateStatus({ connected: false, lastError: 'Connection timeout' });
            resolve(false);
          }
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('[NFC Agent] Connected to local agent');
          this.updateStatus({ connected: true, lastError: null });
          this.startPing();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('[NFC Agent] WebSocket error:', error);
          this.updateStatus({ connected: false, lastError: 'Connection error' });
        };

        this.ws.onclose = () => {
          clearTimeout(connectionTimeout);
          console.log('[NFC Agent] Disconnected from local agent');
          this.stopPing();
          this.updateStatus({
            connected: false,
            readerName: null,
            cardPresent: false
          });

          // Auto-reconnect unless manually disconnected
          if (!this.isManuallyDisconnected) {
            this.scheduleReconnect();
          }
        };
      } catch (err: any) {
        console.error('[NFC Agent] Connection failed:', err);
        this.updateStatus({ connected: false, lastError: err.message });
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from the NFC Agent
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.stopReconnect();
    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateStatus({
      connected: false,
      readerName: null,
      cardPresent: false,
    });
  }

  /**
   * Start NFC scanning
   */
  startScanning(): void {
    this.send({ type: 'start_scan' });
  }

  /**
   * Stop NFC scanning
   */
  stopScanning(): void {
    this.send({ type: 'stop_scan' });
  }

  /**
   * Write data to NFC card
   */
  async writeToCard(data: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ success: false, error: 'Not connected to NFC agent' });
        return;
      }

      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Write timeout' });
      }, 10000);

      // Set up one-time listener for write result
      const handleWriteResult = (event: MessageEvent) => {
        try {
          const msg: NFCAgentMessage = JSON.parse(event.data);
          if (msg.type === 'write_result') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handleWriteResult);
            resolve(msg.payload);
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.addEventListener('message', handleWriteResult);
      this.send({ type: 'write', payload: { data } });
    });
  }

  /**
   * Get current status
   */
  getStatus(): NFCAgentStatus {
    return { ...this.status };
  }

  /**
   * Register callback for card detection
   */
  onCardDetected(callback: CardCallback): () => void {
    this.cardCallbacks.add(callback);
    return () => this.cardCallbacks.delete(callback);
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.status);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Register callback for errors
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  // Private methods

  private send(message: { type: string; payload?: any }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: string): void {
    try {
      const msg: NFCAgentMessage = JSON.parse(data);

      switch (msg.type) {
        case 'status':
          this.updateStatus({
            readerName: msg.payload.readerName,
            cardPresent: msg.payload.cardPresent,
            version: msg.payload.version,
          });
          break;

        case 'card_detected':
          console.log('[NFC Agent] Card detected:', msg.payload);
          this.updateStatus({ cardPresent: true });
          this.notifyCardDetected(msg.payload);
          break;

        case 'card_removed':
          this.updateStatus({ cardPresent: false });
          break;

        case 'error':
          console.error('[NFC Agent] Error:', msg.payload);
          this.updateStatus({ lastError: msg.payload.message });
          this.notifyError(msg.payload.message);
          break;

        case 'pong':
          // Connection is alive
          break;
      }
    } catch (err) {
      console.error('[NFC Agent] Failed to parse message:', err);
    }
  }

  private updateStatus(partial: Partial<NFCAgentStatus>): void {
    this.status = { ...this.status, ...partial };
    this.statusCallbacks.forEach(cb => cb(this.status));
  }

  private notifyCardDetected(card: NFCAgentCardData): void {
    this.cardCallbacks.forEach(cb => cb(card));
  }

  private notifyError(error: string): void {
    this.errorCallbacks.forEach(cb => cb(error));
  }

  private scheduleReconnect(): void {
    this.stopReconnect();
    this.reconnectTimer = setTimeout(() => {
      console.log('[NFC Agent] Attempting to reconnect...');
      this.connect();
    }, this.RECONNECT_INTERVAL);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, this.PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

// Export singleton instance
export const nfcAgentService = new NFCAgentService();
