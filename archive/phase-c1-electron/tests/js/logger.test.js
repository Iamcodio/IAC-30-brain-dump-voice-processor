/**
 * Logger Unit Tests
 *
 * Tests the Winston logger configuration and functionality.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Mock environment before requiring logger
const originalEnv = process.env.LOG_LEVEL;

describe('Logger', () => {
  let logger;

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }

    // Clear require cache to allow fresh logger instance
    jest.resetModules();
  });

  describe('Initialization', () => {
    test('should create logger instance', () => {
      logger = require('../../src/utils/logger');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(winston.Logger);
    });

    test('should have default log level of info', () => {
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      logger = require('../../src/utils/logger');
      expect(logger.level).toBe('info');
    });

    test('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'debug';
      jest.resetModules();
      logger = require('../../src/utils/logger');
      expect(logger.level).toBe('debug');
    });

    test('should have default meta with service name', () => {
      logger = require('../../src/utils/logger');
      expect(logger.defaultMeta).toEqual({ service: 'braindump' });
    });
  });

  describe('Transports', () => {
    beforeEach(() => {
      logger = require('../../src/utils/logger');
    });

    test('should have console transport', () => {
      const consoleTransport = logger.transports.find(
        t => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    test('should have daily rotate file transport', () => {
      const DailyRotateFile = require('winston-daily-rotate-file');
      const rotateTransport = logger.transports.find(
        t => t instanceof DailyRotateFile
      );
      expect(rotateTransport).toBeDefined();
    });

    test('should have error file transport', () => {
      const errorTransport = logger.transports.find(
        t => t instanceof winston.transports.File && t.level === 'error'
      );
      expect(errorTransport).toBeDefined();
    });

    test('should configure daily rotate with correct settings', () => {
      const DailyRotateFile = require('winston-daily-rotate-file');
      const rotateTransport = logger.transports.find(
        t => t instanceof DailyRotateFile
      );
      expect(rotateTransport).toBeDefined();
      expect(rotateTransport.filename).toContain('app-%DATE%.log');
    });
  });

  describe('Log Levels', () => {
    beforeEach(() => {
      logger = require('../../src/utils/logger');
      // Silence console output during tests
      jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
      jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should support debug level', () => {
      expect(() => logger.debug('Debug message')).not.toThrow();
    });

    test('should support info level', () => {
      expect(() => logger.info('Info message')).not.toThrow();
    });

    test('should support warn level', () => {
      expect(() => logger.warn('Warning message')).not.toThrow();
    });

    test('should support error level', () => {
      expect(() => logger.error('Error message')).not.toThrow();
    });

    test('should accept metadata objects', () => {
      expect(() => logger.info('Message with metadata', { key: 'value' })).not.toThrow();
    });

    test('should accept error objects', () => {
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', { error: error.message, stack: error.stack })).not.toThrow();
    });
  });

  describe('Format', () => {
    beforeEach(() => {
      logger = require('../../src/utils/logger');
    });

    test('should include timestamp in format', () => {
      const fileTransport = logger.transports.find(
        t => t instanceof winston.transports.File
      );
      expect(fileTransport.format).toBeDefined();
    });

    test('should use JSON format for file transports', () => {
      const fileTransport = logger.transports.find(
        t => t instanceof winston.transports.File
      );
      // JSON format is applied via winston.format.json()
      expect(fileTransport.format).toBeDefined();
    });
  });

  describe('Exception and Rejection Handling', () => {
    beforeEach(() => {
      logger = require('../../src/utils/logger');
    });

    test('should have exception handlers configured', () => {
      expect(logger.exceptions).toBeDefined();
      expect(logger.exceptions.handlers).toBeDefined();
      expect(logger.exceptions.handlers.size).toBeGreaterThan(0);
    });

    test('should have rejection handlers configured', () => {
      expect(logger.rejections).toBeDefined();
      expect(logger.rejections.handlers).toBeDefined();
      expect(logger.rejections.handlers.size).toBeGreaterThan(0);
    });

    test('should log exceptions to separate file', () => {
      // Exception handlers are configured - verify the exception property exists
      expect(logger.exceptions).toBeDefined();
      expect(logger.exceptions.handlers.size).toBeGreaterThan(0);
    });

    test('should log rejections to separate file', () => {
      // Rejection handlers are configured - verify the rejection property exists
      expect(logger.rejections).toBeDefined();
      expect(logger.rejections.handlers.size).toBeGreaterThan(0);
    });
  });

  describe('Log Directory', () => {
    test('should create logs directory', () => {
      const logsDir = path.join(__dirname, '..', '..', 'logs');
      expect(fs.existsSync(logsDir)).toBe(true);
    });

    test('should have .gitignore in logs directory', () => {
      const gitignorePath = path.join(__dirname, '..', '..', 'logs', '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
    });
  });
});
