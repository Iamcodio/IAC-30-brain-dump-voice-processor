/**
 * WindowManager
 *
 * Manages the main application window lifecycle, including creation,
 * configuration, view loading, and cleanup.
 *
 * Responsibilities:
 * - Create and configure BrowserWindow
 * - Load HTML views (index.html, history.html)
 * - Provide window instance to other managers
 * - Handle window lifecycle (destroy, isValid checks)
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const config = require('config');

class WindowManager {
  /**
   * Initialize WindowManager
   * Note: Does not create window immediately. Call create() to instantiate.
   */
  constructor() {
    this.window = null;
  }

  /**
   * Create the main application window
   *
   * @returns {BrowserWindow} The created window instance
   * @throws {Error} If window creation fails
   */
  create() {
    this.window = new BrowserWindow({
      width: config.get('window.width'),
      height: config.get('window.height'),
      webPreferences: {
        preload: path.join(__dirname, '..', '..', '..', config.get('paths.preloadScript')),
        nodeIntegration: config.get('window.nodeIntegration'),
        contextIsolation: config.get('window.contextIsolation')
      }
    });

    this.loadRecorderView();
    return this.window;
  }

  /**
   * Load the recorder view (index.html)
   *
   * @throws {Error} If window not created
   */
  loadRecorderView() {
    if (!this.isValid()) {
      throw new Error('Window not created');
    }
    this.window.loadFile(config.get('paths.indexHtml'));
  }

  /**
   * Load the history view (history.html)
   *
   * @throws {Error} If window not created
   */
  loadHistoryView() {
    if (!this.isValid()) {
      throw new Error('Window not created');
    }
    this.window.loadFile(config.get('paths.historyHtml'));
  }

  /**
   * Get the current window instance
   *
   * @returns {BrowserWindow|null} The window instance or null if not created
   */
  getWindow() {
    return this.window;
  }

  /**
   * Check if window is valid (exists and not destroyed)
   *
   * @returns {boolean} True if window exists and is not destroyed
   */
  isValid() {
    return !!(this.window && !this.window.isDestroyed());
  }

  /**
   * Destroy the window and cleanup
   */
  destroy() {
    if (this.isValid()) {
      this.window.destroy();
      this.window = null;
    }
  }
}

module.exports = { WindowManager };
