/**
 * Embedded CSS styles for Peeap Chat Widget
 */

export function getStyles(config: {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  offsetX: number;
  offsetY: number;
  zIndex: number;
  theme: 'light' | 'dark';
}): string {
  const { primaryColor, position, offsetX, offsetY, zIndex, theme } = config;

  const isRight = position === 'bottom-right';
  const isDark = theme === 'dark';

  // Theme colors
  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const bgSecondary = isDark ? '#16213e' : '#f8f9fa';
  const bgHover = isDark ? '#0f3460' : '#f0f0f0';
  const text = isDark ? '#ffffff' : '#1a1a2e';
  const textSecondary = isDark ? '#a0a0a0' : '#6c757d';
  const border = isDark ? '#2d2d44' : '#e9ecef';
  const inputBg = isDark ? '#16213e' : '#ffffff';

  return `
/* Peeap Chat Widget Styles */
.peeap-chat-widget {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: ${text};
  box-sizing: border-box;
}

.peeap-chat-widget *,
.peeap-chat-widget *::before,
.peeap-chat-widget *::after {
  box-sizing: inherit;
}

/* Floating Button */
.peeap-chat-button {
  position: fixed;
  ${isRight ? 'right' : 'left'}: ${offsetX}px;
  bottom: ${offsetY}px;
  z-index: ${zIndex};
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${primaryColor};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.peeap-chat-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.peeap-chat-button:active {
  transform: scale(0.95);
}

.peeap-chat-button svg {
  width: 28px;
  height: 28px;
  fill: white;
}

.peeap-chat-button-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Chat Container */
.peeap-chat-container {
  position: fixed;
  ${isRight ? 'right' : 'left'}: ${offsetX}px;
  bottom: ${offsetY + 70}px;
  z-index: ${zIndex + 1};
  width: 380px;
  max-width: calc(100vw - ${offsetX * 2}px);
  height: 560px;
  max-height: calc(100vh - ${offsetY + 90}px);
  background: ${bg};
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.peeap-chat-container.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Header */
.peeap-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${primaryColor};
  color: white;
  flex-shrink: 0;
}

.peeap-chat-header-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.2);
}

.peeap-chat-header-info {
  flex: 1;
  min-width: 0;
}

.peeap-chat-header-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.peeap-chat-header-subtitle {
  font-size: 12px;
  opacity: 0.9;
}

.peeap-chat-header-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.peeap-chat-header-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.peeap-chat-header-close svg {
  width: 18px;
  height: 18px;
  fill: white;
}

/* Pre-chat Form */
.peeap-chat-prechat {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

.peeap-chat-prechat-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${text};
}

.peeap-chat-prechat-subtitle {
  font-size: 14px;
  color: ${textSecondary};
  margin-bottom: 24px;
}

.peeap-chat-form-group {
  margin-bottom: 16px;
}

.peeap-chat-form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: ${text};
  margin-bottom: 6px;
}

.peeap-chat-form-input {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  border: 1px solid ${border};
  border-radius: 8px;
  background: ${inputBg};
  color: ${text};
  transition: border-color 0.2s, box-shadow 0.2s;
}

.peeap-chat-form-input:focus {
  outline: none;
  border-color: ${primaryColor};
  box-shadow: 0 0 0 3px ${primaryColor}20;
}

.peeap-chat-form-input::placeholder {
  color: ${textSecondary};
}

.peeap-chat-form-submit {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: ${primaryColor};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.peeap-chat-form-submit:hover {
  opacity: 0.9;
}

.peeap-chat-form-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* User Search */
.peeap-chat-search {
  padding: 12px 16px;
  background: ${bgSecondary};
  border-bottom: 1px solid ${border};
}

.peeap-chat-search-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid ${border};
  border-radius: 8px;
  background: ${inputBg};
  color: ${text};
}

.peeap-chat-search-input:focus {
  outline: none;
  border-color: ${primaryColor};
}

.peeap-chat-search-results {
  flex: 1;
  overflow-y: auto;
}

.peeap-chat-user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.peeap-chat-user-item:hover {
  background: ${bgHover};
}

.peeap-chat-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${bgSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: ${primaryColor};
  overflow: hidden;
}

.peeap-chat-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.peeap-chat-user-info {
  flex: 1;
  min-width: 0;
}

.peeap-chat-user-name {
  font-weight: 500;
  color: ${text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Conversation List */
.peeap-chat-conversations {
  flex: 1;
  overflow-y: auto;
}

.peeap-chat-conv-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid ${border};
}

.peeap-chat-conv-item:hover {
  background: ${bgHover};
}

.peeap-chat-conv-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${bgSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: ${primaryColor};
  flex-shrink: 0;
}

.peeap-chat-conv-content {
  flex: 1;
  min-width: 0;
}

.peeap-chat-conv-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.peeap-chat-conv-name {
  font-weight: 500;
  color: ${text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.peeap-chat-conv-time {
  font-size: 12px;
  color: ${textSecondary};
  flex-shrink: 0;
  margin-left: 8px;
}

.peeap-chat-conv-preview {
  font-size: 13px;
  color: ${textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.peeap-chat-conv-unread {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: ${primaryColor};
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Messages */
.peeap-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.peeap-chat-message {
  max-width: 80%;
  display: flex;
  flex-direction: column;
}

.peeap-chat-message.sent {
  align-self: flex-end;
}

.peeap-chat-message.received {
  align-self: flex-start;
}

.peeap-chat-message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  word-wrap: break-word;
}

.peeap-chat-message.sent .peeap-chat-message-bubble {
  background: ${primaryColor};
  color: white;
  border-bottom-right-radius: 4px;
}

.peeap-chat-message.received .peeap-chat-message-bubble {
  background: ${bgSecondary};
  color: ${text};
  border-bottom-left-radius: 4px;
}

.peeap-chat-message-sender {
  font-size: 12px;
  color: ${textSecondary};
  margin-bottom: 4px;
}

.peeap-chat-message-time {
  font-size: 11px;
  color: ${textSecondary};
  margin-top: 4px;
  text-align: right;
}

.peeap-chat-message.received .peeap-chat-message-time {
  text-align: left;
}

.peeap-chat-message-system {
  align-self: center;
  max-width: 90%;
  padding: 8px 16px;
  background: ${bgSecondary};
  border-radius: 16px;
  font-size: 12px;
  color: ${textSecondary};
  text-align: center;
}

/* Welcome Message */
.peeap-chat-welcome {
  text-align: center;
  padding: 32px 24px;
}

.peeap-chat-welcome-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: ${bgSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
}

.peeap-chat-welcome-icon svg {
  width: 32px;
  height: 32px;
  fill: ${primaryColor};
}

.peeap-chat-welcome-text {
  font-size: 15px;
  color: ${text};
  margin-bottom: 8px;
}

.peeap-chat-welcome-subtext {
  font-size: 13px;
  color: ${textSecondary};
}

/* Input Area */
.peeap-chat-input-area {
  padding: 12px 16px;
  background: ${bg};
  border-top: 1px solid ${border};
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.peeap-chat-input-wrapper {
  flex: 1;
  position: relative;
}

.peeap-chat-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid ${border};
  border-radius: 20px;
  background: ${inputBg};
  color: ${text};
  resize: none;
  min-height: 42px;
  max-height: 120px;
  line-height: 1.4;
}

.peeap-chat-input:focus {
  outline: none;
  border-color: ${primaryColor};
}

.peeap-chat-input::placeholder {
  color: ${textSecondary};
}

.peeap-chat-send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${primaryColor};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.peeap-chat-send-btn:hover {
  opacity: 0.9;
}

.peeap-chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.peeap-chat-send-btn svg {
  width: 20px;
  height: 20px;
  fill: white;
}

/* Loading States */
.peeap-chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.peeap-chat-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid ${border};
  border-top-color: ${primaryColor};
  border-radius: 50%;
  animation: peeap-spin 0.8s linear infinite;
}

@keyframes peeap-spin {
  to { transform: rotate(360deg); }
}

/* Typing Indicator */
.peeap-chat-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: ${bgSecondary};
  border-radius: 16px;
  align-self: flex-start;
}

.peeap-chat-typing-dot {
  width: 6px;
  height: 6px;
  background: ${textSecondary};
  border-radius: 50%;
  animation: peeap-typing 1.4s infinite;
}

.peeap-chat-typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.peeap-chat-typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes peeap-typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

/* Empty State */
.peeap-chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: ${textSecondary};
  text-align: center;
}

.peeap-chat-empty svg {
  width: 48px;
  height: 48px;
  fill: ${border};
  margin-bottom: 16px;
}

/* Back Button */
.peeap-chat-back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  transition: background 0.2s;
}

.peeap-chat-back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.peeap-chat-back-btn svg {
  width: 18px;
  height: 18px;
  fill: white;
}

/* Powered By */
.peeap-chat-powered {
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: ${textSecondary};
  background: ${bgSecondary};
  border-top: 1px solid ${border};
}

.peeap-chat-powered a {
  color: ${primaryColor};
  text-decoration: none;
  font-weight: 500;
}

.peeap-chat-powered a:hover {
  text-decoration: underline;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .peeap-chat-container {
    ${isRight ? 'right' : 'left'}: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
  }

  .peeap-chat-button {
    ${isRight ? 'right' : 'left'}: 16px;
    bottom: 16px;
  }
}
  `.trim();
}

// SVG Icons
export const icons = {
  chat: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
  send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
  back: `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
  person: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  message: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>`,
};
