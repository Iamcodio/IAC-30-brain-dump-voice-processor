# Phase A Execution Plan: Security & Stability

**Project:** BrainDump Voice Processor
**Phase:** A - Critical Security & Stability
**Version Target:** v2.1.0
**Branch:** feature/phase-a-security-stability
**Status:** APPROVED - Awaiting execution authorization
**Date:** 2025-10-25

---

## Executive Summary

**Approach:** Solo execution with modular implementation
**Strategy:** Security-first, test-driven, incremental verification
**Timeline:** 18-25 hours (3-4 days focused work)
**Risk Level:** Medium (security refactor requires careful testing)

**Why Solo vs Subagents:**
- Phase A is tightly integrated (security changes affect everything)
- Subagent coordination overhead would slow progress
- Better to handle as unified refactor with comprehensive testing
- Can spawn subagents for Phase B/C (less tightly coupled)

---

## Task Breakdown & Approach

### Task 1: Electron Security Fix (6-8 hours) 🔴 CRITICAL

#### Current Vulnerability
```javascript
// main.js:16-19 - DANGEROUS
webPreferences: {
  nodeIntegration: true,      // ❌ Exposes Node.js to renderer
  contextIsolation: false     // ❌ No security boundary
}
```

**Risk:** Remote code execution if malicious content loaded in renderer.

#### Implementation Strategy

**Step 1.1: Create Preload Script (2 hours)**

**File:** `preload.js` (NEW)
```javascript
/**
 * Preload script for secure IPC communication
 * Exposes controlled API to renderer via contextBridge
 */
const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of valid channels (security boundary)
const VALID_CHANNELS = {
  // Database operations
  GET_RECORDINGS: 'get-recordings',
  SEARCH_RECORDINGS: 'search-recordings',
  READ_FILE: 'read-file',

  // UI operations
  PLAY_AUDIO: 'play-audio',
  VIEW_FILE: 'view-file',
  SHOW_HISTORY: 'show-history',
  SHOW_RECORDER: 'show-recorder',

  // Recording status (receive only)
  RECORDING_STARTED: 'recording-started',
  RECORDING_STOPPED: 'recording-stopped',
  TRANSCRIPTION_STARTED: 'transcription-started',
  TRANSCRIPTION_COMPLETE: 'transcription-complete'
};

contextBridge.exposeInMainWorld('electronAPI', {
  // Invoke handlers (async, return value)
  getRecordings: () => ipcRenderer.invoke(VALID_CHANNELS.GET_RECORDINGS),
  searchRecordings: (query) => {
    // Validate input
    if (typeof query !== 'string') {
      throw new Error('Search query must be string');
    }
    return ipcRenderer.invoke(VALID_CHANNELS.SEARCH_RECORDINGS, query);
  },
  readFile: (filePath) => {
    // Basic validation
    if (typeof filePath !== 'string' || !filePath) {
      throw new Error('Invalid file path');
    }
    return ipcRenderer.invoke(VALID_CHANNELS.READ_FILE, filePath);
  },

  // Send handlers (fire and forget)
  playAudio: (audioPath) => {
    if (typeof audioPath !== 'string') return;
    ipcRenderer.send(VALID_CHANNELS.PLAY_AUDIO, audioPath);
  },
  viewFile: (filePath) => {
    if (typeof filePath !== 'string') return;
    ipcRenderer.send(VALID_CHANNELS.VIEW_FILE, filePath);
  },
  showHistory: () => ipcRenderer.send(VALID_CHANNELS.SHOW_HISTORY),
  showRecorder: () => ipcRenderer.send(VALID_CHANNELS.SHOW_RECORDER),

  // Event listeners (receive from main)
  onRecordingStarted: (callback) => {
    ipcRenderer.on(VALID_CHANNELS.RECORDING_STARTED, callback);
  },
  onRecordingStopped: (callback) => {
    ipcRenderer.on(VALID_CHANNELS.RECORDING_STOPPED, callback);
  },
  onTranscriptionStarted: (callback) => {
    ipcRenderer.on(VALID_CHANNELS.TRANSCRIPTION_STARTED, callback);
  },
  onTranscriptionComplete: (callback) => {
    ipcRenderer.on(VALID_CHANNELS.TRANSCRIPTION_COMPLETE, callback);
  }
});
```

**Step 1.2: Update main.js (1 hour)**
```javascript
// main.js - Update createWindow()
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,     // ✅ Secure
      contextIsolation: true,     // ✅ Isolated
      sandbox: true,              // ✅ Extra layer
      enableRemoteModule: false   // ✅ No remote access
    }
  });
  mainWindow.loadFile('index.html');
  startRecorderProcess();
}
```

**Step 1.3: Update history.js (2 hours)**

**Before:**
```javascript
const { ipcRenderer } = require('electron');
// Direct IPC access (UNSAFE)
```

**After:**
```javascript
// Use exposed API (SAFE)
const { electronAPI } = window;

// Update all IPC calls
async function loadRecordings() {
  try {
    const recordings = await electronAPI.getRecordings();
    // ...
  } catch (error) {
    console.error('Error loading recordings:', error);
  }
}

function playRecording(audioPath) {
  electronAPI.playAudio(audioPath);
}

function copyTranscript(transcriptPath) {
  try {
    const content = await electronAPI.readFile(transcriptPath);
    await navigator.clipboard.writeText(extractTranscript(content));
    showToast('Copied!');
  } catch (error) {
    showToast('Copy failed', 'error');
  }
}
```

**Step 1.4: Update index.html (30 min)**
- Remove `require('electron')` calls
- Use `window.electronAPI` for event listeners
- Test recording status updates still work

**Step 1.5: Testing (1-2 hours)**
- [ ] All IPC communications working
- [ ] Recording workflow intact
- [ ] History view loads
- [ ] Copy to clipboard works
- [ ] No console errors
- [ ] DevTools security warnings cleared
- [ ] Run `npm audit` and fix vulnerabilities

**Rollback Plan:**
- Keep old code commented during testing
- Can revert to v2.0 security model if blocked
- Feature flag: `SECURE_MODE=true/false`

---

### Task 2: English-Only Language Mode (2 hours) 🔴 HIGH

#### Problem
Whisper auto-detects language → Irish accent misdetected as Welsh

#### Solution
Force English with `-l en` flag

**Step 2.1: Update WhisperTranscriber (1 hour)**

**File:** `src/python/transcription/whisper_transcriber.py`

**Before:**
```python
cmd = [
    self.whisper_bin,
    "-m", self.model_path,
    "-f", str(audio_path),
    "-otxt",
    "-nt"
]
```

**After:**
```python
class WhisperTranscriber:
    def __init__(
        self,
        model_path: str = "models/ggml-base.bin",
        whisper_bin: str = "whisper-cli",
        language: str = "en"  # NEW: Default English
    ):
        self.model_path = model_path
        self.whisper_bin = whisper_bin
        self.language = language

    def transcribe(
        self,
        audio_path: str,
        output_dir: str = "outputs/transcripts"
    ) -> dict:
        # ...
        cmd = [
            self.whisper_bin,
            "-m", self.model_path,
            "-f", str(audio_path),
            "-l", self.language,  # ✅ Force language
            "-otxt",
            "-nt"
        ]
        # ...
```

**Step 2.2: Add Type Hints (30 min)**
Add complete type annotations to all methods for type safety.

**Step 2.3: Testing (30 min)**
- [ ] Record with Irish accent
- [ ] Verify transcription is English (not Welsh)
- [ ] Test with various English accents
- [ ] Benchmark: Still <500ms per 10 seconds

---

### Task 3: Python Error Handling (4-5 hours) 🔴 HIGH

#### Implementation: Observer Pattern + Try/Catch

**Step 3.1: Create Error Handler (2 hours)**

**File:** `src/python/utils/error_handler.py` (NEW)
```python
"""
Centralized error handling with observer pattern.
Provides structured error reporting and user-friendly messages.
"""
from enum import Enum
from typing import Callable, List, Optional
import sys
import traceback
from datetime import datetime


class ErrorSeverity(Enum):
    """Error severity levels"""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class ErrorHandler:
    """
    Singleton error handler using observer pattern.
    Allows components to subscribe to error events.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._observers = []
        return cls._instance

    def subscribe(self, callback: Callable) -> None:
        """Subscribe to error events"""
        if callback not in self._observers:
            self._observers.append(callback)

    def unsubscribe(self, callback: Callable) -> None:
        """Unsubscribe from error events"""
        if callback in self._observers:
            self._observers.remove(callback)

    def handle_error(
        self,
        error: Exception,
        severity: ErrorSeverity,
        context: str,
        user_message: Optional[str] = None,
        include_traceback: bool = False
    ) -> None:
        """
        Handle error with appropriate severity.

        Args:
            error: The exception that occurred
            severity: Error severity level
            context: Where the error occurred (function/module name)
            user_message: Friendly message for end user
            include_traceback: Whether to include full traceback
        """
        error_data = {
            'timestamp': datetime.now().isoformat(),
            'severity': severity.value,
            'context': context,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'user_message': user_message or self._default_message(severity),
            'traceback': traceback.format_exc() if include_traceback else None
        }

        # Notify observers
        for observer in self._observers:
            try:
                observer(error_data)
            except Exception as e:
                print(f"Observer error: {e}", file=sys.stderr)

        # Log to stderr
        self._log_error(error_data)

        # Output protocol message for Electron
        self._output_error_protocol(error_data)

    def _default_message(self, severity: ErrorSeverity) -> str:
        """Generate default user message based on severity"""
        messages = {
            ErrorSeverity.INFO: "Something went wrong, but we're handling it.",
            ErrorSeverity.WARNING: "We encountered an issue, but can continue.",
            ErrorSeverity.ERROR: "An error occurred. Please try again.",
            ErrorSeverity.CRITICAL: "A critical error occurred. Please restart the app."
        }
        return messages.get(severity, "An unexpected error occurred.")

    def _log_error(self, error_data: dict) -> None:
        """Log error to stderr with structured format"""
        log_line = (
            f"[{error_data['timestamp']}] "
            f"[{error_data['severity']}] "
            f"{error_data['context']}: "
            f"{error_data['error_type']}: {error_data['error_message']}"
        )
        print(log_line, file=sys.stderr)

        if error_data['traceback']:
            print(error_data['traceback'], file=sys.stderr)

    def _output_error_protocol(self, error_data: dict) -> None:
        """Output error in protocol format for Electron to parse"""
        print(
            f"ERROR:{error_data['severity']}:{error_data['user_message']}",
            flush=True
        )
```

**Step 3.2: Update recorder.py (1 hour)**
```python
from src.python.utils.error_handler import ErrorHandler, ErrorSeverity

class SimpleRecorder:
    def __init__(self):
        self.error_handler = ErrorHandler()
        # ... existing init

    def start(self):
        """Start recording with error handling"""
        try:
            self.recording = True
            self.frames = []
            self.stream = self.audio.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=44100,
                input=True,
                frames_per_buffer=1024,
                stream_callback=self.audio_callback
            )
            print("RECORDING_STARTED", flush=True)

        except OSError as e:
            self.error_handler.handle_error(
                e,
                ErrorSeverity.ERROR,
                "recorder.start",
                "Could not access microphone. Check permissions in System Preferences."
            )
            self.recording = False

        except Exception as e:
            self.error_handler.handle_error(
                e,
                ErrorSeverity.CRITICAL,
                "recorder.start",
                "Unexpected error starting recording. Please restart the app."
            )
            self.recording = False

    def stop(self):
        """Stop recording with error handling"""
        try:
            self.recording = False
            if self.stream:
                self.stream.stop_stream()
                self.stream.close()
                self.stream = None

            if self.frames:
                filename = self.save_wav()
                print(f"RECORDING_STOPPED:{filename}", flush=True)
            else:
                print("RECORDING_STOPPED:no_audio", flush=True)

        except Exception as e:
            self.error_handler.handle_error(
                e,
                ErrorSeverity.ERROR,
                "recorder.stop",
                "Error saving recording. Please try again."
            )
            print("ERROR:SAVE_FAILED", flush=True)

    def save_wav(self):
        """Save WAV file with error handling"""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"recording_{timestamp}.wav"
            filepath = os.path.join(self.output_dir, filename)

            wf = wave.open(filepath, 'wb')
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(44100)
            wf.writeframes(b''.join(self.frames))
            wf.close()

            return filepath

        except IOError as e:
            self.error_handler.handle_error(
                e,
                ErrorSeverity.CRITICAL,
                "recorder.save_wav",
                "Could not save recording (disk full?). Check available storage."
            )
            raise

        except Exception as e:
            self.error_handler.handle_error(
                e,
                ErrorSeverity.ERROR,
                "recorder.save_wav",
                "Error saving audio file."
            )
            raise
```

**Step 3.3: Update transcribe.py (1 hour)**
Add try/catch around all operations, use ErrorHandler for reporting.

**Step 3.4: Testing (1 hour)**
- [ ] Test microphone permission denied
- [ ] Test disk full scenario (mock)
- [ ] Test audio device unplugged
- [ ] Verify error messages user-friendly
- [ ] Check error protocol messages parsed by Electron

---

### Task 4: JavaScript Error Handling (4-5 hours) 🔴 HIGH

#### Implementation: Process Manager + Recovery

**Step 4.1: Create Process Manager (3 hours)**

**File:** `src/services/ProcessManager.js` (NEW)
```javascript
/**
 * Process manager with auto-restart and health monitoring.
 * Implements retry logic with exponential backoff.
 */
const { spawn } = require('child_process');
const EventEmitter = require('events');

class ProcessManager extends EventEmitter {
  constructor(options) {
    super();
    this.options = {
      command: '',
      args: [],
      maxRestarts: 3,
      restartDelay: 1000,
      healthCheckInterval: 10000,
      ...options
    };
    this.process = null;
    this.restartCount = 0;
    this.isHealthy = false;
    this.lastHeartbeat = null;
  }

  /**
   * Start managed process
   * @returns {Promise<void>} Resolves when process ready
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.options.command, this.options.args);

        this.process.stdout.on('data', (data) => {
          this.handleOutput(data);
          const output = data.toString();

          // Check for ready signal
          if (output.includes('READY')) {
            this.isHealthy = true;
            this.restartCount = 0;
            this.lastHeartbeat = Date.now();
            resolve();
          }

          // Forward output
          this.emit('output', output);
        });

        this.process.stderr.on('data', (data) => {
          this.handleError(data);
          this.emit('error', data.toString());
        });

        this.process.on('exit', (code, signal) => {
          this.handleExit(code, signal);
        });

        this.startHealthCheck();

        // Timeout if process doesn't become ready
        setTimeout(() => {
          if (!this.isHealthy) {
            reject(new Error('Process failed to start within timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle process output
   * @param {Buffer} data - Output data
   */
  handleOutput(data) {
    this.lastHeartbeat = Date.now();
  }

  /**
   * Handle process errors
   * @param {Buffer} data - Error data
   */
  handleError(data) {
    const errorMsg = data.toString();
    console.error(`Process error: ${errorMsg}`);

    // Parse structured errors
    if (errorMsg.includes('ERROR:')) {
      const [, severity, message] = errorMsg.match(/ERROR:(\w+):(.+)/) || [];
      this.emit('structured-error', { severity, message });
    }
  }

  /**
   * Handle process exit with restart logic
   * @param {number} code - Exit code
   * @param {string} signal - Exit signal
   */
  handleExit(code, signal) {
    this.isHealthy = false;
    this.emit('exit', { code, signal });

    // Don't restart if intentional shutdown
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      console.log('Process terminated intentionally');
      return;
    }

    // Attempt restart if under limit
    if (code !== 0 && this.restartCount < this.options.maxRestarts) {
      const delay = this.options.restartDelay * Math.pow(2, this.restartCount);
      console.warn(
        `Process exited with code ${code}. Restarting in ${delay}ms... ` +
        `(Attempt ${this.restartCount + 1}/${this.options.maxRestarts})`
      );

      setTimeout(() => {
        this.restartCount++;
        this.start().catch(err => {
          console.error('Restart failed:', err);
          this.emit('restart-failed', err);
        });
      }, delay);
    } else if (this.restartCount >= this.options.maxRestarts) {
      console.error('Max restart attempts reached. Process failed permanently.');
      this.emit('permanent-failure');
    }
  }

  /**
   * Start health check monitoring
   */
  startHealthCheck() {
    setInterval(() => {
      if (!this.isHealthy) return;

      const timeSinceHeartbeat = Date.now() - (this.lastHeartbeat || 0);
      if (timeSinceHeartbeat > this.options.healthCheckInterval) {
        console.warn('Process appears unhealthy (no heartbeat)');
        this.isHealthy = false;
        this.emit('unhealthy');
        this.restart();
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Graceful restart
   */
  restart() {
    if (this.process) {
      this.process.kill('SIGTERM');
      // start() will be called from handleExit
    } else {
      this.start();
    }
  }

  /**
   * Graceful shutdown
   */
  stop() {
    if (this.process) {
      // Send quit command for Python recorder
      if (this.process.stdin && this.process.stdin.writable) {
        this.process.stdin.write('quit\n');
      }
      this.process.kill('SIGTERM');
    }
  }

  /**
   * Send command to process
   * @param {string} command - Command to send
   */
  send(command) {
    if (this.process && this.process.stdin && this.process.stdin.writable) {
      this.process.stdin.write(command + '\n');
    } else {
      throw new Error('Process not ready or stdin not writable');
    }
  }
}

module.exports = ProcessManager;
```

**Step 4.2: Update main.js (1 hour)**
```javascript
const ProcessManager = require('./src/services/ProcessManager');

let recorderManager;

function startRecorderProcess() {
  const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
  const scriptPath = path.join(__dirname, 'recorder.py');

  recorderManager = new ProcessManager({
    command: pythonPath,
    args: [scriptPath],
    maxRestarts: 3,
    restartDelay: 1000
  });

  // Handle events
  recorderManager.on('output', (data) => {
    console.log('Recorder:', data);
    handleRecorderOutput(data);
  });

  recorderManager.on('structured-error', ({ severity, message }) => {
    console.error(`Recorder error [${severity}]:`, message);
    // Show user notification
    mainWindow.webContents.send('error-notification', {
      severity,
      message
    });
  });

  recorderManager.on('permanent-failure', () => {
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Recording Service Failed',
      'The recording service has failed. Please restart the application.'
    );
  });

  // Start process
  recorderManager.start()
    .then(() => {
      console.log('Recorder ready');
      recorderProcess = recorderManager.process;
    })
    .catch((error) => {
      console.error('Failed to start recorder:', error);
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'Startup Error',
        'Could not start recording service. Please check:\n' +
        '1. Microphone permissions\n' +
        '2. Python virtual environment\n' +
        '3. PyAudio installation'
      );
    });
}

function startRecording() {
  try {
    isRecording = true;
    recorderManager.send('start');
  } catch (error) {
    console.error('Error starting recording:', error);
    isRecording = false;
    mainWindow.webContents.send('error-notification', {
      severity: 'ERROR',
      message: 'Could not start recording. Please try again.'
    });
  }
}

function stopRecording() {
  try {
    isRecording = false;
    recorderManager.send('stop');
  } catch (error) {
    console.error('Error stopping recording:', error);
    mainWindow.webContents.send('error-notification', {
      severity: 'ERROR',
      message: 'Error stopping recording.'
    });
  }
}

// Cleanup on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (recorderManager) {
    recorderManager.stop();
  }
});
```

**Step 4.3: Add Error Notifications to UI (30 min)**
Update index.html and history.html to show error toasts from main process.

**Step 4.4: Testing (1 hour)**
- [ ] Kill Python process manually → auto-restart works
- [ ] Microphone permission denied → user notified
- [ ] Max restarts reached → permanent failure dialog
- [ ] Clean shutdown works (no restart loop)

---

### Task 5: Input Validation (3-4 hours) 🟡 MEDIUM

**Step 5.1: Create JavaScript Validators (2 hours)**

**File:** `src/utils/validators.js` (NEW)
```javascript
/**
 * Input validation utilities
 */
const fs = require('fs');
const path = require('path');

/**
 * Validate audio file path
 * @param {string} filePath - Path to validate
 * @param {string} baseDir - Base directory for path traversal check
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateAudioPath(filePath, baseDir) {
  // Check type
  if (typeof filePath !== 'string' || !filePath) {
    return { valid: false, error: 'Invalid file path type' };
  }

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.wav') {
    return { valid: false, error: 'Only WAV files supported' };
  }

  // Check file size (max 100MB)
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    if (stats.size > 100 * 1024 * 1024) {
      return { valid: false, error: 'File too large (max 100MB)' };
    }
  } catch (error) {
    return { valid: false, error: 'Could not read file stats' };
  }

  // Check path traversal (ensure file is in expected directory)
  const resolved = path.resolve(filePath);
  const audioDir = path.resolve(baseDir, 'outputs', 'audio');
  if (!resolved.startsWith(audioDir)) {
    return { valid: false, error: 'File path not in audio directory' };
  }

  return { valid: true };
}

/**
 * Validate transcript file path
 * @param {string} filePath - Path to validate
 * @param {string} baseDir - Base directory
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateTranscriptPath(filePath, baseDir) {
  if (typeof filePath !== 'string' || !filePath) {
    return { valid: false, error: 'Invalid file path type' };
  }

  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'Transcript file does not exist' };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.md' && ext !== '.txt') {
    return { valid: false, error: 'Invalid transcript file type' };
  }

  // Path traversal check
  const resolved = path.resolve(filePath);
  const transcriptDir = path.resolve(baseDir, 'outputs', 'transcripts');
  if (!resolved.startsWith(transcriptDir)) {
    return { valid: false, error: 'File path not in transcripts directory' };
  }

  return { valid: true };
}

/**
 * Sanitize search query
 * @param {string} query - Search query to sanitize
 * @returns {string} Sanitized query
 */
function sanitizeSearchQuery(query) {
  if (typeof query !== 'string') return '';

  // Remove potential SQL injection attempts (though we use JSON, be safe)
  return query
    .replace(/[<>'"]/g, '') // Remove HTML/SQL chars
    .trim()
    .substring(0, 100); // Limit length
}

module.exports = {
  validateAudioPath,
  validateTranscriptPath,
  sanitizeSearchQuery
};
```

**Step 5.2: Create Python Validators (1 hour)**

**File:** `src/python/utils/validators.py` (NEW)
```python
"""
Input validation utilities for Python components
"""
from pathlib import Path
from typing import Tuple


def validate_audio_file(audio_path: str, max_size_mb: int = 100) -> Tuple[bool, str]:
    """
    Validate audio file for transcription.

    Args:
        audio_path: Path to audio file
        max_size_mb: Maximum file size in MB

    Returns:
        (is_valid, error_message)
    """
    # Check type
    if not isinstance(audio_path, str) or not audio_path:
        return False, "Invalid file path type"

    path = Path(audio_path)

    # Check exists
    if not path.exists():
        return False, f"File does not exist: {audio_path}"

    # Check is file (not directory)
    if not path.is_file():
        return False, "Path is not a file"

    # Check extension
    if path.suffix.lower() != '.wav':
        return False, f"Only WAV files supported, got: {path.suffix}"

    # Check size
    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb > max_size_mb:
        return False, f"File too large: {size_mb:.1f}MB (max {max_size_mb}MB)"

    # Check not empty
    if path.stat().st_size == 0:
        return False, "File is empty"

    # Basic WAV header check (starts with "RIFF")
    try:
        with open(path, 'rb') as f:
            header = f.read(4)
            if header != b'RIFF':
                return False, "Invalid WAV file (missing RIFF header)"
    except Exception as e:
        return False, f"Could not read file: {e}"

    return True, ""


def validate_model_file(model_path: str) -> Tuple[bool, str]:
    """
    Validate Whisper model file.

    Args:
        model_path: Path to model file

    Returns:
        (is_valid, error_message)
    """
    if not isinstance(model_path, str) or not model_path:
        return False, "Invalid model path type"

    path = Path(model_path)

    if not path.exists():
        return False, f"Model file not found: {model_path}"

    if not path.is_file():
        return False, "Model path is not a file"

    if path.suffix != '.bin':
        return False, "Model file must be .bin format"

    # Check reasonable size (models are typically 100MB-1GB)
    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb < 50:
        return False, f"Model file too small: {size_mb:.1f}MB (corrupted?)"

    return True, ""
```

**Step 5.3: Integrate Validators (1 hour)**
- Update `transcribe.py` to use validators
- Update `main.js` IPC handlers to validate inputs
- Add user-friendly error messages

**Step 5.4: Testing (30 min)**
- [ ] Test with missing file
- [ ] Test with non-WAV file
- [ ] Test with oversized file
- [ ] Test with path traversal attempt
- [ ] Test with empty file

---

### Task 6: Testing (4-6 hours) 🟡 MEDIUM

**Step 6.1: Setup Test Infrastructure (1 hour)**
```bash
# Python tests
uv pip install pytest pytest-cov pytest-mock

# JavaScript tests
npm install --save-dev jest @types/jest

# Configure
```

**File:** `pytest.ini`
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --cov=src/python --cov-report=html --cov-report=term-missing
```

**File:** `jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'database.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
```

**Step 6.2: Write Python Tests (2-3 hours)**

**Priority tests:**
- `test_error_handler.py` - Error handling system
- `test_validators.py` - Input validation
- `test_whisper_transcriber.py` - Transcription (mocked)
- `test_recorder.py` - Recording (mocked)

**Step 6.3: Write JavaScript Tests (2-3 hours)**

**Priority tests:**
- `test_validators.js` - Input validation
- `test_ProcessManager.js` - Process management
- `test_database.js` - Database operations

**Step 6.4: Integration Test (1 hour)**
One critical E2E test: Record → Transcribe → Database

**Target Coverage:**
- Minimum: 50%
- Goal: 80%
- Critical paths: 100%

---

## Timeline & Milestones

### Day 1 (6-8 hours)
- [ ] Task 1: Electron Security Fix
  - Create preload.js
  - Update main.js, history.js, index.html
  - Test IPC still works
- [ ] Task 2: English-Only Mode
  - Update whisper_transcriber.py
  - Test accent handling

**Milestone 1:** Security vulnerabilities fixed, English-only working

### Day 2 (6-8 hours)
- [ ] Task 3: Python Error Handling
  - Create ErrorHandler class
  - Update recorder.py
  - Update transcribe.py
  - Test error scenarios
- [ ] Start Task 4: JavaScript Error Handling
  - Create ProcessManager class

**Milestone 2:** Robust error handling in place

### Day 3 (6-8 hours)
- [ ] Finish Task 4: JavaScript Error Handling
  - Update main.js
  - Add UI error notifications
  - Test auto-restart
- [ ] Task 5: Input Validation
  - Create validators (JS + Python)
  - Integrate into codebase
  - Test validation

**Milestone 3:** Complete error handling and validation

### Day 4 (4-6 hours)
- [ ] Task 6: Testing
  - Setup test infrastructure
  - Write priority tests
  - Run coverage reports
  - Fix any failing tests

**Milestone 4:** Test coverage ≥50%, all tests passing

---

## Technical Decisions & Rationale

### Decision 1: Solo vs Subagents
**Choice:** Solo execution
**Rationale:**
- Phase A tasks are tightly coupled (security affects everything)
- Coordination overhead would exceed parallelization benefits
- Better to refactor as unified changeset
- Can validate integration continuously
- Subagents better suited for Phase B/C (independent features)

### Decision 2: Preload Script Approach
**Choice:** Single preload.js with contextBridge
**Rationale:**
- Industry standard (Electron docs recommend)
- Creates clear security boundary
- Easy to audit exposed API surface
- Maintains all existing functionality
- Low risk if implemented carefully

### Decision 3: Observer Pattern for Errors
**Choice:** Centralized ErrorHandler with observers
**Rationale:**
- Gang of Four design pattern (requirement met)
- Allows flexible error reporting (logs, UI, analytics)
- Separates error handling from business logic
- Easy to test
- Extensible for future needs

### Decision 4: Process Manager with Exponential Backoff
**Choice:** Custom ProcessManager class
**Rationale:**
- Handles 80% of real-world crash scenarios
- Exponential backoff prevents restart storms
- Health monitoring catches silent failures
- Graceful shutdown prevents zombie processes
- Better than npm packages (custom fit)

### Decision 5: English-Only First
**Choice:** Force `-l en`, config support for later
**Rationale:**
- Solves immediate problem (Irish → Welsh)
- Simple, low-risk change
- Fast implementation (2 hours)
- Can add language selector in Phase B
- User doesn't need choice now (all English speakers)

### Decision 6: 50% Coverage Target
**Choice:** Minimum 50%, stretch 80%
**Rationale:**
- 50% is achievable in timeframe
- 80% requires mocking Whisper, PyAudio (complex)
- Critical paths (security, errors) will have 100%
- Can improve coverage in Phase C
- Pragmatic vs perfect

---

## Risk Assessment

### High Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Preload refactor breaks IPC** | Medium | High | Incremental testing, feature flag, careful migration |
| **Process auto-restart causes loops** | Low | High | Max restart limit, exponential backoff, monitoring |
| **Tests reveal design flaws** | Medium | Medium | Fix as found, prioritize critical paths |

### Mitigation Strategies

**For IPC Breakage:**
1. Test each IPC handler individually after migration
2. Keep old code commented during testing
3. Add feature flag `SECURE_MODE` to toggle
4. Rollback plan: revert to v2.0 security model

**For Restart Loops:**
1. Limit max restarts to 3
2. Exponential backoff (1s, 2s, 4s)
3. Emit 'permanent-failure' event
4. Monitor in production

**For Design Flaws:**
1. Don't over-engineer
2. Refactor incrementally
3. Keep changes focused
4. Write tests for new patterns

---

## Success Criteria

### Must Have (Required for v2.1.0)
- ✅ Electron security fixed (preload + contextBridge)
- ✅ English-only transcription working
- ✅ Python error handling implemented
- ✅ JavaScript error handling implemented
- ✅ Input validation in place
- ✅ Test coverage ≥50%
- ✅ All existing features working
- ✅ Zero breaking changes

### Nice to Have (Stretch Goals)
- 🎯 Test coverage ≥80%
- 🎯 Config file for language setting
- 🎯 Re-transcribe UI feature
- 🎯 Performance benchmarks documented

### Definition of Done
- [ ] All code merged to `feature/phase-a-security-stability`
- [ ] All tests passing
- [ ] Coverage report generated
- [ ] Manual testing complete (full workflow)
- [ ] Documentation updated
- [ ] Ready to merge to main
- [ ] Tagged as v2.1.0

---

## Testing Checklist

### Security Testing
- [ ] DevTools security warnings cleared
- [ ] `npm audit` shows no vulnerabilities
- [ ] Cannot access Node.js from DevTools console
- [ ] IPC only works through exposed API
- [ ] Path traversal attempts blocked

### Functional Testing
- [ ] Record audio (Ctrl+Y)
- [ ] Stop recording (Ctrl+Y)
- [ ] Transcription runs automatically
- [ ] Both .txt and .md files created
- [ ] History view loads all recordings
- [ ] Search filters recordings
- [ ] Copy to clipboard works
- [ ] Audio playback works
- [ ] View transcript works
- [ ] Navigation (Record ↔ History) works

### Error Scenario Testing
- [ ] Microphone permission denied → user notified
- [ ] Audio device unplugged during recording → graceful handling
- [ ] Disk full → user notified
- [ ] Python process killed → auto-restart
- [ ] Max restarts reached → permanent failure dialog
- [ ] Invalid file path → validation error
- [ ] Oversized file → validation error
- [ ] Welsh misdetection → fixed with English-only

### Performance Testing
- [ ] Transcription still <500ms per 10 seconds
- [ ] UI responsive during transcription
- [ ] No memory leaks after 10+ recordings
- [ ] Database queries fast (<100ms)

---

## Documentation Updates

**Files to update:**
- `README.md` - New security features
- `CLAUDE.md` - Error handling, validation
- `PHASE_2_COMPLETION_REPORT.md` - Add v2.1 notes
- `CHANGELOG.md` (NEW) - Version history

---

## Rollout Plan

### Step 1: Development
- Work on `feature/phase-a-security-stability` branch
- Commit frequently with clear messages
- Push to remote daily

### Step 2: Testing
- Run full test suite
- Manual testing checklist
- Performance benchmarks

### Step 3: Merge
```bash
git checkout main
git merge feature/phase-a-security-stability
git tag -a v2.1.0 -m "Phase A: Security & Stability"
git push origin main --tags
```

### Step 4: Deployment
- Test v2.1.0 in production
- Monitor for errors
- Collect user feedback

### Step 5: Retrospective
- Document lessons learned
- Plan Phase B improvements

---

## Contingency Plans

### If Security Refactor Blocked
**Scenario:** Preload script breaks critical functionality
**Response:**
1. Revert to v2.0 security model temporarily
2. Implement feature flag to toggle security mode
3. Debug IPC communication in isolation
4. Deploy partial fix (other tasks still proceed)

### If Timeline Overruns
**Priority Order:**
1. Security fix (non-negotiable)
2. English-only mode (fast win)
3. Error handling (critical stability)
4. Input validation (security++)
5. Testing (can be reduced to critical paths)

**Minimum Viable Phase A:**
- Security fix + English-only + basic error handling
- Ship as v2.1.0-beta
- Complete remaining tasks in v2.1.1

### If Tests Reveal Major Issues
**Response:**
1. Don't force merge
2. Fix issues properly
3. Extend timeline if needed
4. Better to ship late than ship broken

---

## Communication Plan

### Daily Updates
Will provide:
- Progress summary
- Blockers encountered
- Next day plan
- Risk updates

### Milestone Reports
After each milestone:
- What shipped
- What's working
- What's next
- Confidence level

### Final Report
At completion:
- Summary of changes
- Test results
- Known issues
- Deployment checklist

---

## Conclusion

**Approach:** Solo execution with modular implementation
**Strategy:** Security-first, test-driven, incremental
**Timeline:** 18-25 hours over 3-4 focused days
**Risk Level:** Medium but well-mitigated
**Confidence:** High (clear path, proven patterns)

**Ready to Execute:** Awaiting final authorization

---

**Prepared by:** Claude Code (Sonnet 4.5)
**Date:** 2025-10-25
**Status:** PLAN READY FOR APPROVAL
**Estimated Completion:** 3-4 days from start
