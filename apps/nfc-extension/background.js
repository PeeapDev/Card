/**
 * PeeAP NFC Extension - Background Service Worker
 *
 * Handles USB NFC reader communication and sends card data to the web app.
 * Uses WebUSB API which works reliably in extensions (unlike web pages).
 */

// ACR122U USB identifiers
const ACR122U_VENDOR_ID = 0x072F;
const ACR122U_PRODUCT_ID = 0x2200;

// State
let usbDevice = null;
let isScanning = false;
let connectedTabs = new Set();

// APDU Commands for ACR122U
const APDU = {
  // Get firmware version
  GET_FIRMWARE: new Uint8Array([0xFF, 0x00, 0x48, 0x00, 0x00]),
  // Turn on LED and beep
  LED_ON: new Uint8Array([0xFF, 0x00, 0x40, 0x0F, 0x04, 0x00, 0x00, 0x00, 0x00]),
  // Poll for card (get UID)
  GET_UID: new Uint8Array([0xFF, 0xCA, 0x00, 0x00, 0x00]),
  // Read block (page 4-7 for NDEF)
  READ_BLOCK: (block) => new Uint8Array([0xFF, 0xB0, 0x00, block, 0x10]),
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[NFC Extension] Installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[NFC Extension] Message:', message);

  switch (message.type) {
    case 'GET_STATUS':
      sendResponse({
        connected: usbDevice !== null,
        scanning: isScanning,
        deviceName: usbDevice?.productName || null,
      });
      return true;

    case 'CONNECT_READER':
      connectReader().then(result => sendResponse(result));
      return true;

    case 'DISCONNECT_READER':
      disconnectReader().then(result => sendResponse(result));
      return true;

    case 'START_SCAN':
      startScanning(sender.tab?.id);
      sendResponse({ success: true });
      return true;

    case 'STOP_SCAN':
      stopScanning(sender.tab?.id);
      sendResponse({ success: true });
      return true;
  }
});

// Handle external connections from web pages
chrome.runtime.onConnectExternal.addListener((port) => {
  console.log('[NFC Extension] External connection from:', port.sender?.url);

  port.onMessage.addListener((message) => {
    handleExternalMessage(message, port);
  });

  port.onDisconnect.addListener(() => {
    console.log('[NFC Extension] Port disconnected');
  });
});

// Handle messages from web pages via externally_connectable
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('[NFC Extension] External message:', message, 'from:', sender.url);

  switch (message.type) {
    case 'PING':
      sendResponse({ type: 'PONG', version: '1.0.0' });
      return true;

    case 'GET_STATUS':
      sendResponse({
        type: 'STATUS',
        connected: usbDevice !== null,
        scanning: isScanning,
        deviceName: usbDevice?.productName || null,
      });
      return true;

    case 'CONNECT':
      connectReader().then(result => {
        sendResponse({ type: 'CONNECT_RESULT', ...result });
      });
      return true;

    case 'START_SCAN':
      if (sender.tab?.id) {
        connectedTabs.add(sender.tab.id);
        startScanning(sender.tab.id);
      }
      sendResponse({ type: 'SCAN_STARTED' });
      return true;

    case 'STOP_SCAN':
      if (sender.tab?.id) {
        connectedTabs.delete(sender.tab.id);
        stopScanning(sender.tab.id);
      }
      sendResponse({ type: 'SCAN_STOPPED' });
      return true;
  }
});

async function handleExternalMessage(message, port) {
  switch (message.type) {
    case 'CONNECT':
      const result = await connectReader();
      port.postMessage({ type: 'CONNECT_RESULT', ...result });
      break;
  }
}

// Connect to USB NFC reader
async function connectReader() {
  try {
    // Check if already connected
    if (usbDevice) {
      return { success: true, deviceName: usbDevice.productName };
    }

    // Request device
    const devices = await navigator.usb.getDevices();
    let device = devices.find(d => d.vendorId === ACR122U_VENDOR_ID);

    if (!device) {
      // Need to request permission
      device = await navigator.usb.requestDevice({
        filters: [{ vendorId: ACR122U_VENDOR_ID }]
      });
    }

    if (!device) {
      return { success: false, error: 'No NFC reader found' };
    }

    // Open device
    await device.open();

    // Select configuration
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Claim interface
    await device.claimInterface(0);

    usbDevice = device;
    console.log('[NFC Extension] Connected to:', device.productName);

    // Notify all tabs
    broadcastToTabs({ type: 'READER_CONNECTED', deviceName: device.productName });

    return { success: true, deviceName: device.productName };

  } catch (error) {
    console.error('[NFC Extension] Connect error:', error);
    return { success: false, error: error.message };
  }
}

// Disconnect from reader
async function disconnectReader() {
  try {
    if (usbDevice) {
      isScanning = false;
      await usbDevice.releaseInterface(0);
      await usbDevice.close();
      usbDevice = null;
      broadcastToTabs({ type: 'READER_DISCONNECTED' });
    }
    return { success: true };
  } catch (error) {
    console.error('[NFC Extension] Disconnect error:', error);
    return { success: false, error: error.message };
  }
}

// Start scanning for cards
function startScanning(tabId) {
  if (tabId) connectedTabs.add(tabId);

  if (!usbDevice) {
    console.log('[NFC Extension] Cannot scan - no reader connected');
    return;
  }

  if (isScanning) return;

  isScanning = true;
  console.log('[NFC Extension] Started scanning');
  pollForCard();
}

// Stop scanning
function stopScanning(tabId) {
  if (tabId) connectedTabs.delete(tabId);

  if (connectedTabs.size === 0) {
    isScanning = false;
    console.log('[NFC Extension] Stopped scanning');
  }
}

// Poll for NFC card
async function pollForCard() {
  if (!isScanning || !usbDevice) return;

  try {
    // Send GET_UID command
    const response = await sendAPDU(APDU.GET_UID);

    if (response && response.length > 2) {
      // Check status bytes (last 2 bytes should be 90 00 for success)
      const sw1 = response[response.length - 2];
      const sw2 = response[response.length - 1];

      if (sw1 === 0x90 && sw2 === 0x00) {
        // Card found! Extract UID
        const uid = Array.from(response.slice(0, -2))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        console.log('[NFC Extension] Card detected:', uid);

        // Try to read NDEF data
        const ndefData = await readNDEF();

        // Notify web page
        broadcastToTabs({
          type: 'CARD_DETECTED',
          uid: uid,
          data: ndefData,
        });

        // Wait before next poll (debounce)
        await sleep(1000);
      }
    }

  } catch (error) {
    // Card read error - likely no card present, continue polling
    if (!error.message?.includes('LIBUSB')) {
      console.log('[NFC Extension] Poll error:', error.message);
    }
  }

  // Continue polling
  if (isScanning) {
    setTimeout(pollForCard, 200);
  }
}

// Send APDU command to reader
async function sendAPDU(command) {
  if (!usbDevice) return null;

  try {
    // Wrap APDU in PC/SC frame for ACR122U
    const frame = wrapAPDU(command);

    // Send to device
    await usbDevice.transferOut(2, frame);

    // Read response
    const result = await usbDevice.transferIn(2, 64);

    if (result.data) {
      return new Uint8Array(result.data.buffer);
    }
  } catch (error) {
    throw error;
  }

  return null;
}

// Wrap APDU command in CCID frame
function wrapAPDU(apdu) {
  const len = apdu.length;
  const frame = new Uint8Array(10 + len);

  frame[0] = 0x6F; // PC_to_RDR_XfrBlock
  frame[1] = len & 0xFF;
  frame[2] = (len >> 8) & 0xFF;
  frame[3] = (len >> 16) & 0xFF;
  frame[4] = (len >> 24) & 0xFF;
  frame[5] = 0x00; // Slot
  frame[6] = 0x00; // Seq
  frame[7] = 0x00; // BWI
  frame[8] = 0x00; // LevelParameter
  frame[9] = 0x00;

  frame.set(apdu, 10);

  return frame;
}

// Read NDEF data from card
async function readNDEF() {
  try {
    // Read pages 4-7 (NDEF area)
    let data = new Uint8Array(0);

    for (let page = 4; page <= 15; page += 4) {
      const response = await sendAPDU(APDU.READ_BLOCK(page));
      if (response && response.length > 2) {
        const sw1 = response[response.length - 2];
        const sw2 = response[response.length - 1];

        if (sw1 === 0x90 && sw2 === 0x00) {
          const pageData = response.slice(0, -2);
          const newData = new Uint8Array(data.length + pageData.length);
          newData.set(data);
          newData.set(pageData, data.length);
          data = newData;
        }
      }
    }

    // Parse NDEF
    return parseNDEF(data);

  } catch (error) {
    console.log('[NFC Extension] NDEF read error:', error.message);
    return null;
  }
}

// Parse NDEF TLV data
function parseNDEF(data) {
  // Look for NDEF TLV (type 0x03)
  for (let i = 0; i < data.length - 2; i++) {
    if (data[i] === 0x03) {
      const len = data[i + 1];
      const payload = data.slice(i + 2, i + 2 + len);

      // Try to parse as text record
      if (payload.length > 5 && payload[0] === 0xD1 && payload[3] === 0x54) {
        const langLen = payload[4] & 0x3F;
        const text = new TextDecoder().decode(payload.slice(5 + langLen));
        return text;
      }
    }
  }

  // Try to find UUID pattern in raw data
  const text = new TextDecoder().decode(data).replace(/[^\x20-\x7E]/g, '');
  const uuidMatch = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (uuidMatch) {
    return uuidMatch[0];
  }

  return null;
}

// Broadcast message to all connected tabs
function broadcastToTabs(message) {
  connectedTabs.forEach(tabId => {
    chrome.tabs.sendMessage(tabId, message).catch(() => {
      // Tab might be closed
      connectedTabs.delete(tabId);
    });
  });
}

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle USB disconnect events
navigator.usb.addEventListener('disconnect', (event) => {
  if (usbDevice && event.device === usbDevice) {
    console.log('[NFC Extension] USB device disconnected');
    usbDevice = null;
    isScanning = false;
    broadcastToTabs({ type: 'READER_DISCONNECTED' });
  }
});
