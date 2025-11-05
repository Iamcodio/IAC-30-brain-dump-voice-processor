/**
 * TrayManager
 *
 * Manages the macOS menu bar (system tray) icon with visual state feedback
 * and quick access controls.
 *
 * Responsibilities:
 * - Display tray icon with 4 visual states (idle, recording, processing, error)
 * - Animate tray icon during recording (pulse effect)
 * - Provide context menu for window control and app quit
 * - Handle tray click to show/hide window
 * - Update tooltip based on current state
 *
 * Features:
 * - Automatic @2x retina icon selection
 * - Light/dark theme support via template images
 * - Smooth 500ms pulse animation during recording
 * - Sub-100ms state transition performance
 * - Graceful degradation on icon load failure
 *
 * Usage:
 *   const trayManager = new TrayManager(windowManager);
 *   trayManager.create();
 *   trayManager.setState('recording');
 *   trayManager.startRecordingAnimation();
 */

import { Tray, Menu, nativeImage, app, NativeImage } from 'electron';
import * as path from 'path';
import logger = require('../utils/logger');
import { WindowManager } from '../js/managers/window_manager';

/**
 * Visual states for the tray icon
 *
 * - idle: Gray microphone, ready to record
 * - recording: Red microphone, actively capturing audio
 * - processing: Blue microphone, transcribing with Whisper
 * - error: Yellow/red microphone, indicates failure
 */
export type TrayState = 'idle' | 'recording' | 'processing' | 'error';

/**
 * TrayManager class
 *
 * Manages the system tray icon lifecycle, state transitions, and animations.
 */
export class TrayManager {
  private tray: Tray | null = null;
  private currentState: TrayState = 'idle';
  private icons: Map<TrayState, NativeImage>;
  private animationInterval: NodeJS.Timeout | null = null;
  private windowManager: WindowManager;
  private animationToggle: boolean = false;

  /**
   * Initialize TrayManager with WindowManager dependency
   *
   * @param windowManager - Window manager instance for show/hide control
   */
  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
    this.icons = this.loadIcons();
    logger.info('TrayManager initialized', { iconsLoaded: this.icons.size });
  }

  /**
   * Load all tray icon assets into memory
   *
   * Electron automatically selects @2x variants on Retina displays.
   * Template images adapt to light/dark menu bar themes.
   *
   * @returns Map of state to NativeImage
   * @private
   */
  private loadIcons(): Map<TrayState, NativeImage> {
    const icons = new Map<TrayState, NativeImage>();
    const assetsDir = path.join(__dirname, '..', '..', 'assets', 'tray');

    const iconFiles: Record<TrayState, string> = {
      idle: 'tray-idle.png',
      recording: 'tray-recording.png',
      processing: 'tray-processing.png',
      error: 'tray-error.png'
    };

    for (const [state, filename] of Object.entries(iconFiles)) {
      try {
        const iconPath = path.join(assetsDir, filename);
        const image = nativeImage.createFromPath(iconPath);

        if (image.isEmpty()) {
          logger.warn(`Tray icon empty or not found: ${iconPath}`, { state });
          // Create a simple placeholder (empty image)
          icons.set(state as TrayState, nativeImage.createEmpty());
        } else {
          // Enable template mode for macOS light/dark theme adaptation
          image.setTemplateImage(true);
          icons.set(state as TrayState, image);
          logger.debug(`Loaded tray icon: ${filename}`, { state, path: iconPath });
        }
      } catch (error) {
        logger.error(`Failed to load tray icon: ${filename}`, {
          state,
          error: error instanceof Error ? error.message : String(error)
        });
        // Use empty image as fallback
        icons.set(state as TrayState, nativeImage.createEmpty());
      }
    }

    return icons;
  }

  /**
   * Create the system tray icon
   *
   * Initializes tray with idle state, sets up click handlers and context menu.
   * Must be called after app 'ready' event.
   *
   * @throws Error if tray creation fails
   */
  public create(): void {
    try {
      const idleIcon = this.icons.get('idle');
      if (!idleIcon) {
        throw new Error('Idle icon not loaded');
      }

      this.tray = new Tray(idleIcon);
      this.tray.setToolTip('BrainDump - Ready to record');

      // Click handler: show window
      this.tray.on('click', () => {
        this.handleTrayClick();
      });

      // Set initial context menu
      this.updateContextMenu();

      logger.info('Tray icon created successfully', {
        state: this.currentState,
        tooltip: 'BrainDump - Ready to record'
      });
    } catch (error) {
      logger.error('Failed to create tray icon', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Handle tray icon click
   *
   * Shows the main window if hidden, brings to front if already visible.
   *
   * @private
   */
  private handleTrayClick(): void {
    try {
      const window = this.windowManager.getWindow();
      if (!window || window.isDestroyed()) {
        logger.warn('Cannot show window: window not available');
        return;
      }

      if (window.isVisible()) {
        // Already visible, bring to front
        window.focus();
        logger.debug('Tray click: focused window');
      } else {
        // Hidden, show and focus
        window.show();
        window.focus();
        logger.debug('Tray click: showed window');
      }
    } catch (error) {
      logger.error('Error handling tray click', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Update tray state and visual appearance
   *
   * Changes icon, tooltip, and context menu to reflect new state.
   * Completes in <100ms for responsive feedback.
   *
   * @param state - New tray state
   * @param message - Optional custom status message
   */
  public setState(state: TrayState, message?: string): void {
    const startTime = Date.now();

    try {
      if (!this.tray || this.tray.isDestroyed()) {
        logger.warn('Cannot set tray state: tray not created or destroyed');
        return;
      }

      this.currentState = state;

      // Update icon
      const icon = this.icons.get(state);
      if (icon) {
        this.tray.setImage(icon);
      } else {
        logger.warn(`Icon not found for state: ${state}`);
      }

      // Update tooltip
      const tooltip = this.getTooltipForState(state, message);
      this.tray.setToolTip(tooltip);

      // Update context menu
      this.updateContextMenu();

      const elapsed = Date.now() - startTime;
      logger.info('Tray state updated', {
        state,
        message,
        tooltip,
        elapsedMs: elapsed
      });

      // Performance check: warn if >100ms
      if (elapsed > 100) {
        logger.warn('Tray state update slow', { elapsedMs: elapsed });
      }
    } catch (error) {
      logger.error('Failed to set tray state', {
        state,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get tooltip text for a given state
   *
   * @param state - Tray state
   * @param customMessage - Optional custom message
   * @returns Tooltip string
   * @private
   */
  private getTooltipForState(state: TrayState, customMessage?: string): string {
    if (customMessage) {
      return `BrainDump - ${customMessage}`;
    }

    const tooltips: Record<TrayState, string> = {
      idle: 'BrainDump - Ready to record',
      recording: 'BrainDump - Recording...',
      processing: 'BrainDump - Processing transcript...',
      error: 'BrainDump - Error (click for details)'
    };

    return tooltips[state];
  }

  /**
   * Start recording animation (pulse effect)
   *
   * Toggles between recording and idle icons every 500ms to create
   * visual pulse. Only runs if currentState is 'recording'.
   * Auto-stops if state changes.
   */
  public startRecordingAnimation(): void {
    try {
      // Stop any existing animation
      if (this.animationInterval) {
        this.stopRecordingAnimation();
      }

      // Only animate if in recording state
      if (this.currentState !== 'recording') {
        logger.warn('Cannot start recording animation: not in recording state', {
          currentState: this.currentState
        });
        return;
      }

      this.animationToggle = false;

      this.animationInterval = setInterval(() => {
        if (!this.tray || this.tray.isDestroyed()) {
          this.stopRecordingAnimation();
          return;
        }

        // Auto-stop if state changed
        if (this.currentState !== 'recording') {
          this.stopRecordingAnimation();
          return;
        }

        // Toggle between recording and idle icons
        this.animationToggle = !this.animationToggle;
        const icon = this.icons.get(this.animationToggle ? 'recording' : 'idle');

        if (icon) {
          this.tray.setImage(icon);
        }
      }, 500);

      logger.info('Recording animation started', { intervalMs: 500 });
    } catch (error) {
      logger.error('Failed to start recording animation', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Stop recording animation
   *
   * Clears animation interval and restores current state icon.
   */
  public stopRecordingAnimation(): void {
    try {
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
        this.animationToggle = false;

        // Restore current state icon
        if (this.tray && !this.tray.isDestroyed()) {
          const icon = this.icons.get(this.currentState);
          if (icon) {
            this.tray.setImage(icon);
          }
        }

        logger.info('Recording animation stopped');
      }
    } catch (error) {
      logger.error('Failed to stop recording animation', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Update context menu with current state
   *
   * Menu items:
   * - Status label (disabled, shows current state)
   * - Show Window
   * - Hide Window
   * - Quit BrainDump
   *
   * @private
   */
  private updateContextMenu(): void {
    try {
      if (!this.tray || this.tray.isDestroyed()) {
        return;
      }

      const window = this.windowManager.getWindow();
      const isWindowVisible = window && !window.isDestroyed() && window.isVisible();

      const menu = Menu.buildFromTemplate([
        {
          label: this.getStatusLabel(),
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Show Window',
          enabled: !isWindowVisible,
          click: () => {
            try {
              const win = this.windowManager.getWindow();
              if (win && !win.isDestroyed()) {
                win.show();
                win.focus();
                logger.debug('Window shown via context menu');
              }
            } catch (error) {
              logger.error('Error showing window from menu', {
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        },
        {
          label: 'Hide Window',
          enabled: isWindowVisible === true,
          click: () => {
            try {
              const win = this.windowManager.getWindow();
              if (win && !win.isDestroyed()) {
                win.hide();
                logger.debug('Window hidden via context menu');
              }
            } catch (error) {
              logger.error('Error hiding window from menu', {
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit BrainDump',
          click: () => {
            logger.info('Quit requested from tray menu');
            app.quit();
          }
        }
      ]);

      this.tray.setContextMenu(menu);
      logger.debug('Context menu updated', {
        state: this.currentState,
        windowVisible: isWindowVisible
      });
    } catch (error) {
      logger.error('Failed to update context menu', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get status label with Unicode dot indicator
   *
   * @returns Formatted status string
   * @private
   */
  private getStatusLabel(): string {
    const labels: Record<TrayState, string> = {
      idle: '● Idle - Ready to record',
      recording: '● Recording...',
      processing: '● Processing transcript...',
      error: '● Error - Check app'
    };

    return labels[this.currentState];
  }

  /**
   * Destroy tray and cleanup resources
   *
   * Stops animations, removes event listeners, and destroys tray instance.
   * Safe to call multiple times.
   */
  public destroy(): void {
    try {
      // Stop animation if running
      this.stopRecordingAnimation();

      // Destroy tray
      if (this.tray && !this.tray.isDestroyed()) {
        this.tray.destroy();
        logger.info('Tray icon destroyed');
      }

      // Clear references
      this.tray = null;
      this.currentState = 'idle';

      logger.info('TrayManager cleanup complete');
    } catch (error) {
      logger.error('Error during tray cleanup', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
