/**
 * useNFC Hook
 *
 * Global NFC reader detection and management hook.
 * Supports (in order of priority):
 * 1. Local NFC Agent (most reliable - uses native PC/SC)
 * 2. Web NFC API (mobile devices)
 * 3. ACR122U USB NFC reader via Web USB (desktop fallback)
 *
 * Use this hook anywhere you need NFC functionality:
 * - Admin dashboard
 * - Merchant payments
 * - Driver collection (card mode)
 * - User payments
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { nfcAgentService, NFCAgentCardData, NFCAgentStatus } from '@/services/nfc-agent.service';
import nfcExtensionService, { NFCExtensionStatus, NFCCardData as ExtensionCardData } from '@/services/nfc-extension.service';
import bluetoothNFCService, { BluetoothNFCStatus, CardReadEvent as BluetoothCardRead } from '@/services/bluetooth-nfc.service';

// Types
export interface NFCReaderStatus {
  // Local NFC Agent (most reliable - uses native PC/SC)
  agent: {
    available: boolean;
    connected: boolean;
    readerName: string | null;
    scanning: boolean;
    error?: string;
  };
  // Chrome Extension (uses WebUSB in extension context)
  extension: {
    available: boolean;
    connected: boolean;
    deviceName: string | null;
    scanning: boolean;
    error?: string;
  };
  // Bluetooth NFC Reader (ACR1255U, etc.)
  bluetooth: {
    supported: boolean;
    paired: boolean;
    connected: boolean;
    deviceName: string | null;
    scanning: boolean;
    error?: string;
  };
  // Web NFC (mobile)
  webNFC: {
    supported: boolean;
    available: boolean;
    scanning: boolean;
    error?: string;
  };
  // USB NFC Reader (ACR122U) - fallback
  usbReader: {
    supported: boolean;
    connected: boolean;
    deviceName: string | null;
    scanning: boolean;
    error?: string;
  };
  // Overall status
  anyReaderAvailable: boolean;
  isScanning: boolean;
  lastCheck: Date;
}

export interface NFCCardData {
  uid: string;
  type: 'wallet' | 'user' | 'unknown';
  data: string | null;
  rawData?: Uint8Array;
}

export interface NFCContextValue {
  status: NFCReaderStatus;
  isChecking: boolean;
  lastCardRead: NFCCardData | null;
  error: string | null;

  // Actions
  checkStatus: () => Promise<void>;
  startWebNFC: () => Promise<boolean>;
  stopWebNFC: () => void;
  connectUSBReader: () => Promise<boolean>;
  disconnectUSBReader: () => Promise<void>;
  startUSBScanning: () => Promise<void> | void;
  stopUSBScanning: () => void;

  // Bluetooth NFC actions
  pairBluetoothReader: () => Promise<{ success: boolean; error?: string }>;
  connectBluetoothReader: () => Promise<{ success: boolean; error?: string }>;
  disconnectBluetoothReader: () => void;
  unpairBluetoothReader: () => void;

  // Write to NFC card
  writeToCard: (data: string) => Promise<boolean>;

  // Event handlers
  onCardDetected: (callback: (card: NFCCardData) => void) => () => void;
}

// USB Device interface
interface USBDeviceInterface {
  opened: boolean;
  productName?: string;
  vendorId: number;
  configuration: { configurationValue: number } | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<{ bytesWritten: number; status: string }>;
  transferIn(endpointNumber: number, length: number): Promise<{ data?: DataView; status: string }>;
}

// Extend Navigator for USB API
declare global {
  interface Navigator {
    usb?: {
      getDevices(): Promise<USBDeviceInterface[]>;
      requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<USBDeviceInterface>;
      addEventListener(event: string, callback: () => void): void;
      removeEventListener(event: string, callback: () => void): void;
    };
  }
}

// Initial status
const initialStatus: NFCReaderStatus = {
  agent: {
    available: false,
    connected: false,
    readerName: null,
    scanning: false,
  },
  extension: {
    available: false,
    connected: false,
    deviceName: null,
    scanning: false,
  },
  bluetooth: {
    supported: false,
    paired: false,
    connected: false,
    deviceName: null,
    scanning: false,
  },
  webNFC: {
    supported: false,
    available: false,
    scanning: false,
  },
  usbReader: {
    supported: false,
    connected: false,
    deviceName: null,
    scanning: false,
  },
  anyReaderAvailable: false,
  isScanning: false,
  lastCheck: new Date(),
};

// Context
const NFCContext = createContext<NFCContextValue | null>(null);

// Provider component
export function NFCProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NFCReaderStatus>(initialStatus);
  const [isChecking, setIsChecking] = useState(true);
  const [lastCardRead, setLastCardRead] = useState<NFCCardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const usbDeviceRef = useRef<USBDeviceInterface | null>(null);
  const nfcReaderRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cardCallbacksRef = useRef<Set<(card: NFCCardData) => void>>(new Set());
  const usbPollingRef = useRef<boolean>(false);
  const agentConnectedRef = useRef<boolean>(false);

  // Notify card detected callbacks
  const notifyCardDetected = useCallback((card: NFCCardData) => {
    setLastCardRead(card);
    cardCallbacksRef.current.forEach(callback => callback(card));
  }, []);

  // Check overall NFC status
  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    const newStatus: NFCReaderStatus = {
      ...initialStatus,
      lastCheck: new Date(),
    };

    // Check Local NFC Agent first (most reliable)
    try {
      const agentAvailable = await nfcAgentService.isAgentAvailable();
      newStatus.agent.available = agentAvailable;

      if (agentAvailable) {
        const agentStatus = nfcAgentService.getStatus();
        newStatus.agent.connected = agentStatus.connected;
        newStatus.agent.readerName = agentStatus.readerName;
        newStatus.agent.scanning = agentStatus.connected; // Agent is always scanning when connected
      }
    } catch (err) {
      console.log('[NFC] Agent check error:', err);
    }

    // Check Chrome Extension (second priority)
    try {
      const extensionStatus = await nfcExtensionService.getStatus();
      newStatus.extension.available = extensionStatus.available;
      newStatus.extension.connected = extensionStatus.connected;
      newStatus.extension.deviceName = extensionStatus.deviceName;
      newStatus.extension.scanning = extensionStatus.scanning;
    } catch (err) {
      console.log('[NFC] Extension check error:', err);
    }

    // Check Bluetooth NFC Reader (third priority)
    try {
      const btStatus = bluetoothNFCService.getStatus();
      newStatus.bluetooth.supported = btStatus.supported;
      newStatus.bluetooth.paired = btStatus.paired;
      newStatus.bluetooth.connected = btStatus.connected;
      newStatus.bluetooth.deviceName = btStatus.deviceName;
      newStatus.bluetooth.scanning = btStatus.connected; // Scanning when connected
      newStatus.bluetooth.error = btStatus.error || undefined;
    } catch (err) {
      console.log('[NFC] Bluetooth check error:', err);
    }

    // Check Web NFC support (mobile)
    if ('NDEFReader' in window) {
      newStatus.webNFC.supported = true;
      newStatus.webNFC.available = true;
    }

    // Check Web USB support (desktop) - fallback if agent not available
    if (navigator.usb && !newStatus.agent.connected) {
      newStatus.usbReader.supported = true;
      try {
        const devices = await navigator.usb.getDevices();
        // Look for ACR122U (vendor ID 0x072F)
        const acr122u = devices.find(d => d.vendorId === 0x072F);
        if (acr122u) {
          usbDeviceRef.current = acr122u;

          // Check if device is already opened and claimed (preserve existing connection state)
          if (acr122u.opened) {
            // Device is already connected and opened - mark as connected
            newStatus.usbReader.connected = true;
            newStatus.usbReader.deviceName = acr122u.productName || 'ACR122U NFC Reader';
            // Preserve scanning state if already scanning
            newStatus.usbReader.scanning = usbPollingRef.current;
          } else {
            // Device found but not opened - user needs to click to connect
            newStatus.usbReader.connected = false;
            newStatus.usbReader.deviceName = acr122u.productName || 'ACR122U NFC Reader';
          }
        }
      } catch (err: any) {
        newStatus.usbReader.error = err.message;
      }
    }

    // Update overall status
    newStatus.anyReaderAvailable =
      newStatus.agent.connected ||
      newStatus.extension.connected ||
      newStatus.bluetooth.connected ||
      newStatus.webNFC.available ||
      newStatus.usbReader.connected;

    newStatus.isScanning =
      newStatus.agent.scanning ||
      newStatus.extension.scanning ||
      newStatus.bluetooth.scanning ||
      newStatus.webNFC.scanning ||
      newStatus.usbReader.scanning;

    setStatus(newStatus);
    setIsChecking(false);
  }, []);

  // Start Web NFC scanning
  const startWebNFC = useCallback(async (): Promise<boolean> => {
    if (!status.webNFC.supported) {
      setError('Web NFC is not supported on this device');
      return false;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      nfcReaderRef.current = ndef;
      abortControllerRef.current = new AbortController();

      ndef.addEventListener('reading', (event: any) => {
        console.log('[NFC] Card detected via Web NFC');
        const { message, serialNumber } = event;
        let cardData = serialNumber;

        // Try to read NDEF text records
        if (message?.records) {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder();
              cardData = textDecoder.decode(record.data);
              break;
            }
            if (record.recordType === 'url') {
              const textDecoder = new TextDecoder();
              const url = textDecoder.decode(record.data);
              const match = url.match(/\/(wallet|user|pay)\/([a-f0-9-]+)/i);
              if (match) {
                cardData = match[2];
              }
            }
          }
        }

        // Determine card type
        const isUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cardData);

        notifyCardDetected({
          uid: serialNumber,
          type: isUUID ? 'wallet' : 'unknown',
          data: cardData,
        });
      });

      ndef.addEventListener('readingerror', () => {
        console.error('[NFC] Web NFC read error');
        setError('Failed to read NFC card');
      });

      await ndef.scan({ signal: abortControllerRef.current.signal });

      setStatus(prev => ({
        ...prev,
        webNFC: { ...prev.webNFC, scanning: true },
        isScanning: true,
      }));

      setError(null);
      return true;
    } catch (err: any) {
      console.error('[NFC] Web NFC error:', err);
      if (err.name === 'NotAllowedError') {
        setError('NFC permission denied');
      } else {
        setError(err.message || 'Failed to start NFC');
      }
      return false;
    }
  }, [status.webNFC.supported, notifyCardDetected]);

  // Stop Web NFC scanning
  const stopWebNFC = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    nfcReaderRef.current = null;

    setStatus(prev => ({
      ...prev,
      webNFC: { ...prev.webNFC, scanning: false },
      isScanning: prev.usbReader.scanning,
    }));
  }, []);

  // Connect USB NFC reader
  const connectUSBReader = useCallback(async (): Promise<boolean> => {
    if (!navigator.usb) {
      setError('Web USB is not supported in this browser');
      return false;
    }

    try {
      // Request device if not already connected
      if (!usbDeviceRef.current) {
        console.log('[NFC] Requesting USB device...');
        const device = await navigator.usb.requestDevice({
          filters: [{ vendorId: 0x072F }], // ACR122U
        });
        usbDeviceRef.current = device;
        console.log('[NFC] Device selected:', device.productName);
      }

      const device = usbDeviceRef.current;

      // Check if already fully connected
      if (device.opened) {
        console.log('[NFC] USB device already opened');
        setStatus(prev => ({
          ...prev,
          usbReader: {
            ...prev.usbReader,
            connected: true,
            deviceName: device.productName || 'ACR122U NFC Reader',
          },
          anyReaderAvailable: true,
        }));
        setError(null);
        return true;
      }

      // Try to close first if it's in a bad state
      try {
        if (device.opened) {
          console.log('[NFC] Closing device first...');
          await device.close();
        }
      } catch (closeErr) {
        console.log('[NFC] Close error (ignored):', closeErr);
      }

      // Open the device
      console.log('[NFC] Opening device...');
      await device.open();
      console.log('[NFC] Device opened successfully');

      // Select configuration
      if (device.configuration === null) {
        console.log('[NFC] Selecting configuration 1...');
        await device.selectConfiguration(1);
      }

      // Try to claim interface with retry
      let claimed = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[NFC] Claiming interface 0 (attempt ${attempt})...`);
          await device.claimInterface(0);
          claimed = true;
          console.log('[NFC] Interface claimed successfully');
          break;
        } catch (claimErr: any) {
          console.error(`[NFC] Claim attempt ${attempt} failed:`, claimErr);
          if (attempt < 3) {
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            throw claimErr;
          }
        }
      }

      if (!claimed) {
        throw new Error('Failed to claim USB interface after 3 attempts');
      }

      setStatus(prev => ({
        ...prev,
        usbReader: {
          ...prev.usbReader,
          connected: true,
          deviceName: device.productName || 'ACR122U NFC Reader',
        },
        anyReaderAvailable: true,
      }));

      setError(null);
      console.log('[NFC] USB reader connected successfully!');
      return true;
    } catch (err: any) {
      console.error('[NFC] USB connect error:', err);

      // Clear the device ref if connection failed
      usbDeviceRef.current = null;

      if (err.name === 'NotFoundError') {
        setError('No ACR122U reader found. Make sure it is plugged in.');
      } else if (err.name === 'SecurityError') {
        setError('USB access denied. Try refreshing the page.');
      } else if (err.name === 'NetworkError' || err.message?.includes('claimed')) {
        setError('USB reader is in use. Close other apps/tabs using it, unplug and replug the reader, then try again.');
      } else if (err.message?.includes('denied') || err.message?.includes('Access denied')) {
        setError('USB access denied. Unplug the reader, wait 5 seconds, plug it back in, then try again.');
      } else {
        setError(err.message || 'Failed to connect USB reader');
      }
      return false;
    }
  }, []);

  // Disconnect USB reader
  const disconnectUSBReader = useCallback(async () => {
    usbPollingRef.current = false;

    if (usbDeviceRef.current) {
      try {
        await usbDeviceRef.current.close();
      } catch (err) {
        // Ignore close errors
      }
      usbDeviceRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      usbReader: {
        ...prev.usbReader,
        connected: false,
        scanning: false,
        deviceName: null,
      },
      isScanning: prev.webNFC.scanning,
      anyReaderAvailable: prev.webNFC.available,
    }));
  }, []);

  // Bluetooth NFC Reader methods
  const pairBluetoothReader = useCallback(async () => {
    return await bluetoothNFCService.requestDevice();
  }, []);

  const connectBluetoothReader = useCallback(async () => {
    const result = await bluetoothNFCService.connect();
    if (result.success) {
      checkStatus();
    }
    return result;
  }, [checkStatus]);

  const disconnectBluetoothReader = useCallback(() => {
    bluetoothNFCService.disconnect();
    setStatus(prev => ({
      ...prev,
      bluetooth: {
        ...prev.bluetooth,
        connected: false,
        scanning: false,
      },
      isScanning: prev.agent.scanning || prev.extension.scanning || prev.webNFC.scanning || prev.usbReader.scanning,
      anyReaderAvailable: prev.agent.connected || prev.extension.connected || prev.webNFC.available || prev.usbReader.connected,
    }));
  }, []);

  const unpairBluetoothReader = useCallback(() => {
    bluetoothNFCService.unpair();
    setStatus(prev => ({
      ...prev,
      bluetooth: {
        ...prev.bluetooth,
        paired: false,
        connected: false,
        deviceName: null,
        scanning: false,
      },
      isScanning: prev.agent.scanning || prev.extension.scanning || prev.webNFC.scanning || prev.usbReader.scanning,
      anyReaderAvailable: prev.agent.connected || prev.extension.connected || prev.webNFC.available || prev.usbReader.connected,
    }));
  }, []);

  // Start USB NFC scanning (polling)
  const startUSBScanning = useCallback(async () => {
    if (!usbDeviceRef.current) {
      setError('USB reader not connected');
      return;
    }

    // Try to open the device if not already opened
    if (!usbDeviceRef.current.opened) {
      try {
        await usbDeviceRef.current.open();
        if (usbDeviceRef.current.configuration === null) {
          await usbDeviceRef.current.selectConfiguration(1);
        }
        await usbDeviceRef.current.claimInterface(0);
        console.log('[NFC] USB device opened for scanning');
      } catch (err: any) {
        console.error('[NFC] Failed to open device for scanning:', err);
        setError('USB reader not connected - click to connect');
        return;
      }
    }

    usbPollingRef.current = true;

    setStatus(prev => ({
      ...prev,
      usbReader: { ...prev.usbReader, scanning: true },
      isScanning: true,
    }));

    const poll = async () => {
      if (!usbPollingRef.current || !usbDeviceRef.current?.opened) {
        return;
      }

      try {
        const device = usbDeviceRef.current;

        // ACR122U command: Get UID (APDU: FF CA 00 00 00)
        const getUidCommand = new Uint8Array([
          0x6B, 0x05, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00,
          0xFF, 0xCA, 0x00, 0x00, 0x00,
        ]);

        await device.transferOut(2, getUidCommand);
        const result = await device.transferIn(1, 64);

        if (result.data && result.data.byteLength > 10) {
          const response = new Uint8Array(result.data.buffer);
          const dataLength = response[1];

          if (dataLength > 2) {
            const sw1 = response[10 + dataLength - 2];
            const sw2 = response[10 + dataLength - 1];

            if (sw1 === 0x90 && sw2 === 0x00) {
              const uid = Array.from(response.slice(10, 10 + dataLength - 2))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

              if (uid && uid !== '00000000') {
                console.log('[NFC] USB card detected, UID:', uid);

                // Try to read NDEF data
                const ndefData = await readNDEFFromUSB(device);

                const isUUID = ndefData && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(ndefData);

                notifyCardDetected({
                  uid,
                  type: isUUID ? 'wallet' : 'unknown',
                  data: ndefData || uid,
                });

                // Wait before next poll to avoid duplicate reads
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
        }
      } catch (err) {
        // Card not present or read error - continue polling
      }

      // Continue polling
      if (usbPollingRef.current) {
        setTimeout(poll, 500);
      }
    };

    poll();
  }, [notifyCardDetected]);

  // Read NDEF data from USB reader
  const readNDEFFromUSB = async (device: USBDeviceInterface): Promise<string | null> => {
    try {
      // Read page 4-7 (NDEF data area for NTAG/Ultralight)
      const readCommand = new Uint8Array([
        0x6B, 0x05, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xB0, 0x00, 0x04, 0x10,
      ]);

      await device.transferOut(2, readCommand);
      const result = await device.transferIn(1, 64);

      if (result.data && result.data.byteLength > 12) {
        const response = new Uint8Array(result.data.buffer);
        const dataLength = response[1];

        if (dataLength > 2) {
          const textDecoder = new TextDecoder();
          const rawData = response.slice(10, 10 + dataLength - 2);
          const fullText = textDecoder.decode(rawData);

          // Look for UUID pattern
          const uuidMatch = fullText.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
          if (uuidMatch) {
            return uuidMatch[0];
          }
        }
      }
    } catch (err) {
      console.error('[NFC] NDEF read error:', err);
    }
    return null;
  };

  // Stop USB scanning
  const stopUSBScanning = useCallback(() => {
    usbPollingRef.current = false;

    setStatus(prev => ({
      ...prev,
      usbReader: { ...prev.usbReader, scanning: false },
      isScanning: prev.webNFC.scanning,
    }));
  }, []);

  // Write data to NFC card
  const writeToCard = useCallback(async (data: string): Promise<boolean> => {
    // Try Web NFC first (mobile)
    if (status.webNFC.supported && nfcReaderRef.current) {
      try {
        const ndef = new (window as any).NDEFReader();
        await ndef.write({
          records: [{ recordType: 'text', data }],
        });
        console.log('[NFC] Written via Web NFC:', data);
        return true;
      } catch (err: any) {
        console.error('[NFC] Web NFC write error:', err);
        setError(err.message || 'Failed to write to card');
        return false;
      }
    }

    // Try USB reader (desktop)
    if (usbDeviceRef.current?.opened) {
      try {
        const device = usbDeviceRef.current;

        // Convert string to bytes with NDEF text record format
        const encoder = new TextEncoder();
        const textBytes = encoder.encode(data);

        // NDEF Message format for NTAG/Ultralight cards
        // TLV format: Type (03), Length, NDEF Record, Terminator (FE)
        // NDEF Record: MB=1, ME=1, CF=0, SR=1, IL=0, TNF=1 (Well Known)
        // Type: 'T' (Text), Payload: language code + text

        const languageCode = 'en';
        const languageBytes = encoder.encode(languageCode);

        // Payload: status byte (language length) + language code + text
        const payloadLength = 1 + languageBytes.length + textBytes.length;

        // NDEF record
        const ndefRecord = new Uint8Array([
          0xD1, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=1 (Well Known)
          0x01, // Type length = 1
          payloadLength, // Payload length
          0x54, // Type = 'T' (Text)
          languageBytes.length, // Status byte (language code length, UTF-8)
          ...languageBytes,
          ...textBytes,
        ]);

        // TLV wrapper
        const tlvMessage = new Uint8Array([
          0x03, // NDEF Message TLV
          ndefRecord.length, // Length
          ...ndefRecord,
          0xFE, // Terminator TLV
        ]);

        // Write to pages starting at page 4 (NDEF data area)
        // NTAG213/215/216 and Ultralight use 4-byte pages
        const pages = Math.ceil(tlvMessage.length / 4);

        for (let i = 0; i < pages; i++) {
          const pageData = new Uint8Array(4);
          for (let j = 0; j < 4 && (i * 4 + j) < tlvMessage.length; j++) {
            pageData[j] = tlvMessage[i * 4 + j];
          }

          // ACR122U command: Write Binary (APDU: FF D6 00 [page] 04 [data])
          const writeCommand = new Uint8Array([
            0x6B, 0x09, 0x00, 0x00, 0x00, // CCID header
            0x00, 0x00, 0x00, 0x00, 0x00, // Slot, Seq, etc.
            0xFF, 0xD6, 0x00, 4 + i, 0x04, // Write Binary command
            ...pageData,
          ]);

          await device.transferOut(2, writeCommand);
          const result = await device.transferIn(1, 64);

          if (result.data) {
            const response = new Uint8Array(result.data.buffer);
            const sw1 = response[response.length - 2];
            const sw2 = response[response.length - 1];

            if (sw1 !== 0x90 || sw2 !== 0x00) {
              throw new Error(`Write failed at page ${4 + i}: SW=${sw1.toString(16)}${sw2.toString(16)}`);
            }
          }
        }

        console.log('[NFC] Written via USB:', data);
        setError(null);
        return true;
      } catch (err: any) {
        console.error('[NFC] USB write error:', err);
        setError(err.message || 'Failed to write to card');
        return false;
      }
    }

    setError('No NFC reader available for writing');
    return false;
  }, [status.webNFC.supported]);

  // Register card detected callback
  const onCardDetected = useCallback((callback: (card: NFCCardData) => void) => {
    cardCallbacksRef.current.add(callback);
    return () => {
      cardCallbacksRef.current.delete(callback);
    };
  }, []);

  // Initial status check, agent connection, and USB event listeners
  useEffect(() => {
    checkStatus();

    // Initialize NFC readers with Chrome Extension check FIRST
    const initializeNFC = async () => {
      // Step 1: Check Chrome Extension FIRST (most common setup)
      console.log('[NFC] Step 1: Checking for Chrome Extension...');
      const extensionAvailable = await nfcExtensionService.detectExtension();

      if (extensionAvailable) {
        console.log('[NFC] Chrome Extension detected! Using extension for NFC.');
        // Extension found - this is the preferred method for desktop
        setStatus(prev => ({
          ...prev,
          extension: {
            ...prev.extension,
            available: true,
          },
        }));
        checkStatus();
        return; // Extension found, no need to check other methods
      }

      console.log('[NFC] Chrome Extension not found.');

      // Step 2: Try Local NFC Agent (for advanced setups)
      console.log('[NFC] Step 2: Checking for Local NFC Agent...');
      const agentConnected = await nfcAgentService.connect();

      if (agentConnected) {
        console.log('[NFC] Connected to local NFC Agent');
        agentConnectedRef.current = true;
        checkStatus();
        return;
      }

      console.log('[NFC] NFC Agent not available.');

      // Step 3: Log available fallback methods
      console.log('[NFC] Step 3: Will use fallback methods (Bluetooth, Web NFC, USB)');
      checkStatus();
    };

    initializeNFC();

    // Listen for card detection from agent
    const unsubscribeCard = nfcAgentService.onCardDetected((agentCard: NFCAgentCardData) => {
      console.log('[NFC] Card detected via agent:', agentCard);

      // Convert agent card data to our format
      const isUUID = agentCard.data && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(agentCard.data);

      const cardData: NFCCardData = {
        uid: agentCard.uid,
        type: isUUID ? 'wallet' : 'unknown',
        data: agentCard.data || agentCard.uid,
      };

      notifyCardDetected(cardData);
    });

    // Listen for agent status changes
    const unsubscribeStatus = nfcAgentService.onStatusChange((agentStatus: NFCAgentStatus) => {
      setStatus(prev => ({
        ...prev,
        agent: {
          available: true,
          connected: agentStatus.connected,
          readerName: agentStatus.readerName,
          scanning: agentStatus.connected && !!agentStatus.readerName,
          error: agentStatus.lastError || undefined,
        },
        anyReaderAvailable: agentStatus.connected || prev.webNFC.available || prev.usbReader.connected,
        isScanning: (agentStatus.connected && !!agentStatus.readerName) || prev.webNFC.scanning || prev.usbReader.scanning,
      }));
    });

    // Listen for agent errors
    const unsubscribeError = nfcAgentService.onError((agentError: string) => {
      console.error('[NFC] Agent error:', agentError);
      setError(agentError);
    });

    // Listen for card detection from Chrome Extension
    const unsubscribeExtensionCard = nfcExtensionService.onCardDetected((extCard: ExtensionCardData) => {
      console.log('[NFC] Card detected via extension:', extCard);

      const isUUID = extCard.data && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(extCard.data);

      const cardData: NFCCardData = {
        uid: extCard.uid,
        type: isUUID ? 'wallet' : 'unknown',
        data: extCard.data || extCard.uid,
      };

      notifyCardDetected(cardData);
    });

    // Listen for extension status changes
    const unsubscribeExtensionStatus = nfcExtensionService.onStatusChange((extStatus: NFCExtensionStatus) => {
      setStatus(prev => ({
        ...prev,
        extension: {
          available: extStatus.available,
          connected: extStatus.connected,
          deviceName: extStatus.deviceName,
          scanning: extStatus.scanning,
        },
        anyReaderAvailable: prev.agent.connected || extStatus.connected || prev.bluetooth.connected || prev.webNFC.available || prev.usbReader.connected,
        isScanning: prev.agent.scanning || extStatus.scanning || prev.bluetooth.scanning || prev.webNFC.scanning || prev.usbReader.scanning,
      }));
    });

    // Listen for card detection from Bluetooth NFC Reader
    const unsubscribeBluetoothCard = bluetoothNFCService.onCardRead((btCard: BluetoothCardRead) => {
      console.log('[NFC] Card detected via Bluetooth:', btCard);

      const isUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(btCard.uid);

      const cardData: NFCCardData = {
        uid: btCard.uid,
        type: isUUID ? 'wallet' : 'unknown',
        data: btCard.uid,
        rawData: btCard.raw,
      };

      notifyCardDetected(cardData);
    });

    // Listen for Bluetooth status changes
    const unsubscribeBluetoothStatus = bluetoothNFCService.onStatusChange((btStatus: BluetoothNFCStatus) => {
      setStatus(prev => ({
        ...prev,
        bluetooth: {
          supported: btStatus.supported,
          paired: btStatus.paired,
          connected: btStatus.connected,
          deviceName: btStatus.deviceName,
          scanning: btStatus.connected,
          error: btStatus.error || undefined,
        },
        anyReaderAvailable: prev.agent.connected || prev.extension.connected || btStatus.connected || prev.webNFC.available || prev.usbReader.connected,
        isScanning: prev.agent.scanning || prev.extension.scanning || btStatus.connected || prev.webNFC.scanning || prev.usbReader.scanning,
      }));
    });

    const handleUSBConnect = () => {
      console.log('[NFC] USB device connected');
      checkStatus();
    };

    const handleUSBDisconnect = () => {
      console.log('[NFC] USB device disconnected');
      usbDeviceRef.current = null;
      checkStatus();
    };

    if (navigator.usb) {
      navigator.usb.addEventListener('connect', handleUSBConnect);
      navigator.usb.addEventListener('disconnect', handleUSBDisconnect);
    }

    return () => {
      // Cleanup
      stopWebNFC();
      usbPollingRef.current = false;
      if (usbDeviceRef.current) {
        usbDeviceRef.current.close().catch(() => {});
      }
      if (navigator.usb) {
        navigator.usb.removeEventListener('connect', handleUSBConnect);
        navigator.usb.removeEventListener('disconnect', handleUSBDisconnect);
      }
      // Cleanup agent subscriptions
      unsubscribeCard();
      unsubscribeStatus();
      unsubscribeError();
      // Cleanup extension subscriptions
      unsubscribeExtensionCard();
      unsubscribeExtensionStatus();
      // Cleanup Bluetooth subscriptions
      unsubscribeBluetoothCard();
      unsubscribeBluetoothStatus();
    };
  }, [checkStatus, stopWebNFC, notifyCardDetected]);

  const value: NFCContextValue = {
    status,
    isChecking,
    lastCardRead,
    error,
    checkStatus,
    startWebNFC,
    stopWebNFC,
    connectUSBReader,
    disconnectUSBReader,
    startUSBScanning,
    stopUSBScanning,
    pairBluetoothReader,
    connectBluetoothReader,
    disconnectBluetoothReader,
    unpairBluetoothReader,
    writeToCard,
    onCardDetected,
  };

  return (
    <NFCContext.Provider value={value}>
      {children}
    </NFCContext.Provider>
  );
}

// Hook to use NFC context
export function useNFC() {
  const context = useContext(NFCContext);
  if (!context) {
    // Return a safe default instead of throwing - this allows components to render
    // while waiting for the provider to mount
    console.warn('[NFC] useNFC called outside NFCProvider - returning defaults');
    return {
      status: {
        ...initialStatus,
        agent: { available: false, connected: false, readerName: null, scanning: false },
        extension: { available: false, connected: false, deviceName: null, scanning: false },
        bluetooth: { supported: false, paired: false, connected: false, deviceName: null, scanning: false },
      },
      isChecking: false,
      lastCardRead: null,
      error: null,
      checkStatus: async () => {},
      startWebNFC: async () => false,
      stopWebNFC: () => {},
      connectUSBReader: async () => false,
      disconnectUSBReader: async () => {},
      startUSBScanning: () => {},
      stopUSBScanning: () => {},
      pairBluetoothReader: async () => ({ success: false, error: 'No provider' }),
      connectBluetoothReader: async () => ({ success: false, error: 'No provider' }),
      disconnectBluetoothReader: () => {},
      unpairBluetoothReader: () => {},
      writeToCard: async () => false,
      onCardDetected: () => () => {},
    } as NFCContextValue;
  }
  return context;
}

// Simple hook for just checking NFC availability (no provider needed)
export function useNFCAvailability() {
  const [status, setStatus] = useState({
    webNFC: false,
    webUSB: false,
    anyAvailable: false,
  });

  useEffect(() => {
    const check = async () => {
      const webNFC = 'NDEFReader' in window;
      let webUSB = false;

      if (navigator.usb) {
        try {
          const devices = await navigator.usb.getDevices();
          webUSB = devices.some(d => d.vendorId === 0x072F);
        } catch {
          webUSB = !!navigator.usb;
        }
      }

      setStatus({
        webNFC,
        webUSB,
        anyAvailable: webNFC || webUSB,
      });
    };

    check();
  }, []);

  return status;
}
