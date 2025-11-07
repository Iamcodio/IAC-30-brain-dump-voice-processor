/**
 * TrayManager Integration Example
 *
 * This file demonstrates how to integrate TrayManager into main.ts
 * DO NOT RUN THIS FILE - it's a reference example only
 */

import { app, BrowserWindow } from 'electron';
import { WindowManager } from '../js/managers/window_manager';
import { TrayManager } from './tray_manager';
import { RecorderManager } from '../js/managers/recorder_manager';
import logger = require('../utils/logger');

// Global references (prevent garbage collection)
let windowManager: WindowManager;
let trayManager: TrayManager;
let recorderManager: RecorderManager;

/**
 * Initialize application after Electron ready event
 */
app.on('ready', async () => {
  try {
    logger.info('Application starting...');

    // 1. Create window manager
    windowManager = new WindowManager(__dirname);
    const mainWindow = windowManager.create();
    logger.info('Window manager initialized');

    // 2. Create tray manager (AFTER window is ready)
    trayManager = new TrayManager(windowManager);
    trayManager.create();
    logger.info('Tray manager initialized');

    // 3. Create recorder manager
    recorderManager = new RecorderManager(mainWindow, __dirname);
    recorderManager.start();
    logger.info('Recorder manager initialized');

    // 4. Connect recorder events to tray state updates
    setupTrayStateHandlers();

    logger.info('Application ready');
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    app.quit();
  }
});

/**
 * Connect RecorderManager events to TrayManager state updates
 */
function setupTrayStateHandlers(): void {
  // Recording started - show red icon with pulse animation
  recorderManager.on('recording-started', () => {
    logger.debug('Recording started - updating tray to recording state');
    trayManager.setState('recording');
    trayManager.startRecordingAnimation();
  });

  // Recording stopped - show processing state
  recorderManager.on('recording-stopped', (data: any) => {
    logger.debug('Recording stopped - updating tray to processing state', {
      audioFile: data?.audioPath
    });
    trayManager.stopRecordingAnimation();
    trayManager.setState('processing', 'Transcribing audio...');
  });

  // Transcription complete - back to idle
  recorderManager.on('transcription-complete', (data: any) => {
    logger.debug('Transcription complete - updating tray to idle state', {
      transcript: data?.transcriptPath
    });
    trayManager.setState('idle');
  });

  // Error occurred - show error state
  recorderManager.on('error', (error: any) => {
    logger.error('Recorder error - updating tray to error state', {
      error: error?.message
    });
    trayManager.stopRecordingAnimation(); // Stop animation if running
    trayManager.setState('error', 'Recording failed');

    // Auto-reset to idle after 5 seconds
    setTimeout(() => {
      logger.debug('Auto-resetting tray to idle state after error');
      trayManager.setState('idle');
    }, 5000);
  });

  // Recorder ready - ensure idle state
  recorderManager.on('ready', () => {
    logger.debug('Recorder ready - ensuring tray idle state');
    trayManager.setState('idle');
  });

  logger.info('Tray state handlers configured');
}

/**
 * Clean up on application quit
 */
app.on('before-quit', () => {
  logger.info('Application quitting - cleaning up resources');

  // Stop recorder
  if (recorderManager) {
    recorderManager.stop();
  }

  // Destroy tray
  if (trayManager) {
    trayManager.destroy();
  }

  // Destroy window
  if (windowManager) {
    windowManager.destroy();
  }

  logger.info('Cleanup complete');
});

/**
 * Handle all windows closed (macOS behavior)
 * On macOS, keep app running with tray icon
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  } else {
    logger.debug('All windows closed - app continues running in tray');
  }
});

/**
 * Reactivate app on macOS dock click
 */
app.on('activate', () => {
  if (windowManager && !windowManager.isValid()) {
    const mainWindow = windowManager.create();
    logger.info('Window recreated on activate');
  }
});

/**
 * Alternative: Manual state management example
 * If you need more control over state transitions
 */
function manualStateManagementExample(): void {
  // Custom recording workflow
  async function handleCustomRecording() {
    try {
      // Start recording
      trayManager.setState('recording', 'Recording started');
      trayManager.startRecordingAnimation();

      // Simulate recording duration
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Stop recording
      trayManager.stopRecordingAnimation();
      trayManager.setState('processing', 'Processing 5s audio...');

      // Simulate transcription
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete
      trayManager.setState('idle', 'Ready for next recording');

      logger.info('Custom recording workflow complete');
    } catch (error) {
      logger.error('Custom recording workflow failed', { error });
      trayManager.setState('error', 'Recording failed');

      // Auto-recover after 3 seconds
      setTimeout(() => trayManager.setState('idle'), 3000);
    }
  }

  // Trigger custom workflow
  handleCustomRecording();
}

/**
 * Example: Test all states in sequence
 */
async function testAllStates(): Promise<void> {
  logger.info('Testing all tray states...');

  // Idle
  trayManager.setState('idle');
  await delay(2000);

  // Recording with animation
  trayManager.setState('recording');
  trayManager.startRecordingAnimation();
  await delay(3000);

  // Processing
  trayManager.stopRecordingAnimation();
  trayManager.setState('processing', 'Transcribing 10s audio...');
  await delay(2000);

  // Error
  trayManager.setState('error', 'Test error state');
  await delay(2000);

  // Back to idle
  trayManager.setState('idle');

  logger.info('State test complete');
}

/**
 * Utility: Promise-based delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Example: Custom tooltip messages
 */
function customTooltipExample(): void {
  // Processing with time estimate
  trayManager.setState('processing', 'Transcribing 45s audio (est. 2s)...');

  // Recording with duration
  trayManager.setState('recording', 'Recording: 12s');

  // Error with specific issue
  trayManager.setState('error', 'Microphone not found');

  // Idle with status
  trayManager.setState('idle', '5 transcripts today');
}

// Export for documentation purposes
export {
  setupTrayStateHandlers,
  testAllStates,
  customTooltipExample
};
