const fs = require('fs');
const path = require('path');
const config = require('config');
const { errorHandler, ErrorLevel, captureError } = require('./src/js/error_handler');
const { FileValidator } = require('./src/js/utils/file_validator.js');
const {
  DURATION,
  DATABASE,
  MARKDOWN,
  ERROR_TYPES,
  CONTEXTS,
  FILE_OPS
} = require('./src/config/constants.js');

/**
 * Database module for managing recordings
 * Uses JSON database file at src/data/recordings.json
 */

class Database {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.dbPath = path.join(baseDir, config.get('paths.databaseFile'));
    this.audioDir = path.join(baseDir, config.get('paths.audioDir'));
    this.transcriptDir = path.join(baseDir, config.get('paths.transcriptDir'));

    // Validate and create database file if needed
    try {
      this.initializeDatabase();
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_CONSTRUCTOR, error, true);
    }
  }

  /**
   * Initialize database file if it doesn't exist
   */
  initializeDatabase() {
    try {
      const dbDir = path.dirname(this.dbPath);

      // Create data directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: FILE_OPS.RECURSIVE_MKDIR });
        errorHandler.notify(
          ErrorLevel.INFO,
          CONTEXTS.DB_INITIALIZE,
          ERROR_TYPES.DIRECTORY_CREATED,
          `Created database directory: ${dbDir}`
        );
      }

      // Create empty database file if it doesn't exist
      if (!fs.existsSync(this.dbPath)) {
        fs.writeFileSync(this.dbPath, JSON.stringify(DATABASE.EMPTY_STRUCTURE, null, DATABASE.JSON_INDENT));
        errorHandler.notify(
          ErrorLevel.INFO,
          CONTEXTS.DB_INITIALIZE,
          ERROR_TYPES.DATABASE_CREATED,
          `Created database file: ${this.dbPath}`
        );
      }
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_INITIALIZE, error);
      throw error;
    }
  }

  /**
   * Read the database file
   * @returns {Object} Database object with recordings array
   */
  readDB() {
    try {
      // Validate file exists
      if (!FileValidator.validateExistsWarn(this.dbPath, CONTEXTS.DB_READ)) {
        return DATABASE.EMPTY_STRUCTURE;
      }

      const data = fs.readFileSync(this.dbPath, FILE_OPS.ENCODING);
      const parsed = JSON.parse(data);

      // Validate structure
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.recordings)) {
        errorHandler.notify(
          ErrorLevel.WARNING,
          CONTEXTS.DB_READ,
          ERROR_TYPES.INVALID_STRUCTURE,
          'Database has invalid structure, returning empty database'
        );
        return DATABASE.EMPTY_STRUCTURE;
      }

      return parsed;
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_READ, error);
      captureError(error, {
        tags: { component: 'database', operation: 'readDB' },
        extra: { dbPath: this.dbPath }
      });
      return DATABASE.EMPTY_STRUCTURE;
    }
  }

  /**
   * Get all recordings sorted by date (newest first)
   * @returns {Array} Array of recording objects
   */
  getAll() {
    try {
      const db = this.readDB();

      if (!db.recordings || db.recordings.length === 0) {
        return [];
      }

      const recordings = db.recordings.map(rec => this.formatRecording(rec));
      return recordings.sort((a, b) => {
        try {
          return new Date(b.timestamp) - new Date(a.timestamp);
        } catch (error) {
          errorHandler.notify(
            ErrorLevel.WARNING,
            CONTEXTS.DB_GET_ALL + '.sort',
            ERROR_TYPES.INVALID_TIMESTAMP,
            'Invalid timestamp in recording'
          );
          return 0;
        }
      });
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_GET_ALL, error);
      captureError(error, {
        tags: { component: 'database', operation: 'getAll' },
        extra: { dbPath: this.dbPath }
      });
      return [];
    }
  }

  /**
   * Format recording object for UI compatibility
   * Converts database format to UI format expected by main.js
   * @param {Object} recording - Recording from database
   * @returns {Object} Formatted recording object
   */
  formatRecording(recording) {
    try {
      // Validate recording object
      if (!recording || typeof recording !== 'object') {
        errorHandler.notify(
          ErrorLevel.WARNING,
          CONTEXTS.DB_FORMAT_RECORDING,
          ERROR_TYPES.INVALID_RECORDING,
          'Invalid recording object'
        );
        return null;
      }

      // Read full text from markdown file if available
      let fullText = '';
      if (recording.transcriptMd) {
        try {
          if (FileValidator.validateExistsWarn(recording.transcriptMd, CONTEXTS.DB_FORMAT_RECORDING)) {
            const content = fs.readFileSync(recording.transcriptMd, FILE_OPS.ENCODING);
            fullText = this.extractTranscriptText(content);
          }
        } catch (error) {
          errorHandler.notify(
            ErrorLevel.WARNING,
            CONTEXTS.DB_FORMAT_RECORDING,
            ERROR_TYPES.TRANSCRIPT_READ_ERROR,
            `Could not read transcript: ${recording.transcriptMd}`
          );
        }
      }

      // Format duration for display
      const durationStr = this.formatDuration(recording.duration);

      return {
        id: recording.id,
        timestamp: this.formatTimestamp(recording.timestamp),
        audioPath: recording.audioFile,
        transcriptPath: recording.transcriptMd || recording.transcriptTxt,
        transcriptTxt: recording.transcriptTxt,
        transcriptMd: recording.transcriptMd,
        duration: durationStr,
        preview: recording.firstLine || DURATION.NO_TRANSCRIPT_LABEL,
        fullText: fullText || recording.firstLine || ''
      };
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_FORMAT_RECORDING, error);
      return null;
    }
  }

  /**
   * Extract transcript text from markdown content
   * @param {string} content - Markdown file content
   * @returns {string} Extracted transcript text
   */
  extractTranscriptText(content) {
    const lines = content.split(MARKDOWN.LINE_SEPARATOR);
    let transcriptText = [];
    let metadataEnded = false;

    for (let line of lines) {
      if (line.trim() === MARKDOWN.SEPARATOR) {
        metadataEnded = true;
      } else if (metadataEnded && line.trim()) {
        transcriptText.push(line.trim());
      }
    }

    return transcriptText.join(MARKDOWN.LINE_SEPARATOR);
  }

  /**
   * Format timestamp for display
   * @param {string} isoTimestamp - ISO format timestamp
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(isoTimestamp) {
    try {
      const date = new Date(isoTimestamp);
      return date.toLocaleString(DATABASE.DATE_LOCALE, DATABASE.DATE_OPTIONS);
    } catch (error) {
      return isoTimestamp;
    }
  }

  /**
   * Format duration for display
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration string
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) {
      return DURATION.UNKNOWN_LABEL;
    }

    if (seconds < DURATION.SECONDS_PER_MINUTE) {
      return `${seconds} sec`;
    } else {
      const minutes = Math.floor(seconds / DURATION.SECONDS_PER_MINUTE);
      const secs = Math.round(seconds % DURATION.SECONDS_PER_MINUTE);
      return `${minutes}m ${secs}s`;
    }
  }

  /**
   * Search recordings by query
   * @param {string} query - Search query
   * @returns {Array} Filtered array of recording objects
   */
  search(query) {
    try {
      const allRecordings = this.getAll();

      // Validate and sanitize query
      if (!query || typeof query !== 'string') {
        return allRecordings;
      }

      query = query.toLowerCase().trim();

      if (!query) {
        return allRecordings;
      }

      return allRecordings.filter(recording => {
        try {
          return (
            (recording.preview && recording.preview.toLowerCase().includes(query)) ||
            (recording.fullText && recording.fullText.toLowerCase().includes(query)) ||
            (recording.timestamp && recording.timestamp.toLowerCase().includes(query))
          );
        } catch (error) {
          errorHandler.notify(
            ErrorLevel.WARNING,
            CONTEXTS.DB_SEARCH + '.filter',
            ERROR_TYPES.FILTER_ERROR,
            `Error filtering recording: ${error.message}`
          );
          return false;
        }
      });
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_SEARCH, error);
      captureError(error, {
        tags: { component: 'database', operation: 'search' },
        extra: { query, dbPath: this.dbPath }
      });
      return [];
    }
  }

  /**
   * Get a recording by ID
   * @param {string} id - Recording ID
   * @returns {Object|null} Recording object or null
   */
  getById(id) {
    try {
      if (!id || typeof id !== 'string') {
        errorHandler.notify(
          ErrorLevel.WARNING,
          CONTEXTS.DB_GET_BY_ID,
          ERROR_TYPES.INVALID_ID,
          'Invalid recording ID provided'
        );
        return null;
      }

      const db = this.readDB();
      const recording = db.recordings.find(rec => rec.id === id);
      return recording ? this.formatRecording(recording) : null;
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_GET_BY_ID, error);
      return null;
    }
  }

  /**
   * Get a single recording by transcript path (for backward compatibility)
   * @param {string} transcriptPath - Path to transcript file
   * @returns {Object|null} Recording object or null
   */
  getByPath(transcriptPath) {
    try {
      if (!transcriptPath || typeof transcriptPath !== 'string') {
        errorHandler.notify(
          ErrorLevel.WARNING,
          CONTEXTS.DB_GET_BY_PATH,
          ERROR_TYPES.INVALID_PATH,
          'Invalid transcript path provided'
        );
        return null;
      }

      const db = this.readDB();
      const recording = db.recordings.find(rec =>
        rec.transcriptMd === transcriptPath || rec.transcriptTxt === transcriptPath
      );
      return recording ? this.formatRecording(recording) : null;
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_GET_BY_PATH, error);
      return null;
    }
  }
}

module.exports = Database;
