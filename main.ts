/**
 * BrainDump Voice Processor - Main Application
 *
 * Refactored architecture using specialized managers:
 * - WindowManager: Window lifecycle and view management
 * - TrayManager: System tray icon with visual state feedback
 * - RecorderManager: Recorder process and recording control
 * - TranscriptionService: Audio transcription handling
 * - ShortcutManager: Global keyboard shortcuts
 * - IPCHandlers: IPC communication with renderer
 *
 * Phase B.2 Refactoring - Reduced from 435 lines to ~100 lines
 * Phase B.3 Enhancement - TrayManager integration (#33)
 */

import { app, BrowserWindow, clipboard, ipcMain } from 'electron';
import * as path from 'path';
import config from 'config';
import Database = require('./database');
import { WindowManager } from './src/js/managers/window_manager';
import { OverlayWindowManager } from './src/main/overlay-window-manager';
import { RecorderManager } from './src/js/managers/recorder_manager';
import { TranscriptionService } from './src/js/services/transcription_service';
import { ShortcutManager } from './src/js/managers/shortcut_manager';
import { IPCHandlers } from './src/js/ipc/handlers';
import { TrayManager } from './src/ui/tray_manager';
import { AutoFillManager } from './src/managers/autofill_manager';
import { AccessibilityService } from './src/services/accessibility_service';
import MetricsServer = require('./src/server/metrics_server');
import { errorHandler, ErrorLevel, initializeErrorTracking, captureError } from './src/js/error_handler';
import { ERROR_TYPES, CONTEXTS } from './src/config/constants';
import logger = require('./src/utils/logger');
import { createApplicationMenu, createMinimalMenu } from './src/ui/application_menu';

/**
 * Application class
 *
 * Orchestrates all managers and services using dependency injection.
 */
class Application {
  private baseDir: string;
  private db: Database | null = null;
  private windowManager: WindowManager | null = null;
  private overlayManager: OverlayWindowManager | null = null;
  private trayManager: TrayManager | null = null;
  private recorderManager: RecorderManager | null = null;
  private transcriptionService: TranscriptionService | null = null;
  private shortcutManager: ShortcutManager | null = null;
  private ipcHandlers: IPCHandlers | null = null;
  private metricsServer: MetricsServer | null = null;
  private autoFillManager: AutoFillManager | null = null;
  private accessibilityService: AccessibilityService | null = null;

  constructor() {
    // When running compiled code from dist/, go up one level to project root
    this.baseDir = path.join(__dirname, '..');
  }

  /**
   * Initialize the application.
   *
   * Creates all managers and wires dependencies.
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize error tracking first (Sentry)
      initializeErrorTracking();

      // Validate required configuration exists
      try {
        config.get('paths.audioDir');
        config.get('paths.transcriptDir');
        config.get('paths.databaseFile');
        config.get('shortcuts.toggleRecording');
        config.get('paths.pythonVenv');
        config.get('paths.recorderScript');
        config.get('paths.transcriberScript');
        errorHandler.notify(
          ErrorLevel.INFO,
          'Application.initialize',
          ERROR_TYPES.PROCESS_STARTING,
          `Configuration loaded successfully (environment: ${process.env.NODE_ENV || 'development'})`
        );
      } catch (err) {
        errorHandler.notify(
          ErrorLevel.CRITICAL,
          'Application.initialize',
          ERROR_TYPES.VALIDATION_ERROR,
          `Configuration validation failed: ${(err as Error).message}`
        );
        captureError(err as Error, {
          tags: { component: 'initialization' },
          extra: { context: 'config validation' },
          level: 'fatal'
        });
        app.quit();
        return;
      }

      // Initialize database
      this.db = new Database(this.baseDir);
      errorHandler.notify(
        ErrorLevel.INFO,
        'Application.initialize',
        ERROR_TYPES.DATABASE_CREATED,
        'Database initialized'
      );

      // Create window manager and main window
      this.windowManager = new WindowManager(this.baseDir);
      const mainWindow: BrowserWindow = this.windowManager.create();

      // Create overlay window manager (for floating overlay during recording)
      this.overlayManager = new OverlayWindowManager(this.baseDir);

      // Create tray manager
      this.trayManager = new TrayManager(this.windowManager);
      this.trayManager.create();
      errorHandler.notify(
        ErrorLevel.INFO,
        'Application.initialize',
        ERROR_TYPES.PROCESS_STARTING,
        'TrayManager initialized'
      );

      // Create transcription service
      this.transcriptionService = new TranscriptionService(mainWindow, this.baseDir);

      // Create recorder manager
      this.recorderManager = new RecorderManager(mainWindow, this.baseDir);

      // Wire recorder → transcription flow
      this.recorderManager.on('recordingComplete', (audioPath: unknown) => {
        this.handleRecordingComplete(audioPath as string);
      });

      // Wire recorder → tray state transitions
      this.wireRecorderEvents();

      // Start recorder process
      this.recorderManager.start();

      // Create shortcut manager (pass overlayManager instead of windowManager)
      this.shortcutManager = new ShortcutManager(this.recorderManager, this.overlayManager);
      this.shortcutManager.registerRecordingToggle();

      // Initialize auto-fill functionality (Phase C.1)
      try {
        // Create accessibility service
        this.accessibilityService = new AccessibilityService();

        // Create auto-fill manager with database dependency
        // Cast to 'any' because database.js is used at runtime (not TypeScript database.ts)
        this.autoFillManager = new AutoFillManager(this.db as any);

        // Start auto-fill (requires permissions)
        const hasPermissions = await this.accessibilityService.ensurePermissions();
        if (hasPermissions) {
          await this.autoFillManager.start();
          logger.info('AutoFillManager started successfully');
        } else {
          logger.warn('Accessibility permissions not granted - auto-fill disabled');
        }
      } catch (error) {
        logger.error('Failed to initialize auto-fill', { error });
        // Continue without auto-fill (graceful degradation)
      }

      // Register IPC handlers (pass auto-fill dependencies and shortcut manager for testing)
      this.ipcHandlers = new IPCHandlers(
        this.db,
        this.windowManager,
        this.autoFillManager || undefined,
        this.accessibilityService || undefined,
        this.shortcutManager
      );
      this.ipcHandlers.registerAll();

      // IPC handler for auto-fill - triggered when transcription completes
      // This just copies to clipboard as fallback
      ipcMain.on('auto-fill-transcript', (event, text: string) => {
        clipboard.writeText(text);
        logger.info('Transcript copied to clipboard', { length: text.length });
      });

      // IPC handler for triggering auto-paste after history refresh
      ipcMain.on('trigger-auto-paste', async () => {
        try {
          logger.info('History refreshed - attempting auto-paste');

          // Use auto-fill manager to paste into currently focused element
          if (this.autoFillManager) {
            const success = await this.autoFillManager.performManualFill();
            if (success) {
              logger.info('Auto-paste successful after history refresh');
            } else {
              logger.warn('Auto-paste skipped - no focused text field or blacklisted app');
            }
          } else {
            logger.warn('AutoFillManager not available - cannot auto-paste');
          }
        } catch (error) {
          logger.error('Auto-paste error', { error: (error as Error).message });
        }
      });

      // Start metrics server
      this.metricsServer = new MetricsServer();
      this.metricsServer.start();

      errorHandler.notify(
        ErrorLevel.INFO,
        'Application.initialize',
        ERROR_TYPES.PROCESS_STARTING,
        'Application initialized successfully'
      );

    } catch (error) {
      errorHandler.handleException('Application.initialize', error as Error, true);
    }
  }

  /**
   * Wire recorder manager events to tray state transitions
   *
   * Connects RecorderManager IPC events to TrayManager state changes.
   * Must be called after both managers are initialized.
   *
   * @private
   */
  private wireRecorderEvents(): void {
    if (!this.recorderManager || !this.trayManager) {
      errorHandler.notify(
        ErrorLevel.WARNING,
        'Application.wireRecorderEvents',
        ERROR_TYPES.VALIDATION_ERROR,
        'Cannot wire events: managers not initialized'
      );
      return;
    }

    // Listen to IPC events sent to main window
    const mainWindow = this.windowManager!.getWindow();
    if (!mainWindow) {
      errorHandler.notify(
        ErrorLevel.WARNING,
        'Application.wireRecorderEvents',
        ERROR_TYPES.VALIDATION_ERROR,
        'Cannot wire events: main window not available'
      );
      return;
    }

    // Recording started: idle → recording
    this.recorderManager!.on('recordingStarted', () => {
      console.log(`\n[EVENT] [${new Date().toISOString()}] Received recordingStarted event`);
      logger.debug('Recording started - updating tray and showing overlay');
      this.trayManager!.setState('recording');
      this.trayManager!.startRecordingAnimation();

      // Show overlay window in recording state
      console.log(`[EVENT] [${new Date().toISOString()}] Creating and showing overlay`);
      this.overlayManager!.createOverlay();
      this.overlayManager!.showOverlay();
      this.overlayManager!.setState('recording');
      console.log(`[EVENT] [${new Date().toISOString()}] Overlay set to recording state\n`);
    });

    // Recording stopped: recording → processing (transcribing)
    this.recorderManager!.on('recordingStopped', () => {
      console.log(`\n[EVENT] [${new Date().toISOString()}] Received recordingStopped event`);
      logger.debug('Recording stopped - updating tray and overlay');
      this.trayManager!.stopRecordingAnimation();
      this.trayManager!.setState('processing');

      // Switch overlay to result state (transcribing)
      console.log(`[EVENT] [${new Date().toISOString()}] Setting overlay to transcribing state\n`);
      this.overlayManager!.setState('result', { status: 'transcribing' });
    });

    // Recording error
    this.recorderManager!.on('recordingError', (error: unknown) => {
      console.log(`\n[EVENT] [${new Date().toISOString()}] Received recordingError event:`, error);
      logger.debug('Error detected - updating tray and hiding overlay', { error });
      this.trayManager!.stopRecordingAnimation();
      this.trayManager!.setState('error', 'Check app for details');

      // Hide overlay on error
      console.log(`[EVENT] [${new Date().toISOString()}] Hiding overlay due to error\n`);
      this.overlayManager!.hideOverlay();
    });

    logger.info('Recorder events wired to TrayManager');
  }

  /**
   * Handle recording completion.
   *
   * Initiates transcription when a recording is saved.
   *
   * @param audioPath - Path to saved audio file
   */
  private async handleRecordingComplete(audioPath: string): Promise<void> {
    try {
      console.log(`\n[EVENT] [${new Date().toISOString()}] Starting transcription for:`, audioPath);
      await this.transcriptionService!.transcribe(audioPath);

      // Transcription complete: processing → idle
      console.log(`\n[EVENT] [${new Date().toISOString()}] Transcription completed successfully`);
      logger.debug('Transcription complete - updating tray and showing result');
      this.trayManager!.setState('idle');

      // Show transcription result in overlay
      console.log(`[EVENT] [${new Date().toISOString()}] Setting overlay to complete state`);
      this.overlayManager!.setState('result', { status: 'complete', text: 'Transcription complete' });

      // Auto-hide overlay after 2 seconds
      console.log(`[EVENT] [${new Date().toISOString()}] Scheduling overlay hide in 2 seconds`);
      setTimeout(() => {
        console.log(`[EVENT] [${new Date().toISOString()}] Hiding overlay now\n`);
        this.overlayManager!.hideOverlay();
      }, 2000);
    } catch (error) {
      console.log(`\n[EVENT] [${new Date().toISOString()}] Transcription error:`, error);
      errorHandler.handleException('Application.handleRecordingComplete', error as Error);

      // Handle transcription error
      this.trayManager!.setState('error', 'Transcription failed');
      this.overlayManager!.hideOverlay();
    }
  }

  /**
   * Cleanup on application quit.
   */
  public async cleanup(): Promise<void> {
    try {
      // Unregister shortcuts
      if (this.shortcutManager) {
        this.shortcutManager.unregisterAll();
      }

      // Stop recorder process
      if (this.recorderManager) {
        this.recorderManager.stop(true);
      }

      // Stop auto-fill manager
      if (this.autoFillManager) {
        await this.autoFillManager.stop();
      }

      // Destroy accessibility service
      if (this.accessibilityService) {
        this.accessibilityService.destroy();
      }

      // Destroy overlay window
      if (this.overlayManager) {
        this.overlayManager.destroy();
      }

      // Destroy tray icon
      if (this.trayManager) {
        this.trayManager.destroy();
      }

      // Stop metrics server
      if (this.metricsServer) {
        this.metricsServer.stop();
      }

      errorHandler.notify(
        ErrorLevel.INFO,
        CONTEXTS.APP_WILL_QUIT,
        ERROR_TYPES.PROCESS_STOPPING,
        'Application cleanup complete'
      );

    } catch (error) {
      errorHandler.handleException(CONTEXTS.APP_WILL_QUIT, error as Error);
    }
  }
}

// ============================================================================
// Application Lifecycle
// ============================================================================

const application = new Application();

// Expose application instance globally for Playwright tests
if (process.env.NODE_ENV === 'test') {
  (global as any).__application__ = application;
}

app.whenReady().then(() => {
  logger.info('Application starting', {
    version: '2.1.0',
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    platform: process.platform,
    arch: process.arch
  });

  // Set up application menu (ensures copy/paste works in DevTools)
  // Use createMinimalMenu() if you want only the Edit menu
  createApplicationMenu();

  application.initialize();
});

app.on('before-quit', () => {
  console.log('[TRACE] forcing quit');
  const overlay = (application as any).overlayManager;
  if (overlay && overlay.exists()) {
    overlay.destroy();
  }
});

app.on('will-quit', () => {
  logger.info('Application shutting down');
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
  application.cleanup();
});

app.on('window-all-closed', () => {
  app.quit();
});

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error });
  captureError(error, {
    tags: { type: 'uncaughtException' },
    level: 'fatal'
  });
  app.quit();
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled rejection', { reason });
  captureError(new Error(String(reason)), {
    tags: { type: 'unhandledRejection' },
    extra: { promise: String(promise) }
  });
});
