/**
 * PeeAP NFC Extension - Offscreen Document Script
 *
 * Handles USB NFC reader communication using WebUSB API.
 * WebUSB is only available in documents, not service workers,
 * so this offscreen document handles all USB operations.
 */

// ACR122U USB identifiers
const ACR122U_VENDOR_ID = 0x072F;
const ACR122U_PRODUCT_ID = 0x2200;

// State
let usbDevice = null;
let isScanning = false;
let pollInterval = null;

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

console.log('[NFC Offscreen] Loaded');

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[NFC Offscreen] Message:', message.type);

  (async () => {
    try {
      let result;
      switch (message.type) {
        case 'OFFSCREEN_GET_STATUS':
          result = {
            type: 'STATUS',
            connected: usbDevice !== null,
            scanning: isScanning,
            deviceName: usbDevice?.productName || null,
          };
          break;

        case 'OFFSCREEN_CONNECT':
          result = await connectReader();
          break;

        case 'OFFSCREEN_DISCONNECT':
          result = await disconnectReader();
          break;

        case 'OFFSCREEN_START_SCAN':
          startScanning();
          result = { success: true };
          break;

        case 'OFFSCREEN_STOP_SCAN':
          stopScanning();
          result = { success: true };
          break;

        default:
          result = { error: 'Unknown message type' };
      }
      sendResponse(result);
    } catch (error) {
      console.error('[NFC Offscreen] Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// Connect to USB NFC reader
async function connectReader() {
  try {
    // Check if already connected
    if (usbDevice) {
      return { success: true, deviceName: usbDevice.productName };
    }

    // Check for paired devices first
    const devices = await navigator.usb.getDevices();
    console.log('[NFC Offscreen] Found paired devices:', devices.length);
    let device = devices.find(d => d.vendorId === ACR122U_VENDOR_ID);

    if (!device) {
      // Need to request permission - this requires user interaction
      // The popup will handle this via a separate flow
      return {
        success: false,
        error: 'NO_PAIRED_DEVICE',
        needsPermission: true
      };
    }

    // Open device
    await device.open();
    console.log('[NFC Offscreen] Device opened');

    // Select configuration
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Claim interface
    await device.claimInterface(0);
    console.log('[NFC Offscreen] Interface claimed');

    usbDevice = device;
    console.log('[NFC Offscreen] Connected to:', device.productName);

    // Notify background
    chrome.runtime.sendMessage({
      type: 'READER_CONNECTED',
      deviceName: device.productName,
    });

    return { success: true, deviceName: device.productName };

  } catch (error) {
    console.error('[NFC Offscreen] Connect error:', error);
    return { success: false, error: error.message };
  }
}

// Disconnect from reader
async function disconnectReader() {
  try {
    stopScanning();

    if (usbDevice) {
      try {
        await usbDevice.releaseInterface(0);
        await usbDevice.close();
      } catch (e) {
        console.log('[NFC Offscreen] Disconnect cleanup error:', e.message);
      }
      usbDevice = null;

      chrome.runtime.sendMessage({ type: 'READER_DISCONNECTED' });
    }
    return { success: true };
  } catch (error) {
    console.error('[NFC Offscreen] Disconnect error:', error);
    return { success: false, error: error.message };
  }
}

// Start scanning for cards
function startScanning() {
  if (!usbDevice) {
    console.log('[NFC Offscreen] Cannot scan - no reader connected');
    return;
  }

  if (isScanning) return;

  isScanning = true;
  console.log('[NFC Offscreen] Started scanning');
  pollForCard();
}

// Stop scanning
function stopScanning() {
  isScanning = false;
  if (pollInterval) {
    clearTimeout(pollInterval);
    pollInterval = null;
  }
  console.log('[NFC Offscreen] Stopped scanning');
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

        console.log('[NFC Offscreen] Card detected:', uid);

        // Try to read NDEF data
        const ndefData = await readNDEF();

        // Notify background
        chrome.runtime.sendMessage({
          type: 'CARD_DETECTED',
          uid: uid,
          data: ndefData,
        });

        // Wait before next poll (debounce same card)
        await sleep(1000);
      }
    }

  } catch (error) {
    // Card read error - likely no card present, continue polling
    if (!error.message?.includes('LIBUSB') && !error.message?.includes('transfer')) {
      console.log('[NFC Offscreen] Poll error:', error.message);
    }
  }

  // Continue polling
  if (isScanning) {
    pollInterval = setTimeout(pollForCard, 200);
  }
}

// Send APDU command to reader
async function sendAPDU(command) {
  if (!usbDevice) return null;

  try {
    // Wrap APDU in PC/SC frame for ACR122U
    const frame = wrapAPDU(command);

    // Send to device (endpoint 2)
    await usbDevice.transferOut(2, frame);

    // Read response (endpoint 2, max 64 bytes)
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
    // Read pages 4-15 (NDEF area)
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
    console.log('[NFC Offscreen] NDEF read error:', error.message);
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

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle USB disconnect events
navigator.usb.addEventListener('disconnect', (event) => {
  if (usbDevice && event.device === usbDevice) {
    console.log('[NFC Offscreen] USB device disconnected');
    usbDevice = null;
    isScanning = false;
    chrome.runtime.sendMessage({ type: 'READER_DISCONNECTED' });
  }
});

// Notify background that offscreen is ready
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });
