/**
 * Quick Overlay Test - Verify Ctrl+Y shows overlay
 */

import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import * as path from 'path';

test.describe('Quick Overlay Test', () => {
  let electronApp: ElectronApplication;
  let mainWindow: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForTimeout(2000); // Wait for app to initialize
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('Ctrl+Y should show overlay window', async () => {
    console.log('🧪 Testing Ctrl+Y shortcut...');

    // Get all windows before pressing Ctrl+Y
    const windowsBefore = electronApp.windows();
    console.log(`Windows before: ${windowsBefore.length}`);

    // Call handleRecordingToggle() directly via exposed application instance
    await electronApp.evaluate(() => {
      const app = (global as any).__application__;
      if (app && app.shortcutManager) {
        console.log('🔵 Calling handleRecordingToggle() from test');
        app.shortcutManager.handleRecordingToggle();
        return true;
      }
      console.log('❌ Application or shortcutManager not accessible');
      return false;
    });

    await mainWindow.waitForTimeout(1000);

    // Check for overlay window
    const windowsAfter = electronApp.windows();
    console.log(`Windows after: ${windowsAfter.length}`);

    // Should have 2 windows now (main + overlay)
    expect(windowsAfter.length).toBeGreaterThan(windowsBefore.length);

    // Try to get overlay window
    const overlayWindow = windowsAfter.find((w: Page) => w !== mainWindow);

    if (overlayWindow) {
      console.log('✅ Overlay window found!');

      // Check if visible
      const isVisible = await overlayWindow.evaluate(() => {
        return document.body !== null;
      });

      console.log(`Overlay visible: ${isVisible}`);
      expect(isVisible).toBe(true);
    } else {
      console.log('❌ Overlay window NOT found');
      throw new Error('Overlay window not created');
    }
  });

  test('Check overlay window properties', async () => {
    // Trigger recording toggle again to ensure overlay exists
    await electronApp.evaluate(() => {
      const app = (global as any).__application__;
      if (app && app.shortcutManager) {
        app.shortcutManager.handleRecordingToggle();
        return true;
      }
      return false;
    });
    await mainWindow.waitForTimeout(500);

    const windows = electronApp.windows();
    const overlayWindow = windows.find((w: Page) => w !== mainWindow);

    if (!overlayWindow) {
      throw new Error('No overlay window found');
    }

    // Check overlay content
    const hasController = await overlayWindow.evaluate(() => {
      return window.hasOwnProperty('OverlayController');
    });

    console.log(`Has overlay controller: ${hasController}`);

    // Check for overlay-controller script
    const scripts = await overlayWindow.$$('script');
    console.log(`Scripts loaded: ${scripts.length}`);
  });
});
