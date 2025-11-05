/**
 * OverlayWindowManager
 *
 * Manages the floating overlay window that appears during recording.
 * This is a SEPARATE window from the main window.
 *
 * Based on FLOATING_OVERLAY_IMPLEMENTATION.md specification.
 */

import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

type OverlayState = 'minimized' | 'recording' | 'result';

interface StateConfig {
  width: number;
  height: number;
}

export class OverlayWindowManager {
  private overlay: BrowserWindow | null = null;
  private baseDir: string;
  private currentState: OverlayState = 'minimized';

  private stateConfigs: Record<OverlayState, StateConfig> = {
    minimized: { width: 80, height: 80 },
    recording: { width: 300, height: 120 },
    result: { width: 400, height: 200 }
  };

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Create the overlay window (starts in minimized state)
   */
  createOverlay(): void {
    console.log('🔵 createOverlay() called');

    if (this.overlay) {
      console.log('✅ Overlay already exists, showing it');
      this.showOverlay();
      return;
    }

    try {
      console.log('🔵 Creating new overlay window...');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      console.log(`🔵 Screen dimensions: ${width}x${height}`);

      // Start with minimized dimensions
      const config = this.stateConfigs.minimized;

      this.overlay = new BrowserWindow({
        width: config.width,
        height: config.height,
        x: width - config.width - 20,  // 20px from right edge
        y: height - config.height - 20,  // 20px from bottom edge

        // CRITICAL: These settings make it float above ALL windows
        alwaysOnTop: true,
        frame: false,
        transparent: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        hasShadow: false,
        skipTaskbar: true,
        focusable: false,  // CRITICAL: Prevents overlay from stealing focus and breaking global shortcuts
        show: false,  // Start hidden, show explicitly

        // macOS specific
        vibrancy: 'under-window' as const,
        visualEffectState: 'active',

        webPreferences: {
          preload: path.join(this.baseDir, 'src', 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      console.log('✅ BrowserWindow created successfully');
      console.log(`🔵 Overlay ID: ${this.overlay.id}`);

      // CRITICAL: macOS combo for floating above all windows
      this.overlay.setAlwaysOnTop(true, 'floating', 1);
      this.overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.overlay.setFullScreenable(false);
      this.overlay.setHasShadow(false);

      // Try screen-saver level (higher than floating)
      try {
        this.overlay.setAlwaysOnTop(true, 'screen-saver', 1);
      } catch (e) {
        console.log('screen-saver level not available, using floating');
      }

      this.overlay.setIgnoreMouseEvents(true, { forward: true });
      console.log('✅ Window level settings applied');

      // CRITICAL: Explicitly show the overlay
      this.overlay.show();
      console.log('✅ Overlay window shown');

      // Load overlay HTML
      const overlayPath = path.join(this.baseDir, 'src', 'renderer', 'overlay.html');
      console.log(`🔵 Loading overlay HTML from: ${overlayPath}`);
      this.overlay.loadFile(overlayPath).then(() => {
        console.log('✅ Overlay HTML loaded successfully');
      }).catch((err) => {
        console.error('❌ Failed to load overlay HTML:', err);
      });

      this.overlay.on('closed', () => {
        console.log('🔵 Overlay window closed');
        this.overlay = null;
        this.currentState = 'minimized';
      });

      this.setupIPC();
      console.log('✅ Overlay creation complete');
    } catch (error) {
      console.error('❌ Error creating overlay:', error);
      throw error;
    }
  }

  /**
   * Setup IPC handlers for overlay communication
   */
  private setupIPC(): void {
    if (!this.overlay) return;

    // Resize overlay window from renderer
    ipcMain.on('resize-overlay', (event, width: number, height: number) => {
      if (this.overlay && !this.overlay.isDestroyed()) {
        const currentBounds = this.overlay.getBounds();
        this.overlay.setBounds({
          ...currentBounds,
          width,
          height
        });
      }
    });

    // Toggle recording from overlay
    ipcMain.on('toggle-recording', () => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('toggle-recording');
    });

    // Stop recording from overlay
    ipcMain.on('stop-recording-overlay', () => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('stop-recording');
    });

    // Audio data from recorder (for waveform)
    ipcMain.on('audio-data', (event, audioData: Uint8Array) => {
      this.overlay?.webContents.send('update-waveform', audioData);
    });

    // Transcription progress
    ipcMain.on('transcription-progress', (event, progress: number) => {
      this.overlay?.webContents.send('update-progress', progress);
    });

    // Stop button clicked
    ipcMain.on('overlay-stop', () => {
      this.hideOverlay();
      BrowserWindow.getAllWindows()[0]?.webContents.send('stop-recording');
    });

    // Cancel button clicked
    ipcMain.on('overlay-cancel', () => {
      this.hideOverlay();
      BrowserWindow.getAllWindows()[0]?.webContents.send('cancel-recording');
    });
  }

  /**
   * Show the overlay window
   */
  showOverlay(): void {
    if (this.overlay && !this.overlay.isDestroyed()) {
      this.overlay.show();
      this.overlay.focus();
      console.log('Overlay window shown and focused');
    }
  }

  /**
   * Hide the overlay window
   */
  hideOverlay(): void {
    if (this.overlay) {
      this.overlay.hide();
      console.log('Overlay window hidden');
    }
  }

  /**
   * Set overlay state and resize window accordingly
   */
  setState(state: OverlayState, data?: any): void {
    if (!this.overlay || this.overlay.isDestroyed()) {
      console.warn('Cannot set state: overlay does not exist');
      return;
    }

    this.currentState = state;
    const config = this.stateConfigs[state];

    // Resize window
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.overlay.setBounds({
      width: config.width,
      height: config.height,
      x: width - config.width - 20,  // 20px from right edge
      y: height - config.height - 20  // 20px from bottom edge
    });

    // Send state change to renderer
    this.overlay.webContents.send('overlay-state-change', state, data);

    console.log(`Overlay state changed to: ${state}`);
  }

  /**
   * Get current overlay state
   */
  getState(): OverlayState {
    return this.currentState;
  }

  /**
   * Set overlay mode (recording vs transcribing) - legacy method
   */
  setMode(mode: 'recording' | 'transcribing'): void {
    this.overlay?.webContents.send('set-mode', mode);
  }

  /**
   * Destroy the overlay window
   */
  destroy(): void {
    if (this.overlay && !this.overlay.isDestroyed()) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  /**
   * Check if overlay exists
   */
  exists(): boolean {
    return this.overlay !== null && !this.overlay.isDestroyed();
  }
}
