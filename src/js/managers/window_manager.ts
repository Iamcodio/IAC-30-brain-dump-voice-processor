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

import { BrowserWindow } from 'electron';
import * as path from 'path';
import config from 'config';

class WindowManager {
  private window: BrowserWindow | null = null;
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Create the main application window
   *
   * @returns The created window instance
   * @throws Error If window creation fails
   */
  public create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: config.get<number>('window.width'),
      height: config.get<number>('window.height'),
      webPreferences: {
        preload: path.join(this.baseDir, config.get<string>('paths.preloadScript')),
        nodeIntegration: config.get<boolean>('window.nodeIntegration'),
        contextIsolation: config.get<boolean>('window.contextIsolation')
      }
    });

    this.loadRecorderView();
    return this.window;
  }

  /**
   * Load the recorder view (index.html)
   *
   * @throws Error If window not created
   */
  public loadRecorderView(): void {
    if (!this.isValid()) {
      throw new Error('Window not created');
    }
    this.window!.loadFile(path.join(this.baseDir, config.get<string>('paths.indexHtml')));
  }

  /**
   * Load the history view (history.html)
   *
   * @throws Error If window not created
   */
  public loadHistoryView(): void {
    if (!this.isValid()) {
      throw new Error('Window not created');
    }
    this.window!.loadFile(path.join(this.baseDir, config.get<string>('paths.historyHtml')));
  }

  /**
   * Get the current window instance
   *
   * @returns The window instance or null if not created
   */
  public getWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * Check if window is valid (exists and not destroyed)
   *
   * @returns True if window exists and is not destroyed
   */
  public isValid(): boolean {
    return !!(this.window && !this.window.isDestroyed());
  }

  /**
   * Destroy the window and cleanup
   */
  public destroy(): void {
    if (this.isValid()) {
      this.window!.destroy();
      this.window = null;
    }
  }
}

export { WindowManager };
