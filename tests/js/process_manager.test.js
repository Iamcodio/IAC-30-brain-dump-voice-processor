/**
 * Tests for process_manager.js - ProcessManager testing
 */

const { ProcessManager } = require('../../src/js/process_manager');
const { EventEmitter } = require('events');

// Mock child_process
jest.mock('child_process');
const { spawn } = require('child_process');

// Mock error_handler
jest.mock('../../src/js/error_handler', () => ({
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

describe('ProcessManager', () => {
  let manager;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock child process
    mockProcess = new EventEmitter();
    mockProcess.pid = 12345;
    mockProcess.stdin = {
      write: jest.fn(),
      destroyed: false
    };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();

    spawn.mockReturnValue(mockProcess);

    manager = new ProcessManager({
      name: 'test-process',
      command: 'python',
      args: ['test.py'],
      maxRestarts: 3,
      baseDelay: 1000
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize with correct options', () => {
      expect(manager.name).toBe('test-process');
      expect(manager.command).toBe('python');
      expect(manager.args).toEqual(['test.py']);
      expect(manager.maxRestarts).toBe(3);
      expect(manager.baseDelay).toBe(1000);
    });

    test('should use default values', () => {
      const defaultManager = new ProcessManager({
        command: 'node'
      });
      expect(defaultManager.name).toBe('process');
      expect(defaultManager.args).toEqual([]);
      expect(defaultManager.maxRestarts).toBe(5);
      expect(defaultManager.baseDelay).toBe(1000);
    });

    test('should initialize with correct state', () => {
      expect(manager.isRunning).toBe(false);
      expect(manager.restartCount).toBe(0);
      expect(manager.shouldRestart).toBe(true);
    });
  });

  describe('Start', () => {
    test('should spawn process with correct parameters', () => {
      manager.start();

      expect(spawn).toHaveBeenCalledWith('python', ['test.py'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    test('should set isRunning to true', () => {
      manager.start();
      expect(manager.isRunning).toBe(true);
    });

    test('should emit started event', (done) => {
      manager.on('started', (proc) => {
        expect(proc).toBe(mockProcess);
        done();
      });
      manager.start();
    });

    test('should not start if already running', () => {
      manager.start();
      spawn.mockClear();

      manager.start();
      expect(spawn).not.toHaveBeenCalled();
    });

    test('should forward stdout events', (done) => {
      manager.on('stdout', (data) => {
        expect(data.toString()).toBe('test output');
        done();
      });

      manager.start();
      mockProcess.stdout.emit('data', Buffer.from('test output'));
    });

    test('should forward stderr events', (done) => {
      manager.on('stderr', (data) => {
        expect(data.toString()).toBe('test error');
        done();
      });

      manager.start();
      mockProcess.stderr.emit('data', Buffer.from('test error'));
    });
  });

  describe('Process Exit Handling', () => {
    test('should set isRunning to false on exit', () => {
      manager.start();
      expect(manager.isRunning).toBe(true);

      mockProcess.emit('exit', 0, null);
      expect(manager.isRunning).toBe(false);
    });

    test('should emit exited event with code and signal', (done) => {
      manager.on('exited', (code, signal) => {
        expect(code).toBe(1);
        expect(signal).toBe(null);
        done();
      });

      manager.start();
      mockProcess.emit('exit', 1, null);
    });

    test('should schedule restart on unexpected exit', () => {
      manager.start();

      const scheduleRestartSpy = jest.spyOn(manager, 'scheduleRestart');
      mockProcess.emit('exit', 1, null);

      expect(scheduleRestartSpy).toHaveBeenCalled();
    });

    test('should not restart if shouldRestart is false', () => {
      manager.shouldRestart = false;
      manager.start();

      const scheduleRestartSpy = jest.spyOn(manager, 'scheduleRestart');
      mockProcess.emit('exit', 1, null);

      expect(scheduleRestartSpy).not.toHaveBeenCalled();
    });

    test('should not restart if max restarts exceeded', (done) => {
      manager.maxRestarts = 2;
      manager.restartCount = 2;

      manager.on('failed', () => {
        done();
      });

      manager.start();
      mockProcess.emit('exit', 1, null);
    });
  });

  describe('Exponential Backoff', () => {
    test('should calculate correct delay for first restart', () => {
      manager.start();
      mockProcess.emit('exit', 1, null);

      expect(manager.restartCount).toBe(1);
      // Delay = 1000 * 2^0 = 1000ms
      jest.advanceTimersByTime(1000);
      expect(spawn).toHaveBeenCalledTimes(2);
    });

    test('should calculate correct delay for second restart', () => {
      manager.start();
      mockProcess.emit('exit', 1, null);
      expect(manager.restartCount).toBe(1);

      // Clear event listeners to prevent double-triggering
      mockProcess.removeAllListeners('exit');
      jest.advanceTimersByTime(1000);

      mockProcess.emit('exit', 1, null);
      expect(manager.restartCount).toBe(2);

      // Delay = 1000 * 2^1 = 2000ms
      jest.advanceTimersByTime(2000);
      expect(spawn).toHaveBeenCalledTimes(3);
    });

    test('should calculate correct delay for third restart', () => {
      manager.start();

      // First restart
      mockProcess.emit('exit', 1, null);
      expect(manager.restartCount).toBe(1);
      mockProcess.removeAllListeners('exit');
      jest.advanceTimersByTime(1000);

      // Second restart
      mockProcess.emit('exit', 1, null);
      expect(manager.restartCount).toBe(2);
      mockProcess.removeAllListeners('exit');
      jest.advanceTimersByTime(2000);

      // Third restart
      mockProcess.emit('exit', 1, null);
      expect(manager.restartCount).toBe(3);
      // Delay = 1000 * 2^2 = 4000ms
      jest.advanceTimersByTime(4000);

      expect(spawn).toHaveBeenCalledTimes(4);
    });

    test('should emit restarting event with count and delay', (done) => {
      manager.on('restarting', (count, delay) => {
        expect(count).toBe(1);
        expect(delay).toBe(1000);
        done();
      });

      manager.start();
      mockProcess.emit('exit', 1, null);
    });
  });

  describe('Stop', () => {
    test('should send quit command to stdin', () => {
      manager.start();
      manager.stop();

      expect(mockProcess.stdin.write).toHaveBeenCalledWith('quit\n');
    });

    test('should disable restart by default', () => {
      manager.start();
      manager.stop();

      expect(manager.shouldRestart).toBe(false);
    });

    test('should not disable restart if specified', () => {
      manager.start();
      manager.stop(false);

      expect(manager.shouldRestart).toBe(true);
    });

    test('should force kill after 5 seconds', () => {
      manager.start();
      manager.stop();

      jest.advanceTimersByTime(5000);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });

    test('should clear restart timer if pending', () => {
      manager.start();
      mockProcess.emit('exit', 1, null);

      expect(manager.restartTimer).toBeDefined();
      manager.stop();
      expect(manager.restartTimer).toBe(null);
    });

    test('should do nothing if not running', () => {
      manager.stop();
      expect(mockProcess.stdin.write).not.toHaveBeenCalled();
    });
  });

  describe('Send', () => {
    test('should send data to stdin', () => {
      manager.start();
      const result = manager.send('test data\n');

      expect(mockProcess.stdin.write).toHaveBeenCalledWith('test data\n');
      expect(result).toBe(true);
    });

    test('should return false if not running', () => {
      const result = manager.send('test data\n');
      expect(result).toBe(false);
    });

    test('should handle write errors', () => {
      manager.start();
      mockProcess.stdin.write.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = manager.send('test data\n');
      expect(result).toBe(false);
    });
  });

  describe('Status', () => {
    test('should return correct status when not running', () => {
      const status = manager.getStatus();

      expect(status.name).toBe('test-process');
      expect(status.isRunning).toBe(false);
      expect(status.restartCount).toBe(0);
      expect(status.maxRestarts).toBe(3);
      expect(status.pid).toBe(null);
    });

    test('should return correct status when running', () => {
      manager.start();
      const status = manager.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.pid).toBe(12345);
    });
  });

  describe('Reset Restart Count', () => {
    test('should reset restart count to zero', () => {
      manager.restartCount = 5;
      manager.resetRestartCount();
      expect(manager.restartCount).toBe(0);
    });

    test('should not change count if already zero', () => {
      manager.restartCount = 0;
      manager.resetRestartCount();
      expect(manager.restartCount).toBe(0);
    });
  });

  describe('Process Error Handling', () => {
    test('should emit error event on process error', (done) => {
      const testError = new Error('Process error');

      manager.on('error', (error) => {
        expect(error).toBe(testError);
        done();
      });

      manager.start();
      mockProcess.emit('error', testError);
    });
  });
});
