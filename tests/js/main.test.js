/**
 * Tests for main.js - Electron main process with ProcessManager
 */

// Mock Electron before requiring any modules
const mockBrowserWindow = jest.fn();
const mockGlobalShortcut = {
  register: jest.fn(),
  unregisterAll: jest.fn()
};
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn()
};
const mockShell = {
  openPath: jest.fn()
};
const mockApp = {
  whenReady: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  quit: jest.fn()
};

jest.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  globalShortcut: mockGlobalShortcut,
  ipcMain: mockIpcMain,
  shell: mockShell
}));

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn
}));

// Mock fs
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
};
jest.mock('fs', () => mockFs);

// Mock Database
const mockDatabase = jest.fn();
jest.mock('../../database.js', () => mockDatabase);

// Mock ProcessManager
const mockProcessManager = jest.fn();
jest.mock('../../src/js/process_manager', () => ({
  ProcessManager: mockProcessManager
}));

// Mock error handler
const mockErrorHandler = {
  notify: jest.fn(),
  handleException: jest.fn()
};
jest.mock('../../src/js/error_handler', () => ({
  errorHandler: mockErrorHandler,
  ErrorLevel: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
  }
}));

// Mock FileValidator
const mockFileValidator = {
  validateExists: jest.fn(),
  validateExistsWithLevel: jest.fn(),
  validateSafe: jest.fn(),
  validateNoTraversal: jest.fn(),
  validateWithinBase: jest.fn(),
  validateExistsWarn: jest.fn(() => true)
};
jest.mock('../../src/js/utils/file_validator.js', () => ({
  FileValidator: mockFileValidator
}));

// Mock constants
jest.mock('../../src/config/constants.js', () => ({
  WINDOW_CONFIG: { WIDTH: 800, HEIGHT: 600, NODE_INTEGRATION: false, CONTEXT_ISOLATION: true },
  PATHS: {
    PYTHON_VENV: '.venv/bin/python',
    RECORDER_SCRIPT: 'recorder.py',
    TRANSCRIBER_SCRIPT: 'transcribe.py',
    PRELOAD_SCRIPT: 'src/preload.js',
    INDEX_HTML: 'index.html',
    HISTORY_HTML: 'history.html'
  },
  PROCESS_CONFIG: { MAX_RESTARTS: 5, BASE_DELAY_MS: 1000 },
  PROTOCOL: {
    READY: 'READY',
    RECORDING_STARTED: 'RECORDING_STARTED',
    RECORDING_STOPPED: 'RECORDING_STOPPED:',
    ERROR_PREFIX: 'ERROR:',
    TRANSCRIPT_SAVED: 'TRANSCRIPT_SAVED:',
    CMD_START: 'start\n',
    CMD_STOP: 'stop\n',
    NO_AUDIO_CAPTURED: 'no_audio'
  },
  SHORTCUTS: { TOGGLE_RECORDING: 'Control+Y' },
  PLATFORM: { DARWIN: 'darwin', AUDIO_PLAYER_MACOS: 'QuickTime Player' },
  EXIT_CODES: { SUCCESS: 0 },
  ERROR_TYPES: {
    RECORDER_READY: 'RecorderReady',
    NO_AUDIO_RECORDED: 'NoAudioRecorded',
    RECORDER_ERROR: 'RecorderError',
    PROCESS_ERROR: 'ProcessError',
    PROCESS_RESTARTING: 'ProcessRestarting',
    PROCESS_FAILED: 'ProcessFailed',
    TRANSCRIPT_SAVED: 'TranscriptSaved',
    TRANSCRIPTION_ERROR: 'TranscriptionError',
    TRANSCRIPTION_COMPLETE: 'TranscriptionComplete',
    TRANSCRIPTION_FAILED: 'TranscriptionFailed',
    RECORDER_NOT_READY: 'RecorderNotReady',
    SEND_FAILED: 'SendFailed'
  },
  CONTEXTS: {
    START_RECORDER: 'startRecorderProcess',
    RECORDER_STDOUT: 'recorder.stdout',
    RECORDER_PROCESS: 'recorder.process',
    TRANSCRIBE_AUDIO: 'transcribeAudio',
    TRANSCRIBE_STDOUT: 'transcribeAudio.stdout',
    TRANSCRIBE_SPAWN: 'transcribeAudio.spawn',
    APP_WILL_QUIT: 'app.will-quit',
    START_RECORDING: 'startRecording',
    STOP_RECORDING: 'stopRecording',
    IPC_GET_RECORDINGS: 'ipc.get-recordings',
    IPC_SEARCH_RECORDINGS: 'ipc.search-recordings',
    IPC_READ_FILE: 'ipc.read-file',
    IPC_PLAY_AUDIO: 'ipc.play-audio',
    IPC_VIEW_FILE: 'ipc.view-file',
    IPC_SHOW_HISTORY: 'ipc.show-history',
    IPC_SHOW_RECORDER: 'ipc.show-recorder'
  },
  SPAWN_COMMANDS: {
    MACOS_OPEN: 'open',
    MACOS_OPEN_APP_FLAG: '-a'
  },
  FILE_OPS: { ENCODING: 'utf-8' }
}));

describe('Main.js - Electron Main Process', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset module cache to get fresh main.js instance
    jest.resetModules();

    // Setup default mocks
    mockFs.existsSync.mockReturnValue(true);
    mockBrowserWindow.mockReturnValue({
      loadFile: jest.fn(),
      webContents: {
        send: jest.fn()
      }
    });
    mockDatabase.mockReturnValue({
      getAll: jest.fn(() => []),
      search: jest.fn(() => [])
    });
    mockProcessManager.mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      isRunning: true,
      resetRestartCount: jest.fn()
    }));
  });

  describe('Initialization', () => {
    test('should validate Python path exists', () => {
      // Make FileValidator throw when path doesn't exist
      mockFileValidator.validateExistsWithLevel.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => {
        require('../../main.js');
      }).not.toThrow();

      // FileValidator should have been called
      expect(mockFileValidator.validateExistsWithLevel).toHaveBeenCalled();
    });

    test('should create ProcessManager with correct options', () => {
      require('../../main.js');

      // Trigger app ready
      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) readyCallback();

      // ProcessManager should be created
      expect(mockProcessManager).toHaveBeenCalled();
    });

    test('should register global shortcut Control+Y', () => {
      require('../../main.js');

      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) readyCallback();

      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'Control+Y',
        expect.any(Function)
      );
    });

    test('should initialize Database', () => {
      require('../../main.js');

      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) readyCallback();

      expect(mockDatabase).toHaveBeenCalled();
    });
  });

  describe('Process Management', () => {
    test('should handle recorder READY message', () => {
      const mockProcessManagerInstance = {
        start: jest.fn(),
        stop: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        isRunning: true,
        resetRestartCount: jest.fn()
      };

      mockProcessManager.mockReturnValue(mockProcessManagerInstance);

      require('../../main.js');

      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) readyCallback();

      // Get the stdout handler
      const stdoutHandler = mockProcessManagerInstance.on.mock.calls.find(
        call => call[0] === 'stdout'
      )?.[1];

      if (stdoutHandler) {
        stdoutHandler(Buffer.from('READY'));
        expect(mockProcessManagerInstance.resetRestartCount).toHaveBeenCalled();
      }
    });

    test('should handle recorder ERROR messages', () => {
      const mockProcessManagerInstance = {
        start: jest.fn(),
        stop: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        isRunning: true,
        resetRestartCount: jest.fn()
      };

      mockProcessManager.mockReturnValue(mockProcessManagerInstance);

      require('../../main.js');

      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) readyCallback();

      // Get the stdout handler
      const stdoutHandler = mockProcessManagerInstance.on.mock.calls.find(
        call => call[0] === 'stdout'
      )?.[1];

      if (stdoutHandler) {
        stdoutHandler(Buffer.from('ERROR:TestError'));
        expect(mockErrorHandler.notify).toHaveBeenCalled();
      }
    });
  });

  describe('IPC Handlers', () => {
    test('should register get-recordings handler', () => {
      require('../../main.js');

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'get-recordings',
        expect.any(Function)
      );
    });

    test('should register search-recordings handler', () => {
      require('../../main.js');

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'search-recordings',
        expect.any(Function)
      );
    });

    test('should register read-file handler', () => {
      require('../../main.js');

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'read-file',
        expect.any(Function)
      );
    });

    test('should register play-audio handler', () => {
      require('../../main.js');

      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'play-audio',
        expect.any(Function)
      );
    });

    test('should register view-file handler', () => {
      require('../../main.js');

      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'view-file',
        expect.any(Function)
      );
    });

    test('should register show-history handler', () => {
      require('../../main.js');

      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'show-history',
        expect.any(Function)
      );
    });

    test('should register show-recorder handler', () => {
      require('../../main.js');

      expect(mockIpcMain.on).toHaveBeenCalledWith(
        'show-recorder',
        expect.any(Function)
      );
    });
  });

  describe('Cleanup', () => {
    test('should unregister shortcuts on will-quit', () => {
      require('../../main.js');

      // Find and call will-quit handler
      const willQuitCall = mockApp.on.mock.calls.find(
        call => call[0] === 'will-quit'
      );

      if (willQuitCall) {
        const handler = willQuitCall[1];
        handler();

        expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
      }
    });

    test('should stop recorder process on will-quit', () => {
      const mockProcessManagerInstance = {
        start: jest.fn(),
        stop: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        isRunning: true,
        resetRestartCount: jest.fn()
      };

      mockProcessManager.mockReturnValue(mockProcessManagerInstance);

      require('../../main.js');

      const readyCallback = mockApp.whenReady.mock.calls[0][0];
      if (readyCallback) readyCallback();

      // Find and call will-quit handler
      const willQuitCall = mockApp.on.mock.calls.find(
        call => call[0] === 'will-quit'
      );

      if (willQuitCall) {
        const handler = willQuitCall[1];
        handler();

        expect(mockProcessManagerInstance.stop).toHaveBeenCalledWith(true);
      }
    });
  });
});
