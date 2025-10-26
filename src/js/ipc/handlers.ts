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

  /**
   * Create IPCHandlers instance
   *
   * @param database - Database instance for recording queries
   * @param windowManager - Window manager for navigation
   */
  constructor(database: DatabaseInterface, windowManager: WindowManagerInterface) {
    this.database = database;
    this.windowManager = windowManager;
  }

  /**
   * Register all IPC handlers
   *
   * Registers handlers for recordings, files, and navigation.
   * Call this after database and window manager are initialized.
   *
   * @example
   * handlers.registerAll();
   */
  public registerAll(): void {
    this.registerRecordingHandlers();
    this.registerFileHandlers();
    this.registerNavigationHandlers();
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
    ipcMain.removeHandler('get-recordings');
    ipcMain.removeHandler('search-recordings');
    ipcMain.removeHandler('read-file');
    ipcMain.removeAllListeners('play-audio');
    ipcMain.removeAllListeners('view-file');
    ipcMain.removeAllListeners('show-history');
    ipcMain.removeAllListeners('show-recorder');
  }
}

export { IPCHandlers };
