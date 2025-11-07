/**
 * Tests for error_handler.js - Observer pattern testing
 */

const { ErrorHandler, ErrorLevel, errorHandler } = require('../../src/js/error_handler');

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    // Create new instance for each test
    ErrorHandler.instance = null;
    handler = new ErrorHandler();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const handler1 = new ErrorHandler();
      const handler2 = new ErrorHandler();
      expect(handler1).toBe(handler2);
    });

    test('should maintain state across instances', () => {
      const handler1 = new ErrorHandler();
      handler1.errorCount = 5;
      const handler2 = new ErrorHandler();
      expect(handler2.errorCount).toBe(5);
    });
  });

  describe('Observer Management', () => {
    test('should subscribe observer', () => {
      const observer = jest.fn();
      handler.subscribe(observer);
      expect(handler.observers).toContain(observer);
    });

    test('should not subscribe duplicate observer', () => {
      const observer = jest.fn();
      handler.subscribe(observer);
      handler.subscribe(observer);
      expect(handler.observers.filter(o => o === observer).length).toBe(1);
    });

    test('should unsubscribe observer', () => {
      const observer = jest.fn();
      handler.subscribe(observer);
      handler.unsubscribe(observer);
      expect(handler.observers).not.toContain(observer);
    });

    test('should handle unsubscribing non-existent observer', () => {
      const observer = jest.fn();
      expect(() => handler.unsubscribe(observer)).not.toThrow();
    });
  });

  describe('Notify', () => {
    test('should call all subscribed observers', () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      handler.subscribe(observer1);
      handler.subscribe(observer2);

      handler.notify(ErrorLevel.ERROR, 'context', 'type', 'message');

      expect(observer1).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'context',
        'type',
        'message',
        null
      );
      expect(observer2).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'context',
        'type',
        'message',
        null
      );
    });

    test('should increment error count', () => {
      const initialCount = handler.getErrorCount();
      handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg');
      expect(handler.getErrorCount()).toBe(initialCount + 1);
    });

    test('should pass exception to observers', () => {
      const observer = jest.fn();
      handler.subscribe(observer);

      const testError = new Error('Test error');
      handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg', testError);

      expect(observer).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'ctx',
        'type',
        'msg',
        testError
      );
    });

    test('should handle observer exceptions without breaking', () => {
      const failingObserver = jest.fn(() => {
        throw new Error('Observer failed');
      });
      const workingObserver = jest.fn();

      handler.subscribe(failingObserver);
      handler.subscribe(workingObserver);

      // Spy on console.error to suppress output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg');
      }).not.toThrow();

      expect(workingObserver).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should log to console for ERROR level', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      handler.notify(ErrorLevel.ERROR, 'ctx', 'TestError', 'Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR:ctx:TestError:Test message')
      );

      consoleSpy.mockRestore();
    });

    test('should log to console for CRITICAL level', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      handler.notify(ErrorLevel.CRITICAL, 'ctx', 'CriticalError', 'Critical message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL:ctx:CriticalError:Critical message')
      );

      consoleSpy.mockRestore();
    });

    test('should log to console for WARNING level', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      handler.notify(ErrorLevel.WARNING, 'ctx', 'WarningType', 'Warning message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING:ctx:WarningType:Warning message')
      );

      consoleSpy.mockRestore();
    });

    test('should log to console for INFO level', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      handler.notify(ErrorLevel.INFO, 'ctx', 'InfoType', 'Info message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO:ctx:InfoType:Info message')
      );

      consoleSpy.mockRestore();
    });

    test('should print stack trace for errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error');

      handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg', testError);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Test error'));

      consoleSpy.mockRestore();
    });
  });

  describe('HandleException', () => {
    test('should handle exception with ERROR level by default', () => {
      const observer = jest.fn();
      handler.subscribe(observer);

      const testError = new Error('Test error');
      handler.handleException('test_context', testError, false);

      expect(observer).toHaveBeenCalledWith(
        ErrorLevel.ERROR,
        'test_context',
        'Error',
        'Test error',
        testError
      );
    });

    test('should handle exception with CRITICAL level when fatal', () => {
      const observer = jest.fn();
      handler.subscribe(observer);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation();

      const testError = new Error('Fatal error');
      handler.handleException('test_context', testError, true);

      expect(observer).toHaveBeenCalledWith(
        ErrorLevel.CRITICAL,
        'test_context',
        'Error',
        'Fatal error',
        testError
      );

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    test('should not exit when fatal is false', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation();

      const testError = new Error('Non-fatal error');
      handler.handleException('test_context', testError, false);

      expect(mockExit).not.toHaveBeenCalled();
      mockExit.mockRestore();
    });
  });

  describe('Error Count', () => {
    test('should return error count', () => {
      expect(handler.getErrorCount()).toBe(0);
      handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg');
      handler.notify(ErrorLevel.WARNING, 'ctx', 'type', 'msg');
      expect(handler.getErrorCount()).toBe(2);
    });

    test('should reset error count', () => {
      handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg');
      handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg');
      expect(handler.getErrorCount()).toBe(2);

      handler.resetCount();
      expect(handler.getErrorCount()).toBe(0);
    });
  });
});

describe('ErrorLevel', () => {
  test('should have INFO level', () => {
    expect(ErrorLevel.INFO).toBe('INFO');
  });

  test('should have WARNING level', () => {
    expect(ErrorLevel.WARNING).toBe('WARNING');
  });

  test('should have ERROR level', () => {
    expect(ErrorLevel.ERROR).toBe('ERROR');
  });

  test('should have CRITICAL level', () => {
    expect(ErrorLevel.CRITICAL).toBe('CRITICAL');
  });
});

describe('consoleObserver', () => {
  test('should be subscribed to global errorHandler', () => {
    // The module exports a singleton with consoleObserver already subscribed
    expect(errorHandler.observers.length).toBeGreaterThan(0);
  });
});

describe('Global errorHandler instance', () => {
  test('should exist and be an ErrorHandler', () => {
    expect(errorHandler).toBeInstanceOf(ErrorHandler);
  });

  test('should have observers subscribed', () => {
    expect(errorHandler.observers).toBeDefined();
    expect(Array.isArray(errorHandler.observers)).toBe(true);
  });
});
