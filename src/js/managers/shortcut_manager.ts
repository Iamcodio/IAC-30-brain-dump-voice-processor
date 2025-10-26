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

/**
 * ShortcutManager class
 *
 * Manages global keyboard shortcuts with dependency injection pattern.
 */
class ShortcutManager {
  private recorderManager: RecorderManagerInterface;
  private registeredShortcuts: Set<string> = new Set();

  /**
   * Create a ShortcutManager instance.
   *
   * @param recorderManager - RecorderManager instance for recording control
   */
  constructor(recorderManager: RecorderManagerInterface) {
    this.recorderManager = recorderManager;
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
   */
  private handleRecordingToggle(): void {
    try {
      if (!this.recorderManager.isRecording) {
        this.recorderManager.startRecording();
      } else {
        this.recorderManager.stopRecording();
      }
    } catch (error) {
      errorHandler.handleException('handleRecordingToggle', error as Error);
    }
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
