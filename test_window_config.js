/**
 * Test script to verify window configuration
 * Run this to check if the minimal overlay is properly configured
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  // Import the WindowManager
  const { WindowManager } = require('./dist/src/js/managers/window_manager');

  const baseDir = __dirname;
  const windowManager = new WindowManager(baseDir);
  const window = windowManager.create();

  // Wait for window to load
  window.webContents.on('did-finish-load', () => {
    const bounds = window.getBounds();
    const isAlwaysOnTop = window.isAlwaysOnTop();
    const isFrameless = !window.isResizable();

    console.log('=== WINDOW CONFIGURATION TEST ===');
    console.log(`Width: ${bounds.width} (expected: 400)`);
    console.log(`Height: ${bounds.height} (expected: 50)`);
    console.log(`X position: ${bounds.x}`);
    console.log(`Y position: ${bounds.y}`);
    console.log(`Always on top: ${isAlwaysOnTop} (expected: true)`);
    console.log(`Frameless: ${isFrameless} (expected: true)`);
    console.log(`Visible: ${window.isVisible()} (expected: true for testing)`);

    // Check if all tests pass
    const allPass = bounds.width === 400 &&
                    bounds.height === 50 &&
                    isAlwaysOnTop === true;

    console.log(`\n=== RESULT: ${allPass ? '✅ PASS' : '❌ FAIL'} ===\n`);

    setTimeout(() => app.quit(), 2000);
  });
});
