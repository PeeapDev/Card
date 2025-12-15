# PeeAP NFC Agent

A lightweight local service that enables reliable NFC card reading for the PeeAP web application.

## Quick Start (For Users)

### Option 1: Download Pre-built Executable (Recommended)

1. Download the installer for your operating system from the PeeAP settings page
2. Run the executable
3. Keep the terminal window open while using NFC features

### Option 2: Run with Node.js

If you have Node.js installed:

```bash
# Clone or download this folder
cd nfc-agent

# Install dependencies
npm install

# Run the agent
npm start
```

You should see:
```
╔═══════════════════════════════════════════╗
║                                           ║
║       PeeAP NFC Agent v1.0.0              ║
║                                           ║
║   Local NFC Reader Service for POS        ║
║                                           ║
╚═══════════════════════════════════════════╝

[10:30:45] WebSocket server running on ws://localhost:9876
[10:30:45] Waiting for browser connections...
[10:30:45] Initializing NFC reader...
[10:30:46] ✓ NFC Reader connected: ACS ACR122U
```

## How It Works

```
┌─────────────────────┐     WebSocket      ┌─────────────────────┐
│   PeeAP Web App     │◄──────────────────►│   NFC Agent         │
│   (Browser)         │   localhost:9876   │   (This script)     │
└─────────────────────┘                    └──────────┬──────────┘
                                                      │
                                                      │ PC/SC
                                                      ▼
                                           ┌─────────────────────┐
                                           │   NFC Reader        │
                                           │   (ACR122U, etc)    │
                                           └─────────────────────┘
```

1. The NFC Agent runs on your computer and talks to the NFC reader
2. It provides a WebSocket server on localhost:9876
3. The web app connects to this server to receive card data
4. Unlike Web USB, this works reliably because it uses the same PC/SC interface as your operating system

## Requirements

- **NFC Reader**: ACR122U or compatible PC/SC reader
- **Operating System**: Windows, macOS, or Linux
- **Node.js**: v18 or later (only if running from source)

### Linux Additional Setup

On Linux, you need the PC/SC daemon:

```bash
# Ubuntu/Debian
sudo apt install pcscd
sudo systemctl start pcscd
sudo systemctl enable pcscd

# Fedora/RHEL
sudo dnf install pcsc-lite
sudo systemctl start pcscd
```

## Building Executables

To create standalone executables (no Node.js required):

```bash
# Install pkg globally
npm install -g pkg

# Build for all platforms
npm run build:exe
```

This creates:
- `dist/peeap-nfc-agent-macos` - macOS executable
- `dist/peeap-nfc-agent-win.exe` - Windows executable
- `dist/peeap-nfc-agent-linux` - Linux executable

## Troubleshooting

### "Smart Card service not running"

**Windows:**
1. Press Win+R, type `services.msc`
2. Find "Smart Card" service
3. Right-click → Start

**Linux:**
```bash
sudo systemctl start pcscd
```

**macOS:**
Should work automatically. If not, try unplugging and reconnecting the reader.

### "Port 9876 already in use"

Another NFC Agent is running. Close it first:

**Windows:**
```cmd
netstat -ano | findstr :9876
taskkill /PID <pid> /F
```

**macOS/Linux:**
```bash
lsof -i :9876
kill -9 <pid>
```

### Reader not detected

1. Make sure the reader is plugged in
2. Check if LED on reader is on
3. Try a different USB port
4. On Linux, make sure you have permissions: `sudo usermod -a -G plugdev $USER`

## Supported Readers

- ACR122U (recommended)
- ACR1252U
- Most PC/SC compatible NFC readers

## Supported Cards

- MIFARE Classic 1K/4K
- MIFARE Ultralight
- NTAG213/215/216
- MIFARE DESFire (limited)

## Security

- Only accepts connections from localhost (127.0.0.1)
- No external network access
- Card data stays on your computer
