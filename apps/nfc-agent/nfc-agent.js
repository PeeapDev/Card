#!/usr/bin/env node
/**
 * PeeAP NFC Agent - Standalone Version
 *
 * A simple Node.js script that provides NFC reader access via WebSocket.
 *
 * Usage:
 *   1. Install Node.js from https://nodejs.org
 *   2. Run: npm install
 *   3. Run: node nfc-agent.js
 *
 * The agent will start a WebSocket server on localhost:9876
 * Your browser will automatically connect to it.
 */

const { NFC } = require('nfc-pcsc');
const WebSocket = require('ws');

const PORT = 9876;
const VERSION = '1.0.0';

// Console colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logBanner() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════╗
║                                           ║
║       PeeAP NFC Agent v${VERSION}             ║
║                                           ║
║   Local NFC Reader Service for POS        ║
║                                           ║
╚═══════════════════════════════════════════╝${colors.reset}
`);
}

// State
let nfc = null;
let reader = null;
let readerName = null;
let cardPresent = false;
let wss = null;
const clients = new Set();

// Initialize WebSocket server
function startWebSocketServer() {
  wss = new WebSocket.Server({
    port: PORT,
    host: '127.0.0.1' // Only accept local connections
  });

  wss.on('listening', () => {
    log(`WebSocket server running on ws://localhost:${PORT}`, 'green');
    log('Waiting for browser connections...', 'blue');
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    log(`Browser connected (${clients.size} total)`, 'green');

    // Send current status
    ws.send(JSON.stringify({
      type: 'status',
      payload: {
        readerName,
        cardPresent,
        version: VERSION,
      }
    }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(ws, msg);
      } catch (err) {
        log(`Invalid message: ${err.message}`, 'red');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      log(`Browser disconnected (${clients.size} remaining)`, 'yellow');
    });

    ws.on('error', (err) => {
      log(`WebSocket error: ${err.message}`, 'red');
      clients.delete(ws);
    });
  });

  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log(`Port ${PORT} is already in use. Is another NFC Agent running?`, 'red');
      process.exit(1);
    }
    log(`Server error: ${err.message}`, 'red');
  });
}

// Handle incoming messages
function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    case 'start_scan':
      log('Scan requested by browser', 'blue');
      break;
    case 'stop_scan':
      log('Scan stopped by browser', 'blue');
      break;
    case 'write':
      if (msg.payload?.data) {
        handleWrite(ws, msg.payload.data);
      }
      break;
  }
}

// Broadcast to all connected browsers
function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        // Ignore send errors
      }
    }
  }
}

// Initialize NFC reader
function startNFC() {
  log('Initializing NFC reader...', 'blue');

  try {
    nfc = new NFC();

    nfc.on('reader', (r) => {
      reader = r;
      readerName = r.name;
      log(`✓ NFC Reader connected: ${readerName}`, 'green');

      broadcast({
        type: 'status',
        payload: { readerName, cardPresent: false, version: VERSION }
      });

      // Card detected
      r.on('card', async (card) => {
        cardPresent = true;
        const uid = card.uid || extractUID(card.atr);
        log(`✓ Card detected: ${uid}`, 'green');

        // Try to read NDEF data
        let ndefData = null;
        try {
          ndefData = await readNDEF(r);
        } catch (err) {
          // Card might not have NDEF
        }

        broadcast({
          type: 'card_detected',
          payload: {
            uid,
            atr: card.atr?.toString('hex') || '',
            data: ndefData,
            type: getCardType(card.atr),
          }
        });
      });

      // Card removed
      r.on('card.off', () => {
        cardPresent = false;
        log('Card removed', 'yellow');
        broadcast({ type: 'card_removed', payload: {} });
      });

      r.on('error', (err) => {
        log(`Reader error: ${err.message}`, 'red');
        broadcast({ type: 'error', payload: { message: err.message } });
      });

      r.on('end', () => {
        log('Reader disconnected', 'yellow');
        reader = null;
        readerName = null;
        cardPresent = false;
        broadcast({
          type: 'status',
          payload: { readerName: null, cardPresent: false, version: VERSION }
        });
      });
    });

    nfc.on('error', (err) => {
      if (err.message.includes('SCARD_E_NO_SERVICE')) {
        log('Smart Card service not running. Please start it:', 'red');
        log('  Windows: Run "services.msc" and start "Smart Card"', 'yellow');
        log('  macOS: Should work automatically', 'yellow');
        log('  Linux: Run "sudo systemctl start pcscd"', 'yellow');
      } else {
        log(`NFC error: ${err.message}`, 'red');
      }
    });

  } catch (err) {
    log(`Failed to initialize NFC: ${err.message}`, 'red');
  }
}

// Read NDEF data from card
async function readNDEF(r) {
  try {
    // Read pages 4-15 for NDEF data
    const data = await r.read(4, 48, 16);
    if (!data || data.length === 0) return null;

    // Find NDEF TLV
    for (let i = 0; i < data.length - 2; i++) {
      if (data[i] === 0x03) { // NDEF TLV
        const len = data[i + 1];
        const payload = data.slice(i + 2, i + 2 + len);
        return parseNDEFRecord(payload);
      }
    }

    // Try to find UUID pattern
    const text = data.toString('utf8').replace(/[^\x20-\x7E]/g, '');
    const uuidMatch = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    return uuidMatch ? uuidMatch[0] : null;

  } catch (err) {
    return null;
  }
}

// Parse NDEF record
function parseNDEFRecord(data) {
  if (data.length < 5) return null;

  const typeLen = data[1];
  const payloadLen = data[2];

  if (data[3] !== 0x54) return null; // Not a text record

  const payload = data.slice(3 + typeLen, 3 + typeLen + payloadLen);
  const langLen = payload[0] & 0x3F;
  return payload.slice(1 + langLen).toString('utf8');
}

// Handle write request
async function handleWrite(ws, data) {
  if (!reader || !cardPresent) {
    ws.send(JSON.stringify({
      type: 'write_result',
      payload: { success: false, error: 'No card present' }
    }));
    return;
  }

  try {
    log(`Writing to card: ${data}`, 'blue');

    // Encode as NDEF
    const ndefMessage = encodeNDEFText(data);

    // Write to pages starting at 4
    for (let i = 0; i < Math.ceil(ndefMessage.length / 4); i++) {
      const page = Buffer.alloc(4);
      for (let j = 0; j < 4 && (i * 4 + j) < ndefMessage.length; j++) {
        page[j] = ndefMessage[i * 4 + j];
      }
      await reader.write(4 + i, page, 4);
    }

    log('✓ Write successful', 'green');
    ws.send(JSON.stringify({
      type: 'write_result',
      payload: { success: true }
    }));

  } catch (err) {
    log(`Write failed: ${err.message}`, 'red');
    ws.send(JSON.stringify({
      type: 'write_result',
      payload: { success: false, error: err.message }
    }));
  }
}

// Encode text as NDEF
function encodeNDEFText(text) {
  const textBytes = Buffer.from(text, 'utf8');
  const lang = Buffer.from('en');

  const payloadLen = 1 + lang.length + textBytes.length;
  const record = Buffer.alloc(3 + 1 + payloadLen);

  record[0] = 0xD1; // Header
  record[1] = 1;    // Type length
  record[2] = payloadLen;
  record[3] = 0x54; // 'T'
  record[4] = lang.length;
  lang.copy(record, 5);
  textBytes.copy(record, 5 + lang.length);

  const message = Buffer.alloc(record.length + 3);
  message[0] = 0x03; // NDEF TLV
  message[1] = record.length;
  record.copy(message, 2);
  message[message.length - 1] = 0xFE; // Terminator

  return message;
}

// Get card type from ATR
function getCardType(atr) {
  if (!atr) return 'unknown';
  const hex = atr.toString('hex').toUpperCase();
  if (hex.includes('0001') || hex.includes('0002')) return 'mifare';
  if (hex.includes('0003') || hex.includes('0044')) return 'ntag';
  if (hex.includes('0004')) return 'desfire';
  return 'unknown';
}

// Extract UID from ATR
function extractUID(atr) {
  if (!atr) return 'unknown';
  let hash = 0;
  for (let i = 0; i < atr.length; i++) {
    hash = ((hash << 5) - hash) + atr[i];
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Graceful shutdown
function shutdown() {
  log('\nShutting down...', 'yellow');

  if (wss) {
    for (const client of clients) {
      client.close();
    }
    wss.close();
  }

  if (reader) {
    try { reader.close(); } catch (e) {}
  }

  if (nfc) {
    try { nfc.close(); } catch (e) {}
  }

  log('Goodbye!', 'green');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start
logBanner();
startWebSocketServer();
startNFC();

log('Press Ctrl+C to stop', 'cyan');
