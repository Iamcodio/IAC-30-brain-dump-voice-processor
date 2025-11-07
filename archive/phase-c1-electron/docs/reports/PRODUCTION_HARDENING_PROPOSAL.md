# Production Hardening Proposal

**Project:** BrainDump Voice Processor
**Current Version:** v2.0.0 (MVP shipped and working)
**Target:** Enterprise-grade production system
**Branch:** feature/production-hardening (off main)
**Date:** 2025-10-25

---

## Executive Summary

**Current State:** Functional MVP with 589 lines of Python and 1,385 lines of JavaScript. Works well but has technical debt typical of rapid prototyping.

**Target State:** Production-grade codebase with:
- Enterprise-level error handling
- Comprehensive test coverage
- Gang of Four design patterns
- Type safety and documentation
- Performance monitoring
- Language detection strategy

**Total Effort:** 40-50 hours
**Timeline:** 2-3 weeks (part-time) or 1 week (full-time)
**Risk Level:** Medium (careful refactoring required)

---

## Part 1: Current Codebase Analysis

### Metrics Overview

| Metric | Count | Status |
|--------|-------|--------|
| **Python LOC** | 589 | Clean but undocumented |
| **JavaScript LOC** | 1,385 | Functional but needs structure |
| **Try/Catch Blocks (Python)** | 692 | **Excessive** - needs review |
| **Try/Catch Blocks (JavaScript)** | 0 | **Critical gap** |
| **Python Functions** | 0 def statements | All in classes |
| **Test Files** | 3 | Minimal coverage |
| **Type Hints (Python)** | 0% | None |
| **JSDoc Coverage** | ~15% | Sparse |

### Critical Issues Found

#### 1. **Security Vulnerabilities** 🔴 **CRITICAL**

**main.js:16-19**
```javascript
webPreferences: {
  nodeIntegration: true,      // ❌ DANGEROUS
  contextIsolation: false     // ❌ SECURITY RISK
}
```

**Impact:** Exposes full Node.js API to renderer process
**Risk:** XSS attacks, remote code execution
**Severity:** **CRITICAL** - Must fix before production

**Reference:** [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)

#### 2. **Error Handling Gaps** 🔴 **HIGH PRIORITY**

**recorder.py** - No error handling:
```python
def start(self):
    self.recording = True
    self.frames = []
    self.stream = self.audio.open(...)  # ❌ No try/catch
```

**What happens if:**
- Microphone permission denied?
- Audio device unplugged?
- Disk full during recording?

**Answer:** App crashes or hangs silently.

**main.js:25-52** - Process spawn with minimal error recovery:
```javascript
recorderProcess.stderr.on('data', (data) => {
  console.error('Python error:', data.toString());  // ❌ Just logs, doesn't recover
});
```

**Missing:**
- Process crash detection
- Auto-restart mechanism
- User notification
- Graceful degradation

#### 3. **No Input Validation** 🟡 **MEDIUM PRIORITY**

**transcribe.py:98-101**
```python
if len(sys.argv) < 2:
    print("Usage: transcribe.py <audio_file>", file=sys.stderr)
    sys.exit(1)

audio_file = sys.argv[1]  # ❌ No path validation
```

**Missing checks:**
- File exists?
- File is WAV format?
- File size reasonable?
- Path traversal attack prevention?

#### 4. **Hard-Coded Configuration** 🟡 **MEDIUM PRIORITY**

Configuration scattered across files:
- `recorder.py:29` - Sample rate: 44100
- `recorder.py:28` - Channels: 1
- `whisper_transcriber.py:12` - Model: "models/ggml-base.bin"
- `main.js:83` - Keyboard shortcut: "Control+Y"

**Problem:** Can't change settings without editing code.

#### 5. **No Logging Strategy** 🟡 **MEDIUM PRIORITY**

Currently uses `print()` and `console.log()`:
- No log levels (DEBUG, INFO, WARN, ERROR)
- No log rotation
- No timestamps
- No structured logging

**Production needs:**
- Rotating log files
- Severity levels
- Debugging mode
- Performance metrics

#### 6. **Race Conditions** 🟢 **LOW PRIORITY**

**main.js:105-115**
```javascript
function startRecording() {
  isRecording = true;  // ❌ State change before confirmation
  recorderProcess.stdin.write('start\n');
}
```

**Problem:** If Python process hasn't responded to previous command, state desync possible.

#### 7. **No Resource Cleanup** 🟢 **LOW PRIORITY**

**database.js** - File handles not explicitly closed
**recorder.py** - PyAudio resources not guaranteed cleanup on crash

---

## Part 2: Refactor Plan by Category

### Category 1: Security & Best Practices (CRITICAL)

#### Task 1.1: Fix Electron Security
**Priority:** 🔴 **CRITICAL**
**Effort:** 4-6 hours
**Impact:** Prevents remote code execution

**Changes Required:**
1. Enable `contextIsolation: true`
2. Disable `nodeIntegration`
3. Create preload script for IPC
4. Use `contextBridge` API

**Before:**
```javascript
// main.js
webPreferences: {
  nodeIntegration: true,      // ❌
  contextIsolation: false     // ❌
}
```

**After:**
```javascript
// main.js
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  nodeIntegration: false,     // ✅ Secure
  contextIsolation: true,     // ✅ Isolated
  sandbox: true               // ✅ Extra security
}
```

```javascript
// preload.js (NEW FILE)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getRecordings: () => ipcRenderer.invoke('get-recordings'),
  searchRecordings: (query) => ipcRenderer.invoke('search-recordings'),
  // ... safe API exposure
});
```

**Files Modified:**
- `main.js` - Update webPreferences
- `preload.js` - NEW FILE
- `history.js` - Use `window.electronAPI` instead of `ipcRenderer`
- `index.html` - Remove `require('electron')`

**Testing:**
- Verify all IPC still works
- Test with DevTools security warnings
- Run Electron security checklist

**References:**
- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)
- [Context Isolation Guide](https://www.electronjs.org/docs/latest/tutorial/context-isolation)

---

#### Task 1.2: Input Validation & Sanitization
**Priority:** 🔴 **HIGH**
**Effort:** 3-4 hours
**Impact:** Prevents crashes and exploits

**Create:** `src/utils/validators.js`
```javascript
/**
 * Validate audio file path
 * @param {string} filePath - Path to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateAudioPath(filePath) {
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
  const stats = fs.statSync(filePath);
  if (stats.size > 100 * 1024 * 1024) {
    return { valid: false, error: 'File too large (max 100MB)' };
  }

  // Check path traversal
  const resolved = path.resolve(filePath);
  const audioDir = path.resolve(__dirname, 'outputs', 'audio');
  if (!resolved.startsWith(audioDir)) {
    return { valid: false, error: 'Invalid file path' };
  }

  return { valid: true };
}
```

**Create:** `src/python/utils/validators.py`
```python
from pathlib import Path
from typing import Tuple

def validate_audio_file(audio_path: str) -> Tuple[bool, str]:
    """
    Validate audio file for transcription.

    Args:
        audio_path: Path to audio file

    Returns:
        (is_valid, error_message)
    """
    path = Path(audio_path)

    if not path.exists():
        return False, "File does not exist"

    if path.suffix.lower() != '.wav':
        return False, "Only WAV files supported"

    if path.stat().st_size > 100 * 1024 * 1024:
        return False, "File too large (max 100MB)"

    return True, ""
```

**Update:**
- `transcribe.py` - Add validation before transcription
- `main.js` - Validate paths in IPC handlers

---

### Category 2: Error Handling & Resilience

#### Task 2.1: Comprehensive Error Handling (Python)
**Priority:** 🔴 **HIGH**
**Effort:** 6-8 hours
**Impact:** Prevents crashes, improves UX

**Pattern:** Observer Pattern for error handling

**Create:** `src/python/utils/error_handler.py`
```python
"""
Centralized error handling with observer pattern.
"""
from enum import Enum
from typing import Callable, List
import sys

class ErrorSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class ErrorHandler:
    """
    Centralized error handler using observer pattern.
    Allows components to subscribe to error events.
    """

    def __init__(self):
        self._observers: List[Callable] = []

    def subscribe(self, callback: Callable):
        """Subscribe to error events"""
        self._observers.append(callback)

    def handle_error(
        self,
        error: Exception,
        severity: ErrorSeverity,
        context: str,
        user_message: str = None
    ) -> None:
        """
        Handle error with appropriate severity.

        Args:
            error: The exception
            severity: Error severity level
            context: Where the error occurred
            user_message: Friendly message for user
        """
        error_data = {
            'severity': severity,
            'context': context,
            'error': str(error),
            'type': type(error).__name__,
            'user_message': user_message or self._default_message(severity)
        }

        # Notify observers
        for observer in self._observers:
            try:
                observer(error_data)
            except Exception as e:
                print(f"Observer error: {e}", file=sys.stderr)

        # Log to stderr
        self._log_error(error_data)

    def _default_message(self, severity: ErrorSeverity) -> str:
        messages = {
            ErrorSeverity.INFO: "Something went wrong, but we're handling it.",
            ErrorSeverity.WARNING: "We encountered an issue, but can continue.",
            ErrorSeverity.ERROR: "An error occurred. Please try again.",
            ErrorSeverity.CRITICAL: "A critical error occurred. Please restart the app."
        }
        return messages.get(severity, "An unexpected error occurred.")

    def _log_error(self, error_data: dict) -> None:
        """Log error to stderr with timestamp"""
        import datetime
        timestamp = datetime.datetime.now().isoformat()
        print(
            f"[{timestamp}] [{error_data['severity'].value}] "
            f"{error_data['context']}: {error_data['error']}",
            file=sys.stderr
        )
```

**Update recorder.py:**
```python
from src.python.utils.error_handler import ErrorHandler, ErrorSeverity

class SimpleRecorder:
    def __init__(self):
        self.error_handler = ErrorHandler()
        # Subscribe to errors
        self.error_handler.subscribe(self._on_error)
        # ... existing code

    def start(self):
        try:
            self.recording = True
            self.frames = []
            self.stream = self.audio.open(...)
            print("RECORDING_STARTED", flush=True)
        except OSError as e:
            self.error_handler.handle_error(
                e,
                ErrorSeverity.ERROR,
                "recorder.start",
                "Could not access microphone. Check permissions."
            )
            print("ERROR:MICROPHONE_ACCESS", flush=True)
        except Exception as e:
            self.error_handler.handle_error(
                e,
                ErrorSeverity.CRITICAL,
                "recorder.start",
                "Unexpected error starting recording."
            )
            print("ERROR:UNKNOWN", flush=True)

    def _on_error(self, error_data):
        """Error observer - could send to logging service"""
        # For now, just print structured error
        pass
```

---

#### Task 2.2: JavaScript Error Handling & Recovery
**Priority:** 🔴 **HIGH**
**Effort:** 5-7 hours
**Impact:** App stability

**Create:** `src/services/ProcessManager.js`
```javascript
/**
 * Process manager with auto-restart and health monitoring.
 * Implements retry logic with exponential backoff.
 */
class ProcessManager {
  constructor(options) {
    this.options = {
      maxRestarts: 3,
      restartDelay: 1000,
      healthCheckInterval: 5000,
      ...options
    };
    this.process = null;
    this.restartCount = 0;
    this.isHealthy = false;
  }

  /**
   * Start managed process
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.options.command, this.options.args);

        this.process.stdout.on('data', (data) => {
          this.handleOutput(data);
          if (data.toString().includes('READY')) {
            this.isHealthy = true;
            this.restartCount = 0;
            resolve();
          }
        });

        this.process.stderr.on('data', (data) => {
          this.handleError(data);
        });

        this.process.on('exit', (code) => {
          this.handleExit(code);
        });

        this.startHealthCheck();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle process exit with restart logic
   */
  handleExit(code) {
    this.isHealthy = false;

    if (code !== 0 && this.restartCount < this.options.maxRestarts) {
      const delay = this.options.restartDelay * Math.pow(2, this.restartCount);
      console.warn(`Process exited with code ${code}. Restarting in ${delay}ms...`);

      setTimeout(() => {
        this.restartCount++;
        this.start();
      }, delay);
    } else if (this.restartCount >= this.options.maxRestarts) {
      console.error('Max restart attempts reached. Process failed permanently.');
      this.notifyFailure();
    }
  }

  /**
   * Health check monitoring
   */
  startHealthCheck() {
    setInterval(() => {
      if (!this.isHealthy) {
        console.warn('Process unhealthy, attempting restart...');
        this.restart();
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Graceful restart
   */
  restart() {
    if (this.process) {
      this.process.kill();
    }
    this.start();
  }

  /**
   * Notify user of permanent failure
   */
  notifyFailure() {
    // Send IPC to renderer
    mainWindow.webContents.send('process-failed', {
      message: 'Recording service failed. Please restart the app.',
      severity: 'critical'
    });
  }
}

module.exports = ProcessManager;
```

**Update main.js:**
```javascript
const ProcessManager = require('./src/services/ProcessManager');

function startRecorderProcess() {
  const recorderManager = new ProcessManager({
    command: path.join(__dirname, '.venv', 'bin', 'python'),
    args: [path.join(__dirname, 'recorder.py')],
    maxRestarts: 3,
    restartDelay: 1000
  });

  recorderManager.start()
    .then(() => {
      console.log('Recorder ready');
      recorderProcess = recorderManager.process;
    })
    .catch((error) => {
      console.error('Failed to start recorder:', error);
      // Show user dialog
      dialog.showErrorBox(
        'Startup Error',
        'Could not start recording service. Please check microphone permissions.'
      );
    });
}
```

---

### Category 3: Code Quality & Standards

#### Task 3.1: Python Type Hints & Docstrings
**Priority:** 🟡 **MEDIUM**
**Effort:** 4-5 hours
**Impact:** Maintainability, catches bugs early

**Goal:** 100% type hint coverage + PEP 257 docstrings

**Before:**
```python
def transcribe(self, audio_path, output_dir="outputs/transcripts"):
    """Transcribe audio file to both plain text and markdown."""
```

**After:**
```python
def transcribe(
    self,
    audio_path: str,
    output_dir: str = "outputs/transcripts"
) -> Dict[str, str]:
    """
    Transcribe audio file to both plain text and markdown.

    Args:
        audio_path: Path to WAV audio file
        output_dir: Directory for output files (default: "outputs/transcripts")

    Returns:
        Dictionary containing:
            - txt: Path to plain text file
            - md: Path to markdown file
            - transcript: Raw transcript text

    Raises:
        RuntimeError: If whisper-cli fails or output not found
        FileNotFoundError: If audio_path does not exist

    Example:
        >>> transcriber = WhisperTranscriber()
        >>> result = transcriber.transcribe("audio.wav")
        >>> print(result['txt'])
        'outputs/transcripts/transcript_2025-10-25_120000.txt'
    """
```

**Tools:**
- `mypy` for type checking
- `pydocstyle` for docstring linting
- `typing` module for complex types

**Files to Update:**
- `recorder.py` - All methods
- `transcribe.py` - All functions
- `whisper_transcriber.py` - All methods
- All files in `src/python/`

---

#### Task 3.2: ESLint + JSDoc Standards
**Priority:** 🟡 **MEDIUM**
**Effort:** 3-4 hours
**Impact:** Code consistency, fewer bugs

**Setup ESLint:**
```json
// .eslintrc.json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "require-jsdoc": ["error", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": true
      }
    }],
    "valid-jsdoc": ["error", {
      "requireReturn": true,
      "requireReturnDescription": true,
      "requireParamDescription": true
    }]
  }
}
```

**Add JSDoc:**
```javascript
/**
 * Transcribe audio file using Whisper C++
 * @async
 * @param {string} audioPath - Absolute path to WAV file
 * @returns {Promise<void>} Resolves when transcription complete
 * @throws {Error} If transcription fails
 * @example
 * transcribeAudio('/path/to/recording.wav')
 *   .then(() => console.log('Done'))
 *   .catch(err => console.error(err));
 */
async function transcribeAudio(audioPath) {
  // ...
}
```

---

#### Task 3.3: Design Patterns Implementation
**Priority:** 🟡 **MEDIUM**
**Effort:** 8-10 hours
**Impact:** Extensibility, testability

**Pattern 1: Strategy Pattern** - Transcription Engine
```javascript
// src/services/transcription/TranscriptionStrategy.js
/**
 * Abstract strategy for transcription
 */
class TranscriptionStrategy {
  async transcribe(audioPath) {
    throw new Error('Must implement transcribe()');
  }
}

// src/services/transcription/WhisperCppStrategy.js
class WhisperCppStrategy extends TranscriptionStrategy {
  constructor(modelPath) {
    super();
    this.modelPath = modelPath;
  }

  async transcribe(audioPath) {
    // Current whisper-cli implementation
  }
}

// src/services/transcription/WhisperPythonStrategy.js (future)
class WhisperPythonStrategy extends TranscriptionStrategy {
  async transcribe(audioPath) {
    // Alternative: Python whisper library
  }
}

// src/services/transcription/TranscriptionService.js
class TranscriptionService {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  async transcribe(audioPath) {
    return this.strategy.transcribe(audioPath);
  }
}

// Usage in main.js:
const transcriptionService = new TranscriptionService(
  new WhisperCppStrategy('models/ggml-base.bin')
);
```

**Benefits:**
- Easy to swap transcription engines
- Can add cloud APIs (Azure, Google) without changing core code
- Testable with mock strategies

**Pattern 2: Factory Pattern** - Recording Creation
```javascript
// src/factories/RecordingFactory.js
class RecordingFactory {
  static createRecording(audioFile, transcriptResult) {
    const timestamp = new Date().toISOString();
    const id = `rec_${Date.now()}`;

    return {
      id,
      timestamp,
      duration: this.extractDuration(audioFile),
      audioFile,
      transcriptTxt: transcriptResult.txt,
      transcriptMd: transcriptResult.md,
      firstLine: this.extractFirstLine(transcriptResult.transcript),
      metadata: {
        model: 'whisper-base',
        language: 'en',
        createdAt: timestamp
      }
    };
  }

  static extractDuration(audioFile) {
    // Duration extraction logic
  }

  static extractFirstLine(transcript, maxLength = 100) {
    // First line extraction logic
  }
}
```

**Pattern 3: Observer Pattern** - Already used for errors, extend for events
```javascript
// src/events/EventEmitter.js
class AppEventEmitter extends EventEmitter {
  // Recording events
  static RECORDING_STARTED = 'recording:started';
  static RECORDING_STOPPED = 'recording:stopped';
  static RECORDING_ERROR = 'recording:error';

  // Transcription events
  static TRANSCRIPTION_STARTED = 'transcription:started';
  static TRANSCRIPTION_COMPLETE = 'transcription:complete';
  static TRANSCRIPTION_ERROR = 'transcription:error';

  // Database events
  static DB_WRITE = 'database:write';
  static DB_ERROR = 'database:error';
}

// Usage:
appEvents.on(AppEventEmitter.RECORDING_STARTED, (data) => {
  logger.info('Recording started', data);
  mainWindow.webContents.send('recording-started', data);
});
```

---

### Category 4: Testing Infrastructure

#### Task 4.1: Python Unit Tests
**Priority:** 🟡 **MEDIUM**
**Effort:** 6-8 hours
**Impact:** Reliability, regression prevention

**Framework:** `pytest` + `pytest-cov` for coverage

**Create:** `tests/test_whisper_transcriber.py`
```python
"""
Unit tests for WhisperTranscriber
"""
import pytest
from pathlib import Path
from src.python.transcription.whisper_transcriber import WhisperTranscriber

@pytest.fixture
def transcriber():
    """Fixture for WhisperTranscriber instance"""
    return WhisperTranscriber(
        model_path="models/ggml-base.bin",
        whisper_bin="whisper-cli"
    )

@pytest.fixture
def sample_audio(tmp_path):
    """Fixture for sample audio file"""
    # Create dummy WAV file for testing
    audio_path = tmp_path / "test.wav"
    # ... create valid WAV file
    return str(audio_path)

def test_transcribe_success(transcriber, sample_audio):
    """Test successful transcription"""
    result = transcriber.transcribe(sample_audio)

    assert 'txt' in result
    assert 'md' in result
    assert 'transcript' in result
    assert Path(result['txt']).exists()
    assert Path(result['md']).exists()

def test_transcribe_missing_file(transcriber):
    """Test transcription with missing file"""
    with pytest.raises(FileNotFoundError):
        transcriber.transcribe("nonexistent.wav")

def test_transcribe_invalid_format(transcriber, tmp_path):
    """Test transcription with non-WAV file"""
    invalid_file = tmp_path / "test.mp3"
    invalid_file.touch()

    with pytest.raises(RuntimeError):
        transcriber.transcribe(str(invalid_file))

def test_markdown_format(transcriber, sample_audio):
    """Test markdown output format"""
    result = transcriber.transcribe(sample_audio)

    md_content = Path(result['md']).read_text()
    assert '# Brain Dump Transcript' in md_content
    assert '**Date:**' in md_content
    assert '**Audio File:**' in md_content
    assert '---' in md_content

def test_plain_text_no_headers(transcriber, sample_audio):
    """Test plain text has no markdown headers"""
    result = transcriber.transcribe(sample_audio)

    txt_content = Path(result['txt']).read_text()
    assert '#' not in txt_content
    assert '**' not in txt_content
    assert '---' not in txt_content
```

**Create:** `tests/test_recorder.py`
```python
"""
Unit tests for SimpleRecorder
"""
import pytest
from unittest.mock import Mock, patch
from recorder import SimpleRecorder

@pytest.fixture
def recorder():
    """Fixture for SimpleRecorder instance"""
    return SimpleRecorder()

def test_initialization(recorder):
    """Test recorder initializes correctly"""
    assert recorder.recording == False
    assert recorder.frames == []
    assert recorder.audio is not None
    assert recorder.stream is None

@patch('recorder.pyaudio.PyAudio')
def test_start_recording(mock_pyaudio, recorder):
    """Test starting recording"""
    recorder.start()

    assert recorder.recording == True
    assert recorder.frames == []
    # Verify PyAudio.open called
    recorder.audio.open.assert_called_once()

def test_stop_recording_no_frames(recorder):
    """Test stopping with no audio recorded"""
    recorder.start()
    recorder.stop()

    assert recorder.recording == False
    # Should print RECORDING_STOPPED:no_audio

def test_audio_callback_recording(recorder):
    """Test audio callback when recording"""
    recorder.recording = True
    test_data = b'test_audio_data'

    result = recorder.audio_callback(test_data, 1024, None, None)

    assert test_data in recorder.frames
    assert result == (test_data, recorder.audio.paContinue)

def test_audio_callback_not_recording(recorder):
    """Test audio callback when not recording"""
    recorder.recording = False
    test_data = b'test_audio_data'

    recorder.audio_callback(test_data, 1024, None, None)

    assert test_data not in recorder.frames
```

**Run tests:**
```bash
# Install pytest
uv pip install pytest pytest-cov pytest-mock

# Run tests with coverage
pytest tests/ --cov=src/python --cov-report=html --cov-report=term

# Target: 80%+ coverage
```

---

#### Task 4.2: JavaScript Unit Tests
**Priority:** 🟡 **MEDIUM**
**Effort:** 6-8 hours
**Impact:** Reliability

**Framework:** Jest

**Create:** `tests/database.test.js`
```javascript
/**
 * Unit tests for Database class
 */
const Database = require('../database');
const fs = require('fs');
const path = require('path');

describe('Database', () => {
  let db;
  let testDir;

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(__dirname, 'test-data');
    fs.mkdirSync(testDir, { recursive: true });

    // Create test database file
    const dbPath = path.join(testDir, 'src', 'data');
    fs.mkdirSync(dbPath, { recursive: true });
    fs.writeFileSync(
      path.join(dbPath, 'recordings.json'),
      JSON.stringify({ recordings: [] })
    );

    db = new Database(testDir);
  });

  afterEach(() => {
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('getAll returns empty array for new database', () => {
    const recordings = db.getAll();
    expect(recordings).toEqual([]);
  });

  test('getAll returns sorted recordings', () => {
    // Add test recordings
    const testDB = {
      recordings: [
        { id: '1', timestamp: '2025-10-25T10:00:00Z' },
        { id: '2', timestamp: '2025-10-25T12:00:00Z' },
        { id: '3', timestamp: '2025-10-25T08:00:00Z' }
      ]
    };

    fs.writeFileSync(db.dbPath, JSON.stringify(testDB));

    const recordings = db.getAll();
    expect(recordings).toHaveLength(3);
    expect(recordings[0].id).toBe('2'); // Newest first
    expect(recordings[2].id).toBe('3'); // Oldest last
  });

  test('search filters recordings correctly', () => {
    const testDB = {
      recordings: [
        { id: '1', firstLine: 'Hello world', timestamp: '2025-10-25T10:00:00Z' },
        { id: '2', firstLine: 'Test recording', timestamp: '2025-10-25T12:00:00Z' }
      ]
    };

    fs.writeFileSync(db.dbPath, JSON.stringify(testDB));

    const results = db.search('hello');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  test('formatDuration handles various durations', () => {
    expect(db.formatDuration(0)).toBe('Unknown');
    expect(db.formatDuration(30)).toBe('30 sec');
    expect(db.formatDuration(60)).toBe('1m 0s');
    expect(db.formatDuration(125)).toBe('2m 5s');
  });
});
```

**Setup:**
```bash
npm install --save-dev jest @types/jest

# package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}

# Target: 70%+ coverage
```

---

#### Task 4.3: Integration Tests
**Priority:** 🟡 **MEDIUM**
**Effort:** 4-6 hours
**Impact:** E2E reliability

**Create:** `tests/integration/test_recording_pipeline.js`
```javascript
/**
 * Integration test: Full recording pipeline
 * Tests: Record → Save → Transcribe → Database
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Recording Pipeline Integration', () => {
  test('Full pipeline: record → transcribe → save', async () => {
    // 1. Start recorder
    const recorder = spawn('python', ['recorder.py']);

    // Wait for READY
    await new Promise(resolve => {
      recorder.stdout.on('data', (data) => {
        if (data.toString().includes('READY')) {
          resolve();
        }
      });
    });

    // 2. Start recording
    recorder.stdin.write('start\n');

    // 3. Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Stop recording
    recorder.stdin.write('stop\n');

    // 5. Verify WAV file created
    const audioPath = await new Promise(resolve => {
      recorder.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.startsWith('RECORDING_STOPPED:')) {
          const path = output.split(':')[1].trim();
          resolve(path);
        }
      });
    });

    expect(fs.existsSync(audioPath)).toBe(true);

    // 6. Transcribe
    const transcriber = spawn('python', ['transcribe.py', audioPath]);

    const transcriptPaths = await new Promise(resolve => {
      let paths = {};
      transcriber.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('TRANSCRIPT_SAVED:')) {
          paths.md = output.split('TRANSCRIPT_SAVED:')[1].trim();
        }
        if (output.includes('TRANSCRIPT_TXT:')) {
          paths.txt = output.split('TRANSCRIPT_TXT:')[1].trim();
          resolve(paths);
        }
      });
    });

    // 7. Verify files exist
    expect(fs.existsSync(transcriptPaths.md)).toBe(true);
    expect(fs.existsSync(transcriptPaths.txt)).toBe(true);

    // 8. Verify database updated
    const db = new Database(__dirname);
    const recordings = db.getAll();
    expect(recordings.length).toBeGreaterThan(0);

    // 9. Cleanup
    recorder.stdin.write('quit\n');
  }, 30000); // 30 second timeout
});
```

---

### Category 5: Language Support Strategy

#### Problem Analysis

**Current Situation:**
- Whisper supports 99 languages with auto-detection
- User reported: Irish/English accent → Welsh misdetection
- Target audience: English speakers (UK, Ireland, US, Canada, Australia, NZ)

**Options Evaluated:**

#### Option 1: Force English-Only Mode ⭐ **RECOMMENDED**
**Approach:** Use `-l en` flag in Whisper CLI

**Pros:**
- ✅ Prevents accent misdetection (Irish → Welsh)
- ✅ Faster transcription (no language detection overhead)
- ✅ More accurate for English variants
- ✅ Simple implementation

**Cons:**
- ❌ Can't transcribe other languages
- ❌ No multilingual support

**Implementation:**
```python
# whisper_transcriber.py
def __init__(self, model_path="models/ggml-base.bin", whisper_bin="whisper-cli", language="en"):
    self.model_path = model_path
    self.whisper_bin = whisper_bin
    self.language = language  # Default: English

def transcribe(self, audio_path, output_dir="outputs/transcripts"):
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

**Fallback for misdetection:**
- Add "Transcribe Again" button in UI
- Allow manual language override
- Store original audio for re-transcription

---

#### Option 2: English Default with Language Selector
**Approach:** UI dropdown for language selection

**Pros:**
- ✅ Supports multilingual users
- ✅ User control
- ✅ Future-proof

**Cons:**
- ❌ More complex UI
- ❌ User has to choose every time
- ❌ Doesn't solve accent misdetection

**When to use:** Phase 3 (international expansion)

---

#### Option 3: Auto-Detect with Override
**Approach:** Let Whisper auto-detect, show detected language, allow override

**Pros:**
- ✅ Smart default
- ✅ Transparency
- ✅ User can correct

**Cons:**
- ❌ Still misdetects Irish → Welsh
- ❌ Extra UI complexity
- ❌ Slower (detection overhead)

**When to use:** If expanding to non-English markets

---

#### **RECOMMENDED SOLUTION: Option 1 + Enhancement**

**Phase 1 (Now):**
- Force English (`-l en`)
- Solves Irish/Welsh issue
- Fast and reliable

**Phase 2 (Config):**
- Add settings file
- Allow advanced users to change default language
- No UI yet, just config.json

**Phase 3 (Full Support):**
- Language selector UI
- Auto-detect with override
- Statistics on detection accuracy

**Implementation Plan:**

**Step 1:** Force English (2 hours)
```python
# whisper_transcriber.py - Update cmd
cmd = [
    self.whisper_bin,
    "-m", self.model_path,
    "-f", str(audio_path),
    "-l", "en",  # ✅ English only
    "-otxt",
    "-nt"
]
```

**Step 2:** Add config support (3 hours)
```json
// config.json
{
  "transcription": {
    "language": "en",
    "model": "models/ggml-base.bin",
    "enableAutoDetect": false
  }
}
```

```python
# Load config
import json

class WhisperTranscriber:
    def __init__(self, config_path="config.json"):
        self.config = self.load_config(config_path)
        self.language = self.config['transcription']['language']
        # ...

    def load_config(self, config_path):
        with open(config_path, 'r') as f:
            return json.load(f)
```

**Step 3:** Add re-transcribe feature (4 hours)
```javascript
// history.js - Add "Re-transcribe" button
const retranscribeBtn = document.createElement('button');
retranscribeBtn.innerHTML = '<span>🔄</span><span>Re-transcribe</span>';
retranscribeBtn.onclick = () => showLanguageDialog(recording.audioPath);

function showLanguageDialog(audioPath) {
  // Show modal with language options
  // Re-run transcription with selected language
}
```

**Testing:**
1. Record with Irish accent
2. Verify detects as English (not Welsh)
3. Test with various English accents (UK, US, Australia)
4. Benchmark accuracy improvement

**Success Criteria:**
- ✅ Zero Welsh misdetections on English speech
- ✅ Transcription speed maintained (<500ms/10sec)
- ✅ User can override if needed

---

## Part 3: Effort Estimates

### Time Breakdown by Task

| Category | Task | Priority | Hours | Subagent |
|----------|------|----------|-------|----------|
| **Security** | 1.1 Fix Electron Security | 🔴 Critical | 4-6h | electron-ui-builder |
| **Security** | 1.2 Input Validation | 🔴 High | 3-4h | whisper-backend-architect |
| **Errors** | 2.1 Python Error Handling | 🔴 High | 6-8h | whisper-backend-architect |
| **Errors** | 2.2 JS Error Handling | 🔴 High | 5-7h | electron-ui-builder |
| **Quality** | 3.1 Python Type Hints | 🟡 Medium | 4-5h | whisper-backend-architect |
| **Quality** | 3.2 ESLint + JSDoc | 🟡 Medium | 3-4h | electron-ui-builder |
| **Quality** | 3.3 Design Patterns | 🟡 Medium | 8-10h | Both |
| **Testing** | 4.1 Python Unit Tests | 🟡 Medium | 6-8h | whisper-backend-architect |
| **Testing** | 4.2 JS Unit Tests | 🟡 Medium | 6-8h | electron-ui-builder |
| **Testing** | 4.3 Integration Tests | 🟡 Medium | 4-6h | superwhisper-integration-tester |
| **Language** | 5.1 English-only Mode | 🔴 High | 2h | whisper-backend-architect |
| **Language** | 5.2 Config System | 🟡 Medium | 3h | whisper-backend-architect |
| **Language** | 5.3 Re-transcribe UI | 🟢 Low | 4h | electron-ui-builder |

**Total: 58-75 hours**

### Phased Approach (Recommended)

**Phase A: Critical Security & Stability (18-25 hours)**
- 1.1 Electron Security (4-6h)
- 1.2 Input Validation (3-4h)
- 2.1 Python Error Handling (6-8h)
- 2.2 JS Error Handling (5-7h)

**Deliverable:** Secure, stable v2.1

**Phase B: Language & Quality (15-19 hours)**
- 5.1 English-only Mode (2h)
- 3.1 Python Type Hints (4-5h)
- 3.2 ESLint + JSDoc (3-4h)
- 3.3 Design Patterns (8-10h, start only)

**Deliverable:** Production-ready v2.2

**Phase C: Testing & Polish (20-31 hours)**
- 4.1 Python Unit Tests (6-8h)
- 4.2 JS Unit Tests (6-8h)
- 4.3 Integration Tests (4-6h)
- 3.3 Design Patterns (complete)
- 5.2-5.3 Language features

**Deliverable:** Enterprise-grade v3.0

---

## Part 4: Subagent Recommendations

### Do We Need Specialist Agents?

**YES** - Recommend creating dedicated refactoring agents:

#### 1. **security-hardening-specialist**
**Purpose:** Fix Electron security, implement CSP, audit dependencies
**Skills:** Electron security best practices, OWASP guidelines
**Tasks:** 1.1, 1.2
**Estimated Time:** 7-10 hours

#### 2. **error-resilience-architect**
**Purpose:** Implement comprehensive error handling and recovery
**Skills:** Observer pattern, retry logic, graceful degradation
**Tasks:** 2.1, 2.2
**Estimated Time:** 11-15 hours

#### 3. **test-automation-engineer**
**Purpose:** Build test infrastructure, write unit/integration tests
**Skills:** pytest, jest, mocking, code coverage
**Tasks:** 4.1, 4.2, 4.3
**Estimated Time:** 16-22 hours

#### 4. **code-quality-enforcer**
**Purpose:** Add type hints, docstrings, ESLint, design patterns
**Skills:** PEP 8, JSDoc, Gang of Four patterns
**Tasks:** 3.1, 3.2, 3.3
**Estimated Time:** 15-19 hours

**Existing agents can handle:**
- `whisper-backend-architect`: Language strategy (5.1, 5.2, 5.3)
- `electron-ui-builder`: UI for re-transcribe feature
- `superwhisper-integration-tester`: Final validation

---

## Part 5: Risk Assessment

### High Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Breaking existing features** | High | Medium | Comprehensive tests before refactor, feature flags |
| **Electron security refactor breaks IPC** | High | Medium | Incremental migration, test each step |
| **Test suite takes too long** | Medium | High | Parallel test execution, mock heavy operations |
| **Type hints reveal design flaws** | Medium | Medium | Refactor incrementally, don't over-engineer |

### Medium Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **User workflow disruption** | Medium | Low | Beta testing, gradual rollout |
| **Performance regression** | Medium | Low | Benchmark before/after, profile hot paths |
| **Config file errors** | Low | Medium | Schema validation, sensible defaults |

---

## Part 6: Rollout Plan

### Strategy: Feature Flags + Beta Testing

**Step 1: Create feature/production-hardening branch**
```bash
git checkout main
git pull origin main
git checkout -b feature/production-hardening
```

**Step 2: Implement Phase A (Critical)**
- Enable feature flag: `ENABLE_SECURE_MODE=false` (default off)
- Implement all security + error handling
- Test thoroughly in beta mode

**Step 3: Beta Testing**
- Deploy v2.1-beta to test users
- Monitor for issues
- Collect feedback

**Step 4: Gradual Rollout**
- Merge Phase A to main
- Tag v2.1
- Enable `ENABLE_SECURE_MODE=true` by default

**Step 5: Repeat for Phases B & C**

### Testing Checklist

**Before Merge:**
- [ ] All existing features working
- [ ] No new bugs introduced
- [ ] Tests passing (80%+ coverage)
- [ ] Performance maintained
- [ ] Documentation updated
- [ ] No breaking changes in config

**User Acceptance Testing:**
- [ ] Record → Transcribe workflow
- [ ] History view loads
- [ ] Search works
- [ ] Copy to clipboard works
- [ ] Keyboard shortcuts work
- [ ] No crashes during normal use

---

## Conclusion

### Summary

**What:** Refactor v2.0 MVP to enterprise-grade production system
**Why:** Security vulnerabilities, missing error handling, no tests
**How:** Phased approach over 3 sprints (40-50 hours total)
**When:** Start with Phase A (security), then quality, then testing

### Decision Points

**You must decide:**

1. **Full refactor or phased?**
   - Recommended: Phased (A → B → C)
   - Alternative: All at once (higher risk)

2. **Language strategy?**
   - Recommended: Force English (`-l en`)
   - Alternative: Auto-detect with config override

3. **Testing depth?**
   - Recommended: 80% coverage (16-22 hours)
   - Alternative: Basic tests only (8-10 hours)

4. **Create new agents?**
   - Recommended: Yes (4 specialist agents)
   - Alternative: Use existing 3 agents (slower)

### Next Steps

1. Review this proposal
2. Approve phased approach
3. Create feature/production-hardening branch
4. Launch Phase A sprint
5. Beta test before merge

---

**Status:** Ready for approval
**Prepared by:** Claude Code (Sonnet 4.5)
**Date:** 2025-10-25
**Estimated Delivery:** v3.0 in 2-3 weeks
