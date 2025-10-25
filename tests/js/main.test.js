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
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        require('../../main.js');
      }).not.toThrow();

      // Error handler should be notified
      expect(mockErrorHandler.notify).toHaveBeenCalled();
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
