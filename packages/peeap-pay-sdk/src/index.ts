/**
 * Peeap Pay SDK
 * Client-side SDK for NFC, QR, and Payment Integration
 *
 * CDN Usage:
 * <script src="https://cdn.peeappay.com/sdk/v1/peeap-pay.js"></script>
 * or
 * <script src="https://cdn.jsdelivr.net/gh/PeeapDev/pay-sdk@latest/dist/peeap-pay.js"></script>
 *
 * @example
 * ```typescript
 * import { PeeapPay } from '@peeap/pay-sdk';
 *
 * const peeap = new PeeapPay({
 *   publicKey: 'pk_live_...',
 *   environment: 'production'
 * });
 *
 * // Generate QR for payment
 * const qr = await peeap.qr.generate({
 *   amount: 5000,
 *   currency: 'USD'
 * });
 *
 * // Listen for NFC taps (Android)
 * peeap.nfc.onTap((event) => {
 *   console.log('NFC payment received:', event);
 * });
 * ```
 */

// Types
export interface PeeapPayConfig {
  publicKey: string;
  environment?: 'sandbox' | 'production';
  baseUrl?: string;
  onError?: (error: PeeapPayError) => void;
  onPaymentComplete?: (result: PaymentResult) => void;
}

export interface PeeapPayError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  sessionId?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

export interface QRGenerateRequest {
  amount: number;
  currency: string;
  merchantId?: string;
  description?: string;
  expiresIn?: number;
}

export interface QRGenerateResponse {
  id: string;
  qrImage: string;
  qrData: string;
  paymentUrl: string;
  expiresAt: number;
}

export interface NFCReadEvent {
  token: string;
  cardId?: string;
  merchantId?: string;
  amount?: number;
  timestamp: number;
}

export interface SessionCreateRequest {
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  customer?: {
    email?: string;
    phone?: string;
  };
  redirectUrl?: string;
  callbackUrl?: string;
}

export interface PaymentSession {
  id: string;
  token: string;
  paymentUrl: string;
  deepLink: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
}

// SDK Implementation
export class PeeapPay {
  private config: Required<PeeapPayConfig>;
  private readonly DEFAULT_BASE_URL = 'https://api.peeappay.com';
  private readonly SANDBOX_BASE_URL = 'https://sandbox.api.peeappay.com';

  public readonly qr: QRModule;
  public readonly nfc: NFCModule;
  public readonly session: SessionModule;
  public readonly checkout: CheckoutModule;

  constructor(config: PeeapPayConfig) {
    if (!config.publicKey) {
      throw new Error('Public key is required');
    }

    if (!config.publicKey.startsWith('pk_')) {
      throw new Error('Invalid public key format. Must start with pk_');
    }

    this.config = {
      publicKey: config.publicKey,
      environment: config.environment || 'production',
      baseUrl: config.baseUrl || (config.environment === 'sandbox' ? this.SANDBOX_BASE_URL : this.DEFAULT_BASE_URL),
      onError: config.onError || (() => {}),
      onPaymentComplete: config.onPaymentComplete || (() => {}),
    };

    // Initialize modules
    this.qr = new QRModule(this);
    this.nfc = new NFCModule(this);
    this.session = new SessionModule(this);
    this.checkout = new CheckoutModule(this);
  }

  /**
   * Make API request
   */
  async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Public-Key': this.config.publicKey,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        const error: PeeapPayError = {
          code: data.code || 'API_ERROR',
          message: data.message || 'Request failed',
          details: data,
        };
        this.config.onError(error);
        throw error;
      }

      return data;
    } catch (error) {
      if ((error as PeeapPayError).code) {
        throw error;
      }
      const peeapError: PeeapPayError = {
        code: 'NETWORK_ERROR',
        message: (error as Error).message || 'Network request failed',
      };
      this.config.onError(peeapError);
      throw peeapError;
    }
  }

  /**
   * Get public key
   */
  getPublicKey(): string {
    return this.config.publicKey;
  }

  /**
   * Get environment
   */
  getEnvironment(): string {
    return this.config.environment;
  }

  /**
   * Check if Web NFC is supported
   */
  isNFCSupported(): boolean {
    return 'NDEFReader' in window;
  }

  /**
   * Handle payment completion
   */
  handlePaymentComplete(result: PaymentResult): void {
    this.config.onPaymentComplete(result);
  }
}

/**
 * QR Module - Generate and scan QR codes
 */
class QRModule {
  constructor(private sdk: PeeapPay) {}

  /**
   * Generate a payment QR code
   */
  async generate(request: QRGenerateRequest): Promise<QRGenerateResponse> {
    const response = await this.sdk.request<{ success: boolean; data: QRGenerateResponse }>('/qr/generate', {
      method: 'POST',
      body: {
        ...request,
        type: 'dynamic',
      },
    });

    return response.data;
  }

  /**
   * Decode a QR payload
   */
  async decode(payload: string): Promise<{
    valid: boolean;
    cardId?: string;
    amount?: number;
    currency?: string;
    error?: string;
  }> {
    const response = await this.sdk.request<{ success: boolean; data: { valid: boolean; cardId?: string; amount?: number; currency?: string; error?: string } }>('/qr/decode', {
      method: 'POST',
      body: { payload },
    });

    return response.data;
  }

  /**
   * Start QR scanner (uses device camera)
   */
  async startScanner(
    videoElement: HTMLVideoElement,
    onScan: (data: string) => void
  ): Promise<{ stop: () => void }> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera not supported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });

    videoElement.srcObject = stream;
    videoElement.play();

    // In production, integrate a QR scanning library like jsQR
    let scanning = true;

    const scan = async () => {
      if (!scanning) return;
      // QR scanning logic would go here
      requestAnimationFrame(scan);
    };

    scan();

    return {
      stop: () => {
        scanning = false;
        stream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
      },
    };
  }

  /**
   * Render QR code to canvas
   */
  renderToCanvas(canvas: HTMLCanvasElement, qrData: string, size: number = 200): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Load QR image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
    };
    img.src = qrData;
  }
}

/**
 * NFC Module - Read and write NFC tags
 */
class NFCModule {
  private reader: NDEFReader | null = null;
  private listeners: ((event: NFCReadEvent) => void)[] = [];

  constructor(private sdk: PeeapPay) {}

  /**
   * Check if Web NFC is available
   */
  isSupported(): boolean {
    return 'NDEFReader' in window;
  }

  /**
   * Start listening for NFC taps
   */
  async startReading(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web NFC is not supported on this device');
    }

    this.reader = new (window as unknown as { NDEFReader: new () => NDEFReader }).NDEFReader();

    this.reader.addEventListener('reading', (event: NDEFReadingEvent) => {
      const record = event.message.records[0];
      if (record && record.recordType === 'url') {
        const decoder = new TextDecoder();
        const url = decoder.decode(record.data);

        // Extract token from URL
        const tokenMatch = url.match(/\/t\/(.+)$/);
        if (tokenMatch) {
          const nfcEvent: NFCReadEvent = {
            token: tokenMatch[1],
            timestamp: Date.now(),
          };

          this.listeners.forEach(listener => listener(nfcEvent));
        }
      }
    });

    await this.reader.scan();
  }

  /**
   * Stop listening for NFC
   */
  stopReading(): void {
    if (this.reader) {
      // No explicit stop method, just clear references
      this.reader = null;
    }
  }

  /**
   * Register callback for NFC tap events
   */
  onTap(callback: (event: NFCReadEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Write NDEF message to NFC tag
   */
  async write(url: string): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web NFC is not supported');
    }

    const writer = new (window as unknown as { NDEFReader: new () => NDEFReader }).NDEFReader();
    await writer.write({
      records: [{ recordType: 'url', data: url }],
    });
  }

  /**
   * Generate NFC token for writing
   */
  async getWriteToken(cardId: string): Promise<string> {
    const response = await this.sdk.request<{ success: boolean; data: { ndefUrl: string } }>('/nfc/token/sign', {
      method: 'POST',
      body: { cardId },
    });

    return response.data.ndefUrl;
  }
}

/**
 * Session Module - Create and manage payment sessions
 */
class SessionModule {
  constructor(private sdk: PeeapPay) {}

  /**
   * Create a new payment session
   */
  async create(request: SessionCreateRequest): Promise<PaymentSession> {
    const response = await this.sdk.request<{ success: boolean; data: { session: PaymentSession; paymentUrl: string; deepLink: string } }>('/session/create', {
      method: 'POST',
      body: request as unknown as Record<string, unknown>,
    });

    return {
      ...response.data.session,
      paymentUrl: response.data.paymentUrl,
      deepLink: response.data.deepLink,
    };
  }

  /**
   * Get session details
   */
  async get(sessionId: string): Promise<PaymentSession> {
    const response = await this.sdk.request<{ success: boolean; data: PaymentSession }>(`/session/${sessionId}`);
    return response.data;
  }

  /**
   * Verify session token
   */
  async verify(token: string): Promise<{ valid: boolean; session?: PaymentSession; error?: string }> {
    const response = await this.sdk.request<{ success: boolean; valid: boolean; session?: PaymentSession; error?: string }>('/session/verify', {
      method: 'POST',
      body: { token },
    });

    return {
      valid: response.valid,
      session: response.session,
      error: response.error,
    };
  }

  /**
   * Cancel a session
   */
  async cancel(sessionId: string): Promise<void> {
    await this.sdk.request(`/session/${sessionId}/cancel`, {
      method: 'POST',
    });
  }
}

/**
 * Checkout Module - Handle checkout UI
 */
class CheckoutModule {
  private modal: HTMLDivElement | null = null;

  constructor(private sdk: PeeapPay) {}

  /**
   * Open checkout modal
   */
  async open(options: {
    session: PaymentSession;
    onSuccess?: (result: PaymentResult) => void;
    onCancel?: () => void;
    onError?: (error: PeeapPayError) => void;
  }): Promise<void> {
    // Create modal overlay
    this.modal = document.createElement('div');
    this.modal.id = 'peeap-checkout-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style="margin: 0 auto;">
          <circle cx="30" cy="30" r="30" fill="#4F46E5"/>
          <path d="M20 30L27 37L40 24" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 24px; color: #111;">Pay with Peeap</h2>
      <p style="margin: 0 0 20px; color: #666; font-size: 14px;">${options.session.amount} ${options.session.currency}</p>

      <div style="margin-bottom: 20px;">
        <img src="${options.session.paymentUrl.replace('/t/', '/qr/')}"
             alt="Scan to pay"
             style="width: 180px; height: 180px; border: 1px solid #eee; border-radius: 8px;" />
      </div>

      <p style="margin: 0 0 16px; color: #888; font-size: 12px;">
        Scan with Peeap app or tap your NFC card
      </p>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <a href="${options.session.deepLink}"
           style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Open Peeap App
        </a>
        <button id="peeap-checkout-cancel"
                style="padding: 12px 24px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
          Cancel
        </button>
      </div>

      <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px;">
        Secured by Peeap Pay
      </p>
    `;

    this.modal.appendChild(content);
    document.body.appendChild(this.modal);

    // Handle cancel
    const cancelBtn = content.querySelector('#peeap-checkout-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.close();
        options.onCancel?.();
      });
    }

    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
        options.onCancel?.();
      }
    });

    // Poll for payment completion
    this.pollForCompletion(options.session.id, options.onSuccess, options.onError);
  }

  /**
   * Close checkout modal
   */
  close(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  /**
   * Poll for payment completion
   */
  private async pollForCompletion(
    sessionId: string,
    onSuccess?: (result: PaymentResult) => void,
    onError?: (error: PeeapPayError) => void
  ): Promise<void> {
    const maxAttempts = 60; // 5 minutes with 5 second intervals
    let attempts = 0;

    const poll = async () => {
      if (!this.modal) return; // Modal closed

      try {
        const session = await this.sdk.session.get(sessionId);

        if (session.status === 'completed') {
          this.close();
          onSuccess?.({
            success: true,
            sessionId,
            amount: session.amount,
            currency: session.currency,
          });
          return;
        }

        if (session.status === 'failed' || session.status === 'cancelled' || session.status === 'expired') {
          this.close();
          onError?.({
            code: 'PAYMENT_FAILED',
            message: `Payment ${session.status}`,
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      } catch (error) {
        // Continue polling on network errors
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  }

  /**
   * Redirect to hosted checkout
   */
  redirect(session: PaymentSession): void {
    window.location.href = session.paymentUrl;
  }
}

// Web NFC types
interface NDEFReader {
  scan(): Promise<void>;
  write(message: { records: NDEFRecordInit[] }): Promise<void>;
  addEventListener(type: 'reading', listener: (event: NDEFReadingEvent) => void): void;
}

interface NDEFReadingEvent extends Event {
  message: {
    records: NDEFRecord[];
  };
}

interface NDEFRecord {
  recordType: string;
  data: ArrayBuffer;
}

interface NDEFRecordInit {
  recordType: string;
  data: string;
}

// Default export
export default PeeapPay;
