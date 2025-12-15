/**
 * NFC Agent Settings Component
 *
 * Displays NFC Agent status and provides download link.
 * Shows real-time connection status with live indicator lights.
 *
 * Usage: Add this component to any settings/profile page
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Download,
  CheckCircle2,
  XCircle,
  Wifi,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  Usb,
  Terminal,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useNFC } from '@/hooks/useNFC';
import { nfcAgentService } from '@/services/nfc-agent.service';

interface NFCAgentSettingsProps {
  className?: string;
  compact?: boolean;
}

export function NFCAgentSettings({ className = '', compact = false }: NFCAgentSettingsProps) {
  const { status, lastCardRead, checkStatus } = useNFC();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Agent connection state
  const agentConnected = status.agent?.connected;
  const agentReaderName = status.agent?.readerName;
  const agentAvailable = status.agent?.available;

  // Fallback states
  const usbConnected = status.usbReader.connected;
  const webNFCSupported = status.webNFC.supported;

  // Overall connection
  const anyConnected = agentConnected || usbConnected || status.webNFC.scanning;

  // Card detection (show for 3 seconds after detection)
  const [cardDetected, setCardDetected] = useState(false);
  useEffect(() => {
    if (lastCardRead) {
      setCardDetected(true);
      const timer = setTimeout(() => setCardDetected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCardRead]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkStatus();
    // Also try to reconnect agent
    if (!agentConnected) {
      await nfcAgentService.connect();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  // Compact version for smaller spaces
  if (compact) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              agentConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              <Monitor className={`w-5 h-5 ${agentConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">NFC Agent</p>
              <p className="text-sm text-gray-500">
                {agentConnected ? agentReaderName || 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className={`w-3 h-3 rounded-full ${
              agentConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />

            {!agentConnected && (
              <button
                onClick={() => setShowInstructions(true)}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg flex items-center gap-1"
              >
                <Terminal className="w-4 h-4" />
                Setup
              </button>
            )}
          </div>
        </div>

        {/* Instructions Modal for Compact */}
        {showInstructions && <InstallInstructionsModal onClose={() => setShowInstructions(false)} copyCommand={copyCommand} copiedCommand={copiedCommand} />}
      </div>
    );
  }

  // Full version
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            agentConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <Monitor className={`w-5 h-5 ${agentConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Local NFC Agent</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Desktop app for reliable NFC card reading
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Section */}
      <div className="p-6">
        {/* Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Agent Status */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            agentConnected
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Monitor className={`w-6 h-6 ${agentConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                {/* Live indicator dot */}
                <motion.div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    agentConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  animate={agentConnected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">NFC Agent</span>
            </div>
            <p className={`text-sm ${agentConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {agentConnected ? 'Connected & Ready' : 'Not Installed'}
            </p>
            {agentConnected && agentReaderName && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={agentReaderName}>
                {agentReaderName}
              </p>
            )}
          </div>

          {/* Reader Status */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            anyConnected
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Wifi className={`w-6 h-6 rotate-90 ${anyConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                <motion.div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    anyConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  animate={anyConnected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">NFC Reader</span>
            </div>
            <p className={`text-sm ${anyConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {anyConnected ? 'Ready to Scan' : 'No Reader'}
            </p>
          </div>

          {/* Card Status */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            cardDetected
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <CreditCard className={`w-6 h-6 ${cardDetected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                <motion.div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    cardDetected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  animate={cardDetected ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">Card</span>
            </div>
            <p className={`text-sm ${cardDetected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {cardDetected ? 'Card Detected!' : 'Waiting...'}
            </p>
            {cardDetected && lastCardRead && (
              <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                {lastCardRead.uid}
              </p>
            )}
          </div>
        </div>

        {/* Download/Install Section */}
        <AnimatePresence mode="wait">
          {!agentConnected ? (
            <motion.div
              key="install"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Terminal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Setup NFC Agent for Reliable Card Reading
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Run a simple command to start the NFC Agent on your computer.
                    Requires Node.js installed.
                  </p>

                  {/* Quick Start Command */}
                  <div className="bg-gray-900 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Run in Terminal:</span>
                      <button
                        onClick={() => copyCommand('npx peeap-nfc-agent')}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        {copiedCommand === 'npx peeap-nfc-agent' ? (
                          <><Check className="w-3 h-3" /> Copied!</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy</>
                        )}
                      </button>
                    </div>
                    <code className="text-green-400 font-mono text-sm">npx peeap-nfc-agent</code>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowInstructions(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                      <Terminal className="w-5 h-5" />
                      View Full Setup Guide
                    </button>
                  </div>

                  {/* Supported platforms */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <span>Supports:</span>
                    <span className="font-medium">Windows</span>
                    <span className="font-medium">macOS</span>
                    <span className="font-medium">Linux</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300">
                    NFC Agent Connected
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {agentReaderName
                      ? `Reader: ${agentReaderName}`
                      : 'Ready to accept NFC card payments'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alternative Methods Notice */}
        {!agentConnected && (webNFCSupported || usbConnected) && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  Fallback method available
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  {webNFCSupported && 'Web NFC is available on this device. '}
                  {usbConnected && 'USB reader connected. '}
                  For the most reliable experience, we recommend installing the NFC Agent.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions Modal */}
        {showInstructions && (
          <InstallInstructionsModal
            onClose={() => setShowInstructions(false)}
            copyCommand={copyCommand}
            copiedCommand={copiedCommand}
          />
        )}
      </div>
    </div>
  );
}

// Install Instructions Modal Component
function InstallInstructionsModal({
  onClose,
  copyCommand,
  copiedCommand,
}: {
  onClose: () => void;
  copyCommand: (cmd: string) => void;
  copiedCommand: string | null;
}) {
  const os = getOS();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Terminal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">NFC Agent Setup</h3>
              <p className="text-sm text-gray-500">Follow these steps to get started</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Install Node.js */}
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Install Node.js (if not installed)
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Download and install Node.js from the official website.
              </p>
              <a
                href="https://nodejs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Download Node.js
              </a>
            </div>
          </div>

          {/* Step 2: Open Terminal */}
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Open Terminal
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {os === 'macOS' && 'Open Terminal from Applications > Utilities, or press Cmd+Space and type "Terminal"'}
                {os === 'Windows' && 'Press Win+R, type "cmd" and press Enter, or search for "Command Prompt"'}
                {os === 'Linux' && 'Open your terminal application (Ctrl+Alt+T on most systems)'}
                {os === 'Desktop' && 'Open your command line terminal'}
              </p>
            </div>
          </div>

          {/* Step 3: Run Command */}
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Run the NFC Agent
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Copy and paste this command into your terminal:
              </p>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Command:</span>
                  <button
                    onClick={() => copyCommand('npx peeap-nfc-agent')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {copiedCommand === 'npx peeap-nfc-agent' ? (
                      <><Check className="w-3 h-3" /> Copied!</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <code className="text-green-400 font-mono">npx peeap-nfc-agent</code>
              </div>
            </div>
          </div>

          {/* Step 4: Keep Running */}
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Keep the Terminal Open
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Keep the terminal window open while using NFC features. You should see:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300">
                <div className="text-cyan-400">╔═══════════════════════════════════════════╗</div>
                <div className="text-cyan-400">║       PeeAP NFC Agent v1.0.0              ║</div>
                <div className="text-cyan-400">╚═══════════════════════════════════════════╝</div>
                <div className="mt-2 text-green-400">[10:30:45] WebSocket server running on ws://localhost:9876</div>
                <div className="text-green-400">[10:30:45] ✓ NFC Reader connected: ACS ACR122U</div>
              </div>
            </div>
          </div>

          {/* Success Notice */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  Auto-Connect
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Once the agent is running, this page will automatically detect it and show a green status indicator.
                </p>
              </div>
            </div>
          </div>

          {/* Linux Note */}
          {os === 'Linux' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                    Linux: Install PC/SC daemon first
                  </p>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 font-mono bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
                    sudo apt install pcscd && sudo systemctl start pcscd
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to detect OS
function getOS(): string {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'Windows';
  if (userAgent.includes('mac')) return 'macOS';
  if (userAgent.includes('linux')) return 'Linux';
  return 'Desktop';
}
