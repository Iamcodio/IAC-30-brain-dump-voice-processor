# Phase B Technical Execution Plan
**BrainDump Voice Processor - Production Readiness Refactoring**

**Date:** 2025-10-25
**Branch:** `feature/phase-b-production-refactor`
**Current Version:** v2.1.0 (Phase A Complete)
**Target Version:** v2.2.0
**Scope:** PRODUCTION READINESS - NO NEW FEATURES

---

## Executive Summary

Phase B transforms the BrainDump Voice Processor from a solid MVP (Phase A: 92% test coverage, security hardened) into **production-grade software** through systematic refactoring, modularization, and adherence to industry best practices.

### Current State Analysis
- **JavaScript:** 1,385 LOC with main.js god object (458 lines)
- **Python:** 589 LOC with good error handling but missing type hints
- **Security:** ✅ Hardened (Phase A complete)
- **Testing:** ✅ 92% coverage (Phase A complete)
- **Documentation:** ⚠️ Sparse JSDoc/docstrings
- **Code Quality:** ⚠️ Magic numbers, duplication, tight coupling

### Target State
- **Modular Architecture:** main.js reduced to 100 lines (orchestration only)
- **Configuration Management:** All constants extracted to config modules
- **Documentation:** 100% public API coverage (JSDoc + docstrings + type hints)
- **Code Standards:** PEP 8 compliant, ES6+ modern JavaScript, ESLint enforced
- **Design Patterns:** SOLID principles, Factory, Builder, enhanced Observer
- **Zero New Features:** Pure refactoring, stability improvements only

### Success Metrics
- ✅ main.js reduced by 75% (458 → ~100 lines)
- ✅ Zero magic numbers (40+ constants extracted)
- ✅ 100% Python type hints on public APIs
- ✅ 100% JSDoc coverage on exported functions
- ✅ ESLint passing with zero warnings
- ✅ All tests still passing at 92%+ coverage

---

## Part 1: Architecture Refactoring

### 1.1 Decompose main.js God Object

**Problem:** main.js (458 lines) violates Single Responsibility Principle

**Current Responsibilities:**
1. Window management (lines 14-26)
2. Recorder process lifecycle (lines 28-156)
3. Transcription orchestration (lines 158-238)
4. Global shortcuts (lines 247-258)
5. IPC handler registration (lines 336-458)
6. Database initialization (line 243)

**Solution:** Extract into specialized modules

#### 1.1.1 Create WindowManager

**File:** `src/js/managers/window_manager.js`

```javascript
import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { WINDOW_CONFIG } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manages Electron BrowserWindow lifecycle.
 * Handles window creation, view switching, and cleanup.
 */
export class WindowManager {
  constructor() {
    this.window = null;
  }

  /**
   * Create main application window.
   * @returns {BrowserWindow} Created window instance
   */
  create() {
    this.window = new BrowserWindow({
      width: WINDOW_CONFIG.WIDTH,
      height: WINDOW_CONFIG.HEIGHT,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    this.loadRecorderView();
    return this.window;
  }

  /**
   * Load recorder view (index.html).
   */
  loadRecorderView() {
    if (!this.window) {
      throw new Error('Window not created');
    }
    this.window.loadFile('index.html');
  }

  /**
   * Load history view (history.html).
   */
  loadHistoryView() {
    if (!this.window) {
      throw new Error('Window not created');
    }
    this.window.loadFile('history.html');
  }

  /**
   * Get the current window instance.
   * @returns {BrowserWindow|null}
   */
  getWindow() {
    return this.window;
  }

  /**
   * Check if window exists and is not destroyed.
   * @returns {boolean}
   */
  isValid() {
    return this.window && !this.window.isDestroyed();
  }

  /**
   * Destroy the window.
   */
  destroy() {
    if (this.isValid()) {
      this.window.destroy();
      this.window = null;
    }
  }
}
```

---

#### 1.1.2 Create RecorderManager

**File:** `src/js/managers/recorder_manager.js`

```javascript
import path from 'path';
import fs from 'fs';
import { ProcessManager } from '../process_manager.js';
import { errorHandler, ErrorLevel } from '../error_handler.js';
import { PROCESS_CONFIG, PATHS } from '../config/constants.js';

/**
 * Manages the Python recorder process lifecycle.
 * Handles process creation, event routing, and state management.
 */
export class RecorderManager {
  constructor(mainWindow, baseDir) {
    this.mainWindow = mainWindow;
    this.baseDir = baseDir;
    this.processManager = null;
    this.isRecording = false;
  }

  /**
   * Start the recorder process.
   * Creates ProcessManager and attaches event handlers.
   */
  start() {
    const pythonPath = path.join(this.baseDir, PATHS.PYTHON);
    const scriptPath = path.join(this.baseDir, PATHS.RECORDER_SCRIPT);

    // Validate paths
    this.validatePaths(pythonPath, scriptPath);

    // Create process manager
    this.processManager = new ProcessManager({
      name: 'recorder',
      command: pythonPath,
      args: [scriptPath],
      cwd: this.baseDir,
      maxRestarts: PROCESS_CONFIG.MAX_RESTARTS,
      baseDelay: PROCESS_CONFIG.BASE_DELAY_MS
    });

    // Attach event handlers
    this.attachEventHandlers();

    // Start the process
    this.processManager.start();
  }

  /**
   * Validate Python and script paths exist.
   * @param {string} pythonPath - Path to Python interpreter
   * @param {string} scriptPath - Path to recorder script
   * @throws {Error} If paths don't exist
   */
  validatePaths(pythonPath, scriptPath) {
    if (!fs.existsSync(pythonPath)) {
      errorHandler.notify(
        ErrorLevel.CRITICAL,
        'RecorderManager.validatePaths',
        'PythonNotFound',
        `Python not found at ${pythonPath}`
      );
      throw new Error(`Python not found: ${pythonPath}`);
    }

    if (!fs.existsSync(scriptPath)) {
      errorHandler.notify(
        ErrorLevel.CRITICAL,
        'RecorderManager.validatePaths',
        'ScriptNotFound',
        `Recorder script not found at ${scriptPath}`
      );
      throw new Error(`Recorder script not found: ${scriptPath}`);
    }
  }

  /**
   * Attach event handlers to process manager.
   * @private
   */
  attachEventHandlers() {
    this.processManager.on('stdout', this.handleStdout.bind(this));
    this.processManager.on('stderr', this.handleStderr.bind(this));
    this.processManager.on('error', this.handleError.bind(this));
    this.processManager.on('restarting', this.handleRestarting.bind(this));
    this.processManager.on('failed', this.handleFailed.bind(this));
  }

  /**
   * Handle stdout messages from recorder process.
   * @param {Buffer} data - stdout data
   */
  handleStdout(data) {
    const output = data.toString().trim();
    console.log('Python:', output);

    try {
      if (output === 'READY') {
        this.handleReady();
      } else if (output === 'RECORDING_STARTED') {
        this.handleRecordingStarted();
      } else if (output.startsWith('RECORDING_STOPPED:')) {
        this.handleRecordingStopped(output);
      } else if (output.startsWith('ERROR:')) {
        this.handleRecorderError(output);
      }
    } catch (error) {
      errorHandler.handleException('RecorderManager.handleStdout', error);
    }
  }

  /**
   * Handle READY message.
   * @private
   */
  handleReady() {
    errorHandler.notify(
      ErrorLevel.INFO,
      'RecorderManager.handleReady',
      'RecorderReady',
      'Recorder process ready'
    );
    this.processManager.resetRestartCount();
  }

  /**
   * Handle RECORDING_STARTED message.
   * @private
   */
  handleRecordingStarted() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('recording-started');
    }
  }

  /**
   * Handle RECORDING_STOPPED message.
   * @param {string} output - Protocol message
   * @private
   */
  handleRecordingStopped(output) {
    const filename = output.split(':')[1];

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('recording-stopped');
    }

    if (filename && filename !== 'no_audio') {
      console.log('Saved:', filename);
      // Emit event for transcription service
      this.emit('recordingComplete', filename);
    } else {
      errorHandler.notify(
        ErrorLevel.WARNING,
        'RecorderManager.handleRecordingStopped',
        'NoAudioRecorded',
        'Recording stopped but no audio captured'
      );
    }
  }

  /**
   * Handle recorder error messages.
   * @param {string} output - Error message
   * @private
   */
  handleRecorderError(output) {
    errorHandler.notify(
      ErrorLevel.ERROR,
      'RecorderManager.handleRecorderError',
      'RecorderError',
      output
    );

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('recording-error', output);
    }
  }

  /**
   * Handle stderr messages.
   * @param {Buffer} data - stderr data
   */
  handleStderr(data) {
    const message = data.toString().trim();
    console.error('Recorder stderr:', message);
  }

  /**
   * Handle process errors.
   * @param {Error} error - Process error
   */
  handleError(error) {
    errorHandler.notify(
      ErrorLevel.ERROR,
      'RecorderManager.handleError',
      'ProcessError',
      `Recorder process error: ${error.message}`
    );

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('recorder-error', error.message);
    }
  }

  /**
   * Handle process restart event.
   * @param {number} count - Restart attempt number
   * @param {number} delay - Delay before restart (ms)
   */
  handleRestarting(count, delay) {
    errorHandler.notify(
      ErrorLevel.WARNING,
      'RecorderManager.handleRestarting',
      'ProcessRestarting',
      `Recorder restarting (attempt ${count}/${PROCESS_CONFIG.MAX_RESTARTS}) in ${delay}ms`
    );

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('recorder-restarting', { count, delay });
    }
  }

  /**
   * Handle max restarts exceeded.
   */
  handleFailed() {
    errorHandler.notify(
      ErrorLevel.CRITICAL,
      'RecorderManager.handleFailed',
      'ProcessFailed',
      'Recorder failed after maximum restart attempts'
    );

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('recorder-failed');
    }
  }

  /**
   * Send start recording command.
   * @returns {boolean} Success status
   */
  startRecording() {
    if (!this.processManager || !this.processManager.isRunning) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'RecorderManager.startRecording',
        'RecorderNotReady',
        'Recorder process not running'
      );
      return false;
    }

    this.isRecording = true;
    console.log('Sending start command to Python');

    const success = this.processManager.send('start\n');
    if (!success) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'RecorderManager.startRecording',
        'SendFailed',
        'Failed to send start command to recorder'
      );
      this.isRecording = false;
    }

    return success;
  }

  /**
   * Send stop recording command.
   * @returns {boolean} Success status
   */
  stopRecording() {
    if (!this.processManager || !this.processManager.isRunning) {
      errorHandler.notify(
        ErrorLevel.WARNING,
        'RecorderManager.stopRecording',
        'RecorderNotReady',
        'Recorder process not running'
      );
      this.isRecording = false;
      return false;
    }

    this.isRecording = false;
    console.log('Sending stop command to Python');

    const success = this.processManager.send('stop\n');
    if (!success) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'RecorderManager.stopRecording',
        'SendFailed',
        'Failed to send stop command to recorder'
      );
    }

    return success;
  }

  /**
   * Stop the recorder process.
   * @param {boolean} force - Force kill if graceful shutdown fails
   */
  async stop(force = false) {
    if (this.processManager) {
      await this.processManager.stop(force);
      this.processManager = null;
    }
  }

  /**
   * Check if currently recording.
   * @returns {boolean}
   */
  getRecordingState() {
    return this.isRecording;
  }

  /**
   * Simple event emitter for inter-manager communication.
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    // Will be replaced with proper EventEmitter when needed
    if (this.onRecordingComplete && event === 'recordingComplete') {
      this.onRecordingComplete(data);
    }
  }
}
```

---

#### 1.1.3 Create TranscriptionService

**File:** `src/js/services/transcription_service.js`

```javascript
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { errorHandler, ErrorLevel } from '../error_handler.js';
import { PATHS, PROCESS_CONFIG } from '../config/constants.js';

/**
 * Service for audio transcription using Whisper.
 * Spawns Python transcription process and handles results.
 */
export class TranscriptionService {
  constructor(mainWindow, baseDir) {
    this.mainWindow = mainWindow;
    this.baseDir = baseDir;
    this.pythonPath = path.join(baseDir, PATHS.PYTHON);
    this.scriptPath = path.join(baseDir, PATHS.TRANSCRIBE_SCRIPT);
  }

  /**
   * Transcribe an audio file.
   * @param {string} audioPath - Absolute path to audio file
   * @returns {Promise<string>} Path to generated transcript
   */
  async transcribe(audioPath) {
    return new Promise((resolve, reject) => {
      try {
        // Validate audio file exists
        if (!fs.existsSync(audioPath)) {
          const error = new Error(`Audio file not found: ${audioPath}`);
          errorHandler.notify(
            ErrorLevel.ERROR,
            'TranscriptionService.transcribe',
            'FileNotFound',
            error.message
          );
          this.notifyUI('transcription-error', 'Audio file not found');
          reject(error);
          return;
        }

        console.log('Starting transcription:', audioPath);
        this.notifyUI('transcription-started');

        const transcriber = spawn(this.pythonPath, [this.scriptPath, audioPath]);

        let transcriptPath = null;

        // Handle stdout
        transcriber.stdout.on('data', (data) => {
          const output = data.toString().trim();
          console.log('Transcription:', output);

          if (output.startsWith('TRANSCRIPT_SAVED:')) {
            transcriptPath = output.split(':')[1];
            errorHandler.notify(
              ErrorLevel.INFO,
              'TranscriptionService.transcribe',
              'TranscriptSaved',
              `Transcript saved: ${transcriptPath}`
            );
          } else if (output.startsWith('ERROR:')) {
            errorHandler.notify(
              ErrorLevel.ERROR,
              'TranscriptionService.transcribe',
              'TranscriptionError',
              output
            );
            this.notifyUI('transcription-error', output);
          }
        });

        // Handle stderr
        transcriber.stderr.on('data', (data) => {
          const message = data.toString().trim();
          console.error('Transcription stderr:', message);
        });

        // Handle errors
        transcriber.on('error', (error) => {
          errorHandler.handleException('TranscriptionService.spawn', error);
          this.notifyUI('transcription-error', error.message);
          reject(error);
        });

        // Handle completion
        transcriber.on('close', (code) => {
          if (code === 0) {
            errorHandler.notify(
              ErrorLevel.INFO,
              'TranscriptionService.transcribe',
              'TranscriptionComplete',
              'Transcription completed successfully'
            );
            this.notifyUI('transcription-complete');
            resolve(transcriptPath);
          } else {
            const error = new Error(`Transcription failed with exit code ${code}`);
            errorHandler.notify(
              ErrorLevel.ERROR,
              'TranscriptionService.transcribe',
              'TranscriptionFailed',
              error.message
            );
            this.notifyUI('transcription-error', `Exit code ${code}`);
            reject(error);
          }
        });

      } catch (error) {
        errorHandler.handleException('TranscriptionService.transcribe', error);
        this.notifyUI('transcription-error', error.message);
        reject(error);
      }
    });
  }

  /**
   * Send notification to UI.
   * @param {string} channel - IPC channel
   * @param {*} data - Data to send
   * @private
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
}
```

---

#### 1.1.4 Create IPCHandlers

**File:** `src/js/ipc/handlers.js`

```javascript
import { ipcMain, shell } from 'electron';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { errorHandler, ErrorLevel } from '../error_handler.js';

/**
 * Centralized IPC handler registration.
 * Groups handlers by domain (recordings, files, navigation).
 */
export class IPCHandlers {
  constructor(database, windowManager) {
    this.database = database;
    this.windowManager = windowManager;
  }

  /**
   * Register all IPC handlers.
   */
  registerAll() {
    this.registerRecordingHandlers();
    this.registerFileHandlers();
    this.registerNavigationHandlers();
  }

  /**
   * Register recording-related IPC handlers.
   * @private
   */
  registerRecordingHandlers() {
    /**
     * Get all recordings from database.
     */
    ipcMain.handle('get-recordings', async () => {
      try {
        if (!this.database) {
          throw new Error('Database not initialized');
        }
        return this.database.getAll();
      } catch (error) {
        errorHandler.handleException('ipc.get-recordings', error);
        return [];
      }
    });

    /**
     * Search recordings by query.
     */
    ipcMain.handle('search-recordings', async (event, query) => {
      try {
        if (!this.database) {
          throw new Error('Database not initialized');
        }
        return this.database.search(query);
      } catch (error) {
        errorHandler.handleException('ipc.search-recordings', error);
        return [];
      }
    });
  }

  /**
   * Register file-related IPC handlers.
   * @private
   */
  registerFileHandlers() {
    /**
     * Read file contents (for copying transcripts).
     */
    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        // Validate file exists
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        // Validate file is within project directory (path traversal check)
        const normalizedPath = path.normalize(filePath);
        if (normalizedPath.includes('..')) {
          throw new Error('Invalid file path');
        }

        return fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        errorHandler.handleException('ipc.read-file', error);
        throw error;
      }
    });

    /**
     * Play audio file in default player.
     */
    ipcMain.on('play-audio', (event, audioPath) => {
      try {
        // Validate file exists
        if (!fs.existsSync(audioPath)) {
          errorHandler.notify(
            ErrorLevel.ERROR,
            'ipc.play-audio',
            'FileNotFound',
            `Audio file not found: ${audioPath}`
          );
          return;
        }

        // macOS: Use QuickTime Player
        if (process.platform === 'darwin') {
          spawn('open', ['-a', 'QuickTime Player', audioPath]);
        } else {
          shell.openPath(audioPath);
        }
      } catch (error) {
        errorHandler.handleException('ipc.play-audio', error);
      }
    });

    /**
     * View file in default application.
     */
    ipcMain.on('view-file', (event, filePath) => {
      try {
        // Validate file exists
        if (!fs.existsSync(filePath)) {
          errorHandler.notify(
            ErrorLevel.ERROR,
            'ipc.view-file',
            'FileNotFound',
            `File not found: ${filePath}`
          );
          return;
        }

        shell.openPath(filePath);
      } catch (error) {
        errorHandler.handleException('ipc.view-file', error);
      }
    });
  }

  /**
   * Register navigation-related IPC handlers.
   * @private
   */
  registerNavigationHandlers() {
    /**
     * Switch to history view.
     */
    ipcMain.on('show-history', () => {
      try {
        this.windowManager.loadHistoryView();
      } catch (error) {
        errorHandler.handleException('ipc.show-history', error);
      }
    });

    /**
     * Switch to recorder view.
     */
    ipcMain.on('show-recorder', () => {
      try {
        this.windowManager.loadRecorderView();
      } catch (error) {
        errorHandler.handleException('ipc.show-recorder', error);
      }
    });
  }

  /**
   * Unregister all IPC handlers.
   */
  unregisterAll() {
    ipcMain.removeHandler('get-recordings');
    ipcMain.removeHandler('search-recordings');
    ipcMain.removeHandler('read-file');
    ipcMain.removeAllListeners('play-audio');
    ipcMain.removeAllListeners('view-file');
    ipcMain.removeAllListeners('show-history');
    ipcMain.removeAllListeners('show-recorder');
  }
}
```

---

#### 1.1.5 Create ShortcutManager

**File:** `src/js/managers/shortcut_manager.js`

```javascript
import { globalShortcut } from 'electron';
import { errorHandler, ErrorLevel } from '../error_handler.js';

/**
 * Manages global keyboard shortcuts.
 * Handles registration, toggling, and cleanup.
 */
export class ShortcutManager {
  constructor(recorderManager) {
    this.recorderManager = recorderManager;
    this.registeredShortcuts = new Map();
  }

  /**
   * Register the recording toggle shortcut.
   * @param {string} accelerator - Shortcut key combination (e.g., 'Control+Y')
   * @returns {boolean} Success status
   */
  registerRecordingToggle(accelerator = 'Control+Y') {
    try {
      const success = globalShortcut.register(accelerator, () => {
        this.handleRecordingToggle();
      });

      if (!success) {
        errorHandler.notify(
          ErrorLevel.ERROR,
          'ShortcutManager.registerRecordingToggle',
          'RegistrationFailed',
          `Failed to register shortcut: ${accelerator}`
        );
        return false;
      }

      this.registeredShortcuts.set('recordingToggle', accelerator);
      console.log(`Registered shortcut: ${accelerator}`);
      return true;

    } catch (error) {
      errorHandler.handleException('ShortcutManager.registerRecordingToggle', error);
      return false;
    }
  }

  /**
   * Handle recording toggle action.
   * @private
   */
  handleRecordingToggle() {
    try {
      console.log('Hotkey pressed: Recording toggle');

      const isRecording = this.recorderManager.getRecordingState();

      if (isRecording) {
        this.recorderManager.stopRecording();
      } else {
        this.recorderManager.startRecording();
      }
    } catch (error) {
      errorHandler.handleException('ShortcutManager.handleRecordingToggle', error);
    }
  }

  /**
   * Unregister all shortcuts.
   */
  unregisterAll() {
    try {
      globalShortcut.unregisterAll();
      this.registeredShortcuts.clear();
      console.log('All shortcuts unregistered');
    } catch (error) {
      errorHandler.handleException('ShortcutManager.unregisterAll', error);
    }
  }

  /**
   * Check if a shortcut is registered.
   * @param {string} name - Shortcut name
   * @returns {boolean}
   */
  isRegistered(name) {
    return this.registeredShortcuts.has(name);
  }
}
```

---

#### 1.1.6 Create AppController (New main.js)

**File:** `main.js` (refactored)

```javascript
import { app } from 'electron';
import { WindowManager } from './src/js/managers/window_manager.js';
import { RecorderManager } from './src/js/managers/recorder_manager.js';
import { TranscriptionService } from './src/js/services/transcription_service.js';
import { IPCHandlers } from './src/js/ipc/handlers.js';
import { ShortcutManager } from './src/js/managers/shortcut_manager.js';
import Database from './database.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { errorHandler } from './src/js/error_handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main application controller.
 * Orchestrates all managers and services.
 */
class Application {
  constructor() {
    this.baseDir = __dirname;
    this.windowManager = null;
    this.recorderManager = null;
    this.transcriptionService = null;
    this.database = null;
    this.ipcHandlers = null;
    this.shortcutManager = null;
  }

  /**
   * Initialize all components.
   */
  initialize() {
    // Initialize database
    this.database = new Database(this.baseDir);

    // Create window manager
    this.windowManager = new WindowManager();

    // Create recorder manager
    this.recorderManager = new RecorderManager(
      this.windowManager.getWindow(),
      this.baseDir
    );

    // Create transcription service
    this.transcriptionService = new TranscriptionService(
      this.windowManager.getWindow(),
      this.baseDir
    );

    // Connect recorder completion to transcription
    this.recorderManager.onRecordingComplete = (audioPath) => {
      this.transcriptionService.transcribe(audioPath)
        .catch(err => console.error('Transcription failed:', err));
    };

    // Create IPC handlers
    this.ipcHandlers = new IPCHandlers(
      this.database,
      this.windowManager
    );

    // Create shortcut manager
    this.shortcutManager = new ShortcutManager(this.recorderManager);
  }

  /**
   * Start the application.
   */
  async start() {
    try {
      await app.whenReady();

      // Initialize components
      this.initialize();

      // Create window
      this.windowManager.create();

      // Start recorder process
      this.recorderManager.start();

      // Register IPC handlers
      this.ipcHandlers.registerAll();

      // Register global shortcuts
      this.shortcutManager.registerRecordingToggle('Control+Y');

      console.log('Application started successfully');
    } catch (error) {
      errorHandler.handleException('Application.start', error, true);
      app.quit();
    }
  }

  /**
   * Shutdown the application.
   */
  async shutdown() {
    try {
      console.log('Shutting down application...');

      // Unregister shortcuts
      if (this.shortcutManager) {
        this.shortcutManager.unregisterAll();
      }

      // Stop recorder process
      if (this.recorderManager) {
        await this.recorderManager.stop(true);
      }

      // Unregister IPC handlers
      if (this.ipcHandlers) {
        this.ipcHandlers.unregisterAll();
      }

      // Destroy window
      if (this.windowManager) {
        this.windowManager.destroy();
      }

      console.log('Application shutdown complete');
    } catch (error) {
      errorHandler.handleException('Application.shutdown', error);
    }
  }
}

// Create and start application
const application = new Application();
application.start();

// Handle app lifecycle
app.on('will-quit', () => application.shutdown());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!application.windowManager || !application.windowManager.isValid()) {
    application.initialize();
    application.windowManager.create();
  }
});
```

**Result:** main.js reduced from 458 lines to ~120 lines (74% reduction)

---

## Part 2: Configuration Management

### 2.1 Create JavaScript Configuration Module

**File:** `src/config/constants.js`

```javascript
/**
 * Application-wide configuration constants.
 * All magic numbers and configuration values centralized here.
 */

/**
 * Audio recording configuration.
 */
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 44100,
  CHANNELS: 1,
  CHUNK_SIZE: 1024,
  FORMAT: 'paInt16'
};

/**
 * Process management configuration.
 */
export const PROCESS_CONFIG = {
  MAX_RESTARTS: 5,
  BASE_DELAY_MS: 1000,
  SHUTDOWN_TIMEOUT_MS: 5000,
  TRANSCRIPTION_TIMEOUT_MS: 300000  // 5 minutes
};

/**
 * File system paths (relative to project root).
 */
export const PATHS = {
  PYTHON: '.venv/bin/python',
  RECORDER_SCRIPT: 'recorder.py',
  TRANSCRIBE_SCRIPT: 'transcribe.py',
  AUDIO_OUTPUT: 'outputs/audio',
  TRANSCRIPT_OUTPUT: 'outputs/transcripts',
  DATABASE: 'src/data/recordings.json',
  WHISPER_MODEL: 'models/ggml-base.bin'
};

/**
 * File validation limits.
 */
export const FILE_LIMITS = {
  MAX_AUDIO_SIZE_MB: 500,
  ALLOWED_AUDIO_EXTENSIONS: ['.wav', '.mp3', '.m4a', '.flac', '.ogg']
};

/**
 * UI configuration.
 */
export const WINDOW_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600
};

export const UI_CONFIG = {
  TOAST_DURATION_MS: 3000,
  PREVIEW_MAX_LENGTH: 150,
  SEARCH_DEBOUNCE_MS: 300
};

/**
 * Protocol messages for stdout communication.
 */
export const PROTOCOL = {
  READY: 'READY',
  RECORDING_STARTED: 'RECORDING_STARTED',
  RECORDING_STOPPED: 'RECORDING_STOPPED',
  TRANSCRIPT_SAVED: 'TRANSCRIPT_SAVED',
  ERROR: 'ERROR'
};
```

---

### 2.2 Create Python Configuration Module

**File:** `src/python/config/settings.py`

```python
"""
Application configuration constants.
All magic numbers and configuration values centralized here.
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Tuple

@dataclass(frozen=True)
class AudioSettings:
    """Audio recording configuration."""
    SAMPLE_RATE: int = 44100
    CHANNELS: int = 1
    CHUNK_SIZE: int = 1024
    FORMAT_NAME: str = 'paInt16'

@dataclass(frozen=True)
class TranscriptionSettings:
    """Whisper transcription configuration."""
    TIMEOUT_SECONDS: int = 300  # 5 minutes
    MODEL_PATH: Path = Path('models/ggml-base.bin')
    LANGUAGE: str = 'en'  # Force English to prevent misdetection
    OUTPUT_FORMAT: str = 'txt'
    NO_TIMESTAMPS: bool = True

@dataclass(frozen=True)
class FileSettings:
    """File validation and limits."""
    MAX_SIZE_MB: int = 500
    ALLOWED_EXTENSIONS: Tuple[str, ...] = ('.wav', '.mp3', '.m4a', '.flac', '.ogg')

@dataclass(frozen=True)
class PathSettings:
    """Output paths."""
    AUDIO_OUTPUT: Path = Path('outputs/audio')
    TRANSCRIPT_OUTPUT: Path = Path('outputs/transcripts')
    DATABASE: Path = Path('src/data/recordings.json')

@dataclass(frozen=True)
class ProtocolMessages:
    """stdout protocol message constants."""
    READY: str = 'READY'
    RECORDING_STARTED: str = 'RECORDING_STARTED'
    RECORDING_STOPPED: str = 'RECORDING_STOPPED'
    TRANSCRIPT_SAVED: str = 'TRANSCRIPT_SAVED'
    ERROR: str = 'ERROR'

# Global configuration instances
AUDIO = AudioSettings()
TRANSCRIPTION = TranscriptionSettings()
FILES = FileSettings()
PATHS = PathSettings()
PROTOCOL = ProtocolMessages()
```

**File:** `src/python/config/__init__.py`

```python
"""Configuration module."""
from .settings import (
    AUDIO,
    TRANSCRIPTION,
    FILES,
    PATHS,
    PROTOCOL
)

__all__ = [
    'AUDIO',
    'TRANSCRIPTION',
    'FILES',
    'PATHS',
    'PROTOCOL'
]
```

---

## Part 3: Code Quality Improvements

### 3.1 Extract File Validation Utilities

**File:** `src/js/utils/file_validator.js`

```javascript
import fs from 'fs';
import path from 'path';
import { errorHandler, ErrorLevel } from '../error_handler.js';

/**
 * File validation utilities.
 * Centralized validation logic to eliminate duplication.
 */
export class FileValidator {
  /**
   * Validate that a file exists.
   * @param {string} filePath - Path to validate
   * @param {string} context - Context for error logging
   * @throws {Error} If file doesn't exist
   */
  static validateExists(filePath, context = 'FileValidator') {
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
   * Validate path doesn't contain traversal sequences.
   * @param {string} filePath - Path to validate
   * @param {string} context - Context for error logging
   * @throws {Error} If path contains '..'
   */
  static validateNoTraversal(filePath, context = 'FileValidator') {
    const normalized = path.normalize(filePath);
    if (normalized.includes('..')) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        context,
        'PathTraversal',
        `Invalid path (traversal detected): ${filePath}`
      );
      throw new Error('Invalid file path');
    }
  }

  /**
   * Validate file exists and has no traversal.
   * @param {string} filePath - Path to validate
   * @param {string} context - Context for error logging
   * @throws {Error} If validation fails
   */
  static validateSafe(filePath, context = 'FileValidator') {
    this.validateNoTraversal(filePath, context);
    this.validateExists(filePath, context);
  }

  /**
   * Validate file is within base directory.
   * @param {string} filePath - Path to validate
   * @param {string} baseDir - Base directory
   * @param {string} context - Context for error logging
   * @throws {Error} If file is outside base directory
   */
  static validateWithinBase(filePath, baseDir, context = 'FileValidator') {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);

    if (!resolvedPath.startsWith(resolvedBase)) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        context,
        'OutsideBaseDirectory',
        `File outside base directory: ${filePath}`
      );
      throw new Error('File outside allowed directory');
    }
  }
}
```

---

### 3.2 Add Comprehensive Python Type Hints

**Example:** Update `recorder.py`

```python
"""Audio recorder with stdin command interface."""
import os
import sys
import wave
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import pyaudio

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'python'))

from core.error_handler import error_handler, ErrorLevel
from core.validators import FileValidator, ValidationError
from config.settings import AUDIO, PATHS, PROTOCOL


class SimpleRecorder:
    """
    Audio recorder using PyAudio with stdin command interface.

    Listens for commands on stdin (start/stop/quit) and outputs
    protocol messages (READY, RECORDING_STARTED, etc.) to stdout.

    Attributes:
        recording: Current recording state
        frames: Audio data frames buffer
        output_dir: Directory for WAV output files
        audio: PyAudio instance
        stream: Active audio stream (None when not recording)
    """

    def __init__(self) -> None:
        """Initialize recorder with PyAudio instance."""
        self.recording: bool = False
        self.frames: List[bytes] = []
        self.output_dir: Path = PATHS.AUDIO_OUTPUT
        self.audio: pyaudio.PyAudio = pyaudio.PyAudio()
        self.stream: Optional[pyaudio.Stream] = None

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def callback(
        self,
        in_data: bytes,
        frame_count: int,
        time_info: dict,
        status: int
    ) -> tuple[bytes, int]:
        """
        PyAudio stream callback for capturing audio data.

        Args:
            in_data: Input audio data
            frame_count: Number of frames
            time_info: Time information dictionary
            status: Stream status flags

        Returns:
            Tuple of (None, pyaudio.paContinue)
        """
        if self.recording:
            self.frames.append(in_data)
        return (None, pyaudio.paContinue)

    def start(self) -> None:
        """
        Start recording audio.

        Opens PyAudio stream and begins capturing audio frames.
        Sends RECORDING_STARTED protocol message to stdout.

        Raises:
            OSError: If microphone cannot be opened
        """
        if self.recording:
            error_handler.notify(
                ErrorLevel.WARNING,
                "SimpleRecorder.start",
                "AlreadyRecording",
                "Attempted to start recording while already recording"
            )
            return

        try:
            self.recording = True
            self.frames = []

            self.stream = self.audio.open(
                format=pyaudio.paInt16,
                channels=AUDIO.CHANNELS,
                rate=AUDIO.SAMPLE_RATE,
                input=True,
                frames_per_buffer=AUDIO.CHUNK_SIZE,
                stream_callback=self.callback
            )

            print(PROTOCOL.RECORDING_STARTED, flush=True)
            error_handler.notify(
                ErrorLevel.INFO,
                "SimpleRecorder.start",
                "RecordingStarted",
                "Recording started successfully"
            )

        except OSError as e:
            self.recording = False
            error_handler.notify(
                ErrorLevel.ERROR,
                "SimpleRecorder.start",
                "MicrophoneError",
                f"Failed to open microphone: {str(e)}"
            )
            print(f"{PROTOCOL.ERROR}:MicrophoneError:{str(e)}", flush=True, file=sys.stderr)
            raise

    def stop(self) -> None:
        """
        Stop recording and save audio to WAV file.

        Closes audio stream, saves frames to file, and sends
        RECORDING_STOPPED protocol message with filename.

        Sends 'no_audio' if no frames were captured.
        """
        if not self.recording:
            error_handler.notify(
                ErrorLevel.WARNING,
                "SimpleRecorder.stop",
                "NotRecording",
                "Attempted to stop recording while not recording"
            )
            return

        try:
            self.recording = False

            if self.stream:
                self.stream.stop_stream()
                self.stream.close()
                self.stream = None

            if not self.frames:
                print(f"{PROTOCOL.RECORDING_STOPPED}:no_audio", flush=True)
                error_handler.notify(
                    ErrorLevel.WARNING,
                    "SimpleRecorder.stop",
                    "NoFramesCaptured",
                    "No audio frames captured during recording"
                )
                return

            filepath = self.save_wav()
            print(f"{PROTOCOL.RECORDING_STOPPED}:{filepath}", flush=True)
            error_handler.notify(
                ErrorLevel.INFO,
                "SimpleRecorder.stop",
                "RecordingSaved",
                f"Recording saved to {filepath}"
            )

        except Exception as e:
            error_handler.notify(
                ErrorLevel.ERROR,
                "SimpleRecorder.stop",
                "SaveError",
                f"Failed to save recording: {str(e)}"
            )
            print(f"{PROTOCOL.ERROR}:SaveError:{str(e)}", flush=True, file=sys.stderr)

    def save_wav(self) -> str:
        """
        Save recorded frames to WAV file.

        Returns:
            Absolute path to saved WAV file

        Raises:
            ValidationError: If output path validation fails
            OSError: If file cannot be written
        """
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"recording_{timestamp}.wav"
        filepath = self.output_dir / filename

        try:
            # Validate output path
            FileValidator.validate_path(
                str(filepath),
                base_dir=str(self.output_dir),
                must_exist=False
            )

            with wave.open(str(filepath), 'wb') as wf:
                wf.setnchannels(AUDIO.CHANNELS)
                wf.setsampwidth(self.audio.get_sample_size(pyaudio.paInt16))
                wf.setframerate(AUDIO.SAMPLE_RATE)
                wf.writeframes(b''.join(self.frames))

            return str(filepath.resolve())

        except (ValidationError, OSError) as e:
            error_handler.notify(
                ErrorLevel.ERROR,
                "SimpleRecorder.save_wav",
                "FileWriteError",
                f"Failed to save WAV file: {str(e)}"
            )
            raise

    def cleanup(self) -> None:
        """
        Clean up PyAudio resources.

        Stops any active stream and terminates PyAudio instance.
        Should be called before program exit.
        """
        try:
            if self.stream:
                self.stream.stop_stream()
                self.stream.close()
                self.stream = None

            self.audio.terminate()

            error_handler.notify(
                ErrorLevel.INFO,
                "SimpleRecorder.cleanup",
                "CleanupComplete",
                "Recorder cleanup completed successfully"
            )

        except Exception as e:
            error_handler.notify(
                ErrorLevel.WARNING,
                "SimpleRecorder.cleanup",
                "CleanupError",
                f"Error during cleanup: {str(e)}"
            )

    def run(self) -> None:
        """
        Main loop: listen for stdin commands and dispatch.

        Commands:
            start - Begin recording
            stop - Stop recording and save
            quit - Exit program

        Sends READY protocol message when initialized.
        """
        print(PROTOCOL.READY, flush=True)
        error_handler.notify(
            ErrorLevel.INFO,
            "SimpleRecorder.run",
            "RecorderReady",
            "Recorder initialized and ready for commands"
        )

        try:
            for line in sys.stdin:
                command = line.strip()

                if command == "start":
                    self.start()
                elif command == "stop":
                    self.stop()
                elif command == "quit":
                    break
                else:
                    error_handler.notify(
                        ErrorLevel.WARNING,
                        "SimpleRecorder.run",
                        "UnknownCommand",
                        f"Unknown command: {command}"
                    )

        except KeyboardInterrupt:
            error_handler.notify(
                ErrorLevel.INFO,
                "SimpleRecorder.run",
                "KeyboardInterrupt",
                "Recorder stopped by keyboard interrupt"
            )
        finally:
            self.cleanup()


if __name__ == "__main__":
    recorder = SimpleRecorder()
    recorder.run()
```

---

### 3.3 Add Comprehensive JSDoc

**Example:** Update `database.js`

```javascript
import fs from 'fs';
import path from 'path';
import { errorHandler, ErrorLevel } from './src/js/error_handler.js';

/**
 * Database module for managing recordings.
 * Uses JSON file storage at src/data/recordings.json.
 *
 * @class Database
 */
class Database {
  /**
   * Create Database instance.
   *
   * @param {string} baseDir - Base directory of the project
   */
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.dbPath = path.join(baseDir, 'src', 'data', 'recordings.json');
    this.audioDir = path.join(baseDir, 'outputs', 'audio');
    this.transcriptDir = path.join(baseDir, 'outputs', 'transcripts');

    try {
      this.initializeDatabase();
    } catch (error) {
      errorHandler.handleException('Database.constructor', error, true);
    }
  }

  /**
   * Initialize database file if it doesn't exist.
   * Creates directory structure and empty database file.
   *
   * @private
   * @throws {Error} If directory/file creation fails
   */
  initializeDatabase() {
    // ... (implementation with JSDoc as shown)
  }

  /**
   * Read the database file.
   *
   * @private
   * @returns {Object} Database object with recordings array
   * @returns {Object[]} return.recordings - Array of recording objects
   */
  readDB() {
    // ... implementation
  }

  /**
   * Get all recordings sorted by date (newest first).
   *
   * @returns {Object[]} Array of formatted recording objects
   * @returns {string} return[].id - Recording unique ID
   * @returns {string} return[].timestamp - Formatted timestamp
   * @returns {string} return[].audioPath - Path to audio file
   * @returns {string} return[].transcriptPath - Path to transcript file
   * @returns {string} return[].duration - Formatted duration string
   * @returns {string} return[].preview - First line preview
   * @returns {string} return[].fullText - Complete transcript text
   */
  getAll() {
    // ... implementation
  }

  /**
   * Format recording object for UI compatibility.
   * Converts database format to UI format expected by renderers.
   *
   * @private
   * @param {Object} recording - Recording from database
   * @param {string} recording.id - Unique recording ID
   * @param {string} recording.timestamp - ISO timestamp
   * @param {number} recording.duration - Duration in seconds
   * @param {string} recording.audioFile - Audio file path
   * @param {string} recording.transcriptMd - Markdown transcript path
   * @param {string} recording.transcriptTxt - Text transcript path
   * @param {string} recording.firstLine - First line of transcript
   * @returns {Object|null} Formatted recording object or null if invalid
   */
  formatRecording(recording) {
    // ... implementation
  }

  /**
   * Extract transcript text from markdown content.
   * Strips metadata headers and returns only the transcript body.
   *
   * @private
   * @param {string} content - Markdown file content
   * @returns {string} Extracted transcript text
   */
  extractTranscriptText(content) {
    // ... implementation
  }

  /**
   * Format timestamp for display.
   *
   * @private
   * @param {string} isoTimestamp - ISO format timestamp
   * @returns {string} Formatted timestamp (MM/DD/YYYY, HH:MM:SS)
   */
  formatTimestamp(isoTimestamp) {
    // ... implementation
  }

  /**
   * Format duration for display.
   *
   * @private
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration string (e.g., "2m 34s")
   */
  formatDuration(seconds) {
    // ... implementation
  }

  /**
   * Search recordings by query string.
   * Searches in preview text, full text, and timestamp fields.
   *
   * @param {string} query - Search query (case-insensitive)
   * @returns {Object[]} Filtered array of recording objects
   */
  search(query) {
    // ... implementation
  }

  /**
   * Get a recording by ID.
   *
   * @param {string} id - Recording unique ID
   * @returns {Object|null} Recording object or null if not found
   */
  getById(id) {
    // ... implementation
  }

  /**
   * Get a recording by transcript path (backward compatibility).
   *
   * @param {string} transcriptPath - Path to transcript file
   * @returns {Object|null} Recording object or null if not found
   */
  getByPath(transcriptPath) {
    // ... implementation
  }
}

export default Database;
```

---

### 3.4 PEP 8 Compliance Sweep

**Issues to Fix:**

1. **Line length violations** (79 character limit)
2. **Import ordering** (stdlib → third-party → local)
3. **Whitespace around operators**
4. **Docstring formatting** (PEP 257)

**Tool:** Use `black` formatter + `flake8` linter

**File:** `.flake8` (project root)

```ini
[flake8]
max-line-length = 79
exclude =
    .venv,
    __pycache__,
    *.pyc,
    .git,
    node_modules,
    archive
ignore =
    E203,  # whitespace before ':' (conflicts with black)
    W503   # line break before binary operator (conflicts with black)
per-file-ignores =
    __init__.py:F401  # unused imports in __init__.py
```

**File:** `pyproject.toml` (black config)

```toml
[tool.black]
line-length = 79
target-version = ['py311']
include = '\.pyi?$'
exclude = '''
/(
    \.git
  | \.venv
  | __pycache__
  | node_modules
  | archive
)/
'''
```

**Commands to run:**

```bash
# Install formatters/linters
uv pip install black flake8 mypy

# Format all Python files
black src/python/ recorder.py transcribe.py tests/

# Check PEP 8 compliance
flake8 src/python/ recorder.py transcribe.py

# Type check
mypy src/python/ --strict
```

---

### 3.5 ESLint + Prettier Configuration

**File:** `.eslintrc.json`

```json
{
  "env": {
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",
    "prefer-template": "error",
    "semi": ["error", "always"],
    "quotes": ["error", "single", { "avoidEscape": true }]
  }
}
```

**File:** `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

**File:** `package.json` (add scripts)

```json
{
  "scripts": {
    "start": "electron .",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"**/*.{js,json,md}\"",
    "format:check": "prettier --check \"**/*.{js,json,md}\""
  },
  "devDependencies": {
    "eslint": "^8.50.0",
    "prettier": "^3.0.3",
    "@types/jest": "^30.0.0",
    "electron": "^28.0.0",
    "jest": "^29.7.0"
  }
}
```

**Install:**

```bash
npm install --save-dev eslint prettier
```

**Run:**

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format all code
npm run format
```

---

## Part 4: Enhanced Error Handling

### 4.1 Database Corruption Recovery

**Update:** `database.js` `readDB()` method

```javascript
/**
 * Read the database file with corruption recovery.
 * If JSON is corrupted, backs up the file and creates new empty database.
 *
 * @private
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

    // Attempt to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (parseError) {
      // JSON is corrupted - backup and recover
      return this.recoverFromCorruption(parseError);
    }

    // Validate structure
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.recordings)) {
      errorHandler.notify(
        ErrorLevel.WARNING,
        'Database.readDB',
        'InvalidStructure',
        'Database has invalid structure, attempting recovery'
      );
      return this.recoverFromCorruption(new Error('Invalid database structure'));
    }

    return parsed;

  } catch (error) {
    errorHandler.handleException('Database.readDB', error);
    return { recordings: [] };
  }
}

/**
 * Recover from database corruption.
 * Backs up corrupted file and creates fresh database.
 *
 * @private
 * @param {Error} originalError - The error that triggered recovery
 * @returns {Object} Empty database object
 */
recoverFromCorruption(originalError) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.dbPath}.corrupted.${timestamp}`;

    // Backup corrupted file
    fs.copyFileSync(this.dbPath, backupPath);

    errorHandler.notify(
      ErrorLevel.ERROR,
      'Database.recoverFromCorruption',
      'DatabaseCorrupted',
      `Database corrupted (${originalError.message}). Backed up to ${backupPath}`
    );

    // Create fresh database
    this.initializeDatabase();

    return { recordings: [] };

  } catch (recoveryError) {
    errorHandler.handleException('Database.recoverFromCorruption', recoveryError);
    return { recordings: [] };
  }
}
```

---

### 4.2 Resource Cleanup with Timeout

**Update:** `src/add_recording.js`

```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'src', 'data', 'recordings.json');
const INPUT_TIMEOUT_MS = 5000;

let inputData = '';

// Set timeout for input
const timeout = setTimeout(() => {
  console.error('Error: Timeout waiting for input data');
  process.exit(1);
}, INPUT_TIMEOUT_MS);

// Read from stdin
process.stdin.setEncoding('utf-8');

process.stdin.on('data', chunk => {
  inputData += chunk.toString();
});

process.stdin.on('end', async () => {
  clearTimeout(timeout);

  try {
    // Parse input data
    const recording = JSON.parse(inputData);

    // Read database
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

    // Add recording
    db.recordings.unshift(recording);

    // Write back
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    console.log('Recording added successfully');
    process.exit(0);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
});

process.stdin.on('error', error => {
  clearTimeout(timeout);
  console.error(`Stdin error: ${error.message}`);
  process.exit(1);
});
```

---

## Part 5: Execution Phases

### Phase B.1 - Quick Wins (1-2 days)

**Day 1:**
1. Create `src/config/constants.js` (1 hour)
2. Create `src/python/config/settings.py` (1 hour)
3. Update imports across codebase to use constants (2 hours)
4. Create `src/js/utils/file_validator.js` (1 hour)
5. Replace duplicate validation with FileValidator (2 hours)

**Day 2:**
1. Add type hints to all Python files (3 hours)
2. Add docstrings to Python classes/methods (3 hours)
3. Run `black` and `flake8`, fix issues (1 hour)

**Deliverables:**
- ✅ Configuration modules created
- ✅ File validation centralized
- ✅ Python type hints at 100%
- ✅ Python docstrings at 100%
- ✅ PEP 8 compliant

---

### Phase B.2 - Architecture Refactoring (3-4 days)

**Day 3-4:**
1. Create `WindowManager` (2 hours)
2. Create `RecorderManager` (4 hours)
3. Create `TranscriptionService` (2 hours)
4. Test managers in isolation (2 hours)

**Day 5-6:**
1. Create `IPCHandlers` (3 hours)
2. Create `ShortcutManager` (2 hours)
3. Refactor `main.js` to use managers (3 hours)
4. Integration testing (2 hours)

**Deliverables:**
- ✅ main.js reduced to ~100 lines
- ✅ 5 specialized manager modules created
- ✅ Clean separation of concerns
- ✅ All tests still passing

---

### Phase B.3 - Code Quality (2-3 days)

**Day 7:**
1. Add JSDoc to all JavaScript files (4 hours)
2. Implement database corruption recovery (2 hours)
3. Add resource cleanup timeouts (1 hour)

**Day 8:**
1. Configure ESLint + Prettier (1 hour)
2. Run linters and fix issues (3 hours)
3. Review and refine documentation (2 hours)

**Deliverables:**
- ✅ 100% JSDoc coverage
- ✅ Database corruption handling
- ✅ ESLint passing with zero warnings
- ✅ Code formatted consistently

---

### Phase B.4 - Documentation & Standards (2-3 days)

**Day 9:**
1. Create architecture documentation (3 hours)
2. Update README with new structure (2 hours)
3. Create CONTRIBUTING.md guide (2 hours)

**Day 10:**
1. Final code review and cleanup (3 hours)
2. Performance profiling (2 hours)
3. Create Phase B completion report (2 hours)

**Deliverables:**
- ✅ Architecture documentation
- ✅ Developer contribution guide
- ✅ Phase B completion report
- ✅ Performance baseline metrics

---

## Part 6: Testing Strategy

### 6.1 Maintain Test Coverage

**Critical:** All refactoring MUST maintain 92%+ test coverage

**Approach:**
1. Run tests before each change
2. Update mocks for new module structure
3. Add tests for new utility functions
4. Run full test suite after each phase

**Commands:**

```bash
# JavaScript tests
npm test -- --coverage

# Python tests
pytest --cov=src/python --cov=recorder --cov=transcribe --cov-report=term-missing

# Integration tests
npm run test:integration
```

---

### 6.2 Update Test Structure

**New Test Files Needed:**

```
tests/js/
  ├── managers/
  │   ├── window_manager.test.js
  │   ├── recorder_manager.test.js
  │   └── shortcut_manager.test.js
  ├── services/
  │   └── transcription_service.test.js
  ├── ipc/
  │   └── handlers.test.js
  └── utils/
      └── file_validator.test.js
```

**Example Test:** `window_manager.test.js`

```javascript
import { WindowManager } from '../../src/js/managers/window_manager.js';
import { BrowserWindow } from 'electron';

jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
    destroy: jest.fn()
  }))
}));

describe('WindowManager', () => {
  let windowManager;

  beforeEach(() => {
    windowManager = new WindowManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a BrowserWindow with correct settings', () => {
      const window = windowManager.create();

      expect(BrowserWindow).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        webPreferences: expect.objectContaining({
          nodeIntegration: false,
          contextIsolation: true
        })
      });

      expect(window.loadFile).toHaveBeenCalledWith('index.html');
    });
  });

  describe('loadHistoryView', () => {
    it('should load history.html', () => {
      const window = windowManager.create();
      windowManager.loadHistoryView();

      expect(window.loadFile).toHaveBeenCalledWith('history.html');
    });

    it('should throw if window not created', () => {
      expect(() => windowManager.loadHistoryView()).toThrow('Window not created');
    });
  });

  describe('isValid', () => {
    it('should return true when window exists and not destroyed', () => {
      windowManager.create();
      expect(windowManager.isValid()).toBe(true);
    });

    it('should return false when window not created', () => {
      expect(windowManager.isValid()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should destroy window and set to null', () => {
      const window = windowManager.create();
      windowManager.destroy();

      expect(window.destroy).toHaveBeenCalled();
      expect(windowManager.getWindow()).toBeNull();
    });
  });
});
```

---

## Part 7: Migration to ES Modules (Optional)

### 7.1 Decision Point

**Recommendation:** OPTIONAL for Phase B

**Reasons to migrate:**
- Modern standard (2024)
- Better tree-shaking
- Native browser support
- Static analysis benefits

**Reasons to defer:**
- CommonJS works perfectly
- Large refactoring effort (affects all files)
- Electron supports both
- Focus on architecture first

**If proceeding, timeline:** Add 3-4 days to Phase B

---

### 7.2 Migration Steps (If Chosen)

**Step 1:** Update `package.json`

```json
{
  "type": "module",
  "main": "main.js"
}
```

**Step 2:** Update all imports/exports

```javascript
// Before (CommonJS)
const { app } = require('electron');
module.exports = Database;

// After (ES Modules)
import { app } from 'electron';
export default Database;
```

**Step 3:** Update `__dirname` references

```javascript
// Before
const __dirname = __dirname;

// After (ES modules don't have __dirname)
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Step 4:** Update Jest config for ES modules

```javascript
// jest.config.js
export default {
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
```

---

## Part 8: Success Criteria

### 8.1 Quantitative Metrics

| Metric | Before | Target | Validation |
|--------|--------|--------|------------|
| main.js LOC | 458 | ~100 | `wc -l main.js` |
| Magic numbers | 40+ | 0 | Code review |
| Python type hints | 0% | 100% | `mypy --strict` |
| JSDoc coverage | 15% | 100% | Manual review |
| ESLint errors | Unknown | 0 | `npm run lint` |
| Test coverage | 92% | 92%+ | `npm test -- --coverage` |
| PEP 8 compliance | Unknown | 100% | `flake8` |

---

### 8.2 Qualitative Criteria

**Architecture:**
- ✅ Single Responsibility Principle enforced
- ✅ No god objects
- ✅ Clean dependency injection
- ✅ SOLID principles applied

**Code Quality:**
- ✅ No duplicate code
- ✅ No magic numbers/strings
- ✅ Consistent naming conventions
- ✅ Clear function/class boundaries

**Documentation:**
- ✅ All public APIs documented
- ✅ Complex logic explained
- ✅ Architecture diagrams created
- ✅ Developer onboarding guide exists

**Maintainability:**
- ✅ Easy to add new features
- ✅ Easy to modify existing code
- ✅ Clear error messages
- ✅ Testable components

---

## Part 9: Rollback Strategy

### 9.1 Git Branch Strategy

**Branch:** `feature/phase-b-production-refactor`

**Commit Strategy:**
1. Commit after each phase completion
2. Tag major milestones
3. Keep main branch stable

**Example:**

```bash
git checkout -b feature/phase-b-production-refactor

# After Phase B.1
git add .
git commit -m "Phase B.1: Configuration management and file validation"
git tag phase-b.1

# After Phase B.2
git add .
git commit -m "Phase B.2: Architecture refactoring complete"
git tag phase-b.2

# etc.
```

---

### 9.2 Rollback Procedure

**If critical bug found:**

```bash
# Rollback to previous phase
git reset --hard phase-b.1

# Or rollback entire Phase B
git checkout main
git branch -D feature/phase-b-production-refactor
```

**Test before merge:**

```bash
# Run all tests
npm test
pytest

# Manual smoke test
npm start
```

---

## Part 10: Phase B Completion Checklist

### Configuration Management
- [ ] `src/config/constants.js` created with all constants
- [ ] `src/python/config/settings.py` created
- [ ] All magic numbers extracted
- [ ] All hardcoded paths moved to config

### Architecture Refactoring
- [ ] `WindowManager` created and tested
- [ ] `RecorderManager` created and tested
- [ ] `TranscriptionService` created and tested
- [ ] `IPCHandlers` created and tested
- [ ] `ShortcutManager` created and tested
- [ ] `main.js` refactored to AppController (<120 lines)
- [ ] All managers integrate correctly

### Code Quality
- [ ] `FileValidator` utility created
- [ ] Duplicate file validation removed
- [ ] Database corruption recovery implemented
- [ ] Resource cleanup timeouts added
- [ ] ESLint configured and passing
- [ ] Prettier configured and run

### Python Standards
- [ ] All Python files have type hints
- [ ] All classes have docstrings
- [ ] All methods have docstrings
- [ ] PEP 8 compliant (flake8 passing)
- [ ] Black formatter applied

### JavaScript Standards
- [ ] All exported functions have JSDoc
- [ ] All classes have JSDoc
- [ ] Complex logic documented
- [ ] ESLint passing (zero warnings)

### Testing
- [ ] All existing tests updated for new structure
- [ ] New tests for managers created
- [ ] Coverage maintained at 92%+
- [ ] Integration tests passing

### Documentation
- [ ] Architecture documentation created
- [ ] README updated
- [ ] CONTRIBUTING.md created
- [ ] Phase B completion report written

### Final Validation
- [ ] All tests passing
- [ ] ESLint passing
- [ ] flake8 passing
- [ ] mypy passing
- [ ] Application runs without errors
- [ ] Recording/transcription workflow works
- [ ] History view works
- [ ] Performance not degraded

---

## Part 11: Post-Phase B State

### File Structure (After Refactoring)

```
IAC-30-brain-dump-voice-processor/
├── main.js                           # 100 lines (orchestration)
├── database.js                       # Unchanged (already clean)
├── recorder.py                       # Updated (type hints, docstrings)
├── transcribe.py                     # Updated (type hints, docstrings)
├── package.json                      # Updated (lint scripts)
├── .eslintrc.json                    # New
├── .prettierrc.json                  # New
├── .flake8                           # New
├── pyproject.toml                    # New (black config)
│
├── src/
│   ├── config/
│   │   └── constants.js              # New - All JS constants
│   │
│   ├── js/
│   │   ├── error_handler.js          # Unchanged
│   │   ├── process_manager.js        # Unchanged
│   │   ├── managers/                 # New directory
│   │   │   ├── window_manager.js     # New
│   │   │   ├── recorder_manager.js   # New
│   │   │   └── shortcut_manager.js   # New
│   │   ├── services/                 # New directory
│   │   │   └── transcription_service.js  # New
│   │   ├── ipc/                      # New directory
│   │   │   └── handlers.js           # New
│   │   └── utils/                    # New directory
│   │       └── file_validator.js     # New
│   │
│   ├── python/
│   │   ├── config/                   # New directory
│   │   │   ├── __init__.py           # New
│   │   │   └── settings.py           # New - All Python constants
│   │   ├── core/
│   │   │   ├── error_handler.py      # Updated (better docs)
│   │   │   └── validators.py         # Updated (better docs)
│   │   ├── transcription/
│   │   │   └── whisper_transcriber.py  # Updated (type hints)
│   │   └── audio/
│   │       └── recorder.py           # Updated (type hints)
│   │
│   ├── preload.js                    # Unchanged
│   ├── renderer.js                   # Unchanged
│   └── history-renderer.js           # Unchanged
│
├── tests/
│   ├── js/
│   │   ├── managers/                 # New directory
│   │   │   ├── window_manager.test.js
│   │   │   ├── recorder_manager.test.js
│   │   │   └── shortcut_manager.test.js
│   │   ├── services/                 # New directory
│   │   │   └── transcription_service.test.js
│   │   ├── ipc/                      # New directory
│   │   │   └── handlers.test.js
│   │   └── utils/                    # New directory
│   │       └── file_validator.test.js
│   └── python/
│       └── (existing tests updated)
│
├── docs/
│   ├── ARCHITECTURE.md               # Updated
│   └── CONTRIBUTING.md               # New
│
└── reports/
    ├── PHASE_A_COMPLETION_REPORT.md  # Existing
    ├── PHASE_B_TECHNICAL_PLAN.md     # This file
    └── PHASE_B_COMPLETION_REPORT.md  # To be created
```

---

## Part 12: Estimated Effort Breakdown

### Total Time: 8-12 days

| Phase | Tasks | Days | Can Parallelize? |
|-------|-------|------|------------------|
| **B.1** | Config modules, file validation, type hints, docstrings | 1-2 | No |
| **B.2** | Manager refactoring, main.js decomposition | 3-4 | Yes (specialist agents) |
| **B.3** | JSDoc, error handling, linting | 2-3 | Yes (specialist agents) |
| **B.4** | Documentation, final review | 2-3 | Yes (specialist agents) |

### Parallelization Strategy

**Spawn Specialist Agents:**
1. **python-standards-agent**: Handle all Python type hints, docstrings, PEP 8
2. **javascript-architect-agent**: Refactor main.js and create managers
3. **documentation-agent**: Write JSDoc, architecture docs, CONTRIBUTING.md
4. **testing-agent**: Update tests for new structure, maintain coverage

**Benefit:** Reduce 8-12 days to 4-6 days with parallel execution

---

## Conclusion

Phase B transforms the BrainDump Voice Processor into production-grade software through:

1. **Modularization**: Breaking god objects into SOLID components
2. **Configuration Management**: Eliminating magic numbers
3. **Code Quality**: PEP 8, ESLint, comprehensive documentation
4. **Error Handling**: Corruption recovery, resource cleanup
5. **Standards Compliance**: Type safety, modern patterns, best practices

**Result:** Maintainable, extensible, production-ready codebase ready for Phase C features.

**Zero New Features Added** - Pure refactoring and quality improvements.

---

**End of Phase B Technical Execution Plan**

**Ready for Approval and Execution**
