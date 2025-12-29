/**
 * NFC Extension Service
 *
 * Communicates with the PeeAP NFC Chrome Extension for card reading.
 * The extension uses WebUSB to communicate with USB NFC readers.
 */

// Type declarations for Chrome extension runtime API
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          callback: (response: unknown) => void
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}

// Extension ID - will be set after publishing to Chrome Web Store
// For development, use the extension ID from chrome://extensions
const EXTENSION_ID = 'your-extension-id-here'; // Replace after publishing

export interface NFCExtensionStatus {
  available: boolean;
  connected: boolean;
  scanning: boolean;
  deviceName: string | null;
  version?: string;
}

export interface NFCCardData {
  uid: string;
  data: string | null;
}

type NFCExtensionListener = (data: NFCCardData) => void;
type StatusListener = (status: NFCExtensionStatus) => void;

class NFCExtensionService {
  private listeners: Set<NFCExtensionListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private extensionId: string | null = null;
  private status: NFCExtensionStatus = {
    available: false,
    connected: false,
    scanning: false,
    deviceName: null,
  };

  constructor() {
    // Listen for messages from extension via content script
    window.addEventListener('message', this.handleWindowMessage);

    // Try to detect extension on load
    this.detectExtension();
  }

  /**
   * Detect if the PeeAP NFC extension is installed
   */
  async detectExtension(): Promise<boolean> {
    // First check if browser supports Chrome extension API
    if (!this.isChromeBrowser()) {
      console.log('[NFC Extension] Not a Chrome-based browser, extension not supported');
      this.updateStatus({ available: false });
      return false;
    }

    // Check if already detected via content script message
    if (this.extensionId && this.status.available) {
      console.log('[NFC Extension] Already detected, using cached status');
      return true;
    }

    // Try stored extension ID first
    const storedId = localStorage.getItem('peeap_nfc_extension_id');
    if (storedId) {
      console.log('[NFC Extension] Trying stored extension ID:', storedId);
      const detected = await this.tryExtensionId(storedId);
      if (detected) {
        console.log('[NFC Extension] Extension detected via stored ID');
        return true;
      }
    }

    // Wait a bit for content script to announce itself
    console.log('[NFC Extension] Waiting for content script announcement...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check again if detected via content script
    if (this.extensionId && this.status.available) {
      console.log('[NFC Extension] Extension detected via content script');
      return true;
    }

    // Try well-known extension IDs
    const knownIds = [
      EXTENSION_ID,
      // Add other known IDs after publishing
    ].filter(id => id !== 'your-extension-id-here');

    for (const id of knownIds) {
      const detected = await this.tryExtensionId(id);
      if (detected) {
        console.log('[NFC Extension] Extension detected via known ID:', id);
        return true;
      }
    }

    console.log('[NFC Extension] Extension not detected');
    this.updateStatus({ available: false });
    return false;
  }

  /**
   * Check if extension is required but not installed
   * Returns info for showing install prompts
   */
  getInstallStatus(): {
    isChromeBrowser: boolean;
    isInstalled: boolean;
    installUrl: string;
    message: string;
  } {
    const isChrome = this.isChromeBrowser();
    const isInstalled = this.status.available;

    let message = '';
    if (!isChrome) {
      message = 'NFC Extension requires Chrome or Edge browser';
    } else if (!isInstalled) {
      message = 'Install the PeeAP NFC Extension to use NFC card readers';
    } else {
      message = 'NFC Extension installed and ready';
    }

    return {
      isChromeBrowser: isChrome,
      isInstalled,
      installUrl: this.getInstallUrl(),
      message,
    };
  }

  /**
   * Try to connect to extension with specific ID
   */
  private async tryExtensionId(extensionId: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!window.chrome?.runtime?.sendMessage) {
          resolve(false);
          return;
        }

        window.chrome.runtime.sendMessage(
          extensionId,
          { type: 'PING' },
          (response: any) => {
            if (window.chrome?.runtime?.lastError) {
              resolve(false);
              return;
            }

            if (response && response.type === 'PONG') {
              this.extensionId = extensionId;
              localStorage.setItem('peeap_nfc_extension_id', extensionId);
              this.updateStatus({
                available: true,
                version: response.version
              });
              this.setupExtensionListeners();
              resolve(true);
              return;
            }

            resolve(false);
          }
        );

        // Timeout fallback
        setTimeout(() => resolve(false), 1000);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Set up listeners for extension messages
   */
  private setupExtensionListeners() {
    if (!this.extensionId) return;

    // Get initial status
    this.getStatus();
  }

  /**
   * Handle messages from window (content script bridge)
   */
  private handleWindowMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'peeap-nfc-extension') return;

    const { type, payload, extensionId } = event.data;

    // Store extension ID when we receive any message from the extension
    if (extensionId && !this.extensionId) {
      console.log('[NFC Extension] Detected extension ID:', extensionId);
      this.extensionId = extensionId;
      localStorage.setItem('peeap_nfc_extension_id', extensionId);
    }

    switch (type) {
      case 'EXTENSION_AVAILABLE':
        console.log('[NFC Extension] Extension available:', payload);
        this.extensionId = extensionId || payload?.extensionId;
        if (this.extensionId) {
          localStorage.setItem('peeap_nfc_extension_id', this.extensionId);
        }
        this.updateStatus({
          available: true,
          version: payload?.version,
        });
        break;
      case 'CARD_DETECTED':
        this.notifyListeners(payload);
        break;
      case 'READER_CONNECTED':
        this.updateStatus({
          available: true,
          connected: true,
          deviceName: payload.deviceName,
        });
        break;
      case 'READER_DISCONNECTED':
        this.updateStatus({
          connected: false,
          scanning: false,
          deviceName: null,
        });
        break;
      case 'STATUS':
        this.updateStatus({
          available: true,
          connected: payload.connected,
          scanning: payload.scanning,
          deviceName: payload.deviceName,
        });
        break;
    }
  };

  /**
   * Get current status from extension
   */
  async getStatus(): Promise<NFCExtensionStatus> {
    if (!this.extensionId) {
      await this.detectExtension();
    }

    if (!this.extensionId || !window.chrome?.runtime?.sendMessage) {
      return this.status;
    }

    return new Promise((resolve) => {
      window.chrome!.runtime!.sendMessage(
        this.extensionId!,
        { type: 'GET_STATUS' },
        (response: any) => {
          if (window.chrome?.runtime?.lastError || !response) {
            resolve(this.status);
            return;
          }

          this.updateStatus({
            connected: response.connected,
            scanning: response.scanning,
            deviceName: response.deviceName,
          });

          resolve(this.status);
        }
      );

      setTimeout(() => resolve(this.status), 2000);
    });
  }

  /**
   * Connect to NFC reader via extension
   */
  async connect(): Promise<{ success: boolean; error?: string }> {
    if (!this.extensionId) {
      const detected = await this.detectExtension();
      if (!detected) {
        return { success: false, error: 'Extension not found' };
      }
    }

    if (!window.chrome?.runtime?.sendMessage) {
      return { success: false, error: 'Chrome extension API not available' };
    }

    return new Promise((resolve) => {
      window.chrome!.runtime!.sendMessage(
        this.extensionId!,
        { type: 'CONNECT' },
        (response: any) => {
          if (window.chrome?.runtime?.lastError) {
            resolve({ success: false, error: window.chrome.runtime.lastError.message });
            return;
          }

          if (response?.type === 'CONNECT_RESULT') {
            if (response.success) {
              this.updateStatus({
                connected: true,
                deviceName: response.deviceName,
              });
            }
            resolve({ success: response.success, error: response.error });
          } else {
            resolve({ success: false, error: 'Invalid response' });
          }
        }
      );

      setTimeout(() => {
        resolve({ success: false, error: 'Connection timeout' });
      }, 10000);
    });
  }

  /**
   * Start scanning for NFC cards
   */
  async startScan(): Promise<void> {
    if (!this.extensionId || !window.chrome?.runtime?.sendMessage) return;

    window.chrome.runtime.sendMessage(
      this.extensionId,
      { type: 'START_SCAN' },
      (response: any) => {
        if (response?.type === 'SCAN_STARTED') {
          this.updateStatus({ scanning: true });
        }
      }
    );
  }

  /**
   * Stop scanning for NFC cards
   */
  async stopScan(): Promise<void> {
    if (!this.extensionId || !window.chrome?.runtime?.sendMessage) return;

    window.chrome.runtime.sendMessage(
      this.extensionId,
      { type: 'STOP_SCAN' },
      (response: any) => {
        if (response?.type === 'SCAN_STOPPED') {
          this.updateStatus({ scanning: false });
        }
      }
    );
  }

  /**
   * Add listener for card detection
   */
  onCardDetected(callback: NFCExtensionListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Add listener for status changes
   */
  onStatusChange(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    // Immediately notify with current status
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(updates: Partial<NFCExtensionStatus>) {
    this.status = { ...this.status, ...updates };
    this.statusListeners.forEach(cb => cb(this.status));
  }

  /**
   * Notify card listeners
   */
  private notifyListeners(data: NFCCardData) {
    this.listeners.forEach(cb => cb(data));
  }

  /**
   * Set extension ID manually (for development)
   */
  setExtensionId(id: string) {
    this.extensionId = id;
    localStorage.setItem('peeap_nfc_extension_id', id);
    this.detectExtension();
  }

  /**
   * Get the Chrome Web Store install URL
   */
  getInstallUrl(): string {
    // For now, return a direct link (will update after publishing)
    return 'chrome://extensions';
  }

  /**
   * Check if running in Chrome browser
   */
  isChromeBrowser(): boolean {
    // Check user agent for Chrome (but not Edge which also has chrome in UA)
    const ua = navigator.userAgent.toLowerCase();
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    // Also check for chromium-based browsers
    const isChromium = ua.includes('chromium');
    return isChrome || isChromium;
  }

  /**
   * Cleanup
   */
  destroy() {
    window.removeEventListener('message', this.handleWindowMessage);
    this.listeners.clear();
    this.statusListeners.clear();
  }
}

// Singleton instance
export const nfcExtensionService = new NFCExtensionService();
export default nfcExtensionService;
