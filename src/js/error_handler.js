/**
 * Centralized error handling using Observer pattern.
 *
 * Provides a singleton ErrorHandler that observers can subscribe to
 * for logging, notifications, and error recovery in JavaScript/Electron.
 */

class ErrorLevel {
  static INFO = 'INFO';
  static WARNING = 'WARNING';
  static ERROR = 'ERROR';
  static CRITICAL = 'CRITICAL';
}

class ErrorHandler {
  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }

    this.observers = [];
    this.errorCount = 0;
    ErrorHandler.instance = this;
  }

  /**
   * Subscribe an observer to error notifications.
   * @param {Function} observer - Callback(level, context, errorType, message, error)
   */
  subscribe(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  /**
   * Unsubscribe an observer from notifications.
   * @param {Function} observer - The observer to remove
   */
  unsubscribe(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Notify all observers of an error event.
   * @param {string} level - Error severity (INFO, WARNING, ERROR, CRITICAL)
   * @param {string} context - Where the error occurred (module/function)
   * @param {string} errorType - Type of error (FileNotFound, ValidationError, etc.)
   * @param {string} message - Human-readable error description
   * @param {Error} [error] - Optional Error object for stack traces
   */
  notify(level, context, errorType, message, error = null) {
    this.errorCount++;

    const formattedMessage = `${level}:${context}:${errorType}:${message}`;

    // Notify all observers
    for (const observer of this.observers) {
      try {
        observer(level, context, errorType, message, error);
      } catch (err) {
        // Prevent observer errors from breaking the system
        console.error('ERROR:ErrorHandler:ObserverFailure:Observer failed:', err);
      }
    }

    // Always log to console as backup
    if (level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL) {
      console.error(formattedMessage);
      if (error && error.stack) {
        console.error(error.stack);
      }
    } else if (level === ErrorLevel.WARNING) {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * Handle an exception with automatic level determination.
   * @param {string} context - Where the exception occurred
   * @param {Error} error - The caught exception
   * @param {boolean} [fatal=false] - If true, exit process after logging
   */
  handleException(context, error, fatal = false) {
    const errorType = error.name || 'Error';
    const message = error.message || String(error);
    const level = fatal ? ErrorLevel.CRITICAL : ErrorLevel.ERROR;

    this.notify(level, context, errorType, message, error);

    if (fatal) {
      process.exit(1);
    }
  }

  /**
   * Get total number of errors notified.
   * @returns {number} Error count
   */
  getErrorCount() {
    return this.errorCount;
  }

  /**
   * Reset error counter (useful for testing).
   */
  resetCount() {
    this.errorCount = 0;
  }
}

/**
 * Default console observer with structured logging.
 * Format: [timestamp] LEVEL:context:type:message
 */
function consoleObserver(level, context, errorType, message, error) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${level}:${context}:${errorType}:${message}`;

  if (level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL) {
    console.error(logLine);
    if (error && error.stack) {
      console.error(error.stack);
    }
  } else if (level === ErrorLevel.WARNING) {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }
}

// Global singleton instance with default observer
const errorHandler = new ErrorHandler();
errorHandler.subscribe(consoleObserver);

module.exports = {
  ErrorHandler,
  ErrorLevel,
  errorHandler
};
