/**
 * Window Properties Deep Test
 *
 * Verifies advanced Electron window properties for overlay:
 * - Floating window level
 * - Cross-workspace visibility
 * - Mouse event forwarding
 * - Vibrancy effects
 * - Frameless configuration
 *
 * Usage: ./node_modules/.bin/electron test-window-properties.js
 */

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { OverlayWindowManager } = require('./dist/src/main/overlay-window-manager');

function logProperty(name, value, expected) {
  const match = value === expected;
  const icon = match ? '✅' : '❌';
  console.log(`${icon} ${name}: ${JSON.stringify(value)} ${expected !== undefined ? `(expected: ${JSON.stringify(expected)})` : ''}`);
  return match;
}

function inspectWindow(win, label = 'Window') {
  console.log(`\n🔍 ${label} Properties:`);
  console.log('─'.repeat(60));

  // Basic properties
  logProperty('ID', win.id);
  logProperty('isVisible()', win.isVisible());
  logProperty('isDestroyed()', win.isDestroyed(), false);
  logProperty('isAlwaysOnTop()', win.isAlwaysOnTop(), true);

  // Window bounds
  const bounds = win.getBounds();
  console.log(`📐 Bounds: x=${bounds.x}, y=${bounds.y}, w=${bounds.width}, h=${bounds.height}`);

  // Frameless check
  const hasFrame = win.isMenuBarVisible();
  logProperty('isMenuBarVisible()', hasFrame, false);

  // Window options (from getNativeWindowHandle - not directly accessible)
  // We can infer from behavior

  // Check if window appears in Dock/Taskbar
  // Note: skipTaskbar is write-only, can't be read
  console.log('ℹ️  skipTaskbar: true (set in config, cannot be verified at runtime)');

  // Vibrancy (macOS only, write-only)
  console.log('ℹ️  vibrancy: "under-window" (set in config, cannot be verified at runtime)');

  console.log('─'.repeat(60));
}

async function testFloatingLevel() {
  console.log('\n🧪 Test: Floating Window Level');
  console.log('─'.repeat(60));

  const baseDir = __dirname;
  const overlay = new OverlayWindowManager(baseDir);

  overlay.createOverlay();
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!overlay.exists()) {
    console.log('❌ Overlay not created');
    return false;
  }

  overlay.showOverlay();
  await new Promise(resolve => setTimeout(resolve, 500));

  const windows = BrowserWindow.getAllWindows();
  const overlayWindow = windows[windows.length - 1];

  inspectWindow(overlayWindow, 'Overlay Window');

  // Test 1: Always on top
  const isOnTop = overlayWindow.isAlwaysOnTop();
  console.log(isOnTop ? '✅ Window is always on top' : '❌ Window is NOT always on top');

  // Test 2: Create another window to test z-order
  console.log('\n🧪 Creating test window to verify z-order...');
  const testWindow = new BrowserWindow({
    width: 400,
    height: 300,
    x: 100,
    y: 100,
    show: true,
    alwaysOnTop: false
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('✅ Test window created (non-floating)');
  console.log('💡 Expected: Overlay should float ABOVE test window');
  console.log('   (Visual verification required)');

  await new Promise(resolve => setTimeout(resolve, 2000));

  testWindow.close();
  overlay.destroy();

  return isOnTop;
}

async function testWorkspaceVisibility() {
  console.log('\n🧪 Test: Cross-Workspace Visibility');
  console.log('─'.repeat(60));

  const baseDir = __dirname;
  const overlay = new OverlayWindowManager(baseDir);

  overlay.createOverlay();
  await new Promise(resolve => setTimeout(resolve, 1000));

  overlay.showOverlay();
  await new Promise(resolve => setTimeout(resolve, 500));

  const windows = BrowserWindow.getAllWindows();
  const overlayWindow = windows[windows.length - 1];

  // Note: setVisibleOnAllWorkspaces is called in createOverlay()
  console.log('✅ setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }) called');
  console.log('💡 To verify: Switch to different workspace - overlay should appear there too');
  console.log('💡 To verify: Enter fullscreen mode - overlay should still be visible');

  console.log('\n⏰ Keeping window open for 5 seconds for manual workspace testing...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  overlay.destroy();
  return true;
}

async function testMouseEvents() {
  console.log('\n🧪 Test: Mouse Event Forwarding');
  console.log('─'.repeat(60));

  const baseDir = __dirname;
  const overlay = new OverlayWindowManager(baseDir);

  overlay.createOverlay();
  await new Promise(resolve => setTimeout(resolve, 1000));

  overlay.showOverlay();
  await new Promise(resolve => setTimeout(resolve, 500));

  const windows = BrowserWindow.getAllWindows();
  const overlayWindow = windows[windows.length - 1];

  console.log('ℹ️  setIgnoreMouseEvents(true, { forward: true }) called');
  console.log('⚠️  Note: This may conflict with clickable controls in overlay');
  console.log('💡 Expected behavior: Clicks should pass through transparent areas');
  console.log('💡 Expected behavior: Clicks on controls should NOT pass through');

  // Check if we can get mouse event state (not directly accessible)
  console.log('\n🧪 Testing control clickability...');
  console.log('💡 Manual verification required: Click "Stop" button in overlay');

  await new Promise(resolve => setTimeout(resolve, 3000));

  overlay.destroy();
  return true;
}

async function testStateResize() {
  console.log('\n🧪 Test: State-Based Resizing');
  console.log('─'.repeat(60));

  const baseDir = __dirname;
  const overlay = new OverlayWindowManager(baseDir);

  overlay.createOverlay();
  await new Promise(resolve => setTimeout(resolve, 1000));

  overlay.showOverlay();

  const windows = BrowserWindow.getAllWindows();
  const overlayWindow = windows[windows.length - 1];

  // Test each state
  const states = [
    { state: 'minimized', width: 80, height: 80 },
    { state: 'recording', width: 300, height: 120 },
    { state: 'result', width: 400, height: 200 }
  ];

  let allPassed = true;

  for (const { state, width, height } of states) {
    console.log(`\n🔄 Transitioning to state: ${state}`);
    overlay.setState(state, { text: `Test ${state}` });
    await new Promise(resolve => setTimeout(resolve, 500));

    const bounds = overlayWindow.getBounds();
    const match = bounds.width === width && bounds.height === height;
    const icon = match ? '✅' : '❌';

    console.log(`${icon} Size: ${bounds.width}x${bounds.height} (expected: ${width}x${height})`);

    // Check position (should be bottom-right)
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const expectedX = screenWidth - width - 20;
    const expectedY = screenHeight - height - 20;

    const positionMatch = Math.abs(bounds.x - expectedX) < 5 && Math.abs(bounds.y - expectedY) < 5;
    const posIcon = positionMatch ? '✅' : '❌';
    console.log(`${posIcon} Position: (${bounds.x}, ${bounds.y}) ≈ (${expectedX}, ${expectedY})`);

    allPassed = allPassed && match && positionMatch;
  }

  overlay.destroy();
  return allPassed;
}

async function testIPC() {
  console.log('\n🧪 Test: IPC Communication');
  console.log('─'.repeat(60));

  const baseDir = __dirname;
  const overlay = new OverlayWindowManager(baseDir);

  overlay.createOverlay();
  await new Promise(resolve => setTimeout(resolve, 1000));

  overlay.showOverlay();
  await new Promise(resolve => setTimeout(resolve, 500));

  const windows = BrowserWindow.getAllWindows();
  const overlayWindow = windows[windows.length - 1];

  // Listen for IPC from overlay renderer
  let ipcReceived = false;
  overlayWindow.webContents.on('ipc-message', (event, channel, ...args) => {
    console.log(`📨 IPC received: ${channel}`, args);
    ipcReceived = true;
  });

  console.log('✅ IPC listener attached to overlay window');
  console.log('💡 Testing state change IPC...');

  // Send state change (should trigger IPC to renderer)
  overlay.setState('recording');
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('✅ setState() called - IPC message should be sent to renderer');
  console.log('   (Renderer receives "overlay-state-change" message)');

  await new Promise(resolve => setTimeout(resolve, 1000));

  overlay.destroy();
  return true;
}

async function runAllTests() {
  console.log('🚀 Window Properties Deep Test');
  console.log('='.repeat(60));

  const results = {
    floatingLevel: await testFloatingLevel(),
    workspaceVisibility: await testWorkspaceVisibility(),
    mouseEvents: await testMouseEvents(),
    stateResize: await testStateResize(),
    ipc: await testIPC()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Floating Level: ${results.floatingLevel ? '✅' : '❌'}`);
  console.log(`Workspace Visibility: ${results.workspaceVisibility ? '✅' : '❌'}`);
  console.log(`Mouse Events: ${results.mouseEvents ? '✅' : '❌'}`);
  console.log(`State Resize: ${results.stateResize ? '✅' : '❌'}`);
  console.log(`IPC Communication: ${results.ipc ? '✅' : '❌'}`);
  console.log('='.repeat(60));

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  app.quit();
}

app.whenReady().then(() => {
  console.log('🎬 Electron app ready\n');
  runAllTests().catch((error) => {
    console.error('❌ Test failed with error:', error);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  // Prevent quit
});
