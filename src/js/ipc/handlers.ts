/**
 * IPC Handlers - Centralized Inter-Process Communication handlers
 *
 * Manages all IPC communication between Electron main process and renderer processes.
 * Organized by domain: recordings, files, navigation.
 *
 * @module IPCHandlers
 */

import { ipcMain, shell, IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import config from 'config';
import { FileValidator } from '../utils/file_validator';
import { errorHandler } from '../error_handler';
import {
  FILE_OPS,
  PLATFORM,
  SPAWN_COMMANDS,
  ERROR_TYPES,
  CONTEXTS
} from '../../config/constants';

interface DatabaseInterface {
  getAll(): unknown[];
  search(query: string): unknown[];
}

interface WindowManagerInterface {
  loadHistoryView(): void;
  loadRecorderView(): void;
  loadSettingsView(): void;
  show(): void;
  hide(): void;
}

interface AutoFillManagerInterface {
  updateSettings(settings: any): void;
  performManualFill(): Promise<boolean>;
}

interface AccessibilityServiceInterface {
  hasPermissions(): Promise<boolean>;
  requestPermissions(): Promise<void>;
  ensurePermissions(): Promise<boolean>;
}

interface ShortcutManagerInterface {
  registerRecordingToggle(accelerator?: string): boolean;
  unregisterAll(): void;
  isRegistered(name: string): boolean;
}

/**
 * IPCHandlers class - Manages all IPC handlers for the application
 *
 * Provides centralized registration and cleanup of IPC handlers grouped by domain.
 * All handlers include error handling and validation.
 *
 * @class
 * @example
 * const handlers = new IPCHandlers(database, windowManager);
 * handlers.registerAll();
 * // ... later ...
 * handlers.unregisterAll();
 */
class IPCHandlers {
  private database: DatabaseInterface;
  private windowManager: WindowManagerInterface;
  private autoFillManager?: AutoFillManagerInterface;
  private accessibilityService?: AccessibilityServiceInterface;
  private shortcutManager?: ShortcutManagerInterface;

  /**
   * Create IPCHandlers instance
   *
   * @param database - Database instance for recording queries
   * @param windowManager - Window manager for navigation
   * @param autoFillManager - Optional AutoFillManager instance
   * @param accessibilityService - Optional AccessibilityService instance
   * @param shortcutManager - Optional ShortcutManager instance (for testing)
   */
  constructor(
    database: DatabaseInterface,
    windowManager: WindowManagerInterface,
    autoFillManager?: AutoFillManagerInterface,
    accessibilityService?: AccessibilityServiceInterface,
    shortcutManager?: ShortcutManagerInterface
  ) {
    this.database = database;
    this.windowManager = windowManager;
    this.autoFillManager = autoFillManager;
    this.accessibilityService = accessibilityService;
    this.shortcutManager = shortcutManager;
  }

  /**
   * Register all IPC handlers
   *
   * Registers handlers for recordings, files, navigation, and auto-fill settings.
   * Call this after database and window manager are initialized.
   *
   * @example
   * handlers.registerAll();
   */
  public registerAll(): void {
    this.registerRecordingHandlers();
    this.registerFileHandlers();
    this.registerNavigationHandlers();
    this.registerAutoFillHandlers();

    // Register test handlers in test environment
    if (process.env.NODE_ENV === 'test') {
      this.registerTestHandlers();
    }
  }

  /**
   * Register recording-related IPC handlers
   *
   * Handlers:
   * - 'get-recordings': Retrieve all recordings from database
   * - 'search-recordings': Search recordings by query string
   *
   * @private
   */
  private registerRecordingHandlers(): void {
    /**
     * IPC Handler: get-recordings
     * Retrieves all recordings from the database
     *
     * @param event - IPC event
     * @returns Array of recording objects or empty array on error
     */
    ipcMain.handle('get-recordings', async (): Promise<unknown[]> => {
      try {
        if (!this.database) throw new Error('Database not initialized');
        return this.database.getAll();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_GET_RECORDINGS, error as Error);
        return [];
      }
    });

    /**
     * IPC Handler: search-recordings
     * Searches recordings by query string
     *
     * @param event - IPC event
     * @param query - Search query string
     * @returns Matching recordings or empty array on error
     */
    ipcMain.handle('search-recordings', async (event: IpcMainInvokeEvent, query: string): Promise<unknown[]> => {
      try {
        if (!this.database) throw new Error('Database not initialized');
        return this.database.search(query);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SEARCH_RECORDINGS, error as Error);
        return [];
      }
    });
  }

  /**
   * Register file operation IPC handlers
   *
   * Handlers:
   * - 'read-file': Read file contents (with security validation)
   * - 'play-audio': Open audio file in system player
   * - 'view-file': Open file in default application
   *
   * @private
   */
  private registerFileHandlers(): void {
    /**
     * IPC Handler: read-file
     * Reads file contents with security validation (no path traversal)
     *
     * @param event - IPC event
     * @param filePath - Absolute path to file
     * @returns File contents as UTF-8 string
     * @throws Error If file doesn't exist or path is unsafe
     */
    ipcMain.handle('read-file', async (event: IpcMainInvokeEvent, filePath: string): Promise<string> => {
      try {
        FileValidator.validateSafe(filePath, CONTEXTS.IPC_READ_FILE);
        return fs.readFileSync(filePath, FILE_OPS.ENCODING as BufferEncoding);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_READ_FILE, error as Error);
        throw error;
      }
    });

    /**
     * IPC Handler: play-audio
     * Opens audio file in system audio player
     * macOS: Opens in QuickTime Player
     * Other platforms: Uses default handler
     *
     * @param event - IPC event
     * @param audioPath - Absolute path to audio file
     */
    ipcMain.on('play-audio', (event: IpcMainEvent, audioPath: string): void => {
      try {
        try {
          FileValidator.validateExists(audioPath, CONTEXTS.IPC_PLAY_AUDIO);
        } catch (error) {
          return;
        }

        if (process.platform === PLATFORM.DARWIN) {
          spawn(SPAWN_COMMANDS.MACOS_OPEN, [SPAWN_COMMANDS.MACOS_OPEN_APP_FLAG, PLATFORM.AUDIO_PLAYER_MACOS, audioPath]);
        } else {
          shell.openPath(audioPath);
        }
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_PLAY_AUDIO, error as Error);
      }
    });

    /**
     * IPC Handler: view-file
     * Opens file in default application
     *
     * @param event - IPC event
     * @param filePath - Absolute path to file
     */
    ipcMain.on('view-file', (event: IpcMainEvent, filePath: string): void => {
      try {
        try {
          FileValidator.validateExists(filePath, CONTEXTS.IPC_VIEW_FILE);
        } catch (error) {
          return;
        }
        shell.openPath(filePath);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_VIEW_FILE, error as Error);
      }
    });
  }

  /**
   * Register navigation IPC handlers
   *
   * Handlers:
   * - 'show-history': Navigate to history view (history.html)
   * - 'show-recorder': Navigate to recorder view (index.html)
   * - 'show-settings': Navigate to settings view (settings.html)
   *
   * @private
   */
  private registerNavigationHandlers(): void {
    /**
     * IPC Handler: show-history
     * Loads history view in main window
     *
     * @param event - IPC event
     */
    ipcMain.on('show-history', (): void => {
      try {
        this.windowManager.loadHistoryView();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SHOW_HISTORY, error as Error);
      }
    });

    /**
     * IPC Handler: show-recorder
     * Loads recorder view in main window
     *
     * @param event - IPC event
     */
    ipcMain.on('show-recorder', (): void => {
      try {
        this.windowManager.loadRecorderView();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SHOW_RECORDER, error as Error);
      }
    });

    /**
     * IPC Handler: show-settings
     * Loads settings view in main window
     *
     * @param event - IPC event
     */
    ipcMain.on('show-settings', (): void => {
      try {
        this.windowManager.loadSettingsView();
      } catch (error) {
        errorHandler.handleException('IPC.showSettings', error as Error);
      }
    });

    /**
     * IPC Handler: hide-overlay
     * Hides the overlay window
     *
     * @param event - IPC event
     */
    ipcMain.on('hide-overlay', (): void => {
      try {
        this.windowManager.hide();
      } catch (error) {
        errorHandler.handleException('IPC.hideOverlay', error as Error);
      }
    });
  }

  /**
   * Register auto-fill settings IPC handlers
   *
   * Handlers:
   * - 'autofill-get-settings': Get current auto-fill settings
   * - 'autofill-update-settings': Update auto-fill settings
   * - 'autofill-manual-fill': Trigger manual auto-fill
   * - 'accessibility-check-permissions': Check accessibility permissions
   * - 'accessibility-request-permissions': Request accessibility permissions
   *
   * @private
   */
  private registerAutoFillHandlers(): void {
    /**
     * IPC Handler: autofill-get-settings
     * Retrieves current auto-fill settings from config
     *
     * @returns Current auto-fill settings object
     */
    ipcMain.handle('autofill-get-settings', async (): Promise<any> => {
      try {
        return {
          enabled: config.get<boolean>('autoFill.enabled'),
          requireManualTrigger: config.get<boolean>('autoFill.requireManualTrigger'),
          blacklistedApps: config.get<string[]>('autoFill.blacklistedApps')
        };
      } catch (error) {
        errorHandler.handleException('IPC.autoFillGetSettings', error as Error);
        return {
          enabled: true,
          requireManualTrigger: false,
          blacklistedApps: []
        };
      }
    });

    /**
     * IPC Handler: autofill-update-settings
     * Updates auto-fill settings and applies to AutoFillManager
     *
     * @param event - IPC event
     * @param newSettings - New settings object
     * @returns true if successful
     */
    ipcMain.handle('autofill-update-settings', async (event: IpcMainInvokeEvent, newSettings: any): Promise<boolean> => {
      try {
        // Update autoFillManager if available
        if (this.autoFillManager) {
          this.autoFillManager.updateSettings(newSettings);
        }
        return true;
      } catch (error) {
        errorHandler.handleException('IPC.autoFillUpdateSettings', error as Error);
        return false;
      }
    });

    /**
     * IPC Handler: autofill-manual-fill
     * Triggers manual auto-fill action
     *
     * @returns true if fill succeeded, false otherwise
     */
    ipcMain.handle('autofill-manual-fill', async (): Promise<boolean> => {
      try {
        if (this.autoFillManager) {
          return await this.autoFillManager.performManualFill();
        }
        return false;
      } catch (error) {
        errorHandler.handleException('IPC.autoFillManualFill', error as Error);
        return false;
      }
    });

    /**
     * IPC Handler: accessibility-check-permissions
     * Checks if accessibility permissions are granted
     *
     * @returns true if permissions granted, false otherwise
     */
    ipcMain.handle('accessibility-check-permissions', async (): Promise<boolean> => {
      try {
        if (this.accessibilityService) {
          return await this.accessibilityService.hasPermissions();
        }
        return false;
      } catch (error) {
        errorHandler.handleException('IPC.accessibilityCheckPermissions', error as Error);
        return false;
      }
    });

    /**
     * IPC Handler: accessibility-request-permissions
     * Requests accessibility permissions from the user
     */
    ipcMain.handle('accessibility-request-permissions', async (): Promise<void> => {
      try {
        if (this.accessibilityService) {
          await this.accessibilityService.requestPermissions();
        }
      } catch (error) {
        errorHandler.handleException('IPC.accessibilityRequestPermissions', error as Error);
      }
    });
  }

  /**
   * Register test-only IPC handlers
   *
   * These handlers are only available when NODE_ENV=test and allow
   * Playwright tests to programmatically trigger internal functions.
   *
   * @private
   */
  private registerTestHandlers(): void {
    console.log('🧪 Registering test IPC handlers');

    /**
     * IPC Handler: test-trigger-recording
     * Programmatically triggers the recording toggle (simulates Ctrl+Y)
     *
     * @returns {Promise<boolean>} True if triggered successfully
     */
    ipcMain.handle('test-trigger-recording', async (): Promise<boolean> => {
      try {
        console.log('🧪 test-trigger-recording called');
        if (!this.shortcutManager) {
          console.error('❌ ShortcutManager not available');
          return false;
        }

        // Access the private handleRecordingToggle through reflection
        // In a real scenario, ShortcutManager should expose a public test method
        const shortcutManager = this.shortcutManager as any;
        if (shortcutManager.handleRecordingToggle) {
          shortcutManager.handleRecordingToggle();
          return true;
        }

        console.error('❌ handleRecordingToggle not found');
        return false;
      } catch (error) {
        console.error('❌ Error in test-trigger-recording:', error);
        return false;
      }
    });
  }

  /**
   * Unregister all IPC handlers
   *
   * Cleanup method to remove all registered handlers.
   * Call this on application shutdown or before re-registering handlers.
   *
   * @example
   * handlers.unregisterAll();
   */
  public unregisterAll(): void {
    // Recording handlers
    ipcMain.removeHandler('get-recordings');
    ipcMain.removeHandler('search-recordings');

    // File handlers
    ipcMain.removeHandler('read-file');
    ipcMain.removeAllListeners('play-audio');
    ipcMain.removeAllListeners('view-file');

    // Navigation handlers
    ipcMain.removeAllListeners('show-history');
    ipcMain.removeAllListeners('show-recorder');
    ipcMain.removeAllListeners('show-settings');
    ipcMain.removeAllListeners('hide-overlay');

    // Auto-fill handlers
    ipcMain.removeHandler('autofill-get-settings');
    ipcMain.removeHandler('autofill-update-settings');
    ipcMain.removeHandler('autofill-manual-fill');
    ipcMain.removeHandler('accessibility-check-permissions');
    ipcMain.removeHandler('accessibility-request-permissions');

    // Test handlers (if registered)
    if (process.env.NODE_ENV === 'test') {
      ipcMain.removeHandler('test-trigger-recording');
    }
  }
}

export { IPCHandlers };
