const fs = require('fs');
const path = require('path');
const { errorHandler, ErrorLevel } = require('./src/js/error_handler');

/**
 * Database module for managing recordings
 * Uses JSON database file at src/data/recordings.json
 */

class Database {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.dbPath = path.join(baseDir, 'src', 'data', 'recordings.json');
    this.audioDir = path.join(baseDir, 'outputs', 'audio');
    this.transcriptDir = path.join(baseDir, 'outputs', 'transcripts');

    // Validate and create database file if needed
    try {
      this.initializeDatabase();
    } catch (error) {
      errorHandler.handleException('Database.constructor', error, true);
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
        fs.mkdirSync(dbDir, { recursive: true });
        errorHandler.notify(
          ErrorLevel.INFO,
          'Database.initializeDatabase',
          'DirectoryCreated',
          `Created database directory: ${dbDir}`
        );
      }

      // Create empty database file if it doesn't exist
      if (!fs.existsSync(this.dbPath)) {
        const emptyDB = { recordings: [] };
        fs.writeFileSync(this.dbPath, JSON.stringify(emptyDB, null, 2));
        errorHandler.notify(
          ErrorLevel.INFO,
          'Database.initializeDatabase',
          'DatabaseCreated',
          `Created database file: ${this.dbPath}`
        );
      }
    } catch (error) {
      errorHandler.handleException('Database.initializeDatabase', error);
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
      if (!fs.existsSync(this.dbPath)) {
        errorHandler.notify(
          ErrorLevel.WARNING,
          'Database.readDB',
          'FileNotFound',
          'Database file not found, returning empty database'
        );
        return { recordings: [] };
      }

      const data = fs.readFileSync(this.dbPath, 'utf-8');
      const parsed = JSON.parse(data);

      // Validate structure
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.recordings)) {
        errorHandler.notify(
          ErrorLevel.WARNING,
          'Database.readDB',
          'InvalidStructure',
          'Database has invalid structure, returning empty database'
        );
        return { recordings: [] };
      }

      return parsed;
    } catch (error) {
      errorHandler.handleException('Database.readDB', error);
      return { recordings: [] };
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
            'Database.getAll.sort',
            'InvalidTimestamp',
            'Invalid timestamp in recording'
          );
          return 0;
        }
      });
    } catch (error) {
      errorHandler.handleException('Database.getAll', error);
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
          'Database.formatRecording',
          'InvalidRecording',
          'Invalid recording object'
        );
        return null;
      }

      // Read full text from markdown file if available
      let fullText = '';
      if (recording.transcriptMd) {
        try {
          if (fs.existsSync(recording.transcriptMd)) {
            const content = fs.readFileSync(recording.transcriptMd, 'utf-8');
            fullText = this.extractTranscriptText(content);
          } else {
            errorHandler.notify(
              ErrorLevel.WARNING,
              'Database.formatRecording',
              'TranscriptNotFound',
              `Transcript file not found: ${recording.transcriptMd}`
            );
          }
        } catch (error) {
          errorHandler.notify(
            ErrorLevel.WARNING,
            'Database.formatRecording',
            'TranscriptReadError',
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
        preview: recording.firstLine || 'No transcript available',
        fullText: fullText || recording.firstLine || ''
      };
    } catch (error) {
      errorHandler.handleException('Database.formatRecording', error);
      return null;
    }
  }

  /**
   * Extract transcript text from markdown content
   * @param {string} content - Markdown file content
   * @returns {string} Extracted transcript text
   */
  extractTranscriptText(content) {
    const lines = content.split('\n');
    let transcriptText = [];
    let metadataEnded = false;

    for (let line of lines) {
      if (line.trim() === '---') {
        metadataEnded = true;
      } else if (metadataEnded && line.trim()) {
        transcriptText.push(line.trim());
      }
    }

    return transcriptText.join('\n');
  }

  /**
   * Format timestamp for display
   * @param {string} isoTimestamp - ISO format timestamp
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(isoTimestamp) {
    try {
      const date = new Date(isoTimestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
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
      return 'Unknown';
    }

    if (seconds < 60) {
      return `${seconds} sec`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
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
            'Database.search.filter',
            'FilterError',
            `Error filtering recording: ${error.message}`
          );
          return false;
        }
      });
    } catch (error) {
      errorHandler.handleException('Database.search', error);
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
          'Database.getById',
          'InvalidId',
          'Invalid recording ID provided'
        );
        return null;
      }

      const db = this.readDB();
      const recording = db.recordings.find(rec => rec.id === id);
      return recording ? this.formatRecording(recording) : null;
    } catch (error) {
      errorHandler.handleException('Database.getById', error);
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
          'Database.getByPath',
          'InvalidPath',
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
      errorHandler.handleException('Database.getByPath', error);
      return null;
    }
  }
}

module.exports = Database;
