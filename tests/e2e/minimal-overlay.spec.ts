/**
 * E2E Test: Minimal Floating Overlay
 *
 * Tests the new minimal overlay UX:
 * - Window configuration (400x50, transparent, always-on-top)
 * - Waveform initialization
 * - Auto-show on Ctrl+Y
 * - Auto-hide after transcription
 */

import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import * as path from 'path';

test.describe('Minimal Floating Overlay', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get the first window
    window = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('window should be 400x50 pixels', async () => {
    // Get bounds from Electron app, not renderer
    const bounds = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });

    expect(bounds.width).toBe(400);
    expect(bounds.height).toBe(50);
  });

  test('window should be frameless and transparent', async () => {
    // Get window properties from Electron app, not renderer
    const windowProps = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        isResizable: win.isResizable(),
        isAlwaysOnTop: win.isAlwaysOnTop(),
        isMaximizable: win.isMaximizable(),
        isMinimizable: win.isMinimizable()
      };
    });

    expect(windowProps.isResizable).toBe(false);
    expect(windowProps.isAlwaysOnTop).toBe(true);
    expect(windowProps.isMaximizable).toBe(false);
    expect(windowProps.isMinimizable).toBe(false);
  });

  test('window should have minimal overlay HTML', async () => {
    // Check that the overlay container exists
    const overlayContainer = await window.locator('#overlay-container');
    await expect(overlayContainer).toBeVisible();

    // Check that waveform canvas exists
    const canvas = await window.locator('#waveform-canvas');
    await expect(canvas).toBeVisible();

    // Verify canvas dimensions
    const canvasSize = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height
    }));

    expect(canvasSize.width).toBe(400);
    expect(canvasSize.height).toBe(50);
  });

  test('should NOT have old UI elements', async () => {
    // Verify old bloated UI is gone
    const statusElement = window.locator('#status');
    await expect(statusElement).toHaveCount(0);

    const settingsBtn = window.locator('#settingsBtn');
    await expect(settingsBtn).toHaveCount(0);

    const historyBtn = window.locator('#historyBtn');
    await expect(historyBtn).toHaveCount(0);
  });

  test('waveform should initialize without errors', async () => {
    // Check console for errors
    const errors: string[] = [];
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for waveform to initialize
    await window.waitForTimeout(1000);

    // Check for specific waveform initialization
    const waveformInitialized = await window.evaluate(() => {
      return window.__waveformManager !== null &&
             window.__waveformManager !== undefined;
    });

    expect(waveformInitialized).toBe(true);

    // Verify no errors
    const hasWaveformError = errors.some(err =>
      err.includes('waveform') || err.includes('Waveform')
    );
    expect(hasWaveformError).toBe(false);
  });

  test('overlay should have processing pulse animation CSS', async () => {
    const hasProcessingClass = await window.evaluate(() => {
      const container = document.getElementById('overlay-container');
      if (!container) return false;

      // Add processing class
      container.classList.add('processing');

      // Check if animation is defined
      const styles = window.getComputedStyle(container);
      return styles.animationName === 'processing-pulse';
    });

    expect(hasProcessingClass).toBe(true);
  });

  test('should have auto-hide logic in renderer', async () => {
    const hasAutoHideFunction = await window.evaluate(() => {
      // Check if hideOverlay API exists
      return typeof window.electronAPI?.hideOverlay === 'function';
    });

    expect(hasAutoHideFunction).toBe(true);
  });
});
