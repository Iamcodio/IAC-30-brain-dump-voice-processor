/**
 * Manual Overlay Window Test Script
 *
 * Tests OverlayWindowManager functionality:
 * - Window creation
 * - State transitions (minimized → recording → result)
 * - Window properties (alwaysOnTop, floating, vibrancy)
 * - Cross-workspace visibility
 *
 * Usage: node test-overlay-manual.js
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { OverlayWindowManager } = require('./dist/src/main/overlay-window-manager');

// Test state
let testResults = {
  windowCreated: false,
  windowVisible: false,
  stateTransitions: {
    minimized: false,
    recording: false,
    result: false
  },
  properties: {
    alwaysOnTop: false,
    floating: false,
    crossWorkspace: false
  }
};

function logResult(test, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? ': ' + details : ''}`);
}

function printWindowCount() {
  const windows = BrowserWindow.getAllWindows();
  console.log(`\n📊 Window count: ${windows.length}`);
  windows.forEach((win, idx) => {
    console.log(`   ${idx + 1}. ID=${win.id}, visible=${win.isVisible()}, destroyed=${win.isDestroyed()}`);
  });
}

async function runTests() {
  console.log('🚀 Starting Overlay Window Manual Tests\n');

  // Get base directory (project root)
  const baseDir = __dirname;
  console.log(`📁 Base directory: ${baseDir}`);

  // Create overlay manager
  const overlay = new OverlayWindowManager(baseDir);
  console.log('✅ OverlayWindowManager instantiated\n');

  // Test 1: Create overlay
  console.log('🔵 Test 1: Creating overlay...');
  try {
    overlay.createOverlay();

    // Wait for window to be created and HTML loaded
    await new Promise(resolve => setTimeout(resolve, 1000));

    testResults.windowCreated = overlay.exists();
    logResult('Window creation', testResults.windowCreated);

    if (testResults.windowCreated) {
      printWindowCount();

      // Check window properties
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const overlayWindow = windows[windows.length - 1]; // Last window should be overlay

        testResults.properties.alwaysOnTop = overlayWindow.isAlwaysOnTop();
        logResult('alwaysOnTop property', testResults.properties.alwaysOnTop);

        // Check if window is frameless (transparent background)
        const hasFrame = overlayWindow.isMenuBarVisible();
        logResult('Frameless window', !hasFrame);

        // Check initial state
        const bounds = overlayWindow.getBounds();
        const expectedMinimized = { width: 80, height: 80 };
        const isMinimizedSize = bounds.width === expectedMinimized.width &&
                                bounds.height === expectedMinimized.height;
        testResults.stateTransitions.minimized = isMinimizedSize;
        logResult('Initial state (minimized)', isMinimizedSize,
          `${bounds.width}x${bounds.height}`);
      }
    }
  } catch (error) {
    logResult('Window creation', false, error.message);
  }

  // Test 2: Show overlay
  console.log('\n🔵 Test 2: Showing overlay...');
  try {
    overlay.showOverlay();
    await new Promise(resolve => setTimeout(resolve, 500));

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const overlayWindow = windows[windows.length - 1];
      testResults.windowVisible = overlayWindow.isVisible();
      logResult('Window visible', testResults.windowVisible);
    }
  } catch (error) {
    logResult('Show overlay', false, error.message);
  }

  // Test 3: State transition to recording
  console.log('\n🔵 Test 3: State transition to recording...');
  try {
    overlay.setState('recording');
    await new Promise(resolve => setTimeout(resolve, 500));

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const overlayWindow = windows[windows.length - 1];
      const bounds = overlayWindow.getBounds();
      const expectedRecording = { width: 300, height: 120 };
      const isRecordingSize = bounds.width === expectedRecording.width &&
                              bounds.height === expectedRecording.height;
      testResults.stateTransitions.recording = isRecordingSize;
      logResult('Recording state', isRecordingSize,
        `${bounds.width}x${bounds.height}`);

      // Check state getter
      const currentState = overlay.getState();
      logResult('getState() returns "recording"', currentState === 'recording');
    }
  } catch (error) {
    logResult('Recording state', false, error.message);
  }

  // Test 4: State transition to result
  console.log('\n🔵 Test 4: State transition to result...');
  try {
    overlay.setState('result', { text: 'Test transcription complete!' });
    await new Promise(resolve => setTimeout(resolve, 500));

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const overlayWindow = windows[windows.length - 1];
      const bounds = overlayWindow.getBounds();
      const expectedResult = { width: 400, height: 200 };
      const isResultSize = bounds.width === expectedResult.width &&
                           bounds.height === expectedResult.height;
      testResults.stateTransitions.result = isResultSize;
      logResult('Result state', isResultSize,
        `${bounds.width}x${bounds.height}`);

      // Check state getter
      const currentState = overlay.getState();
      logResult('getState() returns "result"', currentState === 'result');
    }
  } catch (error) {
    logResult('Result state', false, error.message);
  }

  // Test 5: Hide overlay
  console.log('\n🔵 Test 5: Hiding overlay...');
  try {
    overlay.hideOverlay();
    await new Promise(resolve => setTimeout(resolve, 500));

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const overlayWindow = windows[windows.length - 1];
      const isHidden = !overlayWindow.isVisible();
      logResult('Window hidden', isHidden);
    }
  } catch (error) {
    logResult('Hide overlay', false, error.message);
  }

  // Test 6: Show again
  console.log('\n🔵 Test 6: Showing overlay again...');
  try {
    overlay.showOverlay();
    await new Promise(resolve => setTimeout(resolve, 500));

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const overlayWindow = windows[windows.length - 1];
      logResult('Window shown again', overlayWindow.isVisible());
    }
  } catch (error) {
    logResult('Show again', false, error.message);
  }

  // Test 7: Create overlay when already exists
  console.log('\n🔵 Test 7: Calling createOverlay() when overlay exists...');
  try {
    const windowCountBefore = BrowserWindow.getAllWindows().length;
    overlay.createOverlay();
    await new Promise(resolve => setTimeout(resolve, 500));
    const windowCountAfter = BrowserWindow.getAllWindows().length;

    const noNewWindow = windowCountBefore === windowCountAfter;
    logResult('No duplicate window created', noNewWindow,
      `before=${windowCountBefore}, after=${windowCountAfter}`);
  } catch (error) {
    logResult('Duplicate prevention', false, error.message);
  }

  // Test 8: State back to minimized
  console.log('\n🔵 Test 8: State transition back to minimized...');
  try {
    overlay.setState('minimized');
    await new Promise(resolve => setTimeout(resolve, 500));

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const overlayWindow = windows[windows.length - 1];
      const bounds = overlayWindow.getBounds();
      const expectedMinimized = { width: 80, height: 80 };
      const isMinimizedSize = bounds.width === expectedMinimized.width &&
                              bounds.height === expectedMinimized.height;
      logResult('Back to minimized', isMinimizedSize,
        `${bounds.width}x${bounds.height}`);
    }
  } catch (error) {
    logResult('Back to minimized', false, error.message);
  }

  // Final window count
  printWindowCount();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Window Created: ${testResults.windowCreated ? '✅' : '❌'}`);
  console.log(`Window Visible: ${testResults.windowVisible ? '✅' : '❌'}`);
  console.log(`\nState Transitions:`);
  console.log(`  - Minimized: ${testResults.stateTransitions.minimized ? '✅' : '❌'}`);
  console.log(`  - Recording: ${testResults.stateTransitions.recording ? '✅' : '❌'}`);
  console.log(`  - Result: ${testResults.stateTransitions.result ? '✅' : '❌'}`);
  console.log(`\nWindow Properties:`);
  console.log(`  - Always on top: ${testResults.properties.alwaysOnTop ? '✅' : '❌'}`);
  console.log('='.repeat(60));

  console.log('\n⏰ Keeping window open for 10 seconds for manual inspection...');
  console.log('💡 You should see a small overlay window in the bottom-right corner');
  console.log('   It should be floating above all other windows');

  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('\n✅ Test complete - closing app');
  app.quit();
}

app.whenReady().then(() => {
  console.log('🎬 Electron app ready\n');
  runTests().catch((error) => {
    console.error('❌ Test failed with error:', error);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  // Prevent quit on all windows closed (we control quit manually)
});
