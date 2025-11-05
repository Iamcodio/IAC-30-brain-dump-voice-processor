/**
 * Isolated Test: Floating Overlay Window
 *
 * Tests:
 * - Window appears on CURRENT workspace (not desktop)
 * - Window level 'screen-saver' works
 * - Animation is visible
 * - White border is visible
 *
 * Run: electron test-overlay-window.js
 */

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let overlayWindow = null;

app.whenReady().then(() => {
  console.log('🚀 Creating test overlay window...');

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Position in center of screen
  const overlayWidth = 400;
  const overlayHeight = 100;
  const x = Math.floor((width - overlayWidth) / 2);
  const y = Math.floor(height / 3);

  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x,
    y,

    // CRITICAL: Floating overlay settings
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: true,  // Show immediately for testing

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // CRITICAL: Set window level to 'screen-saver' for cross-workspace visibility
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.setFullScreenable(false);

  // Load test HTML
  overlayWindow.loadFile('test-overlay.html');

  // Debug output
  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Overlay window loaded');
    console.log(`📍 Position: x=${x}, y=${y}`);
    console.log(`📏 Size: ${overlayWidth}x${overlayHeight}`);
    console.log(`🎚️  Window level: screen-saver`);
    console.log(`🌍 Visible on all workspaces: true`);
    console.log('');
    console.log('👀 CHECK:');
    console.log('  1. Can you see a pulsing box with white border?');
    console.log('  2. Switch to another workspace - does it follow?');
    console.log('  3. Is the animation smooth?');
    console.log('');
    console.log('Press Ctrl+C to exit');
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
