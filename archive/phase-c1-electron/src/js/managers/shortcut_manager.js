/**
 * Shortcut Manager
 *
 * Manages global keyboard shortcuts for the BrainDump Voice Processor.
 * Handles registration, unregistration, and toggle logic for recording shortcuts.
 *
 * Extracted from main.js lines 240-251 (registration) and 254-256 (cleanup)
 * as part of Phase B.2 architecture refactoring.
 */

const { globalShortcut } = require('electron');
const config = require('config');
const { errorHandler, ErrorLevel } = require('../error_handler');
const {
  MESSAGES,
  ERROR_TYPES,
  CONTEXTS
} = require('../../config/constants');

/**
 * ShortcutManager class
 *
 * Manages global keyboard shortcuts with dependency injection pattern.
 */
class ShortcutManager {
  /**
   * Create a ShortcutManager instance.
   *
   * @param {Object} recorderManager - RecorderManager instance for recording control
   */
  constructor(recorderManager) {
    this.recorderManager = recorderManager;
    this.registeredShortcuts = new Set();
  }

  /**
   * Register the recording toggle shortcut.
   *
   * @param {string} [accelerator] - Keyboard shortcut (default: from config)
   * @returns {boolean} True if registration succeeded, false otherwise
   */
  registerRecordingToggle(accelerator) {
    accelerator = accelerator || config.get('shortcuts.toggleRecording');
    try {
      const ret = globalShortcut.register(accelerator, () => {
        this.handleRecordingToggle();
      });

      if (ret) {
        this.registeredShortcuts.add(accelerator);
        errorHandler.notify(
          ErrorLevel.INFO,
          CONTEXTS.PM_START,
          ERROR_TYPES.PROCESS_STARTING,
          `Shortcut registered: ${accelerator}`
        );
        return true;
      } else {
        errorHandler.notify(
          ErrorLevel.ERROR,
          CONTEXTS.PM_START,
          ERROR_TYPES.VALIDATION_ERROR,
          `${MESSAGES.SHORTCUT_REGISTRATION_FAILED}: ${accelerator}`
        );
        return false;
      }
    } catch (error) {
      errorHandler.handleException(CONTEXTS.PM_START, error);
      return false;
    }
  }

  /**
   * Handle recording toggle action.
   *
   * Toggles between start and stop recording based on current state.
   */
  handleRecordingToggle() {
    try {
      if (!this.recorderManager.isRecording) {
        this.recorderManager.startRecording();
      } else {
        this.recorderManager.stopRecording();
      }
    } catch (error) {
      errorHandler.handleException('handleRecordingToggle', error);
    }
  }

  /**
   * Unregister all registered shortcuts.
   *
   * Cleans up all global shortcuts on application exit.
   */
  unregisterAll() {
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
      errorHandler.handleException(CONTEXTS.APP_WILL_QUIT, error);
    }
  }

  /**
   * Check if a shortcut is registered.
   *
   * @param {string} name - Shortcut accelerator name
   * @returns {boolean} True if registered, false otherwise
   */
  isRegistered(name) {
    return this.registeredShortcuts.has(name);
  }
}

module.exports = { ShortcutManager };
