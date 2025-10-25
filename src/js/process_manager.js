/**
 * Process Manager with automatic restart and exponential backoff.
 *
 * Manages Python child processes (recorder, transcriber) with automatic
 * crash recovery using exponential backoff strategy.
 *
 * Features:
 * - Exponential backoff: delay = 1000ms * 2^(restart_count-1)
 * - Maximum 5 restart attempts before giving up
 * - Graceful cleanup on exit
 * - Event-based notifications for process state changes
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { errorHandler, ErrorLevel } = require('./error_handler');

class ProcessManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.name = options.name || 'process';
    this.command = options.command;
    this.args = options.args || [];
    this.cwd = options.cwd || process.cwd();
    this.maxRestarts = options.maxRestarts || 5;
    this.baseDelay = options.baseDelay || 1000; // 1 second

    this.process = null;
    this.restartCount = 0;
    this.isRunning = false;
    this.shouldRestart = true;
    this.restartTimer = null;
  }

  /**
   * Start the managed process.
   */
  start() {
    try {
      if (this.isRunning) {
        errorHandler.notify(
          ErrorLevel.WARNING,
          `ProcessManager.${this.name}.start`,
          'AlreadyRunning',
          'Process already running'
        );
        return;
      }

      errorHandler.notify(
        ErrorLevel.INFO,
        `ProcessManager.${this.name}.start`,
        'ProcessStarting',
        `Starting ${this.name} process`
      );

      this.process = spawn(this.command, this.args, {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.isRunning = true;
      this.emit('started', this.process);

      // Set up event handlers
      this.process.on('error', (error) => {
        errorHandler.handleException(`ProcessManager.${this.name}.error`, error);
        this.emit('error', error);
      });

      this.process.on('exit', (code, signal) => {
        this.isRunning = false;
        this.emit('exited', code, signal);

        const exitReason = signal ? `signal ${signal}` : `code ${code}`;
        errorHandler.notify(
          ErrorLevel.WARNING,
          `ProcessManager.${this.name}.exit`,
          'ProcessExited',
          `Process exited with ${exitReason}`
        );

        // Auto-restart if enabled and within limits
        if (this.shouldRestart && this.restartCount < this.maxRestarts) {
          this.scheduleRestart();
        } else if (this.restartCount >= this.maxRestarts) {
          errorHandler.notify(
            ErrorLevel.CRITICAL,
            `ProcessManager.${this.name}.restart`,
            'MaxRestartsExceeded',
            `Process failed after ${this.maxRestarts} restart attempts`
          );
          this.emit('failed');
        }
      });

      // Forward stdout/stderr
      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          this.emit('stdout', data);
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          this.emit('stderr', data);
        });
      }

      // Reset restart count on successful start
      if (this.restartCount > 0) {
        errorHandler.notify(
          ErrorLevel.INFO,
          `ProcessManager.${this.name}.start`,
          'ProcessRestarted',
          `Process restarted successfully (attempt ${this.restartCount + 1})`
        );
      }

    } catch (error) {
      errorHandler.handleException(`ProcessManager.${this.name}.start`, error);
      this.emit('error', error);
    }
  }

  /**
   * Schedule a restart with exponential backoff.
   * Formula: delay = baseDelay * 2^(restartCount)
   */
  scheduleRestart() {
    this.restartCount++;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = this.baseDelay * Math.pow(2, this.restartCount - 1);

    errorHandler.notify(
      ErrorLevel.INFO,
      `ProcessManager.${this.name}.restart`,
      'RestartScheduled',
      `Restarting in ${delay}ms (attempt ${this.restartCount}/${this.maxRestarts})`
    );

    this.emit('restarting', this.restartCount, delay);

    this.restartTimer = setTimeout(() => {
      this.start();
    }, delay);
  }

  /**
   * Stop the process gracefully (send quit command or SIGTERM).
   * @param {boolean} [disableRestart=true] - Prevent automatic restart
   */
  stop(disableRestart = true) {
    if (disableRestart) {
      this.shouldRestart = false;
    }

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (!this.isRunning || !this.process) {
      return;
    }

    errorHandler.notify(
      ErrorLevel.INFO,
      `ProcessManager.${this.name}.stop`,
      'ProcessStopping',
      'Stopping process'
    );

    try {
      // Try graceful shutdown first
      if (this.process.stdin && !this.process.stdin.destroyed) {
        this.process.stdin.write('quit\n');
      }

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.isRunning && this.process) {
          errorHandler.notify(
            ErrorLevel.WARNING,
            `ProcessManager.${this.name}.stop`,
            'ForcedKill',
            'Process did not exit gracefully, forcing kill'
          );
          this.process.kill('SIGKILL');
        }
      }, 5000);

    } catch (error) {
      errorHandler.handleException(`ProcessManager.${this.name}.stop`, error);
    }
  }

  /**
   * Send data to process stdin.
   * @param {string} data - Data to send
   */
  send(data) {
    if (!this.isRunning || !this.process || !this.process.stdin) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        `ProcessManager.${this.name}.send`,
        'ProcessNotRunning',
        'Cannot send data: process not running'
      );
      return false;
    }

    try {
      this.process.stdin.write(data);
      return true;
    } catch (error) {
      errorHandler.handleException(`ProcessManager.${this.name}.send`, error);
      return false;
    }
  }

  /**
   * Get current process status.
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      name: this.name,
      isRunning: this.isRunning,
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      pid: this.process ? this.process.pid : null
    };
  }

  /**
   * Reset restart counter (useful after successful operation).
   */
  resetRestartCount() {
    if (this.restartCount > 0) {
      errorHandler.notify(
        ErrorLevel.INFO,
        `ProcessManager.${this.name}.reset`,
        'RestartCountReset',
        `Restart count reset from ${this.restartCount} to 0`
      );
      this.restartCount = 0;
    }
  }
}

module.exports = { ProcessManager };
