/**
 * Centralized error handling using Observer pattern with Sentry integration.
 *
 * Provides a singleton ErrorHandler that observers can subscribe to
 * for logging, notifications, and error recovery in JavaScript/Electron.
 * Integrates with Sentry for optional production error tracking.
 */

import * as Sentry from '@sentry/electron';
import config from 'config';
import logger = require('../utils/logger');

type ObserverFunction = (
  level: string,
  context: string,
  errorType: string,
  message: string,
  error: Error | null
) => void;

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: string;
}

class ErrorLevel {
  static readonly INFO = 'INFO';
  static readonly WARNING = 'WARNING';
  static readonly ERROR = 'ERROR';
  static readonly CRITICAL = 'CRITICAL';
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private observers: ObserverFunction[] = [];
  private errorCount: number = 0;

  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }

    ErrorHandler.instance = this;
  }

  /**
   * Subscribe an observer to error notifications.
   * @param observer - Callback(level, context, errorType, message, error)
   */
  public subscribe(observer: ObserverFunction): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  /**
   * Unsubscribe an observer from notifications.
   * @param observer - The observer to remove
   */
  public unsubscribe(observer: ObserverFunction): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Notify all observers of an error event.
   * @param level - Error severity (INFO, WARNING, ERROR, CRITICAL)
   * @param context - Where the error occurred (module/function)
   * @param errorType - Type of error (FileNotFound, ValidationError, etc.)
   * @param message - Human-readable error description
   * @param error - Optional Error object for stack traces
   */
  public notify(
    level: string,
    context: string,
    errorType: string,
    message: string,
    error: Error | null = null
  ): void {
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
   * @param context - Where the exception occurred
   * @param error - The caught exception
   * @param fatal - If true, exit process after logging
   */
  public handleException(context: string, error: Error, fatal: boolean = false): void {
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
   * @returns Error count
   */
  public getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * Reset error counter (useful for testing).
   */
  public resetCount(): void {
    this.errorCount = 0;
  }
}

/**
 * Default console observer with structured logging.
 * Format: [timestamp] LEVEL:context:type:message
 */
function consoleObserver(
  level: string,
  context: string,
  errorType: string,
  message: string,
  error: Error | null
): void {
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
function initializeErrorTracking(): void {
  if (!config.get<boolean>('sentry.enabled')) {
    logger.info('Sentry disabled (local development mode)');
    return;
  }

  const dsn = config.get<string>('sentry.dsn');
  if (!dsn || dsn.includes('placeholder') || dsn === '') {
    logger.warn('Sentry enabled but DSN not configured');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: `braindump@${config.get<string>('app.version')}`,
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
              crumb.data.path = (crumb.data.path as string).replace(/\/Users\/[^\/]+/, '/Users/REDACTED');
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
        new (Sentry as any).Integrations.Electron({
          ipcMode: (Sentry as any).IPCMode.Both
        })
      ]
    });

    sentryInitialized = true;
    logger.info('Sentry initialized', {
      environment: process.env.NODE_ENV,
      release: config.get<string>('app.version')
    });
  } catch (err) {
    logger.error('Failed to initialize Sentry', { error: (err as Error).message });
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
 * @param error - The error object to capture
 * @param context - Additional context for the error
 *
 * @example
 * captureError(new Error('Transcription failed'), {
 *   tags: { component: 'transcription' },
 *   extra: { audioPath: '/path/to/audio.wav', fileSize: 12345 },
 *   level: 'error'
 * });
 */
function captureError(error: Error, context: ErrorContext = {}): void {
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
      level: context.level as Sentry.SeverityLevel || 'error'
    });
  }
}

/**
 * Check if Sentry is currently enabled and initialized.
 *
 * @returns True if Sentry is tracking errors, false otherwise
 */
function isSentryEnabled(): boolean {
  return sentryInitialized;
}

// Global singleton instance with default observer
const errorHandler = new ErrorHandler();
errorHandler.subscribe(consoleObserver);

export {
  ErrorHandler,
  ErrorLevel,
  errorHandler,
  initializeErrorTracking,
  captureError,
  isSentryEnabled
};
