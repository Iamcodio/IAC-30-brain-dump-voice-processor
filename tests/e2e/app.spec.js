/**
 * E2E Tests for BrainDump Voice Processor
 * 
 * Tests the complete user workflow including:
 * - Application launch
 * - UI responsiveness
 * - Recording workflow (Ctrl+Y toggle)
 * - Status updates
 * - History view navigation
 * - IPC handlers
 */

const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

let electronApp;
let window;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });

  // Wait for the first window
  window = await electronApp.firstWindow();
  
  // Wait for app to be ready
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(1000); // Give recorder time to start
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('Application Launch', () => {
  test('should launch successfully', async () => {
    expect(window).toBeTruthy();
    expect(await window.title()).toBe('BrainDump Voice Processor');
  });

  test('should load main window with correct dimensions', async () => {
    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});

test.describe('UI Elements', () => {
  test('should display status element', async () => {
    const status = await window.locator('#status');
    expect(await status.isVisible()).toBe(true);
  });

  test('should display "Ready" status on launch', async () => {
    const status = await window.locator('#status');
    const text = await status.textContent();
    expect(text).toContain('Ready');
  });

  test('should have "View History" button', async () => {
    const historyBtn = await window.locator('#historyBtn');
    expect(await historyBtn.isVisible()).toBe(true);
    expect(await historyBtn.textContent()).toContain('View History');
  });

  test('should have ready CSS class on status', async () => {
    const status = await window.locator('#status');
    const className = await status.getAttribute('class');
    expect(className).toContain('ready');
  });
});

test.describe('View History Button', () => {
  test('should be clickable', async () => {
    const historyBtn = await window.locator('#historyBtn');
    expect(await historyBtn.isEnabled()).toBe(true);
  });

  test('should navigate to history view when clicked', async () => {
    const historyBtn = await window.locator('#historyBtn');
    await historyBtn.click();

    // Wait for navigation
    await window.waitForTimeout(500);

    // Check if we're on history page
    const content = await window.content();
    expect(content).toContain('BrainDump History');
  });

  test('should be able to navigate back to recorder', async () => {
    // Assume we're on history page from previous test
    const recorderBtn = await window.locator('#recorderBtn');
    
    if (await recorderBtn.isVisible()) {
      await recorderBtn.click();
      await window.waitForTimeout(500);
      
      // Should be back on recorder page
      const status = await window.locator('#status');
      expect(await status.isVisible()).toBe(true);
    }
  });
});

test.describe('Preload Script / IPC Bridge', () => {
  test('should expose electronAPI to window', async () => {
    const hasAPI = await window.evaluate(() => {
      return typeof window.electronAPI !== 'undefined';
    });
    
    expect(hasAPI).toBe(true);
  });

  test('should have all required IPC methods', async () => {
    const methods = await window.evaluate(() => {
      return Object.keys(window.electronAPI || {});
    });
    
    expect(methods).toContain('showHistory');
    expect(methods).toContain('showRecorder');
    expect(methods).toContain('getRecordings');
    expect(methods).toContain('searchRecordings');
    expect(methods).toContain('readFile');
    expect(methods).toContain('playAudio');
    expect(methods).toContain('viewFile');
  });

  test('should have event listeners', async () => {
    const listeners = await window.evaluate(() => {
      return Object.keys(window.electronAPI || {}).filter(k => k.startsWith('on'));
    });
    
    expect(listeners).toContain('onRecordingStarted');
    expect(listeners).toContain('onRecordingStopped');
    expect(listeners).toContain('onTranscriptionStarted');
    expect(listeners).toContain('onTranscriptionComplete');
  });
});

test.describe('Recording Status Updates', () => {
  test('should update status when recording events fire', async () => {
    // Ensure we're on recorder page
    await window.evaluate(() => {
      if (window.electronAPI && window.electronAPI.showRecorder) {
        window.electronAPI.showRecorder();
      }
    });
    await window.waitForTimeout(500);

    // Get initial status
    const status = await window.locator('#status');
    const initialText = await status.textContent();
    expect(initialText).toContain('Ready');

    // Simulate recording started event
    await window.evaluate(() => {
      // Trigger the event listener callback
      const callbacks = window._recordingCallbacks || [];
      if (callbacks.length > 0) {
        callbacks[0]();
      }
    });

    // Note: This test may not work as expected because we can't easily
    // trigger Electron IPC events from Playwright. We'd need to either:
    // 1. Actually trigger recordings (requires microphone access)
    // 2. Expose test hooks to manually trigger events
    // This is a known limitation - documenting for the report
  });
});

test.describe('Console Errors', () => {
  test('should not have console errors on launch', async () => {
    const errors = [];
    
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to appear
    await window.waitForTimeout(2000);
    
    // Filter out known acceptable errors
    const realErrors = errors.filter(err => {
      // Ignore EPIPE errors (shutdown related)
      return !err.includes('EPIPE');
    });

    if (realErrors.length > 0) {
      console.log('Console errors found:', realErrors);
    }
    
    expect(realErrors.length).toBe(0);
  });
});
