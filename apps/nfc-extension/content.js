/**
 * PeeAP NFC Extension - Content Script
 *
 * Bridges communication between the web page and the background service worker.
 * This runs in the context of the web page.
 */

// Get extension ID
const EXTENSION_ID = chrome.runtime.id;

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages from background to the web page
  window.postMessage({
    source: 'peeap-nfc-extension',
    extensionId: EXTENSION_ID,
    type: message.type,
    payload: message,
  }, '*');

  sendResponse({ received: true });
  return true;
});

// Listen for messages from the web page
window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  // Check if it's a request for us
  if (event.data && event.data.target === 'peeap-nfc-extension') {
    const { type, payload } = event.data;

    // Forward to background script
    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      // Send response back to web page
      window.postMessage({
        source: 'peeap-nfc-extension',
        extensionId: EXTENSION_ID,
        type: type + '_RESPONSE',
        payload: response,
      }, '*');
    });
  }
});

// Notify the page that extension is available
window.postMessage({
  source: 'peeap-nfc-extension',
  extensionId: EXTENSION_ID,
  type: 'EXTENSION_AVAILABLE',
  payload: { version: '1.0.0', extensionId: EXTENSION_ID },
}, '*');

console.log('[PeeAP NFC] Content script loaded, extension ID:', EXTENSION_ID);
