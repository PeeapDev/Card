/**
 * WebSocket Server
 *
 * Provides a WebSocket interface for web applications to communicate
 * with the NFC Agent.
 */

import { EventEmitter } from 'events';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { v4 as uuid } from 'crypto';

interface Client {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
}

export class WebSocketServer extends EventEmitter {
  private server: WSServer | null = null;
  private port: number;
  private clients: Map<string, Client> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(port: number = 9876) {
    super();
    this.port = port;
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = new WSServer({
          port: this.port,
          host: '127.0.0.1', // Only accept local connections
        });

        this.server.on('listening', () => {
          console.log(`[WS] WebSocket server listening on ws://127.0.0.1:${this.port}`);
          this.startHeartbeat();
          resolve();
        });

        this.server.on('connection', (ws: WebSocket, req) => {
          const clientId = this.generateClientId();
          console.log(`[WS] Client connected: ${clientId}`);

          const client: Client = {
            id: clientId,
            ws,
            isAlive: true,
          };

          this.clients.set(clientId, client);
          this.emit('client-connected', clientId);

          ws.on('message', (message: Buffer) => {
            this.handleMessage(clientId, message.toString());
          });

          ws.on('close', () => {
            console.log(`[WS] Client disconnected: ${clientId}`);
            this.clients.delete(clientId);
            this.emit('client-disconnected', clientId);
          });

          ws.on('error', (error) => {
            console.error(`[WS] Client error (${clientId}):`, error.message);
            this.clients.delete(clientId);
          });

          ws.on('pong', () => {
            const c = this.clients.get(clientId);
            if (c) c.isAlive = true;
          });
        });

        this.server.on('error', (error) => {
          console.error('[WS] Server error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    this.stopHeartbeat();

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.ws.close();
      } catch {
        // Ignore close errors
      }
    }
    this.clients.clear();

    // Close server
    if (this.server) {
      this.server.close();
      this.server = null;
    }

    console.log('[WS] WebSocket server stopped');
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: object): void {
    const data = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(data);
        } catch (error) {
          console.error(`[WS] Failed to send to client ${client.id}:`, error);
        }
      }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: object): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[WS] Failed to send to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;

        case 'start_scan':
          // NFC scanning is always active, just acknowledge
          this.sendToClient(clientId, {
            type: 'status',
            payload: { scanning: true },
          });
          break;

        case 'stop_scan':
          // Acknowledge
          this.sendToClient(clientId, {
            type: 'status',
            payload: { scanning: false },
          });
          break;

        case 'write':
          if (message.payload?.data) {
            this.emit('write-request', message.payload.data, clientId);
          }
          break;

        default:
          console.log(`[WS] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    // Simple ID generation since we can't use uuid
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients.entries()) {
        if (!client.isAlive) {
          console.log(`[WS] Client ${clientId} timed out`);
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        client.isAlive = false;
        client.ws.ping();
      }
    }, 30000);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
