/**
 * Bluetooth NFC Reader Service
 *
 * Provides Web Bluetooth API integration for NFC card readers.
 * Supports ACR1255U and similar Bluetooth NFC readers.
 */

import type { BluetoothDevice, BluetoothRemoteGATTCharacteristic } from '@/types/web-bluetooth';

// ACR1255U-J1 Bluetooth NFC Reader UUIDs
const ACR1255U_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
const ACR1255U_READ_CHAR_UUID = '0000ff02-0000-1000-8000-00805f9b34fb';
const ACR1255U_WRITE_CHAR_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';

// Generic NFC reader service UUIDs (fallback)
const GENERIC_NFC_SERVICE_UUIDS = [
  ACR1255U_SERVICE_UUID,
  '0000180f-0000-1000-8000-00805f9b34fb', // Battery service
];

export interface BluetoothNFCStatus {
  supported: boolean;
  available: boolean;
  paired: boolean;
  connected: boolean;
  deviceName: string | null;
  deviceId: string | null;
  scanning: boolean;
  error: string | null;
}

export interface CardReadEvent {
  uid: string;
  type: string;
  timestamp: Date;
  raw?: Uint8Array;
}

type StatusChangeCallback = (status: BluetoothNFCStatus) => void;
type CardReadCallback = (card: CardReadEvent) => void;

const STORAGE_KEY = 'bluetooth_nfc_device';

class BluetoothNFCService {
  private device: BluetoothDevice | null = null;
  private readCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private statusListeners: Set<StatusChangeCallback> = new Set();
  private cardReadListeners: Set<CardReadCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private status: BluetoothNFCStatus = {
    supported: false,
    available: false,
    paired: false,
    connected: false,
    deviceName: null,
    deviceId: null,
    scanning: false,
    error: null,
  };

  constructor() {
    this.checkSupport();
    this.loadSavedDevice();
  }

  /**
   * Check if Web Bluetooth is supported
   */
  private checkSupport(): void {
    this.status.supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    this.notifyStatusChange();
  }

  /**
   * Load previously paired device info from localStorage
   */
  private loadSavedDevice(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { deviceId, deviceName } = JSON.parse(saved);
        this.status.deviceId = deviceId;
        this.status.deviceName = deviceName;
        this.status.paired = true;
        this.notifyStatusChange();
      }
    } catch (e) {
      console.warn('Failed to load saved Bluetooth device:', e);
    }
  }

  /**
   * Save device info to localStorage
   */
  private saveDevice(device: BluetoothDevice): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          deviceId: device.id,
          deviceName: device.name || 'Unknown Device',
        })
      );
    } catch (e) {
      console.warn('Failed to save Bluetooth device:', e);
    }
  }

  /**
   * Clear saved device info
   */
  private clearSavedDevice(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear saved Bluetooth device:', e);
    }
  }

  /**
   * Notify all status listeners
   */
  private notifyStatusChange(): void {
    this.statusListeners.forEach((callback) => callback({ ...this.status }));
  }

  /**
   * Notify all card read listeners
   */
  private notifyCardRead(card: CardReadEvent): void {
    this.cardReadListeners.forEach((callback) => callback(card));
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusListeners.add(callback);
    // Immediately notify with current status
    callback({ ...this.status });
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to card read events
   */
  onCardRead(callback: CardReadCallback): () => void {
    this.cardReadListeners.add(callback);
    return () => {
      this.cardReadListeners.delete(callback);
    };
  }

  /**
   * Get current status
   */
  getStatus(): BluetoothNFCStatus {
    return { ...this.status };
  }

  /**
   * Check if Bluetooth is supported in this browser
   */
  isSupported(): boolean {
    return this.status.supported;
  }

  /**
   * Check if we have a previously paired device
   */
  isPaired(): boolean {
    return this.status.paired;
  }

  /**
   * Request a new Bluetooth NFC device (opens browser picker)
   */
  async requestDevice(): Promise<{ success: boolean; error?: string }> {
    if (!this.status.supported) {
      return {
        success: false,
        error: 'Web Bluetooth is not supported in this browser',
      };
    }

    try {
      this.status.scanning = true;
      this.status.error = null;
      this.notifyStatusChange();

      // Request device with NFC reader service filters
      const device = await navigator.bluetooth!.requestDevice({
        filters: [
          { services: [ACR1255U_SERVICE_UUID] },
          { namePrefix: 'ACR' }, // ACR readers
          { namePrefix: 'ACS' }, // ACS readers
          { namePrefix: 'NFC' }, // Generic NFC prefix
        ],
        optionalServices: GENERIC_NFC_SERVICE_UUIDS,
      });

      this.device = device;
      this.status.deviceId = device.id;
      this.status.deviceName = device.name || 'Unknown NFC Reader';
      this.status.paired = true;
      this.status.scanning = false;
      this.saveDevice(device);
      this.notifyStatusChange();

      // Set up disconnect handler
      device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      return { success: true };
    } catch (error: any) {
      this.status.scanning = false;
      this.status.error = error.message || 'Failed to pair device';
      this.notifyStatusChange();

      if (error.name === 'NotFoundError') {
        return { success: false, error: 'No NFC reader found. Make sure it is powered on and in pairing mode.' };
      }
      if (error.name === 'SecurityError') {
        return { success: false, error: 'Bluetooth access denied. Please allow Bluetooth permissions.' };
      }
      return { success: false, error: error.message || 'Failed to pair device' };
    }
  }

  /**
   * Connect to a paired device
   */
  async connect(): Promise<{ success: boolean; error?: string }> {
    if (!this.status.supported) {
      return { success: false, error: 'Web Bluetooth not supported' };
    }

    // If no device, try to get previously paired devices
    if (!this.device && this.status.deviceId) {
      try {
        const devices = await navigator.bluetooth!.getDevices();
        this.device = devices.find((d) => d.id === this.status.deviceId) || null;
      } catch (e) {
        console.warn('Could not retrieve paired devices:', e);
      }
    }

    if (!this.device) {
      return { success: false, error: 'No device paired. Please pair a device first.' };
    }

    try {
      this.status.error = null;
      this.notifyStatusChange();

      // Connect to GATT server
      const server = await this.device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Get primary service
      const service = await server.getPrimaryService(ACR1255U_SERVICE_UUID);

      // Get characteristics
      this.readCharacteristic = await service.getCharacteristic(ACR1255U_READ_CHAR_UUID);
      this.writeCharacteristic = await service.getCharacteristic(ACR1255U_WRITE_CHAR_UUID);

      // Subscribe to notifications for card reads
      await this.readCharacteristic.startNotifications();
      this.readCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleCardData.bind(this) as EventListener
      );

      this.status.connected = true;
      this.reconnectAttempts = 0;
      this.notifyStatusChange();

      // Start polling for cards (ACR1255U specific)
      this.startCardPolling();

      return { success: true };
    } catch (error: any) {
      this.status.error = error.message || 'Failed to connect';
      this.notifyStatusChange();
      return { success: false, error: error.message || 'Failed to connect to device' };
    }
  }

  /**
   * Disconnect from the device
   */
  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.status.connected = false;
    this.readCharacteristic = null;
    this.writeCharacteristic = null;
    this.notifyStatusChange();
  }

  /**
   * Unpair the device (forget it)
   */
  unpair(): void {
    this.disconnect();
    this.device = null;
    this.status.paired = false;
    this.status.deviceId = null;
    this.status.deviceName = null;
    this.clearSavedDevice();
    this.notifyStatusChange();
  }

  /**
   * Handle disconnect event
   */
  private handleDisconnect(): void {
    this.status.connected = false;
    this.readCharacteristic = null;
    this.writeCharacteristic = null;
    this.notifyStatusChange();

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;

      this.reconnectTimeout = setTimeout(async () => {
        console.log(`Attempting to reconnect... (attempt ${this.reconnectAttempts})`);
        const result = await this.connect();
        if (!result.success) {
          console.warn('Reconnect failed:', result.error);
        }
      }, delay);
    }
  }

  /**
   * Handle card data from characteristic notification
   */
  private handleCardData(event: Event): void {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;

    if (!value) return;

    const data = new Uint8Array(value.buffer);

    // Parse ACR1255U response format
    // Response format: [SW1][SW2][UID bytes...]
    // Success: SW1=0x90, SW2=0x00
    if (data.length >= 2) {
      const sw1 = data[data.length - 2];
      const sw2 = data[data.length - 1];

      if (sw1 === 0x90 && sw2 === 0x00 && data.length > 2) {
        // Extract UID (remove status bytes)
        const uidBytes = data.slice(0, data.length - 2);
        const uid = Array.from(uidBytes)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(':');

        this.notifyCardRead({
          uid,
          type: 'NFC',
          timestamp: new Date(),
          raw: uidBytes,
        });
      }
    }
  }

  /**
   * Send APDU command to reader
   */
  private async sendCommand(command: Uint8Array): Promise<Uint8Array | null> {
    if (!this.writeCharacteristic || !this.status.connected) {
      return null;
    }

    try {
      await this.writeCharacteristic.writeValue(command as unknown as BufferSource);
      return null; // Response comes via notification
    } catch (e) {
      console.error('Failed to send command:', e);
      return null;
    }
  }

  /**
   * Start polling for cards (sends GET UID command periodically)
   */
  private startCardPolling(): void {
    // ACR1255U GET UID command
    const getUidCommand = new Uint8Array([0xff, 0xca, 0x00, 0x00, 0x00]);

    const poll = async () => {
      if (this.status.connected) {
        await this.sendCommand(getUidCommand);
        setTimeout(poll, 500); // Poll every 500ms
      }
    };

    poll();
  }
}

// Singleton instance
const bluetoothNFCService = new BluetoothNFCService();
export default bluetoothNFCService;
