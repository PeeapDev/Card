/**
 * PeeAP NFC Extension - Background Service Worker
 *
 * Coordinates between the popup, offscreen document (for WebUSB), and web pages.
 * Manages 3 connection states:
 *   1. Platform connected (web page connected to extension)
 *   2. USB reader connected (NFC reader hardware)
 *   3. Card scanning (actively listening for card taps)
 */

// State
let offscreenCreated = false;
let readerConnected = false;
let isScanning = false;
let deviceName = null;
let connectedTabs = new Set();
let lastCardUid = null;
let lastCardData = null;
let lastCardTime = 0;

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[NFC Background] Extension installed');
});

// Handle messages from popup, content scripts, and offscreen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[NFC Background] Message:', message.type, 'from:', sender.url || 'extension');

  (async () => {
    try {
      let response;

      switch (message.type) {
        // Status messages
        case 'GET_STATUS':
          response = {
            platformConnected: connectedTabs.size > 0,
            readerConnected: readerConnected,
            scanning: isScanning,
            deviceName: deviceName,
            lastCard: lastCardUid ? {
              uid: lastCardUid,
              data: lastCardData,
              time: lastCardTime
            } : null,
          };
          break;

        // Reader connection
        case 'CONNECT_READER':
          await ensureOffscreen();
          response = await sendToOffscreen({ type: 'OFFSCREEN_CONNECT' });
          break;

        case 'DISCONNECT_READER':
          if (offscreenCreated) {
            response = await sendToOffscreen({ type: 'OFFSCREEN_DISCONNECT' });
          } else {
            response = { success: true };
          }
          break;

        // Scanning
        case 'START_SCAN':
          if (sender.tab?.id) {
            connectedTabs.add(sender.tab.id);
          }
          if (readerConnected) {
            await ensureOffscreen();
            await sendToOffscreen({ type: 'OFFSCREEN_START_SCAN' });
            isScanning = true;
          }
          response = { success: true, scanning: isScanning };
          break;

        case 'STOP_SCAN':
          if (sender.tab?.id) {
            connectedTabs.delete(sender.tab.id);
          }
          if (connectedTabs.size === 0 && offscreenCreated) {
            await sendToOffscreen({ type: 'OFFSCREEN_STOP_SCAN' });
            isScanning = false;
          }
          response = { success: true };
          break;

        // Offscreen document messages
        case 'OFFSCREEN_READY':
          console.log('[NFC Background] Offscreen document ready');
          response = { received: true };
          break;

        case 'READER_CONNECTED':
          readerConnected = true;
          deviceName = message.deviceName;
          broadcastToTabs({ type: 'READER_CONNECTED', deviceName: deviceName });
          broadcastStatus();
          response = { received: true };
          break;

        case 'READER_DISCONNECTED':
          readerConnected = false;
          isScanning = false;
          deviceName = null;
          broadcastToTabs({ type: 'READER_DISCONNECTED' });
          broadcastStatus();
          response = { received: true };
          break;

        case 'CARD_DETECTED':
          lastCardUid = message.uid;
          lastCardData = message.data;
          lastCardTime = Date.now();
          console.log('[NFC Background] Card detected:', message.uid);
          broadcastToTabs({
            type: 'CARD_DETECTED',
            uid: message.uid,
            data: message.data,
          });
          response = { received: true };
          break;

        // Request USB permission (needs user gesture in popup)
        case 'REQUEST_USB_PERMISSION':
          response = { needsPopup: true };
          break;

        default:
          response = { error: 'Unknown message type' };
      }

      sendResponse(response);
    } catch (error) {
      console.error('[NFC Background] Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Handle external connections from web pages
chrome.runtime.onConnectExternal.addListener((port) => {
  const tabId = port.sender?.tab?.id;
  console.log('[NFC Background] External connection from tab:', tabId);

  if (tabId) {
    connectedTabs.add(tabId);
    broadcastStatus();
  }

  port.onMessage.addListener(async (message) => {
    let response;

    switch (message.type) {
      case 'PING':
        response = { type: 'PONG', version: '1.0.1' };
        break;

      case 'GET_STATUS':
        response = {
          type: 'STATUS',
          platformConnected: true,
          readerConnected: readerConnected,
          scanning: isScanning,
          deviceName: deviceName,
        };
        break;

      case 'CONNECT':
        await ensureOffscreen();
        const result = await sendToOffscreen({ type: 'OFFSCREEN_CONNECT' });
        response = { type: 'CONNECT_RESULT', ...result };
        break;

      case 'START_SCAN':
        if (tabId) connectedTabs.add(tabId);
        if (readerConnected) {
          await ensureOffscreen();
          await sendToOffscreen({ type: 'OFFSCREEN_START_SCAN' });
          isScanning = true;
        }
        response = { type: 'SCAN_STARTED' };
        break;

      case 'STOP_SCAN':
        if (tabId) connectedTabs.delete(tabId);
        if (connectedTabs.size === 0 && offscreenCreated) {
          await sendToOffscreen({ type: 'OFFSCREEN_STOP_SCAN' });
          isScanning = false;
        }
        response = { type: 'SCAN_STOPPED' };
        break;
    }

    port.postMessage(response);
  });

  port.onDisconnect.addListener(() => {
    console.log('[NFC Background] Port disconnected, tab:', tabId);
    if (tabId) {
      connectedTabs.delete(tabId);
      if (connectedTabs.size === 0 && offscreenCreated) {
        sendToOffscreen({ type: 'OFFSCREEN_STOP_SCAN' });
        isScanning = false;
      }
      broadcastStatus();
    }
  });
});

// Handle messages from web pages via externally_connectable
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('[NFC Background] External message:', message.type, 'from:', sender.url);

  const tabId = sender.tab?.id;

  (async () => {
    switch (message.type) {
      case 'PING':
        if (tabId) connectedTabs.add(tabId);
        sendResponse({ type: 'PONG', version: '1.0.1' });
        break;

      case 'GET_STATUS':
        if (tabId) connectedTabs.add(tabId);
        sendResponse({
          type: 'STATUS',
          platformConnected: true,
          readerConnected: readerConnected,
          scanning: isScanning,
          deviceName: deviceName,
        });
        break;

      case 'CONNECT':
        await ensureOffscreen();
        const result = await sendToOffscreen({ type: 'OFFSCREEN_CONNECT' });
        if (result.needsPermission) {
          // WebUSB needs user interaction - can't request from here
          sendResponse({
            type: 'CONNECT_RESULT',
            success: false,
            error: 'USB permission required. Please click the extension icon to connect the reader.',
            needsPermission: true
          });
        } else {
          sendResponse({ type: 'CONNECT_RESULT', ...result });
        }
        break;

      case 'START_SCAN':
        if (tabId) connectedTabs.add(tabId);
        if (readerConnected) {
          await ensureOffscreen();
          await sendToOffscreen({ type: 'OFFSCREEN_START_SCAN' });
          isScanning = true;
        }
        sendResponse({ type: 'SCAN_STARTED', scanning: readerConnected });
        break;

      case 'STOP_SCAN':
        if (tabId) connectedTabs.delete(tabId);
        if (connectedTabs.size === 0 && offscreenCreated) {
          await sendToOffscreen({ type: 'OFFSCREEN_STOP_SCAN' });
          isScanning = false;
        }
        sendResponse({ type: 'SCAN_STOPPED' });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();

  return true;
});

// Create offscreen document for WebUSB
async function ensureOffscreen() {
  if (offscreenCreated) return;

  try {
    // Check if offscreen already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
      offscreenCreated = true;
      return;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'], // WebUSB requires this reason
      justification: 'USB NFC reader communication via WebUSB API'
    });

    offscreenCreated = true;
    console.log('[NFC Background] Offscreen document created');

  } catch (error) {
    if (error.message?.includes('Only a single offscreen')) {
      offscreenCreated = true;
    } else {
      console.error('[NFC Background] Failed to create offscreen:', error);
      throw error;
    }
  }
}

// Send message to offscreen document
async function sendToOffscreen(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[NFC Background] Offscreen message error:', chrome.runtime.lastError.message);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: true });
      }
    });

    // Timeout
    setTimeout(() => {
      resolve({ success: false, error: 'Timeout waiting for offscreen response' });
    }, 10000);
  });
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

// Broadcast current status to popup
function broadcastStatus() {
  // This will update the popup if open
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    platformConnected: connectedTabs.size > 0,
    readerConnected: readerConnected,
    scanning: isScanning,
    deviceName: deviceName,
  }).catch(() => {
    // Popup might be closed, ignore
  });
}

// Clean up tabs when closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (connectedTabs.has(tabId)) {
    connectedTabs.delete(tabId);
    if (connectedTabs.size === 0 && offscreenCreated) {
      sendToOffscreen({ type: 'OFFSCREEN_STOP_SCAN' });
      isScanning = false;
    }
    broadcastStatus();
  }
});
