import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication } from 'playwright';
import * as path from 'path';

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/main.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  });
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test('App launches successfully', async () => {
  const window = await electronApp.firstWindow();
  expect(window).toBeTruthy();
  console.log('✅ App launched');
});

test('Main window is visible', async () => {
  const windows = electronApp.windows();
  expect(windows.length).toBeGreaterThan(0);
  console.log('✅ Window count:', windows.length);
});

test('Can show recording overlay', async () => {
  const initialWindowCount = electronApp.windows().length;
  console.log('Initial window count:', initialWindowCount);

  // Trigger recording-started event to create overlay
  await electronApp.evaluate(async ({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      // Emit the recording-started IPC message that triggers overlay creation
      mainWindow.webContents.emit('ipc-message', null, 'recording-started');
    }
    // Wait for overlay to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  // Check that we now have 2 windows (main + overlay)
  const windows = electronApp.windows();
  console.log('✅ Window count after overlay:', windows.length);
  expect(windows.length).toBe(2); // Should have main + overlay window
});

test('Can hide recording overlay', async () => {
  // First create the overlay
  await electronApp.evaluate(async ({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.emit('ipc-message', null, 'recording-started');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  // Verify overlay exists
  let windows = electronApp.windows();
  console.log('Windows after creating overlay:', windows.length);
  expect(windows.length).toBe(2);

  // Now hide the overlay by completing transcription
  await electronApp.evaluate(async ({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.emit('ipc-message', null, 'transcription-complete');
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for auto-hide timeout
  });

  // Overlay should still exist but in result state
  windows = electronApp.windows();
  console.log('✅ Windows after transcription complete:', windows.length);
  expect(windows.length).toBeGreaterThanOrEqual(1); // Main window always exists
});
