/**
 * Tests for IPCHandlers class
 *
 * Tests all IPC handlers including error handling and edge cases.
 * Mocks Electron APIs, file system, and external dependencies.
 */

// Mock config module FIRST
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const config = {
      'paths.audioDir': 'outputs/audio',
      'paths.transcriptDir': 'outputs/transcripts',
      'platform.audioPlayerMacOS': 'QuickTime Player',
      'platform.darwin': 'darwin',
      'sentry.enabled': false,
      'sentry.dsn': '',
      'logging.level': 'info'
    };
    return config[key];
  }),
  has: jest.fn(() => true)
}));

// Mock logger module to avoid winston-daily-rotate-file issues
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock Electron (must be before imports)
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn()
  },
  shell: {
    openPath: jest.fn()
  }
}));

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn
}));

// Mock fs
const mockReadFileSync = jest.fn();
jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Mock FileValidator
const mockFileValidator = {
  validateSafe: jest.fn(),
  validateExists: jest.fn()
};
jest.mock('../../../src/js/utils/file_validator', () => ({
  FileValidator: mockFileValidator
}));

const { IPCHandlers } = require('../../../src/js/ipc/handlers');
const { errorHandler } = require('../../../src/js/error_handler');
const { ipcMain, shell } = require('electron');
const { spawn } = require('child_process');

// Mock errorHandler
jest.spyOn(errorHandler, 'handleException');

describe('IPCHandlers', () => {
  let handlers;
  let mockDatabase;
  let mockWindowManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock dependencies
    mockDatabase = {
      getAll: jest.fn(),
      search: jest.fn()
    };

    mockWindowManager = {
      loadHistoryView: jest.fn(),
      loadRecorderView: jest.fn()
    };

    // Create handlers instance
    handlers = new IPCHandlers(mockDatabase, mockWindowManager);

    // Reset platform
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true
    });
  });

  describe('constructor', () => {
    it('should store database and windowManager references', () => {
      expect(handlers.database).toBe(mockDatabase);
      expect(handlers.windowManager).toBe(mockWindowManager);
    });
  });

  describe('registerAll', () => {
    it('should register all handler groups', () => {
      handlers.registerAll();

      // Verify all handlers registered
      expect(ipcMain.handle).toHaveBeenCalledWith('get-recordings', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('search-recordings', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('read-file', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('play-audio', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('view-file', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('show-history', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('show-recorder', expect.any(Function));
    });
  });

  describe('registerRecordingHandlers', () => {
    describe('get-recordings handler', () => {
      let getRecordingsHandler;

      beforeEach(() => {
        handlers.registerRecordingHandlers();
        getRecordingsHandler = ipcMain.handle.mock.calls.find(
          call => call[0] === 'get-recordings'
        )[1];
      });

      it('should return all recordings from database', async () => {
        const recordings = [{ id: '1' }, { id: '2' }];
        mockDatabase.getAll.mockReturnValue(recordings);

        const result = await getRecordingsHandler();

        expect(result).toBe(recordings);
        expect(mockDatabase.getAll).toHaveBeenCalledTimes(1);
      });

      it('should return empty array if database not initialized', async () => {
        handlers.database = null;

        const result = await getRecordingsHandler();

        expect(result).toEqual([]);
        expect(errorHandler.handleException).toHaveBeenCalled();
      });

      it('should return empty array on database error', async () => {
        mockDatabase.getAll.mockImplementation(() => {
          throw new Error('Database error');
        });

        const result = await getRecordingsHandler();

        expect(result).toEqual([]);
        expect(errorHandler.handleException).toHaveBeenCalled();
      });
    });

    describe('search-recordings handler', () => {
      let searchRecordingsHandler;

      beforeEach(() => {
        handlers.registerRecordingHandlers();
        searchRecordingsHandler = ipcMain.handle.mock.calls.find(
          call => call[0] === 'search-recordings'
        )[1];
      });

      it('should search recordings with query', async () => {
        const query = 'test query';
        const results = [{ id: '1', text: 'test' }];
        mockDatabase.search.mockReturnValue(results);

        const result = await searchRecordingsHandler(null, query);

        expect(result).toBe(results);
        expect(mockDatabase.search).toHaveBeenCalledWith(query);
      });

      it('should return empty array if database not initialized', async () => {
        handlers.database = null;

        const result = await searchRecordingsHandler(null, 'query');

        expect(result).toEqual([]);
        expect(errorHandler.handleException).toHaveBeenCalled();
      });

      it('should return empty array on search error', async () => {
        mockDatabase.search.mockImplementation(() => {
          throw new Error('Search error');
        });

        const result = await searchRecordingsHandler(null, 'query');

        expect(result).toEqual([]);
        expect(errorHandler.handleException).toHaveBeenCalled();
      });
    });
  });

  describe('registerFileHandlers', () => {
    describe('read-file handler', () => {
      let readFileHandler;

      beforeEach(() => {
        handlers.registerFileHandlers();
        readFileHandler = ipcMain.handle.mock.calls.find(
          call => call[0] === 'read-file'
        )[1];
      });

      it('should read file contents with validation', async () => {
        const filePath = '/path/to/file.txt';
        const contents = 'file contents';
        mockReadFileSync.mockReturnValue(contents);

        const result = await readFileHandler(null, filePath);

        expect(mockFileValidator.validateSafe).toHaveBeenCalledWith(
          filePath,
          'ipc.read-file'
        );
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
        expect(result).toBe(contents);
      });

      it('should throw error if validation fails', async () => {
        const filePath = '/path/to/bad.txt';
        mockFileValidator.validateSafe.mockImplementation(() => {
          throw new Error('Validation error');
        });

        await expect(readFileHandler(null, filePath)).rejects.toThrow();
        expect(errorHandler.handleException).toHaveBeenCalled();
      });

      it('should throw error if readFileSync fails', async () => {
        const filePath = '/path/to/file.txt';
        mockReadFileSync.mockImplementation(() => {
          throw new Error('Read error');
        });

        await expect(readFileHandler(null, filePath)).rejects.toThrow();
        expect(errorHandler.handleException).toHaveBeenCalled();
      });
    });

    describe('play-audio handler', () => {
      let playAudioHandler;

      beforeEach(() => {
        handlers.registerFileHandlers();
        playAudioHandler = ipcMain.on.mock.calls.find(
          call => call[0] === 'play-audio'
        )[1];
      });

      it('should spawn QuickTime Player on macOS', () => {
        const audioPath = '/path/to/audio.wav';
        Object.defineProperty(process, 'platform', {
          value: 'darwin',
          configurable: true
        });

        playAudioHandler(null, audioPath);

        expect(mockFileValidator.validateExists).toHaveBeenCalledWith(
          audioPath,
          'ipc.play-audio'
        );
        expect(spawn).toHaveBeenCalledWith('open', ['-a', 'QuickTime Player', audioPath]);
      });

      it('should use shell.openPath on non-macOS platforms', () => {
        const audioPath = '/path/to/audio.wav';
        Object.defineProperty(process, 'platform', {
          value: 'linux',
          configurable: true
        });

        playAudioHandler(null, audioPath);

        expect(shell.openPath).toHaveBeenCalledWith(audioPath);
      });

      it('should return early if file validation fails', () => {
        const audioPath = '/path/to/missing.wav';
        mockFileValidator.validateExists.mockImplementation(() => {
          throw new Error('File not found');
        });

        playAudioHandler(null, audioPath);

        expect(spawn).not.toHaveBeenCalled();
        expect(shell.openPath).not.toHaveBeenCalled();
      });

      it('should handle spawn errors gracefully', () => {
        const audioPath = '/path/to/audio.wav';
        // Reset validateExists to not throw
        mockFileValidator.validateExists.mockImplementationOnce(() => {});
        // Make spawn throw
        spawn.mockImplementationOnce(() => {
          throw new Error('Spawn error');
        });

        playAudioHandler(null, audioPath);

        expect(errorHandler.handleException).toHaveBeenCalled();
      });
    });

    describe('view-file handler', () => {
      let viewFileHandler;

      beforeEach(() => {
        handlers.registerFileHandlers();
        viewFileHandler = ipcMain.on.mock.calls.find(
          call => call[0] === 'view-file'
        )[1];
      });

      it('should open file with shell.openPath', () => {
        const filePath = '/path/to/file.md';
        // Reset validateExists to not throw
        mockFileValidator.validateExists.mockImplementationOnce(() => {});
        shell.openPath.mockResolvedValueOnce('');

        viewFileHandler(null, filePath);

        expect(mockFileValidator.validateExists).toHaveBeenCalledWith(
          filePath,
          'ipc.view-file'
        );
        expect(shell.openPath).toHaveBeenCalledWith(filePath);
      });

      it('should return early if file validation fails', () => {
        const filePath = '/path/to/missing.md';
        mockFileValidator.validateExists.mockImplementationOnce(() => {
          throw new Error('File not found');
        });

        viewFileHandler(null, filePath);

        expect(shell.openPath).not.toHaveBeenCalled();
      });

      it('should handle shell.openPath errors gracefully', () => {
        const filePath = '/path/to/file.md';
        // Reset validateExists to not throw
        mockFileValidator.validateExists.mockImplementationOnce(() => {});
        shell.openPath.mockImplementationOnce(() => {
          throw new Error('Shell error');
        });

        viewFileHandler(null, filePath);

        expect(errorHandler.handleException).toHaveBeenCalled();
      });
    });
  });

  describe('registerNavigationHandlers', () => {
    describe('show-history handler', () => {
      let showHistoryHandler;

      beforeEach(() => {
        handlers.registerNavigationHandlers();
        showHistoryHandler = ipcMain.on.mock.calls.find(
          call => call[0] === 'show-history'
        )[1];
      });

      it('should load history view', () => {
        showHistoryHandler();

        expect(mockWindowManager.loadHistoryView).toHaveBeenCalledTimes(1);
      });

      it('should handle errors gracefully', () => {
        mockWindowManager.loadHistoryView.mockImplementation(() => {
          throw new Error('Window error');
        });

        showHistoryHandler();

        expect(errorHandler.handleException).toHaveBeenCalled();
      });
    });

    describe('show-recorder handler', () => {
      let showRecorderHandler;

      beforeEach(() => {
        handlers.registerNavigationHandlers();
        showRecorderHandler = ipcMain.on.mock.calls.find(
          call => call[0] === 'show-recorder'
        )[1];
      });

      it('should load recorder view', () => {
        showRecorderHandler();

        expect(mockWindowManager.loadRecorderView).toHaveBeenCalledTimes(1);
      });

      it('should handle errors gracefully', () => {
        mockWindowManager.loadRecorderView.mockImplementation(() => {
          throw new Error('Window error');
        });

        showRecorderHandler();

        expect(errorHandler.handleException).toHaveBeenCalled();
      });
    });
  });

  describe('unregisterAll', () => {
    it('should remove all handlers', () => {
      handlers.unregisterAll();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith('get-recordings');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('search-recordings');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('read-file');
      expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('play-audio');
      expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('view-file');
      expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('show-history');
      expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('show-recorder');
    });
  });
});
