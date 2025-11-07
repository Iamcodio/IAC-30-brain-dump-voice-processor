/**
 * Configuration Constants
 *
 * Centralized configuration for the BrainDump Voice Processor application.
 * All magic numbers, strings, paths, and configuration values extracted from
 * the JavaScript codebase for maintainability and consistency.
 */

// ============================================================================
// WINDOW CONFIGURATION
// ============================================================================

/**
 * Main application window configuration
 */
const WINDOW_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  NODE_INTEGRATION: false,
  CONTEXT_ISOLATION: true
};

// ============================================================================
// PATHS
// ============================================================================

/**
 * File paths relative to project root
 */
const PATHS = {
  PYTHON_VENV: '.venv/bin/python',
  RECORDER_SCRIPT: 'recorder.py',
  TRANSCRIBER_SCRIPT: 'transcribe.py',
  PRELOAD_SCRIPT: 'src/preload.js',
  INDEX_HTML: 'index.html',
  HISTORY_HTML: 'history.html',
  DATABASE_FILE: 'src/data/recordings.json',
  AUDIO_OUTPUT_DIR: 'outputs/audio',
  TRANSCRIPT_OUTPUT_DIR: 'outputs/transcripts'
};

// ============================================================================
// PROCESS MANAGEMENT
// ============================================================================

/**
 * Process manager configuration for child processes
 */
const PROCESS_CONFIG = {
  MAX_RESTARTS: 5,
  BASE_DELAY_MS: 1000,
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 5000,
  STDIO_MODE: ['pipe', 'pipe', 'pipe']
};

/**
 * Process restart delays (exponential backoff)
 * Formula: BASE_DELAY_MS * 2^(restartCount-1)
 * Results in: 1s, 2s, 4s, 8s, 16s
 */
const RESTART_DELAYS = {
  ATTEMPT_1: 1000,   // 1 second
  ATTEMPT_2: 2000,   // 2 seconds
  ATTEMPT_3: 4000,   // 4 seconds
  ATTEMPT_4: 8000,   // 8 seconds
  ATTEMPT_5: 16000   // 16 seconds
};

// ============================================================================
// PROTOCOL MESSAGES
// ============================================================================

/**
 * Protocol messages for IPC between Electron and Python processes
 */
const PROTOCOL = {
  // Recorder process messages (stdout)
  READY: 'READY',
  RECORDING_STARTED: 'RECORDING_STARTED',
  RECORDING_STOPPED: 'RECORDING_STOPPED:',
  ERROR_PREFIX: 'ERROR:',

  // Transcriber process messages (stdout)
  TRANSCRIPT_SAVED: 'TRANSCRIPT_SAVED:',

  // Commands to Python processes (stdin)
  CMD_START: 'start\n',
  CMD_STOP: 'stop\n',
  CMD_QUIT: 'quit\n',

  // Special values
  NO_AUDIO_CAPTURED: 'no_audio'
};

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Global keyboard shortcuts
 */
const SHORTCUTS = {
  TOGGLE_RECORDING: 'Control+Y'
};

// ============================================================================
// PLATFORM-SPECIFIC
// ============================================================================

/**
 * Platform-specific configuration
 */
const PLATFORM = {
  DARWIN: 'darwin',
  AUDIO_PLAYER_MACOS: 'QuickTime Player'
};

// ============================================================================
// EXIT CODES
// ============================================================================

/**
 * Process exit codes
 */
const EXIT_CODES = {
  SUCCESS: 0,
  FATAL_ERROR: 1
};

// ============================================================================
// UI CONFIGURATION
// ============================================================================

/**
 * UI element display states
 */
const DISPLAY = {
  BLOCK: 'block',
  NONE: 'none'
};

/**
 * UI status messages
 */
const STATUS_MESSAGES = {
  READY: 'Ready - Press Ctrl+Y to start',
  RECORDING: 'Recording...',
  TRANSCRIBING: 'Transcribing...'
};

/**
 * UI CSS class names
 */
const CSS_CLASSES = {
  READY: 'ready',
  RECORDING: 'recording',
  SHOW: 'show',
  RECORDING_ITEM: 'recording-item',
  RECORDING_HEADER: 'recording-header',
  RECORDING_DATE: 'recording-date',
  RECORDING_DURATION: 'recording-duration',
  RECORDING_PREVIEW: 'recording-preview',
  RECORDING_ACTIONS: 'recording-actions',
  ACTION_BTN: 'action-btn',
  ACTION_BTN_PLAY: 'play',
  ACTION_BTN_COPY: 'copy'
};

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Text formatting and truncation limits
 */
const TEXT_LIMITS = {
  PREVIEW_MAX_LENGTH: 150,
  PREVIEW_ELLIPSIS: '...'
};

/**
 * Duration formatting thresholds
 */
const DURATION = {
  SECONDS_PER_MINUTE: 60,
  UNKNOWN_LABEL: 'Unknown',
  NO_TRANSCRIPT_LABEL: 'No transcript available'
};

/**
 * Date and time formatting
 */
const DATE_FORMAT = {
  MONTHS_SHORT: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  TIME_12H_THRESHOLD: 12,
  MINUTE_PAD_LENGTH: 2,
  HOUR_PAD_LENGTH: 2,
  PAD_CHAR: '0'
};

/**
 * Timestamp parsing regex
 * Matches format: 2025-10-25_03-17-45
 */
const TIMESTAMP_REGEX = /(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/;

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

/**
 * Database structure and formatting
 */
const DATABASE = {
  JSON_INDENT: 2,
  EMPTY_STRUCTURE: { recordings: [] },
  DATE_LOCALE: 'en-US',
  DATE_OPTIONS: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
};

// ============================================================================
// MARKDOWN PARSING
// ============================================================================

/**
 * Markdown content parsing
 */
const MARKDOWN = {
  SEPARATOR: '---',
  HEADER_PREFIX: '#',
  METADATA_PREFIX: '**',
  LINE_SEPARATOR: '\n'
};

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Toast notification configuration
 */
const TOAST = {
  DURATION_MS: 3000,
  TYPE_SUCCESS: 'success',
  TYPE_ERROR: 'error',
  COLOR_SUCCESS: '#4caf50',
  COLOR_ERROR: '#f44336'
};

// ============================================================================
// UI BUTTON CONTENT
// ============================================================================

/**
 * Button labels and icons (HTML content)
 */
const BUTTON_CONTENT = {
  PLAY: '<span>▶</span><span>Play</span>',
  VIEW: '<span>📄</span><span>View</span>',
  COPY: '<span>📋</span><span>Copy</span>'
};

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * User-facing messages
 */
const MESSAGES = {
  COPY_SUCCESS: 'Copied to clipboard!',
  COPY_ERROR: 'Failed to copy transcript',
  LOAD_ERROR: 'Error loading recordings',
  RECORDER_NOT_READY: 'Recorder not ready',
  RECORDER_ERROR: 'Recorder process error',
  FILE_NOT_FOUND: 'File not found',
  INVALID_FILE_PATH: 'Invalid file path',
  DATABASE_NOT_INITIALIZED: 'Database not initialized',
  SHORTCUT_REGISTRATION_FAILED: 'Shortcut registration failed'
};

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error type constants for error handler
 */
const ERROR_TYPES = {
  // File errors
  PYTHON_NOT_FOUND: 'PythonNotFound',
  SCRIPT_NOT_FOUND: 'ScriptNotFound',
  FILE_NOT_FOUND: 'FileNotFound',
  TRANSCRIPT_NOT_FOUND: 'TranscriptNotFound',
  TRANSCRIPT_READ_ERROR: 'TranscriptReadError',

  // Process errors
  PROCESS_ERROR: 'ProcessError',
  PROCESS_RESTARTING: 'ProcessRestarting',
  PROCESS_FAILED: 'ProcessFailed',
  ALREADY_RUNNING: 'AlreadyRunning',
  PROCESS_NOT_RUNNING: 'ProcessNotRunning',
  FORCED_KILL: 'ForcedKill',
  MAX_RESTARTS_EXCEEDED: 'MaxRestartsExceeded',

  // Recording errors
  RECORDER_READY: 'RecorderReady',
  RECORDER_NOT_READY: 'RecorderNotReady',
  RECORDER_ERROR: 'RecorderError',
  NO_AUDIO_RECORDED: 'NoAudioRecorded',
  SEND_FAILED: 'SendFailed',

  // Transcription errors
  TRANSCRIPTION_ERROR: 'TranscriptionError',
  TRANSCRIPTION_FAILED: 'TranscriptionFailed',
  TRANSCRIPTION_COMPLETE: 'TranscriptionComplete',
  TRANSCRIPT_SAVED: 'TranscriptSaved',

  // Database errors
  DIRECTORY_CREATED: 'DirectoryCreated',
  DATABASE_CREATED: 'DatabaseCreated',
  INVALID_STRUCTURE: 'InvalidStructure',
  INVALID_TIMESTAMP: 'InvalidTimestamp',
  INVALID_RECORDING: 'InvalidRecording',
  INVALID_ID: 'InvalidId',
  INVALID_PATH: 'InvalidPath',

  // Observer errors
  OBSERVER_FAILURE: 'ObserverFailure',
  RESTART_COUNT_RESET: 'RestartCountReset',
  RESTART_SCHEDULED: 'RestartScheduled',
  PROCESS_STARTING: 'ProcessStarting',
  PROCESS_RESTARTED: 'ProcessRestarted',
  PROCESS_EXITED: 'ProcessExited',
  PROCESS_STOPPING: 'ProcessStopping',
  FILTER_ERROR: 'FilterError',

  // Validation errors
  VALIDATION_ERROR: 'ValidationError'
};

// ============================================================================
// CONTEXT NAMES
// ============================================================================

/**
 * Context identifiers for error tracking
 */
const CONTEXTS = {
  START_RECORDER: 'startRecorderProcess',
  TRANSCRIBE_AUDIO: 'transcribeAudio',
  START_RECORDING: 'startRecording',
  STOP_RECORDING: 'stopRecording',
  APP_WILL_QUIT: 'app.will-quit',

  // IPC handlers
  IPC_GET_RECORDINGS: 'ipc.get-recordings',
  IPC_SEARCH_RECORDINGS: 'ipc.search-recordings',
  IPC_READ_FILE: 'ipc.read-file',
  IPC_PLAY_AUDIO: 'ipc.play-audio',
  IPC_VIEW_FILE: 'ipc.view-file',
  IPC_SHOW_HISTORY: 'ipc.show-history',
  IPC_SHOW_RECORDER: 'ipc.show-recorder',

  // Database
  DB_CONSTRUCTOR: 'Database.constructor',
  DB_INITIALIZE: 'Database.initializeDatabase',
  DB_READ: 'Database.readDB',
  DB_GET_ALL: 'Database.getAll',
  DB_FORMAT_RECORDING: 'Database.formatRecording',
  DB_SEARCH: 'Database.search',
  DB_GET_BY_ID: 'Database.getById',
  DB_GET_BY_PATH: 'Database.getByPath',

  // Process Manager
  PM_START: 'ProcessManager.start',
  PM_ERROR: 'ProcessManager.error',
  PM_EXIT: 'ProcessManager.exit',
  PM_RESTART: 'ProcessManager.restart',
  PM_RESET: 'ProcessManager.reset',
  PM_STOP: 'ProcessManager.stop',
  PM_SEND: 'ProcessManager.send',

  // Error Handler
  ERROR_HANDLER: 'ErrorHandler',
  OBSERVER_FAILURE: 'ErrorHandler:ObserverFailure',

  // Recorder
  RECORDER_STDOUT: 'recorder.stdout',
  RECORDER_PROCESS: 'recorder.process',

  // Transcriber
  TRANSCRIBE_SPAWN: 'transcribeAudio.spawn',
  TRANSCRIBE_STDOUT: 'transcribeAudio.stdout'
};

// ============================================================================
// SEARCH AND FILTER
// ============================================================================

/**
 * Search and filter configuration
 */
const SEARCH = {
  MIN_QUERY_LENGTH: 0,
  TRIM_WHITESPACE: true,
  CASE_INSENSITIVE: true
};

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * File operation configuration
 */
const FILE_OPS = {
  ENCODING: 'utf-8',
  PATH_TRAVERSAL_INDICATOR: '..',
  RECURSIVE_MKDIR: true
};

// ============================================================================
// SPAWN COMMANDS
// ============================================================================

/**
 * External command configuration
 */
const SPAWN_COMMANDS = {
  MACOS_OPEN: 'open',
  MACOS_OPEN_APP_FLAG: '-a'
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  WINDOW_CONFIG,
  PATHS,
  PROCESS_CONFIG,
  RESTART_DELAYS,
  PROTOCOL,
  SHORTCUTS,
  PLATFORM,
  EXIT_CODES,
  DISPLAY,
  STATUS_MESSAGES,
  CSS_CLASSES,
  TEXT_LIMITS,
  DURATION,
  DATE_FORMAT,
  TIMESTAMP_REGEX,
  DATABASE,
  MARKDOWN,
  TOAST,
  BUTTON_CONTENT,
  MESSAGES,
  ERROR_TYPES,
  CONTEXTS,
  SEARCH,
  FILE_OPS,
  SPAWN_COMMANDS
};
