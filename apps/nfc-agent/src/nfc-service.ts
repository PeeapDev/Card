/**
 * NFC Service
 *
 * Uses the nfc-pcsc library to communicate with NFC readers.
 * This library uses native PC/SC bindings which work properly
 * with the operating system's smart card services.
 */

import { EventEmitter } from 'events';
import { NFC, Reader } from 'nfc-pcsc';

export interface NFCCardData {
  uid: string;
  atr: string;
  data: string | null;
  type: 'mifare' | 'ntag' | 'desfire' | 'unknown';
}

export class NFCService extends EventEmitter {
  private nfc: NFC | null = null;
  private reader: Reader | null = null;
  private readerName: string | null = null;
  private cardPresent = false;
  private lastCardUid: string | null = null;

  constructor() {
    super();
  }

  /**
   * Start the NFC service
   */
  start(): void {
    console.log('[NFC] Starting NFC service...');

    try {
      this.nfc = new NFC();

      this.nfc.on('reader', (reader: Reader) => {
        console.log('[NFC] Reader detected:', reader.name);
        this.reader = reader;
        this.readerName = reader.name;
        this.emit('reader-connected', reader.name);

        // Handle card presence
        reader.on('card', async (card: any) => {
          console.log('[NFC] Card detected:', card);
          this.cardPresent = true;

          const uid = card.uid?.toString('hex') || this.extractUid(card.atr);
          this.lastCardUid = uid;

          // Determine card type from ATR
          const cardType = this.determineCardType(card.atr);

          // Try to read NDEF data
          let ndefData: string | null = null;
          try {
            ndefData = await this.readNDEF(reader, card);
          } catch (err) {
            console.log('[NFC] Could not read NDEF:', err);
          }

          const cardData: NFCCardData = {
            uid,
            atr: card.atr?.toString('hex') || '',
            data: ndefData,
            type: cardType,
          };

          this.emit('card-detected', cardData);
        });

        reader.on('card.off', (card: any) => {
          console.log('[NFC] Card removed');
          this.cardPresent = false;
          this.lastCardUid = null;
          this.emit('card-removed');
        });

        reader.on('error', (err: Error) => {
          console.error('[NFC] Reader error:', err.message);
          this.emit('error', err.message);
        });

        reader.on('end', () => {
          console.log('[NFC] Reader disconnected:', reader.name);
          this.reader = null;
          this.readerName = null;
          this.cardPresent = false;
          this.emit('reader-disconnected');
        });
      });

      this.nfc.on('error', (err: Error) => {
        console.error('[NFC] NFC error:', err.message);
        this.emit('error', err.message);
      });

    } catch (err: any) {
      console.error('[NFC] Failed to start NFC service:', err);
      this.emit('error', err.message);
    }
  }

  /**
   * Stop the NFC service
   */
  stop(): void {
    console.log('[NFC] Stopping NFC service...');
    if (this.reader) {
      try {
        this.reader.close();
      } catch {
        // Ignore close errors
      }
      this.reader = null;
    }
    if (this.nfc) {
      try {
        this.nfc.close();
      } catch {
        // Ignore close errors
      }
      this.nfc = null;
    }
    this.readerName = null;
    this.cardPresent = false;
  }

  /**
   * Check if a reader is connected
   */
  isReaderConnected(): boolean {
    return this.reader !== null;
  }

  /**
   * Get the reader name
   */
  getReaderName(): string | null {
    return this.readerName;
  }

  /**
   * Check if a card is present
   */
  isCardPresent(): boolean {
    return this.cardPresent;
  }

  /**
   * Write data to the current card
   */
  async writeToCard(data: string): Promise<{ success: boolean; error?: string }> {
    if (!this.reader || !this.cardPresent) {
      return { success: false, error: 'No card present' };
    }

    try {
      console.log('[NFC] Writing data to card:', data);

      // Encode data as NDEF text record
      const ndefMessage = this.encodeNDEFText(data);

      // Write to card starting at page 4 (NDEF data area for NTAG/Ultralight)
      // Split into 4-byte pages
      const pages = Math.ceil(ndefMessage.length / 4);

      for (let i = 0; i < pages; i++) {
        const pageData = Buffer.alloc(4);
        for (let j = 0; j < 4 && (i * 4 + j) < ndefMessage.length; j++) {
          pageData[j] = ndefMessage[i * 4 + j];
        }

        // APDU command: UPDATE BINARY
        const blockNumber = 4 + i; // Start at page 4
        await this.reader.write(blockNumber, pageData, 4);
      }

      console.log('[NFC] Write successful');
      return { success: true };
    } catch (err: any) {
      console.error('[NFC] Write error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Read NDEF data from card
   */
  private async readNDEF(reader: Reader, card: any): Promise<string | null> {
    try {
      // Read pages 4-15 (48 bytes of NDEF data area)
      const data = await reader.read(4, 48, 16);

      if (!data || data.length === 0) {
        return null;
      }

      // Parse NDEF TLV
      return this.parseNDEFData(data);
    } catch (err) {
      // Card might not support read command
      return null;
    }
  }

  /**
   * Parse NDEF data from raw bytes
   */
  private parseNDEFData(data: Buffer): string | null {
    // Find NDEF message TLV (type 0x03)
    let offset = 0;
    while (offset < data.length) {
      const type = data[offset];

      if (type === 0x00) {
        // Null TLV, skip
        offset++;
        continue;
      }

      if (type === 0xFE) {
        // Terminator TLV
        break;
      }

      if (type === 0x03) {
        // NDEF message TLV
        const length = data[offset + 1];
        const ndefData = data.slice(offset + 2, offset + 2 + length);
        return this.parseNDEFRecord(ndefData);
      }

      // Other TLV, skip
      const len = data[offset + 1];
      offset += 2 + len;
    }

    // Try to find UUID pattern in raw data
    const text = data.toString('utf8').replace(/[^\x20-\x7E]/g, '');
    const uuidMatch = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (uuidMatch) {
      return uuidMatch[0];
    }

    return null;
  }

  /**
   * Parse a single NDEF record
   */
  private parseNDEFRecord(data: Buffer): string | null {
    if (data.length < 3) return null;

    const header = data[0];
    const typeLength = data[1];
    const payloadLength = data[2];

    // Check if it's a text record (TNF=1, Type='T')
    const tnf = header & 0x07;
    if (tnf !== 1) return null;

    const type = data.slice(3, 3 + typeLength);
    if (type.toString() !== 'T') return null;

    const payload = data.slice(3 + typeLength, 3 + typeLength + payloadLength);

    // Text record format: status byte + language code + text
    const statusByte = payload[0];
    const langLength = statusByte & 0x3F;
    const text = payload.slice(1 + langLength).toString('utf8');

    return text;
  }

  /**
   * Encode text as NDEF message
   */
  private encodeNDEFText(text: string): Buffer {
    const textBytes = Buffer.from(text, 'utf8');
    const langCode = Buffer.from('en');

    // NDEF record
    const payloadLength = 1 + langCode.length + textBytes.length;
    const record = Buffer.alloc(3 + 1 + payloadLength);

    record[0] = 0xD1; // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=1
    record[1] = 1;    // Type length
    record[2] = payloadLength;
    record[3] = 0x54; // Type = 'T'
    record[4] = langCode.length; // Status byte
    langCode.copy(record, 5);
    textBytes.copy(record, 5 + langCode.length);

    // TLV wrapper
    const message = Buffer.alloc(record.length + 3);
    message[0] = 0x03; // NDEF message TLV
    message[1] = record.length;
    record.copy(message, 2);
    message[message.length - 1] = 0xFE; // Terminator

    return message;
  }

  /**
   * Determine card type from ATR
   */
  private determineCardType(atr: Buffer): 'mifare' | 'ntag' | 'desfire' | 'unknown' {
    if (!atr) return 'unknown';

    const atrHex = atr.toString('hex').toUpperCase();

    // MIFARE Classic ATR patterns
    if (atrHex.includes('0001') || atrHex.includes('0002')) {
      return 'mifare';
    }

    // NTAG/Ultralight ATR patterns
    if (atrHex.includes('0003') || atrHex.includes('0044')) {
      return 'ntag';
    }

    // DESFire ATR patterns
    if (atrHex.includes('0004')) {
      return 'desfire';
    }

    return 'unknown';
  }

  /**
   * Extract UID from ATR (fallback)
   */
  private extractUid(atr: Buffer): string {
    if (!atr) return 'unknown';
    // Generate a pseudo-UID from ATR hash
    let hash = 0;
    for (let i = 0; i < atr.length; i++) {
      hash = ((hash << 5) - hash) + atr[i];
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
