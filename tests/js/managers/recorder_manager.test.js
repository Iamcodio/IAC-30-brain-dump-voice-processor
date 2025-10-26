/**
 * RecorderManager Tests
 *
 * Tests the RecorderManager class which manages recorder process lifecycle
 * and recording state control.
 */

// Mock config module FIRST
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const config = {
      'paths.pythonVenv': '.venv/bin/python',
      'paths.recorderScript': 'recorder.py',
      'process.maxRestarts': 5,
      'process.baseDelayMs': 1000,
      'process.gracefulShutdownTimeoutMs': 5000,
      'process.stdioMode': ['pipe', 'pipe', 'pipe'],
      'protocol.ready': 'READY',
      'protocol.recordingStarted': 'RECORDING_STARTED',
      'protocol.recordingStopped': 'RECORDING_STOPPED:',
      'protocol.errorPrefix': 'ERROR:',
      'protocol.cmdStart': 'start\n',
      'protocol.cmdStop': 'stop\n',
      'protocol.cmdQuit': 'quit\n',
      'protocol.noAudioCaptured': 'no_audio',
      'logging.level': 'info',
      'sentry.enabled': false,
      'sentry.dsn': ''
    };
    return config[key];
  }),
  has: jest.fn(() => true)
}));

// Mock logger module
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { RecorderManager } = require('../../../src/js/managers/recorder_manager');
const { ProcessManager } = require('../../../src/js/process_manager');
const { FileValidator } = require('../../../src/js/utils/file_validator');
const { errorHandler, ErrorLevel } = require('../../../src/js/error_handler');
const { PROTOCOL } = require('../../../src/config/constants');
const logger = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/js/process_manager');
jest.mock('../../../src/js/utils/file_validator');
jest.mock('../../../src/js/error_handler');

describe('RecorderManager', () => {
  let recorderManager;
  let mockMainWindow;
  let mockProcessManager;
  let baseDir;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock main window
    mockMainWindow = {
      webContents: {
        send: jest.fn()
      },
      isDestroyed: jest.fn().mockReturnValue(false)
    };

    baseDir = '/test/base/dir';

    // Mock ProcessManager instance
    mockProcessManager = {
      on: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn().mockReturnValue(true),
      resetRestartCount: jest.fn(),
      isRunning: true
    };

    ProcessManager.mockImplementation(() => mockProcessManager);

    // Mock FileValidator
    FileValidator.validateExistsWithLevel = jest.fn();

    // Mock errorHandler
    errorHandler.notify = jest.fn();
    errorHandler.handleException = jest.fn();

    // Create recorder manager
    recorderManager = new RecorderManager(mockMainWindow, baseDir);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(recorderManager.mainWindow).toBe(mockMainWindow);
      expect(recorderManager.baseDir).toBe(baseDir);
      expect(recorderManager.processManager).toBeNull();
      expect(recorderManager.isRecording).toBe(false);
      expect(recorderManager.eventHandlers).toEqual({});
    });
  });

  describe('start', () => {
    it('should validate Python and script paths', () => {
      recorderManager.start();

      expect(FileValidator.validateExistsWithLevel).toHaveBeenCalledTimes(2);
      expect(FileValidator.validateExistsWithLevel).toHaveBeenCalledWith(
        expect.stringContaining('.venv/bin/python'),
        'startRecorderProcess',
        ErrorLevel.CRITICAL
      );
      expect(FileValidator.validateExistsWithLevel).toHaveBeenCalledWith(
        expect.stringContaining('recorder.py'),
        'startRecorderProcess',
        ErrorLevel.CRITICAL
      );
    });

    it('should create ProcessManager with correct config', () => {
      recorderManager.start();

      expect(ProcessManager).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'recorder',
          command: expect.stringContaining('.venv/bin/python'),
          args: [expect.stringContaining('recorder.py')],
          cwd: baseDir,
          maxRestarts: 5,
          baseDelay: 1000
        })
      );
    });

    it('should attach all event handlers', () => {
      recorderManager.start();

      expect(mockProcessManager.on).toHaveBeenCalledWith('stdout', expect.any(Function));
      expect(mockProcessManager.on).toHaveBeenCalledWith('stderr', expect.any(Function));
      expect(mockProcessManager.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockProcessManager.on).toHaveBeenCalledWith('restarting', expect.any(Function));
      expect(mockProcessManager.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should start the process', () => {
      recorderManager.start();

      expect(mockProcessManager.start).toHaveBeenCalled();
    });
  });

  describe('handleStdout', () => {
    beforeEach(() => {
      recorderManager.processManager = mockProcessManager;
    });

    it('should handle READY message', () => {
      const data = Buffer.from('READY');
      recorderManager.handleStdout(data);

      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.INFO,
        'recorder.stdout',
        'RecorderReady',
        'Recorder process ready'
      );
      expect(mockProcessManager.resetRestartCount).toHaveBeenCalled();
    });

    it('should handle RECORDING_STARTED message', () => {
      const data = Buffer.from('RECORDING_STARTED');
      recorderManager.handleStdout(data);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recording-started');
    });

    it('should handle RECORDING_STOPPED with filename', () => {
      const filename = 'outputs/audio/recording_2025-10-25_12-00-00.wav';
      const data = Buffer.from(`RECORDING_STOPPED:${filename}`);

      // Spy on emit
      const emitSpy = jest.spyOn(recorderManager, 'emit');

      recorderManager.handleStdout(data);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recording-stopped');
      expect(emitSpy).toHaveBeenCalledWith('recordingComplete', filename);
    });

    it('should handle RECORDING_STOPPED without filename', () => {
      const data = Buffer.from('RECORDING_STOPPED:no_audio');
      recorderManager.handleStdout(data);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recording-stopped');
      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.WARNING,
        'recorder.stdout',
        'NoAudioRecorded',
        'No audio captured'
      );
    });

    it('should handle ERROR message', () => {
      const errorMsg = 'ERROR: Microphone not available';
      const data = Buffer.from(errorMsg);

      recorderManager.handleStdout(data);

      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'recorder.stdout',
        'RecorderError',
        errorMsg
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recording-error', errorMsg);
    });

    it('should handle exceptions in stdout handler', () => {
      // Make notifyUI throw an error
      mockMainWindow.webContents.send.mockImplementation(() => {
        throw new Error('Test error');
      });

      const data = Buffer.from('RECORDING_STARTED');
      recorderManager.handleStdout(data);

      expect(errorHandler.handleException).toHaveBeenCalledWith(
        'RecorderManager.handleStdout',
        expect.any(Error)
      );
    });
  });

  describe('handleStderr', () => {
    it('should log stderr output', () => {
      const data = Buffer.from('Some stderr output');

      recorderManager.handleStderr(data);

      expect(logger.error).toHaveBeenCalledWith('Recorder stderr', { stderr: 'Some stderr output' });
    });
  });

  describe('handleError', () => {
    it('should notify error handler and UI', () => {
      const error = new Error('Process error');
      recorderManager.handleError(error);

      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'recorder.process',
        'ProcessError',
        'Recorder process error: Process error'
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recorder-error', 'Process error');
    });
  });

  describe('handleRestarting', () => {
    it('should notify error handler and UI with restart info', () => {
      const count = 2;
      const delay = 2000;

      recorderManager.handleRestarting(count, delay);

      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.WARNING,
        'recorder.process',
        'ProcessRestarting',
        'Recorder restarting (attempt 2/5) in 2000ms'
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recorder-restarting', { count, delay });
    });
  });

  describe('handleFailed', () => {
    it('should notify critical error and UI', () => {
      recorderManager.handleFailed();

      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.CRITICAL,
        'recorder.process',
        'ProcessFailed',
        'Recorder failed after maximum restart attempts'
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recorder-failed');
    });
  });

  describe('startRecording', () => {
    beforeEach(() => {
      recorderManager.processManager = mockProcessManager;
    });

    it('should send start command and return true on success', () => {
      const result = recorderManager.startRecording();

      expect(recorderManager.isRecording).toBe(true);
      expect(mockProcessManager.send).toHaveBeenCalledWith('start\n');
      expect(result).toBe(true);
    });

    it('should return false if process not running', () => {
      mockProcessManager.isRunning = false;

      const result = recorderManager.startRecording();

      expect(result).toBe(false);
      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'startRecording',
        'RecorderNotReady',
        'Recorder process not running'
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recording-error', 'Recorder not ready');
    });

    it('should return false if processManager is null', () => {
      recorderManager.processManager = null;

      const result = recorderManager.startRecording();

      expect(result).toBe(false);
    });

    it('should reset isRecording if send fails', () => {
      mockProcessManager.send.mockReturnValue(false);

      const result = recorderManager.startRecording();

      expect(recorderManager.isRecording).toBe(false);
      expect(result).toBe(false);
      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'startRecording',
        'SendFailed',
        'Failed to send start command'
      );
    });
  });

  describe('stopRecording', () => {
    beforeEach(() => {
      recorderManager.processManager = mockProcessManager;
      recorderManager.isRecording = true;
    });

    it('should send stop command and return true on success', () => {
      const result = recorderManager.stopRecording();

      expect(recorderManager.isRecording).toBe(false);
      expect(mockProcessManager.send).toHaveBeenCalledWith('stop\n');
      expect(result).toBe(true);
    });

    it('should return false if process not running', () => {
      mockProcessManager.isRunning = false;

      const result = recorderManager.stopRecording();

      expect(result).toBe(false);
      expect(recorderManager.isRecording).toBe(false);
      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.WARNING,
        'stopRecording',
        'RecorderNotReady',
        'Recorder process not running'
      );
    });

    it('should return false if processManager is null', () => {
      recorderManager.processManager = null;

      const result = recorderManager.stopRecording();

      expect(result).toBe(false);
      expect(recorderManager.isRecording).toBe(false);
    });

    it('should return false if send fails', () => {
      mockProcessManager.send.mockReturnValue(false);

      const result = recorderManager.stopRecording();

      expect(recorderManager.isRecording).toBe(false);
      expect(result).toBe(false);
      expect(errorHandler.notify).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'stopRecording',
        'SendFailed',
        'Failed to send stop command'
      );
    });
  });

  describe('stop', () => {
    it('should stop process manager and set to null', async () => {
      recorderManager.processManager = mockProcessManager;

      await recorderManager.stop(true);

      expect(mockProcessManager.stop).toHaveBeenCalledWith(true);
      expect(recorderManager.processManager).toBeNull();
    });

    it('should handle null processManager gracefully', async () => {
      recorderManager.processManager = null;

      await recorderManager.stop();

      // Should not throw
      expect(recorderManager.processManager).toBeNull();
    });

    it('should use default force=false parameter', async () => {
      recorderManager.processManager = mockProcessManager;

      await recorderManager.stop();

      expect(mockProcessManager.stop).toHaveBeenCalledWith(false);
    });
  });

  describe('getRecordingState', () => {
    it('should return false by default', () => {
      expect(recorderManager.getRecordingState()).toBe(false);
    });

    it('should return true when recording', () => {
      recorderManager.isRecording = true;
      expect(recorderManager.getRecordingState()).toBe(true);
    });

    it('should return false when not recording', () => {
      recorderManager.isRecording = false;
      expect(recorderManager.getRecordingState()).toBe(false);
    });
  });

  describe('notifyUI', () => {
    it('should send message without data', () => {
      recorderManager.notifyUI('test-channel');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('test-channel');
    });

    it('should send message with data', () => {
      const data = { key: 'value' };
      recorderManager.notifyUI('test-channel', data);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('test-channel', data);
    });

    it('should not send if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      recorderManager.notifyUI('test-channel');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send if window is null', () => {
      recorderManager.mainWindow = null;

      recorderManager.notifyUI('test-channel');

      // Should not throw
    });
  });

  describe('on', () => {
    it('should register event handler', () => {
      const handler = jest.fn();
      recorderManager.on('recordingComplete', handler);

      expect(recorderManager.eventHandlers['recordingComplete']).toBe(handler);
    });

    it('should allow multiple event handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      recorderManager.on('event1', handler1);
      recorderManager.on('event2', handler2);

      expect(recorderManager.eventHandlers['event1']).toBe(handler1);
      expect(recorderManager.eventHandlers['event2']).toBe(handler2);
    });
  });

  describe('emit', () => {
    it('should call registered handler with data', () => {
      const handler = jest.fn();
      recorderManager.on('recordingComplete', handler);

      const filename = 'test.wav';
      recorderManager.emit('recordingComplete', filename);

      expect(handler).toHaveBeenCalledWith(filename);
    });

    it('should not throw if handler not registered', () => {
      recorderManager.emit('nonexistent', 'data');

      // Should not throw
    });

    it('should handle undefined data', () => {
      const handler = jest.fn();
      recorderManager.on('test', handler);

      recorderManager.emit('test');

      expect(handler).toHaveBeenCalledWith(undefined);
    });
  });
});
