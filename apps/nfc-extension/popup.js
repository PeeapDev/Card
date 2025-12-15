/**
 * PeeAP NFC Extension - Popup Script
 *
 * Controls the popup UI and communicates with background service worker
 */

// DOM Elements
const readerDot = document.getElementById('readerDot');
const readerStatus = document.getElementById('readerStatus');
const deviceName = document.getElementById('deviceName');
const scanDot = document.getElementById('scanDot');
const scanStatus = document.getElementById('scanStatus');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const lastCard = document.getElementById('lastCard');
const lastCardUid = document.getElementById('lastCardUid');

// Get status on popup open
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response) {
    updateUI(response);
  }
});

// Listen for updates from background
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'READER_CONNECTED':
      updateUI({ connected: true, deviceName: message.deviceName });
      break;
    case 'READER_DISCONNECTED':
      updateUI({ connected: false, scanning: false, deviceName: null });
      break;
    case 'CARD_DETECTED':
      showLastCard(message.uid, message.data);
      break;
  }
});

// Connect button click
connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true;
  connectBtn.innerHTML = '<span>⏳</span> Connecting...';

  chrome.runtime.sendMessage({ type: 'CONNECT_READER' }, (response) => {
    if (response.success) {
      updateUI({ connected: true, deviceName: response.deviceName });
      // Auto-start scanning after connect
      chrome.runtime.sendMessage({ type: 'START_SCAN' });
    } else {
      alert('Failed to connect: ' + response.error);
      connectBtn.disabled = false;
      connectBtn.innerHTML = '<span>🔌</span> Connect NFC Reader';
    }
  });
});

// Disconnect button click
disconnectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'DISCONNECT_READER' }, (response) => {
    if (response.success) {
      updateUI({ connected: false, scanning: false, deviceName: null });
    }
  });
});

// Update UI based on status
function updateUI(status) {
  if (status.connected) {
    readerDot.className = 'status-dot connected';
    readerStatus.textContent = 'Connected';
    deviceName.textContent = status.deviceName || 'NFC Reader';
    connectBtn.classList.add('hidden');
    disconnectBtn.classList.remove('hidden');
  } else {
    readerDot.className = 'status-dot disconnected';
    readerStatus.textContent = 'Not Connected';
    deviceName.textContent = '-';
    connectBtn.classList.remove('hidden');
    disconnectBtn.classList.add('hidden');
    connectBtn.disabled = false;
    connectBtn.innerHTML = '<span>🔌</span> Connect NFC Reader';
  }

  if (status.scanning) {
    scanDot.className = 'status-dot scanning';
    scanStatus.textContent = 'Active';
  } else {
    scanDot.className = 'status-dot disconnected';
    scanStatus.textContent = 'Inactive';
  }
}

// Show last detected card
function showLastCard(uid, data) {
  lastCard.classList.remove('hidden');
  lastCardUid.textContent = data || uid;
}
