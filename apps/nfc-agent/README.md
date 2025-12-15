# PeeAP NFC Agent

A local desktop application that provides reliable NFC reader access for the PeeAP web application.

## Why This Exists

Web browsers have limited access to NFC readers due to security restrictions and conflicts with operating system smart card services. This agent solves the problem by:

1. Running as a native desktop application with full PC/SC access
2. Using the same smart card stack as the operating system (no conflicts)
3. Providing a WebSocket interface that the web app can connect to
4. Working reliably on Windows, macOS, and Linux

## Installation

### Prerequisites

- Node.js 18 or later
- npm or yarn
- An NFC reader (ACR122U recommended)

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building for Distribution

```bash
# Build for Windows
npm run package:win

# Build for macOS
npm run package:mac

# Build for Linux
npm run package:linux
```

The built application will be in the `release` folder.

## Usage

1. Connect your NFC reader to the computer
2. Launch the PeeAP NFC Agent
3. The agent will automatically detect the reader
4. Open the PeeAP web app - it will connect to the agent automatically
5. Use NFC features as normal

## How It Works

```
┌─────────────────────┐     WebSocket      ┌─────────────────────┐
│   PeeAP Web App     │◄──────────────────►│   NFC Agent         │
│   (Browser)         │   localhost:9876   │   (Electron)        │
└─────────────────────┘                    └──────────┬──────────┘
                                                      │
                                                      │ PC/SC
                                                      ▼
                                           ┌─────────────────────┐
                                           │   NFC Reader        │
                                           │   (ACR122U, etc)    │
                                           └─────────────────────┘
```

1. The NFC Agent uses the `nfc-pcsc` library to communicate with NFC readers via the PC/SC interface
2. It exposes a WebSocket server on `ws://localhost:9876`
3. The web app connects to this WebSocket to receive card events and send write commands
4. This approach works because it uses the same smart card stack as the OS, avoiding conflicts

## Supported Readers

- ACR122U (recommended)
- ACR1252U
- Most PC/SC compatible readers

## Supported Cards

- MIFARE Classic
- MIFARE Ultralight
- NTAG213/215/216
- MIFARE DESFire (limited)

## Security

- The WebSocket server only accepts connections from localhost
- No external network access required
- Card data never leaves the local machine

## Troubleshooting

### Reader not detected

1. Make sure the reader is properly connected
2. Check if the reader appears in your system's device manager
3. On Windows, ensure the smart card service is running
4. On macOS, the reader should work automatically
5. On Linux, you may need to install `pcscd` (`sudo apt install pcscd`)

### Web app not connecting

1. Make sure the NFC Agent is running
2. Check that port 9876 is not in use by another application
3. Ensure your browser allows WebSocket connections to localhost

## License

MIT
