/**
 * IPC Handlers - Centralized Inter-Process Communication handlers
 *
 * Manages all IPC communication between Electron main process and renderer processes.
 * Organized by domain: recordings, files, navigation.
 *
 * @module IPCHandlers
 */

const { ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const config = require('config');
const { FileValidator } = require('../utils/file_validator');
const { errorHandler } = require('../error_handler');
const {
  FILE_OPS,
  PLATFORM,
  SPAWN_COMMANDS,
  ERROR_TYPES,
  CONTEXTS
} = require('../../config/constants');

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
  /**
   * Create IPCHandlers instance
   *
   * @param {Database} database - Database instance for recording queries
   * @param {WindowManager} windowManager - Window manager for navigation
   */
  constructor(database, windowManager) {
    this.database = database;
    this.windowManager = windowManager;
  }

  /**
   * Register all IPC handlers
   *
   * Registers handlers for recordings, files, and navigation.
   * Call this after database and window manager are initialized.
   *
   * @returns {void}
   * @example
   * handlers.registerAll();
   */
  registerAll() {
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
   * @returns {void}
   */
  registerRecordingHandlers() {
    /**
     * IPC Handler: get-recordings
     * Retrieves all recordings from the database
     *
     * @param {Electron.IpcMainInvokeEvent} event - IPC event
     * @returns {Promise<Array>} Array of recording objects or empty array on error
     */
    ipcMain.handle('get-recordings', async () => {
      try {
        if (!this.database) throw new Error('Database not initialized');
        return this.database.getAll();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_GET_RECORDINGS, error);
        return [];
      }
    });

    /**
     * IPC Handler: search-recordings
     * Searches recordings by query string
     *
     * @param {Electron.IpcMainInvokeEvent} event - IPC event
     * @param {string} query - Search query string
     * @returns {Promise<Array>} Matching recordings or empty array on error
     */
    ipcMain.handle('search-recordings', async (event, query) => {
      try {
        if (!this.database) throw new Error('Database not initialized');
        return this.database.search(query);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SEARCH_RECORDINGS, error);
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
   * @returns {void}
   */
  registerFileHandlers() {
    /**
     * IPC Handler: read-file
     * Reads file contents with security validation (no path traversal)
     *
     * @param {Electron.IpcMainInvokeEvent} event - IPC event
     * @param {string} filePath - Absolute path to file
     * @returns {Promise<string>} File contents as UTF-8 string
     * @throws {Error} If file doesn't exist or path is unsafe
     */
    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        FileValidator.validateSafe(filePath, CONTEXTS.IPC_READ_FILE);
        return fs.readFileSync(filePath, FILE_OPS.ENCODING);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_READ_FILE, error);
        throw error;
      }
    });

    /**
     * IPC Handler: play-audio
     * Opens audio file in system audio player
     * macOS: Opens in QuickTime Player
     * Other platforms: Uses default handler
     *
     * @param {Electron.IpcMainEvent} event - IPC event
     * @param {string} audioPath - Absolute path to audio file
     * @returns {void}
     */
    ipcMain.on('play-audio', (event, audioPath) => {
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
        errorHandler.handleException(CONTEXTS.IPC_PLAY_AUDIO, error);
      }
    });

    /**
     * IPC Handler: view-file
     * Opens file in default application
     *
     * @param {Electron.IpcMainEvent} event - IPC event
     * @param {string} filePath - Absolute path to file
     * @returns {void}
     */
    ipcMain.on('view-file', (event, filePath) => {
      try {
        try {
          FileValidator.validateExists(filePath, CONTEXTS.IPC_VIEW_FILE);
        } catch (error) {
          return;
        }
        shell.openPath(filePath);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_VIEW_FILE, error);
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
   * @returns {void}
   */
  registerNavigationHandlers() {
    /**
     * IPC Handler: show-history
     * Loads history view in main window
     *
     * @param {Electron.IpcMainEvent} event - IPC event
     * @returns {void}
     */
    ipcMain.on('show-history', () => {
      try {
        this.windowManager.loadHistoryView();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SHOW_HISTORY, error);
      }
    });

    /**
     * IPC Handler: show-recorder
     * Loads recorder view in main window
     *
     * @param {Electron.IpcMainEvent} event - IPC event
     * @returns {void}
     */
    ipcMain.on('show-recorder', () => {
      try {
        this.windowManager.loadRecorderView();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SHOW_RECORDER, error);
      }
    });
  }

  /**
   * Unregister all IPC handlers
   *
   * Cleanup method to remove all registered handlers.
   * Call this on application shutdown or before re-registering handlers.
   *
   * @returns {void}
   * @example
   * handlers.unregisterAll();
   */
  unregisterAll() {
    ipcMain.removeHandler('get-recordings');
    ipcMain.removeHandler('search-recordings');
    ipcMain.removeHandler('read-file');
    ipcMain.removeAllListeners('play-audio');
    ipcMain.removeAllListeners('view-file');
    ipcMain.removeAllListeners('show-history');
    ipcMain.removeAllListeners('show-recorder');
  }
}

module.exports = { IPCHandlers };
