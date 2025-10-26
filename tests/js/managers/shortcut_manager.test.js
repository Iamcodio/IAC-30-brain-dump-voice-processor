/**
 * Tests for ShortcutManager
 *
 * Test coverage for global keyboard shortcut management.
 */

const { ShortcutManager } = require('../../../src/js/managers/shortcut_manager');

// Mock Electron
jest.mock('electron', () => ({
  globalShortcut: {
    register: jest.fn(),
    unregisterAll: jest.fn()
  }
}));

// Mock error handler
jest.mock('../../../src/js/error_handler', () => ({
  errorHandler: {
    notify: jest.fn(),
    handleException: jest.fn()
  },
  ErrorLevel: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
  }
}));

// Mock constants
jest.mock('../../../src/config/constants', () => ({
  SHORTCUTS: {
    TOGGLE_RECORDING: 'Control+Y'
  },
  MESSAGES: {
    SHORTCUT_REGISTRATION_FAILED: 'Shortcut registration failed'
  },
  ERROR_TYPES: {
    PROCESS_STARTING: 'ProcessStarting',
    VALIDATION_ERROR: 'ValidationError',
    PROCESS_STOPPING: 'ProcessStopping'
  },
  CONTEXTS: {
    PM_START: 'ProcessManager.start',
    APP_WILL_QUIT: 'app.will-quit'
  }
}));

const { globalShortcut } = require('electron');
const { errorHandler } = require('../../../src/js/error_handler');
const { SHORTCUTS, MESSAGES, ERROR_TYPES, CONTEXTS } = require('../../../src/config/constants');

describe('ShortcutManager', () => {
  let shortcutManager;
  let mockRecorderManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock RecorderManager
    mockRecorderManager = {
      isRecording: false,
      startRecording: jest.fn(),
      stopRecording: jest.fn()
    };

    // Create ShortcutManager instance
    shortcutManager = new ShortcutManager(mockRecorderManager);
  });

  describe('Constructor', () => {
    test('should initialize with RecorderManager', () => {
      expect(shortcutManager.recorderManager).toBe(mockRecorderManager);
    });

    test('should initialize empty registeredShortcuts Set', () => {
      expect(shortcutManager.registeredShortcuts).toBeInstanceOf(Set);
      expect(shortcutManager.registeredShortcuts.size).toBe(0);
    });

    test('should store RecorderManager reference', () => {
      expect(shortcutManager.recorderManager).toBeDefined();
      expect(shortcutManager.recorderManager.startRecording).toBeDefined();
      expect(shortcutManager.recorderManager.stopRecording).toBeDefined();
    });
  });

  describe('registerRecordingToggle', () => {
    test('should register shortcut successfully with default accelerator', () => {
      globalShortcut.register.mockReturnValue(true);

      const result = shortcutManager.registerRecordingToggle();

      expect(globalShortcut.register).toHaveBeenCalledWith(
        SHORTCUTS.TOGGLE_RECORDING,
        expect.any(Function)
      );
      expect(result).toBe(true);
    });

    test('should register shortcut with custom accelerator', () => {
      globalShortcut.register.mockReturnValue(true);

      const result = shortcutManager.registerRecordingToggle('Control+Shift+R');

      expect(globalShortcut.register).toHaveBeenCalledWith(
        'Control+Shift+R',
        expect.any(Function)
      );
      expect(result).toBe(true);
    });

    test('should add shortcut to registeredShortcuts Set', () => {
      globalShortcut.register.mockReturnValue(true);

      shortcutManager.registerRecordingToggle();

      expect(shortcutManager.registeredShortcuts.has(SHORTCUTS.TOGGLE_RECORDING)).toBe(true);
    });

    test('should call errorHandler.notify on registration success', () => {
      globalShortcut.register.mockReturnValue(true);

      shortcutManager.registerRecordingToggle();

      expect(errorHandler.notify).toHaveBeenCalledWith(
        'INFO',
        CONTEXTS.PM_START,
        ERROR_TYPES.PROCESS_STARTING,
        `Shortcut registered: ${SHORTCUTS.TOGGLE_RECORDING}`
      );
    });

    test('should handle registration failure gracefully', () => {
      globalShortcut.register.mockReturnValue(false);

      const result = shortcutManager.registerRecordingToggle();

      expect(result).toBe(false);
    });

    test('should call errorHandler.notify on registration failure', () => {
      globalShortcut.register.mockReturnValue(false);

      shortcutManager.registerRecordingToggle();

      expect(errorHandler.notify).toHaveBeenCalledWith(
        'ERROR',
        CONTEXTS.PM_START,
        ERROR_TYPES.VALIDATION_ERROR,
        `${MESSAGES.SHORTCUT_REGISTRATION_FAILED}: ${SHORTCUTS.TOGGLE_RECORDING}`
      );
    });

    test('should not add failed shortcut to Set', () => {
      globalShortcut.register.mockReturnValue(false);

      shortcutManager.registerRecordingToggle();

      expect(shortcutManager.registeredShortcuts.has(SHORTCUTS.TOGGLE_RECORDING)).toBe(false);
    });

    test('should handle exceptions during registration', () => {
      const error = new Error('Registration error');
      globalShortcut.register.mockImplementation(() => {
        throw error;
      });

      const result = shortcutManager.registerRecordingToggle();

      expect(result).toBe(false);
      expect(errorHandler.handleException).toHaveBeenCalledWith(CONTEXTS.PM_START, error);
    });
  });

  describe('handleRecordingToggle', () => {
    test('should call startRecording when not recording', () => {
      mockRecorderManager.isRecording = false;

      shortcutManager.handleRecordingToggle();

      expect(mockRecorderManager.startRecording).toHaveBeenCalled();
      expect(mockRecorderManager.stopRecording).not.toHaveBeenCalled();
    });

    test('should call stopRecording when recording', () => {
      mockRecorderManager.isRecording = true;

      shortcutManager.handleRecordingToggle();

      expect(mockRecorderManager.stopRecording).toHaveBeenCalled();
      expect(mockRecorderManager.startRecording).not.toHaveBeenCalled();
    });

    test('should handle errors from RecorderManager gracefully', () => {
      const error = new Error('Recording error');
      mockRecorderManager.isRecording = false;
      mockRecorderManager.startRecording.mockImplementation(() => {
        throw error;
      });

      shortcutManager.handleRecordingToggle();

      expect(errorHandler.handleException).toHaveBeenCalledWith('handleRecordingToggle', error);
    });

    test('should toggle correctly when called multiple times', () => {
      // Start not recording
      mockRecorderManager.isRecording = false;
      shortcutManager.handleRecordingToggle();
      expect(mockRecorderManager.startRecording).toHaveBeenCalledTimes(1);

      // Now recording
      mockRecorderManager.isRecording = true;
      shortcutManager.handleRecordingToggle();
      expect(mockRecorderManager.stopRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe('unregisterAll', () => {
    test('should unregister all shortcuts via globalShortcut.unregisterAll', () => {
      shortcutManager.unregisterAll();

      expect(globalShortcut.unregisterAll).toHaveBeenCalled();
    });

    test('should clear registeredShortcuts Set', () => {
      // Add some shortcuts first
      shortcutManager.registeredShortcuts.add('Control+Y');
      shortcutManager.registeredShortcuts.add('Control+Shift+R');

      shortcutManager.unregisterAll();

      expect(shortcutManager.registeredShortcuts.size).toBe(0);
    });

    test('should log unregistration action', () => {
      shortcutManager.unregisterAll();

      expect(errorHandler.notify).toHaveBeenCalledWith(
        'INFO',
        CONTEXTS.APP_WILL_QUIT,
        ERROR_TYPES.PROCESS_STOPPING,
        'All shortcuts unregistered'
      );
    });

    test('should handle errors during unregistration', () => {
      const error = new Error('Unregister error');
      globalShortcut.unregisterAll.mockImplementation(() => {
        throw error;
      });

      shortcutManager.unregisterAll();

      expect(errorHandler.handleException).toHaveBeenCalledWith(CONTEXTS.APP_WILL_QUIT, error);
    });

    test('should work when no shortcuts registered', () => {
      expect(shortcutManager.registeredShortcuts.size).toBe(0);

      shortcutManager.unregisterAll();

      expect(globalShortcut.unregisterAll).toHaveBeenCalled();
      expect(shortcutManager.registeredShortcuts.size).toBe(0);
    });
  });

  describe('isRegistered', () => {
    test('should return true for registered shortcuts', () => {
      shortcutManager.registeredShortcuts.add('Control+Y');

      expect(shortcutManager.isRegistered('Control+Y')).toBe(true);
    });

    test('should return false for unregistered shortcuts', () => {
      expect(shortcutManager.isRegistered('Control+Y')).toBe(false);
    });

    test('should work with empty Set', () => {
      expect(shortcutManager.registeredShortcuts.size).toBe(0);
      expect(shortcutManager.isRegistered('Control+Y')).toBe(false);
    });
  });

  describe('Integration', () => {
    test('should handle full registration and toggle workflow', () => {
      // Register shortcut
      globalShortcut.register.mockReturnValue(true);
      let registeredCallback;
      globalShortcut.register.mockImplementation((accelerator, callback) => {
        registeredCallback = callback;
        return true;
      });

      // Ensure unregisterAll mock doesn't throw
      globalShortcut.unregisterAll.mockImplementation(() => {});

      shortcutManager.registerRecordingToggle();

      // Verify registration
      expect(shortcutManager.isRegistered(SHORTCUTS.TOGGLE_RECORDING)).toBe(true);

      // Simulate shortcut press (start recording)
      mockRecorderManager.isRecording = false;
      registeredCallback();
      expect(mockRecorderManager.startRecording).toHaveBeenCalled();

      // Simulate shortcut press (stop recording)
      mockRecorderManager.isRecording = true;
      registeredCallback();
      expect(mockRecorderManager.stopRecording).toHaveBeenCalled();

      // Unregister all
      shortcutManager.unregisterAll();
      expect(shortcutManager.isRegistered(SHORTCUTS.TOGGLE_RECORDING)).toBe(false);
    });
  });
});
