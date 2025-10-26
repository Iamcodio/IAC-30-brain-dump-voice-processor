/**
 * Unit tests for Sentry error tracking integration
 *
 * Tests the initializeErrorTracking() and captureError() functions
 * that integrate Sentry with the existing error handler.
 */

// Set NODE_ENV for tests
process.env.NODE_ENV = 'test';

// Create a mutable config map that can be updated between tests
const mockConfigMap = {
  'sentry.enabled': true,
  'sentry.dsn': 'https://test-key@sentry.io/123',
  'app.version': '2.1.0',
  'logging.level': 'info'
};

// Create persistent mock functions that survive jest.resetModules()
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerDebug = jest.fn();

const mockSentryInit = jest.fn();
const mockSentryCaptureException = jest.fn();
const mockSentryElectronIntegration = jest.fn();

const mockConfigGet = jest.fn((key) => mockConfigMap[key]);
const mockConfigHas = jest.fn(() => true);

// Mock config module FIRST with reference to mutable map and persistent mocks
jest.mock('config', () => ({
  get: mockConfigGet,
  has: mockConfigHas
}));

// Mock logger module with persistent mocks
jest.mock('../../src/utils/logger', () => ({
  info: mockLoggerInfo,
  error: mockLoggerError,
  warn: mockLoggerWarn,
  debug: mockLoggerDebug
}));

// Mock Sentry with persistent mocks
jest.mock('@sentry/electron', () => ({
  init: mockSentryInit,
  captureException: mockSentryCaptureException,
  Integrations: {
    Electron: mockSentryElectronIntegration
  },
  IPCMode: {
    Both: 'both'
  }
}));

const Sentry = require('@sentry/electron');
const config = require('config');
const logger = require('../../src/utils/logger');

describe('Error Tracking Integration', () => {
  let errorHandler;
  let initializeErrorTracking;
  let captureError;
  let isSentryEnabled;

  beforeEach(() => {
    // Reset config map to default test values
    mockConfigMap['sentry.enabled'] = true;
    mockConfigMap['sentry.dsn'] = 'https://test-key@sentry.io/123';
    mockConfigMap['app.version'] = '2.1.0';

    // Reset module cache to get fresh state for sentryInitialized variable
    jest.resetModules();

    // Clear all mock call history AFTER resetModules
    jest.clearAllMocks();

    // Reset mock implementations to default behavior
    mockSentryInit.mockReset();
    mockSentryCaptureException.mockReset();
    mockSentryElectronIntegration.mockReset();

    // Re-require module after mocks are set up
    const errorHandlerModule = require('../../src/js/error_handler');
    errorHandler = errorHandlerModule.errorHandler;
    initializeErrorTracking = errorHandlerModule.initializeErrorTracking;
    captureError = errorHandlerModule.captureError;
    isSentryEnabled = errorHandlerModule.isSentryEnabled;
  });

  describe('initializeErrorTracking()', () => {
    test('initializes Sentry with correct configuration', () => {
      initializeErrorTracking();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test-key@sentry.io/123',
          environment: 'test',
          release: 'braindump@2.1.0'
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Sentry initialized',
        expect.objectContaining({
          environment: 'test',
          release: '2.1.0'
        })
      );
    });

    test('does not initialize Sentry when disabled in config', () => {
      mockConfigMap['sentry.enabled'] = false;

      initializeErrorTracking();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Sentry disabled (local development mode)');
    });

    test('does not initialize Sentry when DSN is missing', () => {
      mockConfigMap['sentry.dsn'] = '';

      initializeErrorTracking();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Sentry enabled but DSN not configured');
    });

    test('does not initialize Sentry when DSN contains placeholder', () => {
      mockConfigMap['sentry.dsn'] = 'https://placeholder@sentry.io/123';

      initializeErrorTracking();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Sentry enabled but DSN not configured');
    });

    test('handles Sentry initialization errors gracefully', () => {
      Sentry.init.mockImplementation(() => {
        throw new Error('Sentry init failed');
      });

      initializeErrorTracking();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize Sentry',
        { error: 'Sentry init failed' }
      );
    });

    test('configures beforeSend to sanitize sensitive data', () => {
      initializeErrorTracking();

      const initCall = Sentry.init.mock.calls[0][0];
      expect(initCall.beforeSend).toBeDefined();

      // Test beforeSend removes cookies and headers
      const event = {
        request: {
          cookies: { session: 'secret' },
          headers: { authorization: 'Bearer token' }
        }
      };

      const sanitized = initCall.beforeSend(event);
      expect(sanitized.request.cookies).toBeUndefined();
      expect(sanitized.request.headers).toBeUndefined();
    });

    test('beforeSend sanitizes file paths in breadcrumbs', () => {
      initializeErrorTracking();

      const initCall = Sentry.init.mock.calls[0][0];
      const event = {
        breadcrumbs: [
          {
            data: {
              path: '/Users/john/project/file.js'
            }
          }
        ]
      };

      const sanitized = initCall.beforeSend(event);
      expect(sanitized.breadcrumbs[0].data.path).toBe('/Users/REDACTED/project/file.js');
    });

    test('beforeSend sanitizes file paths in stack traces', () => {
      initializeErrorTracking();

      const initCall = Sentry.init.mock.calls[0][0];
      const event = {
        exception: {
          values: [
            {
              stacktrace: {
                frames: [
                  { filename: '/Users/alice/project/main.js' },
                  { filename: '/Users/bob/other/file.js' }
                ]
              }
            }
          ]
        }
      };

      const sanitized = initCall.beforeSend(event);
      expect(sanitized.exception.values[0].stacktrace.frames[0].filename).toBe(
        '/Users/REDACTED/project/main.js'
      );
      expect(sanitized.exception.values[0].stacktrace.frames[1].filename).toBe(
        '/Users/REDACTED/other/file.js'
      );
    });

    test('configures Electron integration with IPC mode', () => {
      initializeErrorTracking();

      const initCall = Sentry.init.mock.calls[0][0];
      expect(initCall.integrations).toBeDefined();
      expect(Sentry.Integrations.Electron).toHaveBeenCalledWith(
        expect.objectContaining({
          ipcMode: 'both'
        })
      );
    });
  });

  describe('captureError()', () => {
    test('logs error to Winston', () => {
      const error = new Error('Test error');
      const context = {
        tags: { component: 'test' },
        extra: { foo: 'bar' }
      };

      captureError(error, context);

      expect(logger.error).toHaveBeenCalledWith(
        'Error captured',
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String),
          context
        })
      );
    });

    test('sends error to Sentry when initialized', () => {
      // Initialize Sentry first
      initializeErrorTracking();

      const error = new Error('Test error');
      const context = {
        tags: { component: 'recorder' },
        extra: { audioPath: '/path/to/file.wav' },
        level: 'error'
      };

      captureError(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { component: 'recorder' },
          extra: { audioPath: '/path/to/file.wav' },
          level: 'error'
        })
      );
    });

    test('does not send to Sentry when not initialized', () => {
      const error = new Error('Test error');
      captureError(error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled(); // Still logs to Winston
    });

    test('uses default level "error" when not specified', () => {
      initializeErrorTracking();

      const error = new Error('Test error');
      captureError(error, { tags: { component: 'test' } });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error'
        })
      );
    });

    test('handles empty context object', () => {
      initializeErrorTracking();

      const error = new Error('Test error');
      captureError(error, {});

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {},
          extra: {},
          level: 'error'
        })
      );
    });

    test('handles missing context parameter', () => {
      initializeErrorTracking();

      const error = new Error('Test error');
      captureError(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {},
          extra: {},
          level: 'error'
        })
      );
    });
  });

  describe('isSentryEnabled()', () => {
    test('returns false before initialization', () => {
      expect(isSentryEnabled()).toBe(false);
    });

    test('returns true after successful initialization', () => {
      initializeErrorTracking();
      expect(isSentryEnabled()).toBe(true);
    });

    test('returns false when Sentry is disabled', () => {
      mockConfigMap['sentry.enabled'] = false;

      initializeErrorTracking();
      expect(isSentryEnabled()).toBe(false);
    });

    test('returns false when DSN is invalid', () => {
      mockConfigMap['sentry.dsn'] = '';

      initializeErrorTracking();
      expect(isSentryEnabled()).toBe(false);
    });

    test('returns false when Sentry init fails', () => {
      Sentry.init.mockImplementation(() => {
        throw new Error('Init failed');
      });

      initializeErrorTracking();
      expect(isSentryEnabled()).toBe(false);
    });
  });

  describe('Integration with existing error handler', () => {
    test('captureError works alongside errorHandler.notify', () => {
      const mockObserver = jest.fn();
      errorHandler.subscribe(mockObserver);

      initializeErrorTracking();

      const error = new Error('Test error');
      captureError(error, {
        tags: { component: 'test' }
      });

      // Winston logger should be called
      expect(logger.error).toHaveBeenCalled();

      // Sentry should be called
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });
});
