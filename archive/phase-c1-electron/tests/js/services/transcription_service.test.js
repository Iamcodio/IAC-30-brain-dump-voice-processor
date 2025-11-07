/**
 * Tests for TranscriptionService
 *
 * Validates transcription workflow, Promise handling, error cases,
 * and UI notification behavior.
 */

// Mock config module FIRST
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const config = {
      'paths.pythonVenv': '.venv/bin/python',
      'paths.transcriberScript': 'transcribe.py',
      'paths.databaseFile': 'src/data/recordings.json',
      'process.stdioMode': ['pipe', 'pipe', 'pipe'],
      'file.encoding': 'utf-8',
      'logging.level': 'info',
      'sentry.enabled': false,
      'sentry.dsn': '',
      'protocol.transcriptSaved': 'TRANSCRIPT_SAVED:',
      'protocol.errorPrefix': 'ERROR:'
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

// Mock metrics module
jest.mock('../../../src/utils/metrics', () => ({
  errorCounter: {
    inc: jest.fn()
  },
  totalTranscriptions: {
    inc: jest.fn()
  },
  transcriptionLatency: {
    observe: jest.fn()
  }
}));

const { TranscriptionService } = require('../../../src/js/services/transcription_service');
const { spawn } = require('child_process');
const { FileValidator } = require('../../../src/js/utils/file_validator');
const { errorHandler } = require('../../../src/js/error_handler');
const { EventEmitter } = require('events');

// Mock dependencies
jest.mock('child_process');
jest.mock('../../../src/js/utils/file_validator');
jest.mock('../../../src/js/error_handler', () => ({
  errorHandler: {
    notify: jest.fn(),
    handleException: jest.fn()
  },
  captureError: jest.fn(),
  ErrorLevel: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
  }
}));

describe('TranscriptionService', () => {
  let service;
  let mockWindow;
  let mockProcess;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock BrowserWindow
    mockWindow = {
      isDestroyed: jest.fn().mockReturnValue(false),
      webContents: {
        send: jest.fn()
      }
    };

    // Mock child process
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    spawn.mockReturnValue(mockProcess);

    // Mock FileValidator by default to pass
    FileValidator.validateExists = jest.fn();

    service = new TranscriptionService(mockWindow, '/test/base');
  });

  describe('constructor', () => {
    it('should initialize with correct paths', () => {
      expect(service.mainWindow).toBe(mockWindow);
      expect(service.baseDir).toBe('/test/base');
      expect(service.pythonPath).toBe('/test/base/.venv/bin/python');
      expect(service.scriptPath).toBe('/test/base/transcribe.py');
    });
  });

  describe('transcribe', () => {
    describe('success cases', () => {
      it('should resolve with transcript path on success', async () => {
        const audioPath = '/test/audio.wav';
        const transcriptPath = '/test/transcript.md';

        const promise = service.transcribe(audioPath);

        // Simulate Python process output
        mockProcess.stdout.emit('data', Buffer.from(`TRANSCRIPT_SAVED:${transcriptPath}`));
        mockProcess.emit('close', 0);

        const result = await promise;

        expect(result).toBe(transcriptPath);
        expect(FileValidator.validateExists).toHaveBeenCalledWith(
          audioPath,
          'transcribeAudio'
        );
        expect(spawn).toHaveBeenCalledWith('/test/base/.venv/bin/python', [
          '/test/base/transcribe.py',
          audioPath
        ]);
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('transcription-started');
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('transcription-complete');
      });

      it('should handle multiple stdout messages', async () => {
        const promise = service.transcribe('/test/audio.wav');

        mockProcess.stdout.emit('data', Buffer.from('Processing audio...'));
        mockProcess.stdout.emit('data', Buffer.from('TRANSCRIPT_SAVED:/test/transcript.md'));
        mockProcess.emit('close', 0);

        const result = await promise;
        expect(result).toBe('/test/transcript.md');
      });

      it('should log stderr without failing', async () => {
        const logger = require('../../../src/utils/logger');

        const promise = service.transcribe('/test/audio.wav');

        mockProcess.stderr.emit('data', Buffer.from('Warning: low audio quality'));
        mockProcess.stdout.emit('data', Buffer.from('TRANSCRIPT_SAVED:/test/transcript.md'));
        mockProcess.emit('close', 0);

        await promise;

        expect(logger.error).toHaveBeenCalledWith(
          'Transcription stderr',
          { stderr: 'Warning: low audio quality' }
        );
      });
    });

    describe('error cases', () => {
      it('should reject if audio file does not exist', async () => {
        const error = new Error('File not found: /test/missing.wav');
        FileValidator.validateExists.mockImplementation(() => {
          throw error;
        });

        await expect(service.transcribe('/test/missing.wav')).rejects.toThrow(error);

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          'transcription-error',
          'Audio file not found'
        );
        expect(spawn).not.toHaveBeenCalled();
      });

      it('should reject on non-zero exit code', async () => {
        const promise = service.transcribe('/test/audio.wav');

        mockProcess.emit('close', 1);

        await expect(promise).rejects.toThrow('Transcription failed with exit code 1');

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          'transcription-error',
          'Exit code 1'
        );
        expect(errorHandler.notify).toHaveBeenCalledWith(
          'ERROR',
          'transcribeAudio',
          'TranscriptionFailed',
          'Transcription failed with exit code 1'
        );
      });

      it('should reject on process error event', async () => {
        const error = new Error('spawn ENOENT');

        const promise = service.transcribe('/test/audio.wav');

        mockProcess.emit('error', error);

        await expect(promise).rejects.toThrow(error);

        expect(errorHandler.handleException).toHaveBeenCalledWith(
          'transcribeAudio.spawn',
          error
        );
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          'transcription-error',
          'spawn ENOENT'
        );
      });

      it('should handle ERROR: prefix in stdout', async () => {
        const promise = service.transcribe('/test/audio.wav');

        mockProcess.stdout.emit('data', Buffer.from('ERROR:Model not found'));
        mockProcess.emit('close', 1);

        await expect(promise).rejects.toThrow('Transcription failed with exit code 1');

        // Should notify about the ERROR: message from stdout
        expect(errorHandler.notify).toHaveBeenCalledWith(
          'ERROR',
          'transcribeAudio.stdout',
          'TranscriptionError',
          'ERROR:Model not found'
        );

        // Should also notify about the exit code failure
        expect(errorHandler.notify).toHaveBeenCalledWith(
          'ERROR',
          'transcribeAudio',
          'TranscriptionFailed',
          'Transcription failed with exit code 1'
        );

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          'transcription-error',
          'ERROR:Model not found'
        );
      });

      it('should reject and handle exceptions in try-catch', async () => {
        const error = new Error('Unexpected error');
        FileValidator.validateExists.mockImplementation(() => {
          throw error;
        });

        await expect(service.transcribe('/test/audio.wav')).rejects.toThrow(error);

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          'transcription-error',
          'Audio file not found'
        );
      });

      it('should handle spawn throwing error in outer catch block', async () => {
        const error = new Error('spawn synchronous error');
        spawn.mockImplementation(() => {
          throw error;
        });

        await expect(service.transcribe('/test/audio.wav')).rejects.toThrow(error);

        expect(errorHandler.handleException).toHaveBeenCalledWith(
          'transcribeAudio',
          error
        );
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          'transcription-error',
          'spawn synchronous error'
        );
      });
    });

    describe('notification handling', () => {
      it('should notify UI of TRANSCRIPT_SAVED message', async () => {
        const promise = service.transcribe('/test/audio.wav');

        mockProcess.stdout.emit('data', Buffer.from('TRANSCRIPT_SAVED:/test/transcript.md'));
        mockProcess.emit('close', 0);

        await promise;

        // Should be called twice: once for TRANSCRIPT_SAVED, once for completion
        expect(errorHandler.notify).toHaveBeenCalledWith(
          'INFO',
          'transcribeAudio',
          'TranscriptSaved',
          'Transcript saved: /test/transcript.md'
        );
        expect(errorHandler.notify).toHaveBeenCalledWith(
          'INFO',
          'transcribeAudio',
          'TranscriptionComplete',
          'Transcription completed successfully'
        );
      });

      it('should notify UI of completion', async () => {
        const promise = service.transcribe('/test/audio.wav');

        mockProcess.stdout.emit('data', Buffer.from('TRANSCRIPT_SAVED:/test/transcript.md'));
        mockProcess.emit('close', 0);

        await promise;

        expect(errorHandler.notify).toHaveBeenCalledWith(
          'INFO',
          'transcribeAudio',
          'TranscriptionComplete',
          'Transcription completed successfully'
        );
      });
    });
  });

  describe('notifyUI', () => {
    it('should send message to window if valid', () => {
      service.notifyUI('test-channel', 'test-data');

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('test-channel', 'test-data');
    });

    it('should send message without data if no data provided', () => {
      service.notifyUI('test-channel');

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('test-channel');
    });

    it('should not send if window is destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      service.notifyUI('test-channel', 'test-data');

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send if window is null', () => {
      service.mainWindow = null;

      service.notifyUI('test-channel', 'test-data');

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
