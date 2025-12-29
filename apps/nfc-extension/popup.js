/**
 * PeeAP NFC Extension - Popup Script
 *
 * Controls the popup UI with 3 connection indicator lights:
 *   1. Platform - Web page connected to extension
 *   2. USB Reader - NFC reader hardware connected
 *   3. Card - Card tap detection status
 */

// DOM Elements - Connection Lights
const platformLight = document.getElementById('platformLight');
const platformStatus = document.getElementById('platformStatus');
const readerLight = document.getElementById('readerLight');
const readerStatus = document.getElementById('readerStatus');
const cardLight = document.getElementById('cardLight');
const cardStatus = document.getElementById('cardStatus');

// DOM Elements - Other
const deviceName = document.getElementById('deviceName');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const errorMessage = document.getElementById('errorMessage');
const lastCard = document.getElementById('lastCard');
const lastCardUid = document.getElementById('lastCardUid');
const lastCardTime = document.getElementById('lastCardTime');

// State
let isConnecting = false;
let cardFlashTimeout = null;

// ACR122U USB identifiers for permission request
const ACR122U_VENDOR_ID = 0x072F;

// Get status on popup open
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response) {
    updateUI(response);
  }
});

// Listen for status updates from background
chrome.runtime.onMessage.addListener((message) => {
  console.log('[Popup] Message:', message.type);

  switch (message.type) {
    case 'STATUS_UPDATE':
      updateUI(message);
      break;
    case 'READER_CONNECTED':
      updateUI({
        readerConnected: true,
        deviceName: message.deviceName,
        scanning: true
      });
      break;
    case 'READER_DISCONNECTED':
      updateUI({
        readerConnected: false,
        scanning: false,
        deviceName: null
      });
      break;
    case 'CARD_DETECTED':
      showCardDetected(message.uid, message.data);
      break;
  }
});

// Connect button click
connectBtn.addEventListener('click', async () => {
  if (isConnecting) return;

  isConnecting = true;
  connectBtn.disabled = true;
  connectBtn.innerHTML = '<span>⏳</span> Connecting...';
  hideError();

  try {
    // First try to connect via background (for already paired devices)
    const response = await sendMessage({ type: 'CONNECT_READER' });

    if (response.success) {
      // Connected successfully to already-paired device
      updateUI({
        readerConnected: true,
        deviceName: response.deviceName,
        scanning: true
      });
      // Auto-start scanning
      chrome.runtime.sendMessage({ type: 'START_SCAN' });
    } else if (response.needsPermission || response.error === 'NO_PAIRED_DEVICE') {
      // Need to request USB permission - this requires user gesture
      console.log('[Popup] Requesting USB permission...');
      await requestUSBPermission();
    } else {
      showError(response.error || 'Failed to connect');
    }
  } catch (error) {
    console.error('[Popup] Connect error:', error);
    showError(error.message || 'Connection failed');
  }

  isConnecting = false;
  connectBtn.disabled = false;
  connectBtn.innerHTML = '<span>🔌</span> Connect NFC Reader';
});

// Request USB permission (requires user gesture, so must be in popup)
async function requestUSBPermission() {
  try {
    // WebUSB API is available in popup context
    if (!navigator.usb) {
      showError('WebUSB not supported in this browser');
      return;
    }

    // Request device permission
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: ACR122U_VENDOR_ID }]
    });

    if (device) {
      console.log('[Popup] USB permission granted for:', device.productName);

      // Now try to connect again via background
      const response = await sendMessage({ type: 'CONNECT_READER' });

      if (response.success) {
        updateUI({
          readerConnected: true,
          deviceName: response.deviceName,
          scanning: true
        });
        chrome.runtime.sendMessage({ type: 'START_SCAN' });
      } else {
        showError(response.error || 'Failed to connect after permission');
      }
    }
  } catch (error) {
    if (error.name === 'NotFoundError') {
      showError('No NFC reader found. Make sure it is plugged in.');
    } else if (error.name === 'SecurityError') {
      showError('USB access denied by browser');
    } else {
      console.error('[Popup] USB permission error:', error);
      showError('Failed to access USB device: ' + error.message);
    }
  }
}

// Disconnect button click
disconnectBtn.addEventListener('click', async () => {
  const response = await sendMessage({ type: 'DISCONNECT_READER' });
  if (response.success) {
    updateUI({
      readerConnected: false,
      scanning: false,
      deviceName: null
    });
  }
});

// Update UI based on status
function updateUI(status) {
  // Platform Light (1st) - Web page connected to extension
  if (status.platformConnected) {
    platformLight.className = 'light connected';
    platformStatus.textContent = 'Online';
  } else {
    platformLight.className = 'light off';
    platformStatus.textContent = 'Offline';
  }

  // Reader Light (2nd) - USB NFC reader connected
  if (status.readerConnected) {
    readerLight.className = 'light connected';
    readerStatus.textContent = 'Connected';
    deviceName.textContent = status.deviceName || 'NFC Reader';
    connectBtn.classList.add('hidden');
    disconnectBtn.classList.remove('hidden');
  } else {
    readerLight.className = 'light off';
    readerStatus.textContent = 'Not Found';
    deviceName.textContent = 'Not connected';
    connectBtn.classList.remove('hidden');
    disconnectBtn.classList.add('hidden');
  }

  // Card Light (3rd) - Scanning status
  if (status.scanning) {
    cardLight.className = 'light active';
    cardStatus.textContent = 'Scanning';
  } else {
    cardLight.className = 'light off';
    cardStatus.textContent = 'Idle';
  }

  // Show last card if available
  if (status.lastCard) {
    showLastCard(status.lastCard.uid, status.lastCard.data, status.lastCard.time);
  }
}

// Show card detected with flash animation
function showCardDetected(uid, data) {
  // Flash the card light
  cardLight.className = 'light connected';
  cardStatus.textContent = 'Detected!';

  // Clear previous timeout
  if (cardFlashTimeout) {
    clearTimeout(cardFlashTimeout);
  }

  // Return to scanning state after flash
  cardFlashTimeout = setTimeout(() => {
    cardLight.className = 'light active';
    cardStatus.textContent = 'Scanning';
  }, 1500);

  // Show card info
  showLastCard(uid, data, Date.now());
}

// Show last detected card
function showLastCard(uid, data, time) {
  lastCard.classList.remove('hidden');
  lastCardUid.textContent = data || uid;

  if (time) {
    const date = new Date(time);
    lastCardTime.textContent = 'Detected at ' + date.toLocaleTimeString();
  }
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

// Hide error message
function hideError() {
  errorMessage.classList.add('hidden');
}

// Helper to send message and wait for response
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: true });
      }
    });
  });
}
