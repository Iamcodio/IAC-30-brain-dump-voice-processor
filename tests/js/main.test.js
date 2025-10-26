/**
 * Tests for main.js - Electron main process with ProcessManager
 */

// Mock config module FIRST
const mockConfigGet = jest.fn((key) => {
  const config = {
    'paths.audioDir': 'outputs/audio',
    'paths.transcriptDir': 'outputs/transcripts',
    'paths.databaseFile': 'src/data/recordings.json',
    'paths.pythonVenv': '.venv/bin/python',
    'paths.recorderScript': 'recorder.py',
    'paths.transcriberScript': 'transcribe.py',
    'paths.preloadScript': 'src/preload.js',
    'paths.indexHtml': 'index.html',
    'paths.historyHtml': 'history.html',
    'window.width': 800,
    'window.height': 600,
    'window.nodeIntegration': false,
    'window.contextIsolation': true,
    'shortcuts.toggleRecording': 'Control+Y',
    'logging.level': 'info',
    'sentry.enabled': false,
    'sentry.dsn': ''
  };
  if (config[key] === undefined) {
    throw new Error(`Configuration key "${key}" not found`);
  }
  return config[key];
});

jest.mock('config', () => ({
  get: mockConfigGet,
  has: jest.fn(() => true)
}));

// Mock logger module
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

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
let whenReadyResolve;
let whenReadyPromise = new Promise(resolve => {
  whenReadyResolve = resolve;
});

const mockApp = {
  whenReady: jest.fn(() => {
    // Return a promise that resolves immediately
    setImmediate(() => whenReadyResolve());
    return whenReadyPromise;
  }),
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

// Mock WindowManager
const mockWindowManager = jest.fn();
jest.mock('../../src/js/managers/window_manager', () => ({
  WindowManager: mockWindowManager
}));

// Mock RecorderManager
const mockRecorderManager = jest.fn();
jest.mock('../../src/js/managers/recorder_manager', () => ({
  RecorderManager: mockRecorderManager
}));

// Mock TranscriptionService
const mockTranscriptionService = jest.fn();
jest.mock('../../src/js/services/transcription_service', () => ({
  TranscriptionService: mockTranscriptionService
}));

// Mock ShortcutManager
const mockShortcutManager = jest.fn();
jest.mock('../../src/js/managers/shortcut_manager', () => ({
  ShortcutManager: mockShortcutManager
}));

// Mock IPCHandlers
const mockIPCHandlers = jest.fn();
jest.mock('../../src/js/ipc/handlers', () => ({
  IPCHandlers: mockIPCHandlers
}));

// Mock MetricsServer
const mockMetricsServer = jest.fn();
jest.mock('../../src/server/metrics_server', () => mockMetricsServer);

// Mock error handler
const mockErrorHandler = {
  notify: jest.fn(),
  handleException: jest.fn()
};
const mockInitializeErrorTracking = jest.fn();
const mockCaptureError = jest.fn();
jest.mock('../../src/js/error_handler', () => ({
  errorHandler: mockErrorHandler,
  initializeErrorTracking: mockInitializeErrorTracking,
  captureError: mockCaptureError,
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
  let mockWindow;

  beforeEach(() => {
    jest.clearAllMocks();

    // DON'T reset modules - mocks are defined at file level
    // jest.resetModules();

    // Setup default mocks
    mockFs.existsSync.mockReturnValue(true);
    mockWindow = {
      loadFile: jest.fn(),
      webContents: {
        send: jest.fn()
      }
    };
    mockBrowserWindow.mockReturnValue(mockWindow);
    mockDatabase.mockReturnValue({
      getAll: jest.fn(() => []),
      search: jest.fn(() => [])
    });

    // Store manager instances globally for access in tests
    mockWindow.windowManagerInstance = {
      create: jest.fn(() => mockWindow),
      getMainWindow: jest.fn(() => mockWindow),
      showHistory: jest.fn(),
      showRecorder: jest.fn()
    };

    mockWindow.recorderManagerInstance = {
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn(),
      on: jest.fn(),
      isRunning: true,
      resetRestartCount: jest.fn(),
      startRecording: jest.fn(),
      stopRecording: jest.fn()
    };

    mockWindow.transcriptionServiceInstance = {
      transcribe: jest.fn()
    };

    mockWindow.shortcutManagerInstance = {
      registerRecordingToggle: jest.fn(),
      unregisterAll: jest.fn()
    };

    mockWindow.ipcHandlersInstance = {
      registerAll: jest.fn()
    };

    mockWindow.metricsServerInstance = {
      start: jest.fn(),
      stop: jest.fn()
    };

    // Mock WindowManager
    mockWindowManager.mockImplementation(() => mockWindow.windowManagerInstance);

    // Mock RecorderManager
    mockRecorderManager.mockImplementation(() => mockWindow.recorderManagerInstance);

    // Mock TranscriptionService
    mockTranscriptionService.mockImplementation(() => mockWindow.transcriptionServiceInstance);

    // Mock ShortcutManager
    mockShortcutManager.mockImplementation(() => mockWindow.shortcutManagerInstance);

    // Mock IPCHandlers
    mockIPCHandlers.mockImplementation(() => mockWindow.ipcHandlersInstance);

    // Mock MetricsServer
    mockMetricsServer.mockImplementation(() => mockWindow.metricsServerInstance);
  });

  describe('Initialization', () => {
    test('should load main.js and register lifecycle handlers', () => {
      expect(() => {
        require('../../main.js');
      }).not.toThrow();

      // app.whenReady should be called
      expect(mockApp.whenReady).toHaveBeenCalled();

      // app.on should be called for will-quit and window-all-closed
      const appOnCalls = mockApp.on.mock.calls.map(call => call[0]);
      expect(appOnCalls).toContain('will-quit');
      expect(appOnCalls).toContain('window-all-closed');
    });
  });

  describe('Error Handling', () => {
    test('should register uncaught exception handler', () => {
      // process.on should have been called for uncaughtException
      const processOnCalls = process.listeners('uncaughtException');
      expect(processOnCalls.length).toBeGreaterThan(0);
    });

    test('should register unhandled rejection handler', () => {
      // process.on should have been called for unhandledRejection
      const processOnCalls = process.listeners('unhandledRejection');
      expect(processOnCalls.length).toBeGreaterThan(0);
    });
  });
});
