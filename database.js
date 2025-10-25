const fs = require('fs');
const path = require('path');

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
  }

  /**
   * Read the database file
   * @returns {Object} Database object with recordings array
   */
  readDB() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Database read error, initializing empty database:', error.message);
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
      const recordings = db.recordings.map(rec => this.formatRecording(rec));
      return recordings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error getting recordings:', error);
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
    // Read full text from markdown file if available
    let fullText = '';
    if (recording.transcriptMd && fs.existsSync(recording.transcriptMd)) {
      try {
        const content = fs.readFileSync(recording.transcriptMd, 'utf-8');
        fullText = this.extractTranscriptText(content);
      } catch (error) {
        console.warn(`Could not read transcript: ${recording.transcriptMd}`);
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
    const allRecordings = this.getAll();
    query = query.toLowerCase().trim();

    if (!query) {
      return allRecordings;
    }

    return allRecordings.filter(recording => {
      return (
        (recording.preview && recording.preview.toLowerCase().includes(query)) ||
        (recording.fullText && recording.fullText.toLowerCase().includes(query)) ||
        (recording.timestamp && recording.timestamp.toLowerCase().includes(query))
      );
    });
  }

  /**
   * Get a recording by ID
   * @param {string} id - Recording ID
   * @returns {Object|null} Recording object or null
   */
  getById(id) {
    const db = this.readDB();
    const recording = db.recordings.find(rec => rec.id === id);
    return recording ? this.formatRecording(recording) : null;
  }

  /**
   * Get a single recording by transcript path (for backward compatibility)
   * @param {string} transcriptPath - Path to transcript file
   * @returns {Object|null} Recording object or null
   */
  getByPath(transcriptPath) {
    const db = this.readDB();
    const recording = db.recordings.find(rec =>
      rec.transcriptMd === transcriptPath || rec.transcriptTxt === transcriptPath
    );
    return recording ? this.formatRecording(recording) : null;
  }
}

module.exports = Database;
