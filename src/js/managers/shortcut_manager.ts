/**
 * Shortcut Manager
 *
 * Manages global keyboard shortcuts for the BrainDump Voice Processor.
 * Handles registration, unregistration, and toggle logic for recording shortcuts.
 *
 * Extracted from main.js lines 240-251 (registration) and 254-256 (cleanup)
 * as part of Phase B.2 architecture refactoring.
 */

import { globalShortcut } from 'electron';
import config from 'config';
import { errorHandler, ErrorLevel } from '../error_handler';
import {
  MESSAGES,
  ERROR_TYPES,
  CONTEXTS
} from '../../config/constants';

interface RecorderManagerInterface {
  isRecording: boolean;
  startRecording(): void;
  stopRecording(): void;
}

interface OverlayManagerInterface {
  createOverlay(): void;
  showOverlay(): void;
  setState(state: string, data?: any): void;
}

/**
 * ShortcutManager class
 *
 * Manages global keyboard shortcuts with dependency injection pattern.
 */
class ShortcutManager {
  private recorderManager: RecorderManagerInterface;
  private overlayManager: OverlayManagerInterface;
  private registeredShortcuts: Set<string> = new Set();
  private lastToggle: number = 0;

  /**
   * Create a ShortcutManager instance.
   *
   * @param recorderManager - RecorderManager instance for recording control
   * @param overlayManager - OverlayWindowManager instance for overlay visibility
   */
  constructor(recorderManager: RecorderManagerInterface, overlayManager: OverlayManagerInterface) {
    this.recorderManager = recorderManager;
    this.overlayManager = overlayManager;
  }

  /**
   * Register the recording toggle shortcut.
   *
   * @param accelerator - Keyboard shortcut (default: from config)
   * @returns True if registration succeeded, false otherwise
   */
  public registerRecordingToggle(accelerator?: string): boolean {
    const shortcut = accelerator || config.get<string>('shortcuts.toggleRecording');
    try {
      const ret = globalShortcut.register(shortcut, () => {
        this.handleRecordingToggle();
      });

      if (ret) {
        this.registeredShortcuts.add(shortcut);
        errorHandler.notify(
          ErrorLevel.INFO,
          CONTEXTS.PM_START,
          ERROR_TYPES.PROCESS_STARTING,
          `Shortcut registered: ${shortcut}`
        );
        return true;
      } else {
        errorHandler.notify(
          ErrorLevel.ERROR,
          CONTEXTS.PM_START,
          ERROR_TYPES.VALIDATION_ERROR,
          `${MESSAGES.SHORTCUT_REGISTRATION_FAILED}: ${shortcut}`
        );
        return false;
      }
    } catch (error) {
      errorHandler.handleException(CONTEXTS.PM_START, error as Error);
      return false;
    }
  }

  /**
   * Handle recording toggle action.
   *
   * Toggles between start and stop recording based on current state.
   * Shows overlay window when starting recording.
   *
   * Made public for test accessibility.
   */
  public handleRecordingToggle(): void {
    const timestamp = new Date().toISOString();
    console.log(`\n[STEP 1] [${timestamp}] ShortcutManager.handleRecordingToggle() CALLED`);

    // Debounce: prevent rapid toggles (1.5 second cooldown)
    const now = Date.now();
    if (now - this.lastToggle < 1500) {
      console.log(`[DEBOUNCE] [${timestamp}] Ignoring toggle - too soon (${now - this.lastToggle}ms since last toggle)`);
      return;
    }
    this.lastToggle = now;

    console.log(`[STEP 1] Current isRecording state: ${this.recorderManager.isRecording}`);

    try {
      if (!this.recorderManager.isRecording) {
        console.log(`[STEP 2] [${new Date().toISOString()}] BRANCH: Starting recording (isRecording=false)`);
        console.log(`[STEP 3] [${new Date().toISOString()}] Calling overlayManager.createOverlay()`);
        this.overlayManager.createOverlay();

        console.log(`[STEP 4] [${new Date().toISOString()}] Calling overlayManager.showOverlay()`);
        this.overlayManager.showOverlay();

        console.log(`[STEP 5] [${new Date().toISOString()}] Calling overlayManager.setState('recording')`);
        this.overlayManager.setState('recording');

        console.log(`[STEP 6] [${new Date().toISOString()}] Calling recorderManager.startRecording()`);
        const startResult = this.recorderManager.startRecording();
        console.log(`[STEP 7] [${new Date().toISOString()}] startRecording() returned: ${startResult}`);
        console.log(`[STEP 8] [${new Date().toISOString()}] After startRecording, isRecording=${this.recorderManager.isRecording}`);
      } else {
        console.log(`[STEP 2] [${new Date().toISOString()}] BRANCH: Stopping recording (isRecording=true)`);
        console.log(`[STEP 3] [${new Date().toISOString()}] Calling recorderManager.stopRecording()`);
        const stopResult = this.recorderManager.stopRecording();
        console.log(`[STEP 4] [${new Date().toISOString()}] stopRecording() returned: ${stopResult}`);
        console.log(`[STEP 5] [${new Date().toISOString()}] After stopRecording, isRecording=${this.recorderManager.isRecording}`);
      }
    } catch (error) {
      console.error(`[ERROR] [${new Date().toISOString()}] Exception in handleRecordingToggle:`, error);
      errorHandler.handleException('handleRecordingToggle', error as Error);
    }
    console.log(`[STEP END] [${new Date().toISOString()}] ShortcutManager.handleRecordingToggle() COMPLETE\n`);
  }

  /**
   * Unregister all registered shortcuts.
   *
   * Cleans up all global shortcuts on application exit.
   */
  public unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      this.registeredShortcuts.clear();
      errorHandler.notify(
        ErrorLevel.INFO,
        CONTEXTS.APP_WILL_QUIT,
        ERROR_TYPES.PROCESS_STOPPING,
        'All shortcuts unregistered'
      );
    } catch (error) {
      errorHandler.handleException(CONTEXTS.APP_WILL_QUIT, error as Error);
    }
  }

  /**
   * Check if a shortcut is registered.
   *
   * @param name - Shortcut accelerator name
   * @returns True if registered, false otherwise
   */
  public isRegistered(name: string): boolean {
    return this.registeredShortcuts.has(name);
  }
}

export { ShortcutManager };
