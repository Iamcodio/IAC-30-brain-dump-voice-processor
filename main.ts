/**
 * BrainDump Voice Processor - Main Application
 *
 * Refactored architecture using specialized managers:
 * - WindowManager: Window lifecycle and view management
 * - RecorderManager: Recorder process and recording control
 * - TranscriptionService: Audio transcription handling
 * - ShortcutManager: Global keyboard shortcuts
 * - IPCHandlers: IPC communication with renderer
 *
 * Phase B.2 Refactoring - Reduced from 435 lines to ~100 lines
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import config from 'config';
import Database = require('./database');
import { WindowManager } from './src/js/managers/window_manager';
import { RecorderManager } from './src/js/managers/recorder_manager';
import { TranscriptionService } from './src/js/services/transcription_service';
import { ShortcutManager } from './src/js/managers/shortcut_manager';
import { IPCHandlers } from './src/js/ipc/handlers';
import MetricsServer = require('./src/server/metrics_server');
import { errorHandler, ErrorLevel, initializeErrorTracking, captureError } from './src/js/error_handler';
import { ERROR_TYPES, CONTEXTS } from './src/config/constants';
import logger = require('./src/utils/logger');

/**
 * Application class
 *
 * Orchestrates all managers and services using dependency injection.
 */
class Application {
  private baseDir: string;
  private db: Database | null = null;
  private windowManager: WindowManager | null = null;
  private recorderManager: RecorderManager | null = null;
  private transcriptionService: TranscriptionService | null = null;
  private shortcutManager: ShortcutManager | null = null;
  private ipcHandlers: IPCHandlers | null = null;
  private metricsServer: MetricsServer | null = null;

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

      // Create transcription service
      this.transcriptionService = new TranscriptionService(mainWindow, this.baseDir);

      // Create recorder manager
      this.recorderManager = new RecorderManager(mainWindow, this.baseDir);

      // Wire recorder → transcription flow
      this.recorderManager.on('recordingComplete', (audioPath: unknown) => {
        this.handleRecordingComplete(audioPath as string);
      });

      // Start recorder process
      this.recorderManager.start();

      // Create shortcut manager
      this.shortcutManager = new ShortcutManager(this.recorderManager);
      this.shortcutManager.registerRecordingToggle();

      // Register IPC handlers
      this.ipcHandlers = new IPCHandlers(this.db, this.windowManager);
      this.ipcHandlers.registerAll();

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
   * Handle recording completion.
   *
   * Initiates transcription when a recording is saved.
   *
   * @param audioPath - Path to saved audio file
   */
  private async handleRecordingComplete(audioPath: string): Promise<void> {
    try {
      await this.transcriptionService!.transcribe(audioPath);
    } catch (error) {
      errorHandler.handleException('Application.handleRecordingComplete', error as Error);
    }
  }

  /**
   * Cleanup on application quit.
   */
  public cleanup(): void {
    try {
      // Unregister shortcuts
      if (this.shortcutManager) {
        this.shortcutManager.unregisterAll();
      }

      // Stop recorder process
      if (this.recorderManager) {
        this.recorderManager.stop(true);
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

app.whenReady().then(() => {
  logger.info('Application starting', {
    version: '2.1.0',
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    platform: process.platform,
    arch: process.arch
  });
  application.initialize();
});

app.on('will-quit', () => {
  logger.info('Application shutting down');
  application.cleanup();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
