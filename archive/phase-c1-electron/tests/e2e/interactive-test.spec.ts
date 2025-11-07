/**
 * Interactive User Testing
 * Run with: npx playwright test --ui --headed tests/e2e/interactive-test.spec.ts
 */

import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import * as path from 'path';

test.describe('Interactive 20-Minute User Test', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    console.log('🚀 Launching BrainDump Voice Processor...');

    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    window = await electronApp.firstWindow();
    console.log('✅ App launched successfully');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('Interactive session - app stays open for user testing', async () => {
    // Keep test alive for 30 minutes to allow interactive testing
    test.setTimeout(30 * 60 * 1000); // 30 minutes

    console.log('📱 App is ready for testing!');
    console.log('');
    console.log('INSTRUCTIONS:');
    console.log('1. Look for the tray icon in your menu bar');
    console.log('2. Press Ctrl+Y to start recording');
    console.log('3. Speak into your microphone');
    console.log('4. Press Ctrl+Y again to stop');
    console.log('5. Click in a text field to test auto-fill');
    console.log('');
    console.log('The app will stay running. Test for as long as you want!');
    console.log('Press Ctrl+C in terminal to stop when done.');
    console.log('');

    // Log any console errors from the app
    window.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ APP ERROR:', msg.text());
      } else if (msg.type() === 'warning') {
        console.warn('⚠️  APP WARNING:', msg.text());
      } else if (msg.text().includes('Recording') || msg.text().includes('Transcription')) {
        console.log('📝', msg.text());
      }
    });

    // Monitor performance every 30 seconds
    let testStartTime = Date.now();
    const performanceInterval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;

      console.log(`⏱️  Session time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 30000);

    // Wait indefinitely for user testing
    await window.waitForTimeout(30 * 60 * 1000); // 30 minutes max

    clearInterval(performanceInterval);
  });
});
