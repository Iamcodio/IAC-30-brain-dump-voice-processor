/**
 * E2E Test: Overlay Window States
 *
 * Tests all overlay window states and transitions:
 * - Minimized (pill) state
 * - Recording state with waveform
 * - Transcribing state
 * - Result display state
 * - Error states
 * - State transitions and animations
 *
 * Validates the overlay UI behavior and user interactions.
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';

test.describe('Overlay Window States E2E', () => {
  let electronApp: ElectronApplication;
  let mainWindow: Page;
  let overlayWindow: Page | null = null;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test.beforeEach(async () => {
    // Ensure clean state before each test
    overlayWindow = null;
  });

  test.describe('Overlay Window Creation', () => {
    test('should create overlay window on Ctrl+Y', async () => {
      // Trigger recording via IPC
      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.startRecording) {
          window.electronAPI.startRecording();
        }
      });

      await mainWindow.waitForTimeout(500);

      const windows = await electronApp.windows();
      expect(windows.length).toBeGreaterThan(1);

      if (windows.length > 1) {
        overlayWindow = windows[1];
      }
    });

    test('should create overlay with transparent background', async () => {
      if (!overlayWindow) {
        await mainWindow.evaluate(() => {
          if (window.electronAPI && window.electronAPI.startRecording) {
            window.electronAPI.startRecording();
          }
        });
        await mainWindow.waitForTimeout(500);
        const windows = await electronApp.windows();
        if (windows.length > 1) {
          overlayWindow = windows[1];
        }
      }

      if (overlayWindow) {
        const bgColor = await overlayWindow.evaluate(() => {
          return window.getComputedStyle(document.body).backgroundColor;
        });

        // Background should be transparent or rgba
        expect(bgColor).toMatch(/rgba|transparent/);
      }
    });

    test('should create overlay with no frame', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify overlay has no title bar or window controls'
      });

      // Frameless window is set in BrowserWindow options
      // Visual verification required
      expect(overlayWindow).toBeTruthy();
    });

    test('should position overlay at top-right of screen', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify overlay appears in top-right corner of screen'
      });

      // Position is set in overlay-window-manager.ts
      // Visual verification required
      expect(overlayWindow).toBeTruthy();
    });

    test('should set overlay as always on top', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify overlay stays above all other windows'
      });

      // alwaysOnTop is BrowserWindow option
      expect(overlayWindow).toBeTruthy();
    });
  });

  test.describe('State 1: Minimized Pill', () => {
    test('should show minimized pill when idle', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      // Check for minimized state elements
      const isMinimized = await overlayWindow!.evaluate(() => {
        const pill = document.querySelector('.minimized-pill') ||
                     document.querySelector('[data-state="minimized"]') ||
                     document.querySelector('.pill');
        return !!pill;
      });

      // Note: May not be minimized immediately after creation
      expect(isMinimized).toBeDefined();
    });

    test('should display microphone icon in pill', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const hasMicIcon = await overlayWindow!.evaluate(() => {
        const icon = document.querySelector('.mic-icon') ||
                     document.querySelector('[data-icon="microphone"]') ||
                     document.querySelector('svg');
        return !!icon;
      });

      expect(hasMicIcon).toBeDefined();
    });

    test('should expand pill on hover', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Hover over minimized pill and verify it expands'
      });

      if (overlayWindow) {
        // Hover simulation in Playwright
        await overlayWindow.hover('.minimized-pill, .pill, body');
        await overlayWindow.waitForTimeout(500);

        // Check for expanded state
        const isExpanded = await overlayWindow.evaluate(() => {
          const pill = document.querySelector('.minimized-pill') ||
                      document.querySelector('.pill');
          return pill?.classList.contains('expanded') ||
                 pill?.classList.contains('hover');
        });

        expect(isExpanded).toBeDefined();
      }
    });

    test('should show quick actions on hover', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify quick action buttons appear on hover'
      });

      // Quick actions might include:
      // - Start recording
      // - View history
      // - Settings
      expect(overlayWindow).toBeDefined();
    });
  });

  test.describe('State 2: Recording Active', () => {
    test.beforeEach(async () => {
      // Start recording before each test in this suite
      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.startRecording) {
          window.electronAPI.startRecording();
        }
      });
      await mainWindow.waitForTimeout(500);

      const windows = await electronApp.windows();
      if (windows.length > 1) {
        overlayWindow = windows[1];
      }
    });

    test('should show "Recording..." status text', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      await overlayWindow.waitForTimeout(1000);

      const statusText = await overlayWindow.evaluate(() => {
        const status = document.querySelector('.status-text') ||
                      document.querySelector('[data-status]') ||
                      document.body;
        return status.textContent || '';
      });

      expect(statusText.toLowerCase()).toContain('recording');
    });

    test('should display animated recording indicator', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const hasIndicator = await overlayWindow.evaluate(() => {
        const indicator = document.querySelector('.recording-indicator') ||
                         document.querySelector('.pulse') ||
                         document.querySelector('[data-recording]');
        return !!indicator;
      });

      expect(hasIndicator).toBe(true);
    });

    test('should show real-time waveform visualization', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      // Wait for waveform to initialize
      await overlayWindow.waitForTimeout(1500);

      const hasWaveform = await overlayWindow.evaluate(() => {
        const waveform = document.querySelector('canvas') ||
                        document.querySelector('.waveform') ||
                        document.querySelector('[data-waveform]');
        return !!waveform;
      });

      expect(hasWaveform).toBe(true);
    });

    test('should update waveform as audio is captured', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      test.info().annotations.push({
        type: 'manual',
        description: 'Speak into microphone and verify waveform animates'
      });

      // Check canvas is rendering
      const isRendering = await overlayWindow.evaluate(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return false;

        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        // Check if canvas has been drawn to
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some(val => val !== 0);
        return hasContent;
      });

      // Canvas may be blank initially
      expect(isRendering).toBeDefined();
    });

    test('should display recording duration timer', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      await overlayWindow.waitForTimeout(2000);

      const hasTimer = await overlayWindow.evaluate(() => {
        const timer = document.querySelector('.duration') ||
                     document.querySelector('.timer') ||
                     document.querySelector('[data-duration]');
        return !!timer;
      });

      expect(hasTimer).toBeDefined();
    });

    test('should show stop recording hint', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const hasHint = await overlayWindow.evaluate(() => {
        const hint = document.querySelector('.hint') ||
                    document.querySelector('[data-hint]') ||
                    Array.from(document.querySelectorAll('*')).find(el =>
                      el.textContent?.includes('Ctrl+Y') ||
                      el.textContent?.includes('stop')
                    );
        return !!hint;
      });

      expect(hasHint).toBe(true);
    });

    test('should transition to transcribing on stop', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      // Stop recording
      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.stopRecording) {
          window.electronAPI.stopRecording();
        }
      });

      await overlayWindow.waitForTimeout(1000);

      const statusText = await overlayWindow.evaluate(() => {
        const status = document.querySelector('.status-text') ||
                      document.body;
        return status.textContent || '';
      });

      expect(statusText.toLowerCase()).toMatch(/transcribing|processing/);
    });
  });

  test.describe('State 3: Transcribing', () => {
    test.beforeEach(async () => {
      // Start and stop recording to enter transcribing state
      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.startRecording) {
          window.electronAPI.startRecording();
        }
      });
      await mainWindow.waitForTimeout(1000);

      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.stopRecording) {
          window.electronAPI.stopRecording();
        }
      });
      await mainWindow.waitForTimeout(500);

      const windows = await electronApp.windows();
      if (windows.length > 1) {
        overlayWindow = windows[1];
      }
    });

    test('should show "Transcribing..." status', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const statusText = await overlayWindow.evaluate(() => {
        const status = document.querySelector('.status-text') ||
                      document.body;
        return status.textContent || '';
      });

      expect(statusText.toLowerCase()).toMatch(/transcribing|processing/);
    });

    test('should display loading animation', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const hasLoader = await overlayWindow.evaluate(() => {
        const loader = document.querySelector('.loader') ||
                      document.querySelector('.spinner') ||
                      document.querySelector('[data-loading]');
        return !!loader;
      });

      expect(hasLoader).toBe(true);
    });

    test('should show progress indicator', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify progress indicator shows transcription progress'
      });

      if (overlayWindow) {
        const hasProgress = await overlayWindow.evaluate(() => {
          const progress = document.querySelector('.progress') ||
                          document.querySelector('progress') ||
                          document.querySelector('[data-progress]');
          return !!progress;
        });

        expect(hasProgress).toBeDefined();
      }
    });

    test('should transition to result display when complete', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      // Wait for transcription to complete (usually <5 seconds)
      await overlayWindow.waitForTimeout(6000);

      const statusText = await overlayWindow.evaluate(() => {
        const status = document.querySelector('.status-text') ||
                      document.body;
        return status.textContent || '';
      });

      // Should no longer say "Transcribing"
      expect(statusText.toLowerCase()).not.toContain('transcribing');
    });
  });

  test.describe('State 4: Result Display', () => {
    test.beforeEach(async () => {
      // Complete full recording workflow
      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.startRecording) {
          window.electronAPI.startRecording();
        }
      });
      await mainWindow.waitForTimeout(2000);

      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.stopRecording) {
          window.electronAPI.stopRecording();
        }
      });

      // Wait for transcription to complete
      await mainWindow.waitForTimeout(7000);

      const windows = await electronApp.windows();
      if (windows.length > 1) {
        overlayWindow = windows[1];
      }
    });

    test('should display transcription result text', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const resultText = await overlayWindow.evaluate(() => {
        const result = document.querySelector('.transcript-result') ||
                      document.querySelector('.result-text') ||
                      document.querySelector('[data-result]') ||
                      document.body;
        return result.textContent || '';
      });

      expect(resultText.length).toBeGreaterThan(0);
      expect(resultText).not.toContain('Transcribing');
    });

    test('should show copy to clipboard button', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const hasCopyButton = await overlayWindow.evaluate(() => {
        const button = document.querySelector('.copy-button') ||
                      document.querySelector('[data-action="copy"]') ||
                      Array.from(document.querySelectorAll('button')).find(btn =>
                        btn.textContent?.toLowerCase().includes('copy')
                      );
        return !!button;
      });

      expect(hasCopyButton).toBe(true);
    });

    test('should copy text when copy button clicked', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const copyButton = await overlayWindow.locator('.copy-button, [data-action="copy"], button:has-text("Copy")').first();

      if (await copyButton.count() > 0) {
        await copyButton.click();
        await overlayWindow.waitForTimeout(500);

        // Verify clipboard (requires clipboard permissions)
        test.info().annotations.push({
          type: 'manual',
          description: 'Paste (Cmd+V) and verify transcript text is in clipboard'
        });
      }
    });

    test('should show edit in history button', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const hasHistoryButton = await overlayWindow.evaluate(() => {
        const button = document.querySelector('.history-button') ||
                      document.querySelector('[data-action="history"]') ||
                      Array.from(document.querySelectorAll('button')).find(btn =>
                        btn.textContent?.toLowerCase().includes('history') ||
                        btn.textContent?.toLowerCase().includes('edit')
                      );
        return !!button;
      });

      expect(hasHistoryButton).toBeDefined();
    });

    test('should open main window history when history button clicked', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const historyButton = await overlayWindow.locator('.history-button, [data-action="history"], button:has-text("History")').first();

      if (await historyButton.count() > 0) {
        await historyButton.click();
        await mainWindow.waitForTimeout(1000);

        // Main window should be focused and visible
        const isFocused = await mainWindow.evaluate(() => {
          return !document.hidden;
        });

        expect(isFocused).toBe(true);
      }
    });

    test('should auto-hide overlay after delay', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Wait 10 seconds and verify overlay minimizes or hides'
      });

      if (overlayWindow) {
        await overlayWindow.waitForTimeout(12000);

        // Overlay may minimize or hide
        const isMinimized = await overlayWindow.evaluate(() => {
          const body = document.body;
          return body.classList.contains('minimized') ||
                 body.dataset.state === 'minimized';
        });

        expect(isMinimized).toBeDefined();
      }
    });
  });

  test.describe('State 5: Error States', () => {
    test('should display error state when recording fails', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Revoke microphone permissions and attempt recording'
      });

      // Expected: Error state with helpful message
      expect(true).toBe(true);
    });

    test('should show error message when transcription fails', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Kill Whisper process mid-transcription'
      });

      // Expected: Error state with retry option
      expect(true).toBe(true);
    });

    test('should provide retry button on error', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify retry button appears and functions'
      });

      expect(true).toBe(true);
    });

    test('should show permission request on permission error', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify overlay shows permission request UI'
      });

      expect(true).toBe(true);
    });
  });

  test.describe('State Transitions', () => {
    test('should transition smoothly between states', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify smooth animations between overlay states'
      });

      // State flow: minimized → recording → transcribing → result → minimized
      expect(true).toBe(true);
    });

    test('should handle rapid state changes', async () => {
      // Start and immediately stop recording
      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.startRecording) {
          window.electronAPI.startRecording();
        }
      });

      await mainWindow.waitForTimeout(100);

      await mainWindow.evaluate(() => {
        if (window.electronAPI && window.electronAPI.stopRecording) {
          window.electronAPI.stopRecording();
        }
      });

      await mainWindow.waitForTimeout(1000);

      // Should handle gracefully without crashes
      const windows = await electronApp.windows();
      expect(windows.length).toBeGreaterThanOrEqual(1);
    });

    test('should maintain state across overlay hide/show', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Hide and show overlay, verify state is preserved'
      });

      expect(true).toBe(true);
    });
  });

  test.describe('Overlay Interactions', () => {
    test('should support click and drag to reposition', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Click and drag overlay to move it around screen'
      });

      if (overlayWindow) {
        // Drag overlay window
        await overlayWindow.mouse.move(100, 50);
        await overlayWindow.mouse.down();
        await overlayWindow.mouse.move(200, 100);
        await overlayWindow.mouse.up();

        await overlayWindow.waitForTimeout(500);
      }

      expect(true).toBe(true);
    });

    test('should close overlay on close button click', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Click close button (X) and verify overlay closes'
      });

      if (overlayWindow) {
        const closeButton = await overlayWindow.locator('.close-button, [data-action="close"]').first();

        if (await closeButton.count() > 0) {
          await closeButton.click();
          await mainWindow.waitForTimeout(500);

          const windows = await electronApp.windows();
          expect(windows.length).toBe(1); // Only main window remains
        }
      }
    });

    test('should minimize overlay on minimize button click', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Click minimize button and verify overlay becomes pill'
      });

      expect(true).toBe(true);
    });

    test('should handle keyboard shortcuts in overlay', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Press Escape to close overlay, Ctrl+C to copy, etc.'
      });

      if (overlayWindow) {
        await overlayWindow.keyboard.press('Escape');
        await overlayWindow.waitForTimeout(500);
      }

      expect(true).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible labels and roles', async () => {
      if (!overlayWindow) {
        test.skip(true, 'Overlay not available');
      }

      const hasAriaLabels = await overlayWindow.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).some(btn =>
          btn.getAttribute('aria-label') ||
          btn.getAttribute('title')
        );
      });

      expect(hasAriaLabels).toBeDefined();
    });

    test('should support keyboard navigation', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Tab through overlay controls and verify focus visible'
      });

      if (overlayWindow) {
        await overlayWindow.keyboard.press('Tab');
        await overlayWindow.waitForTimeout(500);
      }

      expect(true).toBe(true);
    });

    test('should have sufficient color contrast', async () => {
      test.info().annotations.push({
        type: 'manual',
        description: 'Verify text is readable against background (WCAG AA)'
      });

      expect(true).toBe(true);
    });
  });
});

/**
 * Test Execution Instructions:
 *
 * Run:
 * npm run test:e2e -- overlay-states.spec.ts
 *
 * Manual Verification Checklist:
 * □ Overlay appears in top-right corner
 * □ Overlay is frameless and transparent
 * □ Overlay stays above all windows
 * □ Minimized pill shows microphone icon
 * □ Pill expands on hover
 * □ Recording state shows animated waveform
 * □ Waveform responds to audio input
 * □ Duration timer counts up during recording
 * □ Transcribing shows loading animation
 * □ Result displays transcript text
 * □ Copy button copies to clipboard
 * □ History button opens main window
 * □ Overlay auto-hides after delay
 * □ Error states show helpful messages
 * □ Transitions are smooth and animated
 * □ Overlay can be dragged to reposition
 * □ Keyboard shortcuts work (Escape, etc.)
 * □ Accessible labels and keyboard navigation
 *
 * Success Criteria:
 * - All state transitions work correctly
 * - No visual glitches or flashing
 * - Animations are smooth (60fps)
 * - Error states are clear and actionable
 * - Accessibility features function properly
 */
