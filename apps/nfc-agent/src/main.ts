/**
 * PeeAP NFC Agent - Main Entry Point
 *
 * This Electron app runs as a local NFC agent that:
 * 1. Uses native PC/SC libraries to communicate with NFC readers
 * 2. Exposes a WebSocket server on localhost:9876
 * 3. Sends NFC card data to connected web clients
 * 4. Supports writing data to NFC cards
 *
 * This approach works reliably because:
 * - It uses the same PC/SC stack that the OS smart card services use
 * - No conflict with system services
 * - Works on Windows, macOS, and Linux
 */

import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import { NFCService } from './nfc-service';
import { WebSocketServer } from './websocket-server';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let nfcService: NFCService | null = null;
let wsServer: WebSocketServer | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    resizable: false,
    show: false, // Start hidden, show from tray
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'PeeAP NFC Agent',
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create a simple tray icon
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // Create a simple colored icon if file doesn't exist
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADPSURBVDiNpZMxDoJAEEXfLhQktNg7hYWNHdxBL0CDF9AreBW9gh6AHgq8gqW1xoRQkBB2LHYJy7JAfpJJZmbz/wyzuwCVSim1tNY3rfVNKbW01stKqSUQRFHEYrFgNpsRx/F/gYPD4UAcx0yn0/dZAGw2G4Ig4Hg8AjAej6nVanYBp9OJ0WjEbrfL8KPRiMPhQBAE7wGA6/WaQqEAwPl8ZrlcZh8QhiGO47BYLDgej/R6PT6B+XyO4zgcDge63S7X65Ver8d6vf51x7/4BW/LYX/LxPHHAAAAAElFTkSuQmCC'
  ) : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Status',
      enabled: false,
      label: nfcService?.isReaderConnected() ? '✓ Reader Connected' : '✗ No Reader',
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('PeeAP NFC Agent');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const isConnected = nfcService?.isReaderConnected() ?? false;
  const readerName = nfcService?.getReaderName() ?? 'No reader';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow?.show();
      },
    },
    { type: 'separator' },
    {
      label: isConnected ? `✓ ${readerName}` : '✗ No Reader',
      enabled: false,
    },
    {
      label: `Clients: ${wsServer?.getClientCount() ?? 0}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`PeeAP NFC Agent - ${isConnected ? 'Ready' : 'No Reader'}`);
}

async function initializeServices() {
  console.log('[Main] Initializing NFC Agent...');

  // Initialize WebSocket server
  wsServer = new WebSocketServer(9876);
  await wsServer.start();
  console.log('[Main] WebSocket server started on port 9876');

  // Initialize NFC service
  nfcService = new NFCService();

  // Connect NFC events to WebSocket broadcasts
  nfcService.on('reader-connected', (readerName: string) => {
    console.log('[Main] Reader connected:', readerName);
    wsServer?.broadcast({
      type: 'status',
      payload: {
        readerName,
        cardPresent: false,
        version: app.getVersion(),
      },
    });
    updateTrayMenu();
    mainWindow?.webContents.send('nfc-status', { readerConnected: true, readerName });
  });

  nfcService.on('reader-disconnected', () => {
    console.log('[Main] Reader disconnected');
    wsServer?.broadcast({
      type: 'status',
      payload: {
        readerName: null,
        cardPresent: false,
        version: app.getVersion(),
      },
    });
    updateTrayMenu();
    mainWindow?.webContents.send('nfc-status', { readerConnected: false, readerName: null });
  });

  nfcService.on('card-detected', (card: any) => {
    console.log('[Main] Card detected:', card);
    wsServer?.broadcast({
      type: 'card_detected',
      payload: card,
    });
    mainWindow?.webContents.send('card-detected', card);
  });

  nfcService.on('card-removed', () => {
    console.log('[Main] Card removed');
    wsServer?.broadcast({
      type: 'card_removed',
      payload: {},
    });
    mainWindow?.webContents.send('card-removed');
  });

  nfcService.on('error', (error: string) => {
    console.error('[Main] NFC error:', error);
    wsServer?.broadcast({
      type: 'error',
      payload: { message: error },
    });
    mainWindow?.webContents.send('nfc-error', error);
  });

  // Handle write requests from WebSocket clients
  wsServer.on('write-request', async (data: string, clientId: string) => {
    console.log('[Main] Write request from client:', clientId);
    const result = await nfcService?.writeToCard(data);
    wsServer?.sendToClient(clientId, {
      type: 'write_result',
      payload: result,
    });
  });

  // Handle client connections for status updates
  wsServer.on('client-connected', () => {
    updateTrayMenu();
    // Send current status to new client
    wsServer?.broadcast({
      type: 'status',
      payload: {
        readerName: nfcService?.getReaderName() ?? null,
        cardPresent: nfcService?.isCardPresent() ?? false,
        version: app.getVersion(),
      },
    });
  });

  wsServer.on('client-disconnected', () => {
    updateTrayMenu();
  });

  // Start NFC service
  nfcService.start();
  console.log('[Main] NFC service started');
}

// IPC handlers for renderer
ipcMain.handle('get-status', () => {
  return {
    readerConnected: nfcService?.isReaderConnected() ?? false,
    readerName: nfcService?.getReaderName() ?? null,
    cardPresent: nfcService?.isCardPresent() ?? false,
    clientCount: wsServer?.getClientCount() ?? 0,
    version: app.getVersion(),
  };
});

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  createTray();
  await initializeServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close - run in background
});

app.on('before-quit', () => {
  console.log('[Main] Shutting down...');
  nfcService?.stop();
  wsServer?.stop();
});

// Extend app with isQuitting property
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}
