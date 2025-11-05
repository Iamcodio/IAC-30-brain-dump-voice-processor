/**
 * RecorderManager - Manages recorder process lifecycle and recording control.
 *
 * Responsibilities:
 * - Manage recorder process lifecycle (start, stop, restart)
 * - Handle all recorder events (stdout, stderr, error, restart, failed)
 * - Control recording state (start/stop commands)
 * - Validate Python and script paths on startup
 * - Notify UI of recorder state changes
 * - Emit custom events for transcription integration
 *
 * @module RecorderManager
 */

const path = require('path');
const config = require('config');
const Sentry = require('@sentry/electron');
const { ProcessManager } = require('../process_manager');
const { FileValidator } = require('../utils/file_validator');
const { errorHandler, ErrorLevel, captureError } = require('../error_handler');
const {
  ERROR_TYPES,
  CONTEXTS
} = require('../../config/constants');
const logger = require('../../utils/logger');
const metrics = require('../../utils/metrics');

/**
 * RecorderManager class - Manages audio recorder process and recording state.
 */
class RecorderManager {
  /**
   * Creates a new RecorderManager instance.
   *
   * @param {BrowserWindow} mainWindow - Electron BrowserWindow for UI notifications
   * @param {string} baseDir - Base directory path (usually __dirname from main.js)
   */
  constructor(mainWindow, baseDir) {
    this.mainWindow = mainWindow;
    this.baseDir = baseDir;
    this.processManager = null;
    this.isRecording = false;
    this.eventHandlers = {}; // For custom events like 'recordingComplete'
    this.recordingStartTime = null; // Track recording start time for metrics
  }

  /**
   * Start the recorder process.
   * Validates Python and script paths, creates ProcessManager, and starts the process.
   *
   * @throws {Error} If Python or script paths don't exist (CRITICAL level)
   */
  start() {
    const pythonPath = path.join(this.baseDir, config.get('paths.pythonVenv'));
    const scriptPath = path.join(this.baseDir, config.get('paths.recorderScript'));

    // Validate paths exist
    FileValidator.validateExistsWithLevel(pythonPath, CONTEXTS.START_RECORDER, ErrorLevel.CRITICAL);
    FileValidator.validateExistsWithLevel(scriptPath, CONTEXTS.START_RECORDER, ErrorLevel.CRITICAL);

    // Create process manager
    this.processManager = new ProcessManager({
      name: 'recorder',
      command: pythonPath,
      args: [scriptPath],
      cwd: this.baseDir,
      maxRestarts: config.get('process.maxRestarts'),
      baseDelay: config.get('process.baseDelayMs')
    });

    // Attach event handlers
    this.processManager.on('stdout', this.handleStdout.bind(this));
    this.processManager.on('stderr', this.handleStderr.bind(this));
    this.processManager.on('error', this.handleError.bind(this));
    this.processManager.on('restarting', this.handleRestarting.bind(this));
    this.processManager.on('failed', this.handleFailed.bind(this));

    // Start process
    this.processManager.start();
  }

  /**
   * Handle stdout messages from recorder process.
   * Processes protocol messages: READY, RECORDING_STARTED, RECORDING_STOPPED, ERROR.
   *
   * @param {Buffer} data - Raw stdout data from process
   */
  handleStdout(data) {
    const output = data.toString().trim();

    try {
      logger.debug('Python stdout', { output });
    } catch (e) {
      // Ignore EPIPE errors during shutdown
    }

    try {
      if (output === config.get('protocol.ready')) {
        errorHandler.notify(ErrorLevel.INFO, CONTEXTS.RECORDER_STDOUT, ERROR_TYPES.RECORDER_READY, 'Recorder process ready');
        this.processManager.resetRestartCount();
      } else if (output === config.get('protocol.recordingStarted')) {
        this.notifyUI('recording-started');
        metrics.activeRecordings.inc();
        this.recordingStartTime = Date.now();
      } else if (output.startsWith(config.get('protocol.recordingStopped'))) {
        const filename = output.split(':')[1];
        this.notifyUI('recording-stopped');

        // Calculate recording duration for metrics
        if (this.recordingStartTime) {
          const duration = (Date.now() - this.recordingStartTime) / 1000;
          metrics.recordingDuration.observe({ status: 'success' }, duration);
          this.recordingStartTime = null;
        }
        metrics.activeRecordings.dec();

        if (filename && filename !== config.get('protocol.noAudioCaptured')) {
          try {
            logger.info('Recording saved', { filename });
          } catch (e) {
            // Ignore EPIPE errors during shutdown
          }
          metrics.totalRecordings.inc({ status: 'success' });
          this.emit('recordingComplete', filename); // Emit for transcription service
        } else {
          errorHandler.notify(ErrorLevel.WARNING, CONTEXTS.RECORDER_STDOUT, ERROR_TYPES.NO_AUDIO_RECORDED, 'No audio captured');
          metrics.totalRecordings.inc({ status: 'no_audio' });
        }
      } else if (output.startsWith(config.get('protocol.errorPrefix'))) {
        errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.RECORDER_STDOUT, ERROR_TYPES.RECORDER_ERROR, output);
        metrics.errorCounter.inc({ component: 'recorder', error_type: 'recording_error' });
        metrics.totalRecordings.inc({ status: 'error' });
        if (this.recordingStartTime) {
          metrics.activeRecordings.dec();
          this.recordingStartTime = null;
        }
        this.notifyUI('recording-error', output);
      }
    } catch (error) {
      errorHandler.handleException('RecorderManager.handleStdout', error);
    }
  }

  /**
   * Handle stderr messages from recorder process.
   * Logs stderr output (Python error_handler outputs to stderr).
   *
   * @param {Buffer} data - Raw stderr data from process
   */
  handleStderr(data) {
    const stderr = data.toString().trim();
    try {
      logger.error('Recorder stderr', { stderr });
    } catch (e) {
      // Ignore EPIPE errors during shutdown
    }

    captureError(new Error('Recorder process error'), {
      tags: { component: 'recorder' },
      extra: { stderr }
    });
  }

  /**
   * Handle process error events.
   *
   * @param {Error} error - Error object from process
   */
  handleError(error) {
    errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.RECORDER_PROCESS, ERROR_TYPES.PROCESS_ERROR, `Recorder process error: ${error.message}`);
    metrics.errorCounter.inc({ component: 'recorder', error_type: 'process_error' });
    captureError(error, {
      tags: { component: 'recorder', type: 'process_error' },
      extra: { context: 'recorder process spawn error' }
    });
    this.notifyUI('recorder-error', error.message);
  }

  /**
   * Handle process restart events.
   * Called when process crashes and is being restarted with exponential backoff.
   *
   * @param {number} count - Current restart attempt number
   * @param {number} delay - Delay in milliseconds before restart
   */
  handleRestarting(count, delay) {
    errorHandler.notify(ErrorLevel.WARNING, CONTEXTS.RECORDER_PROCESS, ERROR_TYPES.PROCESS_RESTARTING,
      `Recorder restarting (attempt ${count}/${config.get('process.maxRestarts')}) in ${delay}ms`);
    this.notifyUI('recorder-restarting', { count, delay });
  }

  /**
   * Handle process failed events.
   * Called when max restart attempts exceeded.
   */
  handleFailed() {
    errorHandler.notify(ErrorLevel.CRITICAL, CONTEXTS.RECORDER_PROCESS, ERROR_TYPES.PROCESS_FAILED,
      'Recorder failed after maximum restart attempts');
    captureError(new Error('Recorder failed after maximum restart attempts'), {
      tags: { component: 'recorder', type: 'process_failed' },
      extra: { maxRestarts: config.get('process.maxRestarts') },
      level: 'fatal'
    });
    this.notifyUI('recorder-failed');
  }

  /**
   * Start recording.
   * Sends 'start' command to recorder process via stdin.
   *
   * @returns {boolean} True if command sent successfully, false otherwise
   */
  startRecording() {
    if (!this.processManager || !this.processManager.isRunning) {
      errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.START_RECORDING, ERROR_TYPES.RECORDER_NOT_READY, 'Recorder process not running');
      metrics.errorCounter.inc({ component: 'recorder', error_type: 'not_ready' });
      this.notifyUI('recording-error', 'Recorder not ready');
      return false;
    }

    this.isRecording = true;
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'User started recording',
      level: 'info'
    });

    try {
      logger.debug('Sending start command to Python');
    } catch (e) {
      // Ignore EPIPE errors during shutdown
    }

    if (!this.processManager.send(config.get('protocol.cmdStart'))) {
      errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.START_RECORDING, ERROR_TYPES.SEND_FAILED, 'Failed to send start command');
      metrics.errorCounter.inc({ component: 'recorder', error_type: 'send_failed' });
      this.isRecording = false;
      return false;
    }

    return true;
  }

  /**
   * Stop recording.
   * Sends 'stop' command to recorder process via stdin.
   *
   * @returns {boolean} True if command sent successfully, false otherwise
   */
  stopRecording() {
    if (!this.processManager || !this.processManager.isRunning) {
      errorHandler.notify(ErrorLevel.WARNING, CONTEXTS.STOP_RECORDING, ERROR_TYPES.RECORDER_NOT_READY, 'Recorder process not running');
      this.isRecording = false;
      return false;
    }

    this.isRecording = false;
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'User stopped recording',
      level: 'info'
    });

    try {
      logger.debug('Sending stop command to Python');
    } catch (e) {
      // Ignore EPIPE errors during shutdown
    }

    if (!this.processManager.send(config.get('protocol.cmdStop'))) {
      errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.STOP_RECORDING, ERROR_TYPES.SEND_FAILED, 'Failed to send stop command');
      return false;
    }

    return true;
  }

  /**
   * Stop the recorder process.
   * Sends graceful shutdown command and waits for process to exit.
   *
   * @param {boolean} [force=false] - If true, prevents automatic restart
   * @returns {Promise<void>}
   */
  async stop(force = false) {
    if (this.processManager) {
      await this.processManager.stop(force);
      this.processManager = null;
    }
  }

  /**
   * Get current recording state.
   *
   * @returns {boolean} True if currently recording, false otherwise
   */
  getRecordingState() {
    return this.isRecording;
  }

  /**
   * Notify UI via IPC.
   * Sends messages to renderer process if window is valid.
   *
   * @param {string} channel - IPC channel name
   * @param {*} [data=null] - Optional data to send
   */
  notifyUI(channel, data = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (data) {
        this.mainWindow.webContents.send(channel, data);
      } else {
        this.mainWindow.webContents.send(channel);
      }
    }
  }

  /**
   * Register event handler.
   * Simple event emitter for custom events (e.g., 'recordingComplete').
   *
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    this.eventHandlers[event] = handler;
  }

  /**
   * Emit custom event.
   * Calls registered handler if exists.
   *
   * @param {string} event - Event name
   * @param {*} data - Event data to pass to handler
   */
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event](data);
    }
  }
}

module.exports = { RecorderManager };
