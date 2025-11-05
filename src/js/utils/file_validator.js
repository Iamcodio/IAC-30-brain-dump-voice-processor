/**
 * File validation utilities to eliminate duplicate validation code.
 * Provides centralized file existence, path traversal, and security checks.
 *
 * @module FileValidator
 */

const fs = require('fs');
const path = require('path');
const { errorHandler, ErrorLevel } = require('../error_handler');

/**
 * FileValidator - Centralized file validation and security checks.
 *
 * All methods throw errors on validation failure, allowing callers to
 * catch and handle appropriately. Errors are also logged through errorHandler.
 */
class FileValidator {
  /**
   * Validate that a file exists.
   *
   * @param {string} filePath - Absolute path to file to validate
   * @param {string} context - Context string for error logging (e.g., 'transcribeAudio', 'ipc.read-file')
   * @throws {Error} If file doesn't exist
   * @example
   * FileValidator.validateExists('/path/to/file.txt', 'myFunction');
   */
  static validateExists(filePath, context) {
    if (!fs.existsSync(filePath)) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        context,
        'FileNotFound',
        `File not found: ${filePath}`
      );
      throw new Error(`File not found: ${filePath}`);
    }
  }

  /**
   * Validate path doesn't contain path traversal sequences.
   *
   * Prevents directory traversal attacks by checking for '..' in normalized paths.
   * This is a basic security check to ensure files stay within expected directories.
   *
   * @param {string} filePath - Path to validate
   * @param {string} context - Context string for error logging
   * @throws {Error} If path contains '..' after normalization
   * @example
   * FileValidator.validateNoTraversal('/safe/path/file.txt', 'ipc.read-file');
   * // Throws: FileValidator.validateNoTraversal('/path/../../etc/passwd', 'ipc.read-file');
   */
  static validateNoTraversal(filePath, context) {
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        context,
        'PathTraversalDetected',
        `Invalid file path (path traversal detected): ${filePath}`
      );
      throw new Error('Invalid file path');
    }
  }

  /**
   * Validate file exists and has no path traversal (combined check).
   *
   * Convenience method that combines validateExists() and validateNoTraversal()
   * for common use cases where both checks are needed.
   *
   * @param {string} filePath - Absolute path to file to validate
   * @param {string} context - Context string for error logging
   * @throws {Error} If file doesn't exist or path contains '..'
   * @example
   * FileValidator.validateSafe('/path/to/file.txt', 'ipc.read-file');
   */
  static validateSafe(filePath, context) {
    this.validateExists(filePath, context);
    this.validateNoTraversal(filePath, context);
  }

  /**
   * Validate file is within a base directory.
   *
   * Uses path.relative() to ensure the file is contained within baseDir.
   * Prevents access to files outside the intended directory tree.
   *
   * @param {string} filePath - Absolute path to file to validate
   * @param {string} baseDir - Base directory that file must be within
   * @param {string} context - Context string for error logging
   * @throws {Error} If file is outside baseDir
   * @example
   * FileValidator.validateWithinBase(
   *   '/project/outputs/audio/file.wav',
   *   '/project/outputs',
   *   'ipc.play-audio'
   * );
   */
  static validateWithinBase(filePath, baseDir, context) {
    const normalizedFile = path.normalize(filePath);
    const normalizedBase = path.normalize(baseDir);

    // path.relative returns a path starting with '..' if file is outside base
    const relative = path.relative(normalizedBase, normalizedFile);
    const isInside = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

    if (!isInside) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        context,
        'PathOutsideBase',
        `File path outside base directory: ${filePath} (base: ${baseDir})`
      );
      throw new Error(`File path outside base directory: ${filePath}`);
    }
  }

  /**
   * Validate file exists with detailed error notification.
   *
   * Similar to validateExists() but uses a specific ErrorLevel for critical files.
   * Useful for startup validation where missing files should halt execution.
   *
   * @param {string} filePath - Absolute path to file to validate
   * @param {string} context - Context string for error logging
   * @param {ErrorLevel} errorLevel - Error level to use (defaults to ERROR)
   * @throws {Error} If file doesn't exist
   * @example
   * FileValidator.validateExistsWithLevel(
   *   '/path/to/python',
   *   'startRecorderProcess',
   *   ErrorLevel.CRITICAL
   * );
   */
  static validateExistsWithLevel(filePath, context, errorLevel = ErrorLevel.ERROR) {
    if (!fs.existsSync(filePath)) {
      errorHandler.notify(
        errorLevel,
        context,
        'FileNotFound',
        `File not found at ${filePath}`
      );
      throw new Error(`File not found: ${filePath}`);
    }
  }

  /**
   * Validate file exists but only warn if missing (non-throwing).
   *
   * For optional files where missing file should log a warning but not throw.
   * Returns boolean indicating whether file exists.
   *
   * @param {string} filePath - Path to file to check
   * @param {string} context - Context string for error logging
   * @returns {boolean} True if file exists, false otherwise
   * @example
   * if (!FileValidator.validateExistsWarn('/path/to/optional.txt', 'Database.formatRecording')) {
   *   // Handle missing file gracefully
   * }
   */
  static validateExistsWarn(filePath, context) {
    if (!fs.existsSync(filePath)) {
      errorHandler.notify(
        ErrorLevel.WARNING,
        context,
        'FileNotFound',
        `File not found: ${filePath}`
      );
      return false;
    }
    return true;
  }
}

module.exports = {
  FileValidator
};
