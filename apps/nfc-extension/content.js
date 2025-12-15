/**
 * PeeAP NFC Extension - Content Script
 *
 * Bridges communication between the web page and the background service worker.
 * This runs in the context of the web page.
 */

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages from background to the web page
  window.postMessage({
    source: 'peeap-nfc-extension',
    type: message.type,
    payload: message,
  }, '*');

  sendResponse({ received: true });
  return true;
});

// Notify the page that extension is available
window.postMessage({
  source: 'peeap-nfc-extension',
  type: 'EXTENSION_AVAILABLE',
  payload: { version: '1.0.0' },
}, '*');

console.log('[PeeAP NFC] Content script loaded');
