/**
 * Centralized error handling using Observer pattern with Sentry integration.
 *
 * Provides a singleton ErrorHandler that observers can subscribe to
 * for logging, notifications, and error recovery in JavaScript/Electron.
 * Integrates with Sentry for optional production error tracking.
 */

const Sentry = require('@sentry/electron');
const config = require('config');
const logger = require('../utils/logger');

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

/**
 * Sentry integration state
 */
let sentryInitialized = false;

/**
 * Initialize Sentry error tracking.
 *
 * Call this once during app startup. Sentry is disabled by default
 * and only enabled when config.sentry.enabled is true and a valid DSN is provided.
 *
 * Privacy features:
 * - Sanitizes file paths (removes user names)
 * - Removes sensitive headers and cookies
 * - Only sends error messages and stack traces
 */
function initializeErrorTracking() {
  if (!config.get('sentry.enabled')) {
    logger.info('Sentry disabled (local development mode)');
    return;
  }

  const dsn = config.get('sentry.dsn');
  if (!dsn || dsn.includes('placeholder') || dsn === '') {
    logger.warn('Sentry enabled but DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: `braindump@${config.get('app.version')}`,
      beforeSend(event) {
        // Sanitize sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }

        // Remove file paths from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs.forEach(crumb => {
            if (crumb.data && crumb.data.path) {
              crumb.data.path = crumb.data.path.replace(/\/Users\/[^\/]+/, '/Users/REDACTED');
            }
          });
        }

        // Sanitize exception stack traces
        if (event.exception && event.exception.values) {
          event.exception.values.forEach(exception => {
            if (exception.stacktrace && exception.stacktrace.frames) {
              exception.stacktrace.frames.forEach(frame => {
                if (frame.filename) {
                  frame.filename = frame.filename.replace(/\/Users\/[^\/]+/, '/Users/REDACTED');
                }
              });
            }
          });
        }

        return event;
      },
      integrations: [
        new Sentry.Integrations.Electron({
          ipcMode: Sentry.IPCMode.Both
        })
      ]
    });

    sentryInitialized = true;
    logger.info('Sentry initialized', {
      environment: process.env.NODE_ENV,
      release: config.get('app.version')
    });
  } catch (err) {
    logger.error('Failed to initialize Sentry', { error: err.message });
  }
}

/**
 * Capture an error to both Winston logger and Sentry (if enabled).
 *
 * Always logs to Winston for local debugging. Sends to Sentry only if:
 * 1. Sentry is initialized
 * 2. Configuration enables Sentry
 * 3. Valid DSN is provided
 *
 * @param {Error} error - The error object to capture
 * @param {Object} context - Additional context for the error
 * @param {Object} context.tags - Tags for categorizing (e.g., {component: 'recorder'})
 * @param {Object} context.extra - Extra data (e.g., {audioPath: '/path/to/file.wav'})
 * @param {string} context.level - Sentry level (info, warning, error, fatal)
 *
 * @example
 * captureError(new Error('Transcription failed'), {
 *   tags: { component: 'transcription' },
 *   extra: { audioPath: '/path/to/audio.wav', fileSize: 12345 },
 *   level: 'error'
 * });
 */
function captureError(error, context = {}) {
  // Always log to Winston
  logger.error('Error captured', {
    error: error.message,
    stack: error.stack,
    context
  });

  // Send to Sentry if enabled
  if (sentryInitialized) {
    Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {},
      level: context.level || 'error'
    });
  }
}

/**
 * Check if Sentry is currently enabled and initialized.
 *
 * @returns {boolean} True if Sentry is tracking errors, false otherwise
 */
function isSentryEnabled() {
  return sentryInitialized;
}

// Global singleton instance with default observer
const errorHandler = new ErrorHandler();
errorHandler.subscribe(consoleObserver);

module.exports = {
  ErrorHandler,
  ErrorLevel,
  errorHandler,
  initializeErrorTracking,
  captureError,
  isSentryEnabled
};
