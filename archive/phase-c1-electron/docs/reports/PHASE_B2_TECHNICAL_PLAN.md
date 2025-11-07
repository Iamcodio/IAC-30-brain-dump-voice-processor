# Phase B.2 Technical Execution Plan
**BrainDump Voice Processor - Architecture Refactoring**

**Date:** 2025-10-25
**Branch:** `feature/phase-b-production-refactor`
**Phase:** B.2 - Decompose God Object (main.js)
**Prerequisites:** Phase B.1 Complete ✅
**Target Duration:** 3-4 days (can parallelize to 1-2 days)
**Status:** READY TO EXECUTE

---

## Executive Summary

Phase B.2 transforms main.js from a 435-line god object into a clean 100-line orchestrator by extracting 5 specialized manager classes. This refactoring applies SOLID principles, improves testability, and eliminates tight coupling while maintaining 100% backward compatibility.

### Current State (Phase B.1 Complete)
- **main.js:** 435 lines, 5 functions, multiple responsibilities
- **Responsibilities:** Window management, process lifecycle, transcription, IPC, shortcuts, app lifecycle
- **State:** 4 global variables (mainWindow, recorderManager, isRecording, db)
- **Issues:** Violates Single Responsibility Principle, difficult to test, tight coupling

### Target State (Phase B.2 Complete)
- **main.js:** ~100 lines (77% reduction), orchestration only
- **Managers:** 5 specialized classes with single responsibilities
- **Pattern:** Dependency injection for testability
- **Tests:** Maintai ned at 92%+ coverage with new manager tests

---

## Part 1: Architecture Analysis

### 1.1 Current main.js Breakdown

**Line Distribution:**

| Section | Lines | Responsibility | Target Module |
|---------|-------|----------------|---------------|
| Imports | 1-21 | Dependencies | Stays in main.js |
| Global State | 23-26 | State management | Distributed to managers |
| createWindow() | 28-40 (13 lines) | Window lifecycle | **WindowManager** |
| startRecorderProcess() | 42-153 (112 lines) | Process + event handling | **RecorderManager** |
| transcribeAudio() | 155-232 (78 lines) | Transcription | **TranscriptionService** |
| app.whenReady() | 234-252 (19 lines) | App initialization | **AppController** (main.js) |
| app.on('will-quit') | 254-265 (12 lines) | App cleanup | **AppController** (main.js) |
| startRecording() | 267-296 (30 lines) | Recording control | **RecorderManager** (method) |
| stopRecording() | 298-326 (29 lines) | Recording control | **RecorderManager** (method) |
| IPC Handlers | 333-435 (103 lines) | IPC routing | **IPCHandlers** |

**Total:** 435 lines → Split into 6 modules

---

### 1.2 Responsibilities Matrix

| Responsibility | Current Location | New Module | Lines | Coupling |
|----------------|------------------|------------|-------|----------|
| **Window Management** | createWindow() | WindowManager | 13 → 80 | Low |
| **Process Lifecycle** | startRecorderProcess() | RecorderManager | 112 → 200 | Medium |
| **Event Handling** | Inside startRecorderProcess() | RecorderManager | Embedded → Separate methods | Low |
| **Recording Control** | startRecording(), stopRecording() | RecorderManager | 59 → Methods | Low |
| **Transcription** | transcribeAudio() | TranscriptionService | 78 → 120 | Low |
| **IPC Routing** | 6 ipcMain handlers | IPCHandlers | 103 → 150 | Low |
| **Shortcuts** | Inside app.whenReady() | ShortcutManager | 19 → 70 | Low |
| **Orchestration** | app lifecycle events | AppController (main.js) | 435 → 100 | Low |

---

### 1.3 Dependency Graph

```
AppController (main.js)
├── WindowManager (creates mainWindow)
├── Database (existing, passed to managers)
├── RecorderManager (depends on WindowManager.window)
│   └── ProcessManager (existing utility)
├── TranscriptionService (depends on WindowManager.window)
├── IPCHandlers (depends on Database, WindowManager)
└── ShortcutManager (depends on RecorderManager)
```

**Key Insight:** Clean dependency tree with no circular dependencies

---

## Part 2: Module Specifications

### 2.1 WindowManager

**File:** `src/js/managers/window_manager.js`
**Lines:** ~80
**Dependencies:** Electron (BrowserWindow), constants (WINDOW_CONFIG, PATHS)

**Responsibilities:**
1. Create and configure BrowserWindow
2. Load HTML views (index.html, history.html)
3. Provide window instance to other managers
4. Handle window lifecycle (destroy, isValid checks)

**Public API:**
```javascript
class WindowManager {
  constructor()                    // Initialize (no window created yet)
  create()                         // Create BrowserWindow, returns instance
  loadRecorderView()              // Load index.html
  loadHistoryView()               // Load history.html
  getWindow()                     // Get current window instance
  isValid()                       // Check if window exists and not destroyed
  destroy()                       // Destroy window
}
```

**Migration from main.js:**
- Lines 28-40: createWindow() → create()
- Lines 420, 432: loadFile() calls → loadRecorderView(), loadHistoryView()

**Code Example:**
```javascript
const { BrowserWindow } = require('electron');
const path = require('path');
const { WINDOW_CONFIG, PATHS } = require('../config/constants');

class WindowManager {
  constructor() {
    this.window = null;
  }

  create() {
    this.window = new BrowserWindow({
      width: WINDOW_CONFIG.WIDTH,
      height: WINDOW_CONFIG.HEIGHT,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', PATHS.PRELOAD_SCRIPT),
        nodeIntegration: WINDOW_CONFIG.NODE_INTEGRATION,
        contextIsolation: WINDOW_CONFIG.CONTEXT_ISOLATION
      }
    });

    this.loadRecorderView();
    return this.window;
  }

  loadRecorderView() {
    if (!this.isValid()) throw new Error('Window not created');
    this.window.loadFile(PATHS.INDEX_HTML);
  }

  loadHistoryView() {
    if (!this.isValid()) throw new Error('Window not created');
    this.window.loadFile(PATHS.HISTORY_HTML);
  }

  getWindow() {
    return this.window;
  }

  isValid() {
    return this.window && !this.window.isDestroyed();
  }

  destroy() {
    if (this.isValid()) {
      this.window.destroy();
      this.window = null;
    }
  }
}

module.exports = { WindowManager };
```

---

### 2.2 RecorderManager

**File:** `src/js/managers/recorder_manager.js`
**Lines:** ~200
**Dependencies:** ProcessManager, FileValidator, errorHandler, constants

**Responsibilities:**
1. Manage recorder process lifecycle
2. Handle all recorder events (stdout, stderr, error, restart, failed)
3. Control recording (start/stop)
4. Validate Python and script paths
5. Notify UI of recorder state changes
6. Emit events for transcription integration

**Public API:**
```javascript
class RecorderManager {
  constructor(mainWindow, baseDir)  // Dependencies injected
  start()                            // Start recorder process
  startRecording()                   // Send start command
  stopRecording()                    // Send stop command
  stop(force)                        // Stop process (graceful or force)
  getRecordingState()                // Returns boolean
  on(event, handler)                 // Event emitter (for transcription)
}
```

**Events Emitted:**
- `'recordingComplete'` - Emitted when RECORDING_STOPPED with filename

**Migration from main.js:**
- Lines 42-153: startRecorderProcess() → constructor + start()
- Lines 62-105: stdout handler → handleStdout()
- Lines 108-112: stderr handler → handleStderr()
- Lines 115-123: error handler → handleError()
- Lines 126-134: restart handler → handleRestarting()
- Lines 137-145: failed handler → handleFailed()
- Lines 267-296: startRecording() → startRecording()
- Lines 298-326: stopRecording() → stopRecording()

**Code Example:**
```javascript
const path = require('path');
const fs = require('fs');
const { ProcessManager } = require('../process_manager');
const { FileValidator } = require('../utils/file_validator');
const { errorHandler, ErrorLevel } = require('../error_handler');
const {
  PATHS,
  PROCESS_CONFIG,
  PROTOCOL,
  ERROR_TYPES,
  CONTEXTS
} = require('../config/constants');

class RecorderManager {
  constructor(mainWindow, baseDir) {
    this.mainWindow = mainWindow;
    this.baseDir = baseDir;
    this.processManager = null;
    this.isRecording = false;
    this.eventHandlers = {}; // For custom events like recordingComplete
  }

  start() {
    const pythonPath = path.join(this.baseDir, PATHS.PYTHON_VENV);
    const scriptPath = path.join(this.baseDir, PATHS.RECORDER_SCRIPT);

    // Validate paths
    FileValidator.validateExistsWithLevel(pythonPath, CONTEXTS.START_RECORDER, ErrorLevel.CRITICAL);
    FileValidator.validateExistsWithLevel(scriptPath, CONTEXTS.START_RECORDER, ErrorLevel.CRITICAL);

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
    this.processManager.on('stdout', this.handleStdout.bind(this));
    this.processManager.on('stderr', this.handleStderr.bind(this));
    this.processManager.on('error', this.handleError.bind(this));
    this.processManager.on('restarting', this.handleRestarting.bind(this));
    this.processManager.on('failed', this.handleFailed.bind(this));

    // Start process
    this.processManager.start();
  }

  handleStdout(data) {
    const output = data.toString().trim();
    console.log('Python:', output);

    try {
      if (output === PROTOCOL.READY) {
        errorHandler.notify(ErrorLevel.INFO, CONTEXTS.RECORDER_STDOUT, ERROR_TYPES.RECORDER_READY, 'Recorder process ready');
        this.processManager.resetRestartCount();
      } else if (output === PROTOCOL.RECORDING_STARTED) {
        this.notifyUI('recording-started');
      } else if (output.startsWith(PROTOCOL.RECORDING_STOPPED)) {
        const filename = output.split(':')[1];
        this.notifyUI('recording-stopped');

        if (filename && filename !== PROTOCOL.NO_AUDIO_CAPTURED) {
          console.log('Saved:', filename);
          this.emit('recordingComplete', filename); // Emit for transcription service
        } else {
          errorHandler.notify(ErrorLevel.WARNING, CONTEXTS.RECORDER_STDOUT, ERROR_TYPES.NO_AUDIO_RECORDED, 'No audio captured');
        }
      } else if (output.startsWith(PROTOCOL.ERROR_PREFIX)) {
        errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.RECORDER_STDOUT, ERROR_TYPES.RECORDER_ERROR, output);
        this.notifyUI('recording-error', output);
      }
    } catch (error) {
      errorHandler.handleException('RecorderManager.handleStdout', error);
    }
  }

  handleStderr(data) {
    console.error('Recorder stderr:', data.toString().trim());
  }

  handleError(error) {
    errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.RECORDER_PROCESS, ERROR_TYPES.PROCESS_ERROR, `Recorder process error: ${error.message}`);
    this.notifyUI('recorder-error', error.message);
  }

  handleRestarting(count, delay) {
    errorHandler.notify(ErrorLevel.WARNING, CONTEXTS.RECORDER_PROCESS, ERROR_TYPES.PROCESS_RESTARTING,
      `Recorder restarting (attempt ${count}/${PROCESS_CONFIG.MAX_RESTARTS}) in ${delay}ms`);
    this.notifyUI('recorder-restarting', { count, delay });
  }

  handleFailed() {
    errorHandler.notify(ErrorLevel.CRITICAL, CONTEXTS.RECORDER_PROCESS, ERROR_TYPES.PROCESS_FAILED,
      'Recorder failed after maximum restart attempts');
    this.notifyUI('recorder-failed');
  }

  startRecording() {
    if (!this.processManager || !this.processManager.isRunning) {
      errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.START_RECORDING, ERROR_TYPES.RECORDER_NOT_READY, 'Recorder process not running');
      this.notifyUI('recording-error', 'Recorder not ready');
      return false;
    }

    this.isRecording = true;
    console.log('Sending start command to Python');

    if (!this.processManager.send(PROTOCOL.CMD_START)) {
      errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.START_RECORDING, ERROR_TYPES.SEND_FAILED, 'Failed to send start command');
      this.isRecording = false;
      return false;
    }

    return true;
  }

  stopRecording() {
    if (!this.processManager || !this.processManager.isRunning) {
      errorHandler.notify(ErrorLevel.WARNING, CONTEXTS.STOP_RECORDING, ERROR_TYPES.RECORDER_NOT_READY, 'Recorder process not running');
      this.isRecording = false;
      return false;
    }

    this.isRecording = false;
    console.log('Sending stop command to Python');

    if (!this.processManager.send(PROTOCOL.CMD_STOP)) {
      errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.STOP_RECORDING, ERROR_TYPES.SEND_FAILED, 'Failed to send stop command');
      return false;
    }

    return true;
  }

  async stop(force = false) {
    if (this.processManager) {
      await this.processManager.stop(force);
      this.processManager = null;
    }
  }

  getRecordingState() {
    return this.isRecording;
  }

  notifyUI(channel, data = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (data) {
        this.mainWindow.webContents.send(channel, data);
      } else {
        this.mainWindow.webContents.send(channel);
      }
    }
  }

  // Simple event emitter for recordingComplete event
  on(event, handler) {
    this.eventHandlers[event] = handler;
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event](data);
    }
  }
}

module.exports = { RecorderManager };
```

---

### 2.3 TranscriptionService

**File:** `src/js/services/transcription_service.js`
**Lines:** ~120
**Dependencies:** child_process (spawn), FileValidator, errorHandler, constants

**Responsibilities:**
1. Spawn Python transcription process
2. Handle transcription stdout/stderr
3. Monitor transcription completion
4. Notify UI of transcription state
5. Validate audio file exists before transcription

**Public API:**
```javascript
class TranscriptionService {
  constructor(mainWindow, baseDir)  // Dependencies injected
  async transcribe(audioPath)       // Transcribe audio file, returns Promise
}
```

**Migration from main.js:**
- Lines 155-232: transcribeAudio() → transcribe()
- Lines 173-195: stdout handler → Inline in transcribe()
- Lines 197-206: stderr + error handlers → Inline in transcribe()
- Lines 208-226: close handler → Promise resolution

**Code Example:**
```javascript
const { spawn } = require('child_process');
const path = require('path');
const { FileValidator } = require('../utils/file_validator');
const { errorHandler, ErrorLevel } = require('../error_handler');
const {
  PATHS,
  PROTOCOL,
  EXIT_CODES,
  ERROR_TYPES,
  CONTEXTS
} = require('../config/constants');

class TranscriptionService {
  constructor(mainWindow, baseDir) {
    this.mainWindow = mainWindow;
    this.baseDir = baseDir;
    this.pythonPath = path.join(baseDir, PATHS.PYTHON_VENV);
    this.scriptPath = path.join(baseDir, PATHS.TRANSCRIBER_SCRIPT);
  }

  async transcribe(audioPath) {
    return new Promise((resolve, reject) => {
      try {
        // Validate audio file
        try {
          FileValidator.validateExists(audioPath, CONTEXTS.TRANSCRIBE_AUDIO);
        } catch (error) {
          this.notifyUI('transcription-error', 'Audio file not found');
          reject(error);
          return;
        }

        console.log('Starting transcription:', audioPath);
        this.notifyUI('transcription-started');

        const transcriber = spawn(this.pythonPath, [this.scriptPath, audioPath]);

        let transcriptPath = null;

        transcriber.stdout.on('data', (data) => {
          const output = data.toString().trim();
          console.log('Transcription:', output);

          if (output.startsWith(PROTOCOL.TRANSCRIPT_SAVED)) {
            transcriptPath = output.split(':')[1];
            errorHandler.notify(ErrorLevel.INFO, CONTEXTS.TRANSCRIBE_AUDIO, ERROR_TYPES.TRANSCRIPT_SAVED,
              `Transcript saved: ${transcriptPath}`);
          } else if (output.startsWith(PROTOCOL.ERROR_PREFIX)) {
            errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.TRANSCRIBE_STDOUT, ERROR_TYPES.TRANSCRIPTION_ERROR, output);
            this.notifyUI('transcription-error', output);
          }
        });

        transcriber.stderr.on('data', (data) => {
          console.error('Transcription stderr:', data.toString().trim());
        });

        transcriber.on('error', (error) => {
          errorHandler.handleException(CONTEXTS.TRANSCRIBE_SPAWN, error);
          this.notifyUI('transcription-error', error.message);
          reject(error);
        });

        transcriber.on('close', (code) => {
          if (code === EXIT_CODES.SUCCESS) {
            errorHandler.notify(ErrorLevel.INFO, CONTEXTS.TRANSCRIBE_AUDIO, ERROR_TYPES.TRANSCRIPTION_COMPLETE,
              'Transcription completed successfully');
            this.notifyUI('transcription-complete');
            resolve(transcriptPath);
          } else {
            const error = new Error(`Transcription failed with exit code ${code}`);
            errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.TRANSCRIBE_AUDIO, ERROR_TYPES.TRANSCRIPTION_FAILED, error.message);
            this.notifyUI('transcription-error', `Exit code ${code}`);
            reject(error);
          }
        });

      } catch (error) {
        errorHandler.handleException(CONTEXTS.TRANSCRIBE_AUDIO, error);
        this.notifyUI('transcription-error', error.message);
        reject(error);
      }
    });
  }

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

module.exports = { TranscriptionService };
```

---

### 2.4 IPCHandlers

**File:** `src/js/ipc/handlers.js`
**Lines:** ~150
**Dependencies:** Electron (ipcMain, shell), child_process (spawn), FileValidator, errorHandler, constants

**Responsibilities:**
1. Register all IPC handlers
2. Group handlers by domain (recordings, files, navigation)
3. Handle database operations (get, search)
4. Handle file operations (read, play, view)
5. Handle navigation (show-history, show-recorder)
6. Provide cleanup (unregisterAll)

**Public API:**
```javascript
class IPCHandlers {
  constructor(database, windowManager)  // Dependencies injected
  registerAll()                         // Register all IPC handlers
  unregisterAll()                       // Cleanup all handlers
}
```

**Migration from main.js:**
- Lines 333-343: get-recordings handler → registerRecordingHandlers()
- Lines 348-358: search-recordings handler → registerRecordingHandlers()
- Lines 363-373: read-file handler → registerFileHandlers()
- Lines 378-395: play-audio handler → registerFileHandlers()
- Lines 400-413: view-file handler → registerFileHandlers()
- Lines 418-424: show-history handler → registerNavigationHandlers()
- Lines 429-435: show-recorder handler → registerNavigationHandlers()

**Code Example:**
```javascript
const { ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const { FileValidator } = require('../utils/file_validator');
const { errorHandler } = require('../error_handler');
const {
  FILE_OPS,
  PLATFORM,
  SPAWN_COMMANDS,
  PATHS,
  ERROR_TYPES,
  CONTEXTS
} = require('../config/constants');

class IPCHandlers {
  constructor(database, windowManager) {
    this.database = database;
    this.windowManager = windowManager;
  }

  registerAll() {
    this.registerRecordingHandlers();
    this.registerFileHandlers();
    this.registerNavigationHandlers();
  }

  registerRecordingHandlers() {
    ipcMain.handle('get-recordings', async () => {
      try {
        if (!this.database) throw new Error('Database not initialized');
        return this.database.getAll();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_GET_RECORDINGS, error);
        return [];
      }
    });

    ipcMain.handle('search-recordings', async (event, query) => {
      try {
        if (!this.database) throw new Error('Database not initialized');
        return this.database.search(query);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SEARCH_RECORDINGS, error);
        return [];
      }
    });
  }

  registerFileHandlers() {
    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        FileValidator.validateSafe(filePath, CONTEXTS.IPC_READ_FILE);
        return fs.readFileSync(filePath, FILE_OPS.ENCODING);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_READ_FILE, error);
        throw error;
      }
    });

    ipcMain.on('play-audio', (event, audioPath) => {
      try {
        try {
          FileValidator.validateExists(audioPath, CONTEXTS.IPC_PLAY_AUDIO);
        } catch (error) {
          return;
        }

        if (process.platform === PLATFORM.DARWIN) {
          spawn(SPAWN_COMMANDS.MACOS_OPEN, [SPAWN_COMMANDS.MACOS_OPEN_APP_FLAG, PLATFORM.AUDIO_PLAYER_MACOS, audioPath]);
        } else {
          shell.openPath(audioPath);
        }
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_PLAY_AUDIO, error);
      }
    });

    ipcMain.on('view-file', (event, filePath) => {
      try {
        try {
          FileValidator.validateExists(filePath, CONTEXTS.IPC_VIEW_FILE);
        } catch (error) {
          return;
        }
        shell.openPath(filePath);
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_VIEW_FILE, error);
      }
    });
  }

  registerNavigationHandlers() {
    ipcMain.on('show-history', () => {
      try {
        this.windowManager.loadHistoryView();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SHOW_HISTORY, error);
      }
    });

    ipcMain.on('show-recorder', () => {
      try {
        this.windowManager.loadRecorderView();
      } catch (error) {
        errorHandler.handleException(CONTEXTS.IPC_SHOW_RECORDER, error);
      }
    });
  }

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

module.exports = { IPCHandlers };
```

---

### 2.5 ShortcutManager

**File:** `src/js/managers/shortcut_manager.js`
**Lines:** ~70
**Dependencies:** Electron (globalShortcut), errorHandler, constants

**Responsibilities:**
1. Register global keyboard shortcuts
2. Handle recording toggle shortcut
3. Provide cleanup (unregisterAll)
4. Track registered shortcuts

**Public API:**
```javascript
class ShortcutManager {
  constructor(recorderManager)      // Dependency injected
  registerRecordingToggle(accelerator)  // Register shortcut, returns boolean
  unregisterAll()                   // Cleanup all shortcuts
  isRegistered(name)                // Check if shortcut registered
}
```

**Migration from main.js:**
- Lines 240-251: globalShortcut.register() → registerRecordingToggle()
- Lines 256: globalShortcut.unregisterAll() → unregisterAll()
- Recording toggle logic integrated

**Code Example:**
```javascript
const { globalShortcut } = require('electron');
const { errorHandler, ErrorLevel } = require('../error_handler');
const { SHORTCUTS, ERROR_TYPES, CONTEXTS } = require('../config/constants');

class ShortcutManager {
  constructor(recorderManager) {
    this.recorderManager = recorderManager;
    this.registeredShortcuts = new Map();
  }

  registerRecordingToggle(accelerator = SHORTCUTS.TOGGLE_RECORDING) {
    try {
      const success = globalShortcut.register(accelerator, () => {
        this.handleRecordingToggle();
      });

      if (!success) {
        errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.SHORTCUT_MANAGER, ERROR_TYPES.SHORTCUT_REGISTRATION_FAILED,
          `Failed to register shortcut: ${accelerator}`);
        console.log('Shortcut registration failed');
        return false;
      }

      this.registeredShortcuts.set('recordingToggle', accelerator);
      console.log(`Registered shortcut: ${accelerator}`);
      return true;

    } catch (error) {
      errorHandler.handleException(CONTEXTS.SHORTCUT_MANAGER, error);
      return false;
    }
  }

  handleRecordingToggle() {
    try {
      console.log(`Hotkey pressed: ${SHORTCUTS.TOGGLE_RECORDING}`);

      const isRecording = this.recorderManager.getRecordingState();

      if (isRecording) {
        this.recorderManager.stopRecording();
      } else {
        this.recorderManager.startRecording();
      }
    } catch (error) {
      errorHandler.handleException(CONTEXTS.SHORTCUT_TOGGLE, error);
    }
  }

  unregisterAll() {
    try {
      globalShortcut.unregisterAll();
      this.registeredShortcuts.clear();
      console.log('All shortcuts unregistered');
    } catch (error) {
      errorHandler.handleException(CONTEXTS.SHORTCUT_MANAGER, error);
    }
  }

  isRegistered(name) {
    return this.registeredShortcuts.has(name);
  }
}

module.exports = { ShortcutManager };
```

---

### 2.6 AppController (New main.js)

**File:** `main.js` (refactored)
**Lines:** ~100
**Dependencies:** All managers, Database, Electron app

**Responsibilities:**
1. Initialize all managers (dependency injection)
2. Coordinate manager interactions
3. Handle app lifecycle (whenReady, will-quit)
4. Wire up cross-manager events (recorder → transcription)

**Public API:**
```javascript
class Application {
  constructor()       // Initialize manager instances
  async start()       // Start application
  async shutdown()    // Cleanup on quit
}
```

**Code Example:**
```javascript
const { app } = require('electron');
const Database = require('./database.js');
const { WindowManager } = require('./src/js/managers/window_manager');
const { RecorderManager } = require('./src/js/managers/recorder_manager');
const { TranscriptionService } = require('./src/js/services/transcription_service');
const { IPCHandlers } = require('./src/js/ipc/handlers');
const { ShortcutManager } = require('./src/js/managers/shortcut_manager');
const { errorHandler } = require('./src/js/error_handler');
const { SHORTCUTS } = require('./src/js/config/constants');

class Application {
  constructor() {
    this.baseDir = __dirname;
    this.database = null;
    this.windowManager = null;
    this.recorderManager = null;
    this.transcriptionService = null;
    this.ipcHandlers = null;
    this.shortcutManager = null;
  }

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

    // Wire up recorder → transcription
    this.recorderManager.on('recordingComplete', (audioPath) => {
      this.transcriptionService.transcribe(audioPath)
        .catch(err => console.error('Transcription failed:', err));
    });

    // Create IPC handlers
    this.ipcHandlers = new IPCHandlers(
      this.database,
      this.windowManager
    );

    // Create shortcut manager
    this.shortcutManager = new ShortcutManager(this.recorderManager);
  }

  async start() {
    try {
      await app.whenReady();

      // Initialize all components
      this.initialize();

      // Create window
      this.windowManager.create();

      // Start recorder process
      this.recorderManager.start();

      // Register IPC handlers
      this.ipcHandlers.registerAll();

      // Register global shortcuts
      this.shortcutManager.registerRecordingToggle(SHORTCUTS.TOGGLE_RECORDING);

      console.log('Application started successfully');
    } catch (error) {
      errorHandler.handleException('Application.start', error, true);
      app.quit();
    }
  }

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

**Lines:** ~105 (within target!)

---

## Part 3: Execution Strategy

### 3.1 Sequential Execution Order

**Order Matters:** Create modules in dependency order

1. **WindowManager** (no dependencies) → 30 min
2. **RecorderManager** (depends on WindowManager concept) → 45 min
3. **TranscriptionService** (independent) → 30 min
4. **IPCHandlers** (depends on WindowManager, Database) → 30 min
5. **ShortcutManager** (depends on RecorderManager concept) → 20 min
6. **AppController** (main.js refactor, depends on all) → 30 min
7. **Integration Testing** → 45 min

**Total Sequential Time:** ~4 hours

---

### 3.2 Parallel Execution Strategy

**Can Parallelize:** WindowManager, TranscriptionService, IPCHandlers (independent)

**Agent Assignment:**
- **Agent 1:** WindowManager + tests (30 min)
- **Agent 2:** TranscriptionService + tests (30 min)
- **Agent 3:** IPCHandlers + tests (30 min)
- **Agent 4:** RecorderManager + tests (45 min) - WAIT for WindowManager
- **Agent 5:** ShortcutManager + tests (20 min) - WAIT for RecorderManager
- **Agent 6:** AppController (main.js) + integration (30 min) - WAIT for all

**Total Parallel Time:** ~75 minutes (agents 1-3 parallel, then 4, then 5, then 6)

---

### 3.3 Testing Strategy

**For Each Module:**
1. Create Jest test file in `tests/js/managers/` or `tests/js/services/`
2. Mock dependencies (Electron, ProcessManager, etc.)
3. Test public API methods
4. Test error handling
5. Verify event emissions

**Example Test Structure:**
```javascript
// tests/js/managers/window_manager.test.js
const { WindowManager } = require('../../src/js/managers/window_manager');
const { BrowserWindow } = require('electron');

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

  describe('create', () => {
    it('should create BrowserWindow with correct settings', () => {
      const window = windowManager.create();
      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        width: 800,
        height: 600
      }));
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
});
```

---

## Part 4: Migration Checklist

### 4.1 Pre-Migration Validation ✅
- [x] Phase B.1 complete (constants extracted)
- [x] All tests passing at 92%+
- [x] Git branch created
- [x] Backup current main.js

### 4.2 Module Creation
- [ ] Create `src/js/managers/window_manager.js`
- [ ] Create `src/js/managers/recorder_manager.js`
- [ ] Create `src/js/services/transcription_service.js`
- [ ] Create `src/js/ipc/handlers.js`
- [ ] Create `src/js/managers/shortcut_manager.js`

### 4.3 Test Creation
- [ ] Create `tests/js/managers/window_manager.test.js`
- [ ] Create `tests/js/managers/recorder_manager.test.js`
- [ ] Create `tests/js/services/transcription_service.test.js`
- [ ] Create `tests/js/ipc/handlers.test.js`
- [ ] Create `tests/js/managers/shortcut_manager.test.js`

### 4.4 main.js Refactoring
- [ ] Create new `main.js` with AppController
- [ ] Verify imports all resolve
- [ ] Test application starts
- [ ] Test recording workflow
- [ ] Test transcription workflow
- [ ] Test history view
- [ ] Test all IPC handlers

### 4.5 Validation
- [ ] Run full test suite (`npm test`)
- [ ] Verify coverage maintained at 92%+
- [ ] Manual smoke testing
- [ ] Performance profiling (no degradation)

### 4.6 Documentation
- [ ] Update ARCHITECTURE.md
- [ ] Create Phase B.2 completion report
- [ ] Update README if needed

---

## Part 5: Success Criteria

### 5.1 Quantitative Metrics

| Metric | Before B.2 | Target | Validation |
|--------|------------|--------|------------|
| **main.js LOC** | 435 | ~100 | `wc -l main.js` |
| **Number of Modules** | 1 | 6 | File count |
| **Functions in main.js** | 5 | 1 class | Code review |
| **Test Coverage** | 92%+ | 92%+ | `npm test -- --coverage` |
| **Global Variables** | 4 | 0 | Code review |
| **Max Function Length** | 112 lines | <50 lines | Code review |

---

### 5.2 Qualitative Criteria

**Architecture:**
- ✅ Single Responsibility Principle enforced
- ✅ Dependency injection used throughout
- ✅ No circular dependencies
- ✅ Clean separation of concerns

**Code Quality:**
- ✅ Each class has single responsibility
- ✅ Public APIs well-defined
- ✅ Error handling comprehensive
- ✅ Event-driven communication

**Maintainability:**
- ✅ Easy to add new IPC handlers
- ✅ Easy to modify recorder behavior
- ✅ Easy to test components in isolation
- ✅ Clear manager responsibilities

**Testability:**
- ✅ All managers can be unit tested
- ✅ Dependencies can be mocked
- ✅ Integration tests possible
- ✅ No tight coupling to Electron internals

---

## Part 6: Risk Mitigation

### 6.1 Potential Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Breaking Changes** | Medium | High | Comprehensive testing, keep old main.js as backup |
| **Event Wiring Bugs** | Medium | Medium | Explicit event documentation, integration tests |
| **Dependency Injection Errors** | Low | Medium | Clear constructor signatures, validation |
| **Test Coverage Drop** | Medium | Medium | Write tests before refactoring, monitor coverage |
| **Performance Regression** | Low | Low | Profile before/after, benchmark critical paths |

---

### 6.2 Rollback Plan

**If critical issues found:**

1. Keep old `main.js` as `main.js.backup`
2. Git tag before changes: `git tag phase-b2-start`
3. Test incrementally (one manager at a time)
4. If failure: `git reset --hard phase-b2-start`

---

## Part 7: File Structure After Phase B.2

```
IAC-30-brain-dump-voice-processor/
├── main.js                           # 100 lines (AppController)
├── database.js                       # Unchanged
├── package.json                      # Unchanged
│
├── src/
│   ├── config/
│   │   └── constants.js              # From Phase B.1
│   │
│   ├── js/
│   │   ├── error_handler.js          # Unchanged
│   │   ├── process_manager.js        # Unchanged
│   │   ├── managers/                 # NEW DIRECTORY
│   │   │   ├── window_manager.js     # NEW (80 lines)
│   │   │   ├── recorder_manager.js   # NEW (200 lines)
│   │   │   └── shortcut_manager.js   # NEW (70 lines)
│   │   ├── services/                 # NEW DIRECTORY
│   │   │   └── transcription_service.js  # NEW (120 lines)
│   │   ├── ipc/                      # NEW DIRECTORY
│   │   │   └── handlers.js           # NEW (150 lines)
│   │   └── utils/
│   │       └── file_validator.js     # From Phase B.1
│   │
│   └── (preload, renderers unchanged)
│
├── tests/
│   └── js/
│       ├── managers/                 # NEW DIRECTORY
│       │   ├── window_manager.test.js        # NEW
│       │   ├── recorder_manager.test.js      # NEW
│       │   └── shortcut_manager.test.js      # NEW
│       ├── services/                 # NEW DIRECTORY
│       │   └── transcription_service.test.js # NEW
│       └── ipc/                      # NEW DIRECTORY
│           └── handlers.test.js      # NEW
│
└── reports/
    ├── PHASE_B1_COMPLETION_REPORT.md # From Phase B.1
    ├── PHASE_B2_TECHNICAL_PLAN.md    # This document
    └── PHASE_B2_COMPLETION_REPORT.md # To be created
```

---

## Part 8: Estimated Timeline

### 8.1 Sequential Execution (1 Developer)

| Task | Duration | Cumulative |
|------|----------|------------|
| Create WindowManager | 30 min | 0:30 |
| Test WindowManager | 15 min | 0:45 |
| Create RecorderManager | 45 min | 1:30 |
| Test RecorderManager | 20 min | 1:50 |
| Create TranscriptionService | 30 min | 2:20 |
| Test TranscriptionService | 15 min | 2:35 |
| Create IPCHandlers | 30 min | 3:05 |
| Test IPCHandlers | 15 min | 3:20 |
| Create ShortcutManager | 20 min | 3:40 |
| Test ShortcutManager | 10 min | 3:50 |
| Refactor main.js | 30 min | 4:20 |
| Integration Testing | 45 min | 5:05 |
| Documentation | 30 min | 5:35 |

**Total:** ~5.5 hours (can stretch to 1 day with breaks)

---

### 8.2 Parallel Execution (6 Agents)

**Wave 1 (Parallel):** WindowManager, TranscriptionService, IPCHandlers
- Duration: 45 min (longest agent)

**Wave 2 (Sequential):** RecorderManager
- Duration: 65 min (code + tests)
- Dependency: WindowManager complete

**Wave 3 (Sequential):** ShortcutManager
- Duration: 30 min (code + tests)
- Dependency: RecorderManager complete

**Wave 4 (Sequential):** AppController (main.js)
- Duration: 30 min (code + integration tests)
- Dependency: All managers complete

**Wave 5 (Sequential):** Documentation
- Duration: 30 min
- Dependency: Everything complete

**Total Parallel Time:** ~3 hours (with wave dependencies)

---

## Part 9: Agent Missions

### 9.1 Agent 1: WindowManager Specialist

**Mission:** Create WindowManager class with full JSDoc and tests

**Deliverables:**
1. `src/js/managers/window_manager.js` (80 lines)
2. `tests/js/managers/window_manager.test.js` (60 lines)
3. Test coverage: 100%

**Requirements:**
- Follow code example in Part 2.1
- Complete JSDoc on all methods
- Mock Electron BrowserWindow
- Test all public methods
- Test error conditions (window not created)

---

### 9.2 Agent 2: TranscriptionService Specialist

**Mission:** Create TranscriptionService class with full JSDoc and tests

**Deliverables:**
1. `src/js/services/transcription_service.js` (120 lines)
2. `tests/js/services/transcription_service.test.js` (80 lines)
3. Test coverage: 100%

**Requirements:**
- Follow code example in Part 2.3
- Complete JSDoc on all methods
- Mock child_process.spawn
- Test Promise resolution/rejection
- Test all error paths

---

### 9.3 Agent 3: IPCHandlers Specialist

**Mission:** Create IPCHandlers class with full JSDoc and tests

**Deliverables:**
1. `src/js/ipc/handlers.js` (150 lines)
2. `tests/js/ipc/handlers.test.js` (100 lines)
3. Test coverage: 100%

**Requirements:**
- Follow code example in Part 2.4
- Complete JSDoc on all methods
- Mock ipcMain, shell, spawn
- Test all 6 IPC handlers
- Test error handling

---

### 9.4 Agent 4: RecorderManager Specialist

**Mission:** Create RecorderManager class with full JSDoc and tests

**Dependencies:** WAIT for WindowManager (Agent 1)

**Deliverables:**
1. `src/js/managers/recorder_manager.js` (200 lines)
2. `tests/js/managers/recorder_manager.test.js` (120 lines)
3. Test coverage: 100%

**Requirements:**
- Follow code example in Part 2.2
- Complete JSDoc on all methods
- Mock ProcessManager
- Test all event handlers
- Test recording control methods
- Test custom event emission

---

### 9.5 Agent 5: ShortcutManager Specialist

**Mission:** Create ShortcutManager class with full JSDoc and tests

**Dependencies:** WAIT for RecorderManager (Agent 4)

**Deliverables:**
1. `src/js/managers/shortcut_manager.js` (70 lines)
2. `tests/js/managers/shortcut_manager.test.js` (50 lines)
3. Test coverage: 100%

**Requirements:**
- Follow code example in Part 2.5
- Complete JSDoc on all methods
- Mock globalShortcut
- Test registration success/failure
- Test toggle logic

---

### 9.6 Agent 6: AppController Integration Specialist

**Mission:** Refactor main.js to AppController pattern

**Dependencies:** WAIT for ALL managers (Agents 1-5)

**Deliverables:**
1. New `main.js` (100 lines)
2. Integration test (validate all wiring)
3. Phase B.2 completion report

**Requirements:**
- Follow code example in Part 2.6
- Dependency injection for all managers
- Wire recorder → transcription event
- Test application starts without errors
- Verify all workflows (record, transcribe, history)
- Create completion report in `/reports/PHASE_B2_COMPLETION_REPORT.md`

---

## Part 10: Validation Protocol

### 10.1 Per-Module Validation

**After each module creation:**
```bash
# 1. Syntax check
node --check src/js/managers/window_manager.js

# 2. Run tests
npm test -- tests/js/managers/window_manager.test.js

# 3. Check coverage
npm test -- tests/js/managers/window_manager.test.js --coverage
```

**Acceptance:** Module passes syntax check, all tests pass, 100% coverage

---

### 10.2 Integration Validation

**After main.js refactoring:**
```bash
# 1. Full test suite
npm test

# 2. Coverage check
npm test -- --coverage

# 3. Manual smoke test
npm start
# - Test recording (Ctrl+Y start/stop)
# - Test transcription
# - Test history view
# - Test all IPC handlers

# 4. Performance check (should be similar to before)
time npm start
```

**Acceptance:** All tests pass, coverage ≥92%, application works correctly

---

## Part 11: Completion Report Template

**File:** `/reports/PHASE_B2_COMPLETION_REPORT.md`

**Sections:**
1. Executive Summary
2. Modules Created (5)
3. main.js Refactoring Stats
4. Test Results (coverage, passing tests)
5. Code Quality Metrics (LOC reduction, complexity)
6. Integration Testing Results
7. Performance Comparison
8. Issues Encountered & Resolutions
9. Phase B.3 Readiness

---

## Conclusion

Phase B.2 will successfully decompose the 435-line god object into a clean, maintainable architecture with 6 specialized modules. This refactoring:

✅ **Reduces main.js by 77%** (435 → 100 lines)
✅ **Applies SOLID principles** (Single Responsibility, Dependency Injection)
✅ **Improves testability** (mockable dependencies)
✅ **Maintains functionality** (100% backward compatible)
✅ **Preserves test coverage** (92%+ maintained)

**Ready to execute when approved.**

---

**End of Phase B.2 Technical Execution Plan**
