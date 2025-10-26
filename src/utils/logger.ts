/**
 * Production-grade Winston logger
 *
 * Features:
 * - JSON format for production parsing
 * - Human-readable console output for development
 * - Daily rotating file transport (14-day retention, 20MB max)
 * - Separate error log file
 * - Environment-aware log levels
 */

import * as winston from 'winston';
import * as path from 'path';
import 'winston-daily-rotate-file';

// Determine log level from environment or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Define log directory
const logsDir = path.join(__dirname, '..', '..', 'logs');

/**
 * Custom format for console output
 * Includes timestamp, level, service, and message
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${level}] [${service}]: ${message}`;

    // Append metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

/**
 * JSON format for file output
 * Structured logging for production parsing
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Daily rotating file transport
 * Keeps logs for 14 days, max 20MB per file
 */
const dailyRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat
});

/**
 * Error-only file transport
 * Separate file for error-level logs
 */
const errorFileTransport = new winston.transports.File({
  filename: path.join(logsDir, 'error.log'),
  level: 'error',
  format: fileFormat
});

/**
 * Console transport
 * Human-readable output for development
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat
});

/**
 * Winston logger instance
 */
const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'braindump' },
  transports: [
    consoleTransport,
    dailyRotateTransport,
    errorFileTransport
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

/**
 * Export logger singleton
 */
export = logger;
