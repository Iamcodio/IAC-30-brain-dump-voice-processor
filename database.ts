import * as fs from 'fs';
import * as path from 'path';
import config from 'config';
import { errorHandler, ErrorLevel, captureError } from './src/js/error_handler';
import { FileValidator } from './src/js/utils/file_validator';
import {
  DURATION,
  DATABASE,
  MARKDOWN,
  ERROR_TYPES,
  CONTEXTS,
  FILE_OPS
} from './src/config/constants';

interface RawRecording {
  id: string;
  audioFile: string;
  transcriptMd?: string;
  transcriptTxt?: string;
  timestamp: string;
  duration?: number;
  firstLine?: string;
}

interface FormattedRecording {
  id: string;
  timestamp: string;
  audioPath: string;
  transcriptPath: string;
  transcriptTxt?: string;
  transcriptMd?: string;
  duration: string;
  preview: string;
  fullText: string;
}

interface DatabaseStructure {
  recordings: RawRecording[];
}

/**
 * Database module for managing recordings
 * Uses JSON database file at src/data/recordings.json
 */
class Database {
  private baseDir: string;
  private dbPath: string;
  private audioDir: string;
  private transcriptDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.dbPath = path.join(baseDir, config.get<string>('paths.databaseFile'));
    this.audioDir = path.join(baseDir, config.get<string>('paths.audioDir'));
    this.transcriptDir = path.join(baseDir, config.get<string>('paths.transcriptDir'));

    // Validate and create database file if needed
    try {
      this.initializeDatabase();
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_CONSTRUCTOR, error as Error, true);
    }
  }

  /**
   * Initialize database file if it doesn't exist
   */
  private initializeDatabase(): void {
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
      errorHandler.handleException(CONTEXTS.DB_INITIALIZE, error as Error);
      throw error;
    }
  }

  /**
   * Read the database file
   * @returns Database object with recordings array
   */
  private readDB(): DatabaseStructure {
    try {
      // Validate file exists
      if (!FileValidator.validateExistsWarn(this.dbPath, CONTEXTS.DB_READ)) {
        return DATABASE.EMPTY_STRUCTURE as DatabaseStructure;
      }

      const data = fs.readFileSync(this.dbPath, FILE_OPS.ENCODING as BufferEncoding);
      const parsed = JSON.parse(data);

      // Validate structure
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.recordings)) {
        errorHandler.notify(
          ErrorLevel.WARNING,
          CONTEXTS.DB_READ,
          ERROR_TYPES.INVALID_STRUCTURE,
          'Database has invalid structure, returning empty database'
        );
        return DATABASE.EMPTY_STRUCTURE as DatabaseStructure;
      }

      return parsed as DatabaseStructure;
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_READ, error as Error);
      captureError(error as Error, {
        tags: { component: 'database', operation: 'readDB' },
        extra: { dbPath: this.dbPath }
      });
      return DATABASE.EMPTY_STRUCTURE as DatabaseStructure;
    }
  }

  /**
   * Get all recordings sorted by date (newest first)
   * @returns Array of recording objects
   */
  public getAll(): FormattedRecording[] {
    try {
      const db = this.readDB();

      if (!db.recordings || db.recordings.length === 0) {
        return [];
      }

      const recordings = db.recordings
        .map(rec => this.formatRecording(rec))
        .filter((rec): rec is FormattedRecording => rec !== null);

      return recordings.sort((a, b) => {
        try {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
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
      errorHandler.handleException(CONTEXTS.DB_GET_ALL, error as Error);
      captureError(error as Error, {
        tags: { component: 'database', operation: 'getAll' },
        extra: { dbPath: this.dbPath }
      });
      return [];
    }
  }

  /**
   * Format recording object for UI compatibility
   * Converts database format to UI format expected by main.js
   * @param recording - Recording from database
   * @returns Formatted recording object
   */
  private formatRecording(recording: RawRecording): FormattedRecording | null {
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
            const content = fs.readFileSync(recording.transcriptMd, FILE_OPS.ENCODING as BufferEncoding);
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
        transcriptPath: recording.transcriptMd || recording.transcriptTxt || '',
        transcriptTxt: recording.transcriptTxt,
        transcriptMd: recording.transcriptMd,
        duration: durationStr,
        preview: recording.firstLine || DURATION.NO_TRANSCRIPT_LABEL,
        fullText: fullText || recording.firstLine || ''
      };
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_FORMAT_RECORDING, error as Error);
      return null;
    }
  }

  /**
   * Extract transcript text from markdown content
   * @param content - Markdown file content
   * @returns Extracted transcript text
   */
  private extractTranscriptText(content: string): string {
    const lines = content.split(MARKDOWN.LINE_SEPARATOR);
    const transcriptText: string[] = [];
    let metadataEnded = false;

    for (const line of lines) {
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
   * @param isoTimestamp - ISO format timestamp
   * @returns Formatted timestamp
   */
  private formatTimestamp(isoTimestamp: string): string {
    try {
      const date = new Date(isoTimestamp);
      return date.toLocaleString(DATABASE.DATE_LOCALE, DATABASE.DATE_OPTIONS as Intl.DateTimeFormatOptions);
    } catch (error) {
      return isoTimestamp;
    }
  }

  /**
   * Format duration for display
   * @param seconds - Duration in seconds
   * @returns Formatted duration string
   */
  private formatDuration(seconds?: number): string {
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
   * @param query - Search query
   * @returns Filtered array of recording objects
   */
  public search(query: string): FormattedRecording[] {
    try {
      const allRecordings = this.getAll();

      // Validate and sanitize query
      if (!query || typeof query !== 'string') {
        return allRecordings;
      }

      const normalizedQuery = query.toLowerCase().trim();

      if (!normalizedQuery) {
        return allRecordings;
      }

      return allRecordings.filter(recording => {
        try {
          return (
            (recording.preview && recording.preview.toLowerCase().includes(normalizedQuery)) ||
            (recording.fullText && recording.fullText.toLowerCase().includes(normalizedQuery)) ||
            (recording.timestamp && recording.timestamp.toLowerCase().includes(normalizedQuery))
          );
        } catch (error) {
          errorHandler.notify(
            ErrorLevel.WARNING,
            CONTEXTS.DB_SEARCH + '.filter',
            ERROR_TYPES.FILTER_ERROR,
            `Error filtering recording: ${(error as Error).message}`
          );
          return false;
        }
      });
    } catch (error) {
      errorHandler.handleException(CONTEXTS.DB_SEARCH, error as Error);
      captureError(error as Error, {
        tags: { component: 'database', operation: 'search' },
        extra: { query, dbPath: this.dbPath }
      });
      return [];
    }
  }

  /**
   * Get a recording by ID
   * @param id - Recording ID
   * @returns Recording object or null
   */
  public getById(id: string): FormattedRecording | null {
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
      errorHandler.handleException(CONTEXTS.DB_GET_BY_ID, error as Error);
      return null;
    }
  }

  /**
   * Get a single recording by transcript path (for backward compatibility)
   * @param transcriptPath - Path to transcript file
   * @returns Recording object or null
   */
  public getByPath(transcriptPath: string): FormattedRecording | null {
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
      errorHandler.handleException(CONTEXTS.DB_GET_BY_PATH, error as Error);
      return null;
    }
  }
}

export = Database;
