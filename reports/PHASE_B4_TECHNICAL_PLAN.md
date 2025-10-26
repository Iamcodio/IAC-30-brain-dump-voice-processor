# Phase B.4 Technical Plan: Production Hardening + TypeScript Migration

**Date:** 2025-10-26
**Status:** 📋 PLANNING
**Timeline:** 12-13 hours (5 agents, 4 execution phases)
**Objective:** Production-grade reliability through structured logging, metrics, config management, error tracking, and TypeScript migration

---

## Executive Summary

Phase B.4 transforms the BrainDump Voice Processor from a feature-complete application into a production-ready system with enterprise-grade observability, maintainability, and type safety.

### Current State (Post-B.3)
✅ Clean modular architecture (6 managers, 1,059 LOC)
✅ 100% unit test coverage on core modules
✅ 14/14 E2E tests passing
✅ Zero known bugs
❌ **Production gaps:**
- console.log scattered across codebase (poor observability)
- No performance metrics or health monitoring
- Configuration hardcoded in constants file
- No centralized error tracking
- JavaScript (runtime type errors possible)
- No production deployment readiness

### Target State (Post-B.4)
✅ Structured JSON logging with rotation (Winston)
✅ Prometheus-compatible metrics collection
✅ Environment-based configuration management
✅ Centralized error tracking (Sentry integration ready)
✅ TypeScript with compile-time type safety
✅ Production deployment documentation
✅ Zero runtime type errors
✅ Full observability stack

### Key Motivation: TypeScript Prevents Production Crashes

**Real-world scenario that TypeScript would have prevented:**

```javascript
// Phase B.2 - Could have caused runtime crash
class RecorderManager {
  constructor(mainWindow, baseDir) {
    this.mainWindow = mainWindow;  // No type checking
    this.baseDir = baseDir;
  }

  notifyUI(event, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);  // Could crash if mainWindow is wrong type
    }
  }
}

// What if someone passes wrong arguments?
const manager = new RecorderManager('oops', 12345);  // ✅ JavaScript: runs until crash
manager.notifyUI('test', {});  // 💥 Runtime error: cannot read 'webContents' of string
```

**With TypeScript:**

```typescript
// Phase B.4 - Compile-time safety
import { BrowserWindow } from 'electron';

class RecorderManager {
  private mainWindow: BrowserWindow;
  private baseDir: string;

  constructor(mainWindow: BrowserWindow, baseDir: string) {
    this.mainWindow = mainWindow;  // Type enforced
    this.baseDir = baseDir;
  }

  notifyUI(event: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);  // Type-safe
    }
  }
}

// Compiler prevents the mistake
const manager = new RecorderManager('oops', 12345);  // ❌ Compile error: Argument type 'string' not assignable to 'BrowserWindow'
```

**TypeScript catches at build time:**
- Wrong argument types
- Null/undefined errors
- Missing properties
- Interface mismatches
- Return type violations

**Phase B.3 Bug Example - Would TypeScript Have Helped?**

Bug #1 (Preload Path): **Partially** - TypeScript would enforce string types but not validate the path logic
Bug #2 (EPIPE Errors): **No** - This is a runtime I/O error, not a type error

**New Bugs TypeScript Will Prevent:**
- Database method called with wrong column names
- IPC handlers expecting wrong data shapes
- Event emitters with misspelled event names
- Configuration objects with missing required fields

---

## Phase B.4 Objectives

### 1. Structured Logging (Winston)
**Why:** Replace 57 `console.log` statements with production-grade logging

**Current Problems:**
```javascript
// Scattered throughout codebase
console.log('Recorder process ready');  // No timestamp, no level, no context
console.error('Failed to transcribe:', err);  // Lost in stdout/stderr mix
```

**Target Solution:**
```javascript
logger.info('Recorder process ready', {
  pid: recorderProcess.pid,
  timestamp: Date.now()
});

logger.error('Transcription failed', {
  error: err.message,
  stack: err.stack,
  audioPath: filePath
});
```

**Benefits:**
- JSON format for log aggregation (ELK, Splunk, CloudWatch)
- Log levels (debug, info, warn, error)
- Automatic log rotation (prevent disk fill)
- Contextual metadata (process IDs, timestamps, user actions)

---

### 2. Metrics Collection (prom-client)
**Why:** Monitor application health and performance

**Metrics to Track:**
- Recording duration (histogram)
- Transcription latency (histogram)
- Error rates (counter)
- Active recordings (gauge)
- Database query times (histogram)
- Memory usage (gauge)

**Usage:**
```javascript
const recordingDuration = new Histogram({
  name: 'braindump_recording_duration_seconds',
  help: 'Duration of voice recordings',
  buckets: [1, 5, 10, 30, 60, 120]
});

// Measure recording
const end = recordingDuration.startTimer();
// ... recording happens ...
end({ status: 'success' });
```

**Output Format:** Prometheus-compatible (`/metrics` endpoint for scraping)

---

### 3. Configuration Management (config package)
**Why:** Separate dev/test/prod configurations

**Current State:**
```javascript
// src/config/paths.js - Hardcoded
module.exports = {
  AUDIO_OUTPUT_DIR: path.join(__dirname, '..', '..', 'outputs', 'audio'),
  // ...
};
```

**Target State:**
```javascript
// config/default.json
{
  "app": {
    "name": "BrainDump Voice Processor"
  },
  "paths": {
    "audioDir": "outputs/audio",
    "transcriptDir": "outputs/transcripts"
  },
  "recording": {
    "sampleRate": 44100,
    "channels": 1
  }
}

// config/production.json (overrides)
{
  "paths": {
    "audioDir": "/var/app/audio",
    "transcriptDir": "/var/app/transcripts"
  },
  "logging": {
    "level": "warn"
  }
}

// Usage
const config = require('config');
const audioDir = config.get('paths.audioDir');  // Type-safe access
```

**Environment Detection:**
```bash
NODE_ENV=production npm start  # Loads production.json
NODE_ENV=test npm test         # Loads test.json
```

---

### 4. Error Tracking (Sentry Integration Ready)
**Why:** Centralized error reporting with stack traces

**Current State:**
```javascript
try {
  await transcribe(audioPath);
} catch (err) {
  console.error('Transcription failed:', err);  // Lost forever
}
```

**Target State:**
```javascript
const Sentry = require('@sentry/electron');

// Initialization
Sentry.init({
  dsn: config.get('sentry.dsn'),
  environment: process.env.NODE_ENV,
  enabled: config.get('sentry.enabled')  // false for local dev
});

// Usage
try {
  await transcribe(audioPath);
} catch (err) {
  logger.error('Transcription failed', { error: err });
  Sentry.captureException(err, {
    tags: { component: 'transcription' },
    extra: { audioPath, fileSize: fs.statSync(audioPath).size }
  });
}
```

**Features:**
- Automatic breadcrumb tracking (user actions before crash)
- Release tracking (know which version crashed)
- Environment tagging (dev vs prod)
- Optional (disabled by default for privacy)

---

### 5. TypeScript Migration
**Why:** Prevent runtime type errors with compile-time checks

**Migration Scope:**
- **Phase 1:** Convert 6 core managers to TypeScript
- **Phase 2:** Convert IPC handlers and services
- **Phase 3:** Add type definitions for Python IPC protocol
- **Phase 4:** Enable strict mode

**File-by-File Strategy:**
1. `src/js/managers/window_manager.js` → `.ts` (simple, no external deps)
2. `src/js/managers/shortcut_manager.js` → `.ts` (uses Electron APIs)
3. `src/js/services/transcription_service.js` → `.ts` (subprocess handling)
4. `src/js/managers/recorder_manager.js` → `.ts` (event emitter)
5. `src/js/ipc/handlers.js` → `.ts` (IPC protocols)
6. `main.js` → `main.ts` (orchestrator)

**TypeScript Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "main.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Build Integration:**
```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "start": "npm run build && electron dist/main.js",
    "dev": "npm run build:watch & electron dist/main.js"
  }
}
```

**Type Definitions Needed:**
```typescript
// types/ipc.d.ts
export interface RecordingStartedEvent {
  timestamp: number;
}

export interface RecordingStoppedEvent {
  timestamp: number;
  audioPath: string;
  duration: number;
}

export interface TranscriptionCompleteEvent {
  audioPath: string;
  transcriptPath: string;
  text: string;
  duration: number;
}

// types/python-protocol.d.ts
export type RecorderCommand = 'start' | 'stop' | 'quit';
export type RecorderResponse =
  | { type: 'READY' }
  | { type: 'RECORDING_STARTED'; timestamp: number }
  | { type: 'RECORDING_STOPPED'; filename: string }
  | { type: 'ERROR'; message: string };
```

**Expected Compilation Time:** ~500ms on M2 chip (TypeScript compiler)

---

## Agent Missions

### Agent 1: Logging Infrastructure Specialist
**Duration:** 2-3 hours
**Files to Create:**
- `src/utils/logger.ts` (Winston configuration)
- `config/logging.json` (log levels, transports)
- `logs/.gitkeep` (log directory)

**Files to Modify:**
- `src/js/managers/recorder_manager.js` (replace 5 console.log)
- `src/js/managers/window_manager.js` (replace 3 console.log)
- `src/js/services/transcription_service.js` (replace 4 console.log)
- `src/js/ipc/handlers.js` (replace 8 console.log)
- `main.js` (replace 6 console.log, add startup logging)

**NPM Packages:**
- `winston@^3.11.0`
- `winston-daily-rotate-file@^4.7.1`

**Configuration:**
```javascript
// src/utils/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'braindump' },
  transports: [
    // Console (human-readable for dev)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Daily rotating file (JSON for production)
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, '..', '..', 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.json()
    }),
    // Error log (separate file)
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
      level: 'error'
    })
  ]
});

module.exports = logger;
```

**Test Coverage:**
- Unit tests for logger initialization
- Test log rotation behavior
- Verify JSON output format
- Test different log levels

**Success Criteria:**
- Zero `console.log` in production code (except EPIPE try-catch)
- Logs rotate daily (14-day retention)
- JSON format parseable by log aggregators
- Error logs separate from info logs

---

### Agent 2: Metrics Collection Specialist
**Duration:** 2-3 hours
**Files to Create:**
- `src/utils/metrics.ts` (Prometheus metrics registry)
- `src/metrics/app_metrics.ts` (application-specific metrics)
- `tests/utils/metrics.test.js` (unit tests)

**Files to Modify:**
- `src/js/managers/recorder_manager.js` (track recording duration)
- `src/js/services/transcription_service.js` (track transcription latency)
- `src/js/ipc/handlers.js` (track IPC call counts)
- `src/database/database.js` (track query times)

**NPM Packages:**
- `prom-client@^15.1.0`

**Metrics Definition:**
```javascript
// src/utils/metrics.js
const client = require('prom-client');

// Create registry
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const recordingDuration = new client.Histogram({
  name: 'braindump_recording_duration_seconds',
  help: 'Duration of voice recordings in seconds',
  labelNames: ['status'],
  buckets: [1, 5, 10, 30, 60, 120, 300]
});

const transcriptionLatency = new client.Histogram({
  name: 'braindump_transcription_latency_seconds',
  help: 'Time to transcribe audio',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const errorCounter = new client.Counter({
  name: 'braindump_errors_total',
  help: 'Total errors by component',
  labelNames: ['component', 'error_type']
});

const activeRecordings = new client.Gauge({
  name: 'braindump_active_recordings',
  help: 'Number of active recordings'
});

register.registerMetric(recordingDuration);
register.registerMetric(transcriptionLatency);
register.registerMetric(errorCounter);
register.registerMetric(activeRecordings);

module.exports = {
  register,
  recordingDuration,
  transcriptionLatency,
  errorCounter,
  activeRecordings
};
```

**Usage Example:**
```javascript
// In RecorderManager
const { recordingDuration, activeRecordings } = require('../utils/metrics');

class RecorderManager {
  startRecording() {
    activeRecordings.inc();
    this.recordingStartTime = Date.now();
    // ... existing code
  }

  handleStdout(data) {
    if (output.startsWith('RECORDING_STOPPED:')) {
      const duration = (Date.now() - this.recordingStartTime) / 1000;
      recordingDuration.observe({ status: 'success' }, duration);
      activeRecordings.dec();
    }
  }
}
```

**Metrics Endpoint (for future Prometheus scraping):**
```javascript
// main.js or separate metrics server
const { register } = require('./src/utils/metrics');

app.on('ready', async () => {
  // Expose /metrics endpoint (HTTP server on localhost:9090)
  const http = require('http');
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
  server.listen(9090, 'localhost');
});
```

**Test Coverage:**
- Verify metrics registration
- Test histogram buckets
- Test counter increments
- Test gauge up/down

**Success Criteria:**
- All critical paths instrumented (record, transcribe, DB queries)
- Metrics endpoint returns valid Prometheus format
- Zero performance overhead (<5ms per metric)

---

### Agent 3: Configuration Management Specialist
**Duration:** 1.5-2 hours
**Files to Create:**
- `config/default.json` (base configuration)
- `config/development.json` (dev overrides)
- `config/production.json` (prod overrides)
- `config/test.json` (test overrides)
- `config/custom-environment-variables.json` (env var mappings)

**Files to Modify:**
- `src/config/paths.js` → Use config package
- `src/config/constants.js` → Migrate to JSON configs
- All managers (replace hardcoded values with `config.get()`)

**Files to Delete:**
- `src/config/paths.js` (replaced by config package)
- `src/config/constants.js` (replaced by config package)

**NPM Packages:**
- `config@^3.3.11`

**Configuration Structure:**
```json
// config/default.json
{
  "app": {
    "name": "BrainDump Voice Processor",
    "version": "2.1.0"
  },
  "paths": {
    "audioDir": "outputs/audio",
    "transcriptDir": "outputs/transcripts",
    "databaseDir": "db",
    "modelsDir": "models"
  },
  "recording": {
    "sampleRate": 44100,
    "channels": 1,
    "format": "WAV",
    "bitDepth": 16
  },
  "transcription": {
    "model": "ggml-base.bin",
    "language": "en",
    "threads": 4
  },
  "shortcuts": {
    "toggleRecording": "Control+Y"
  },
  "logging": {
    "level": "info",
    "format": "json",
    "retention": "14d"
  },
  "metrics": {
    "enabled": true,
    "port": 9090
  },
  "sentry": {
    "enabled": false,
    "dsn": ""
  }
}
```

```json
// config/production.json
{
  "paths": {
    "audioDir": "/var/app/braindump/audio",
    "transcriptDir": "/var/app/braindump/transcripts",
    "databaseDir": "/var/app/braindump/db"
  },
  "logging": {
    "level": "warn"
  },
  "sentry": {
    "enabled": true,
    "dsn": "https://your-sentry-dsn@sentry.io/project"
  }
}
```

```json
// config/custom-environment-variables.json
{
  "logging": {
    "level": "LOG_LEVEL"
  },
  "sentry": {
    "dsn": "SENTRY_DSN",
    "enabled": "SENTRY_ENABLED"
  }
}
```

**Migration Example:**
```javascript
// Before (src/config/paths.js)
module.exports = {
  AUDIO_OUTPUT_DIR: path.join(__dirname, '..', '..', 'outputs', 'audio'),
  TRANSCRIPT_OUTPUT_DIR: path.join(__dirname, '..', '..', 'outputs', 'transcripts')
};

// After (using config)
const config = require('config');
const path = require('path');

const baseDir = __dirname;  // or passed as constructor arg
const audioDir = path.join(baseDir, config.get('paths.audioDir'));
const transcriptDir = path.join(baseDir, config.get('paths.transcriptDir'));
```

**Test Coverage:**
- Test config loading in different environments
- Test env var override behavior
- Test default value fallbacks
- Test invalid config detection

**Success Criteria:**
- Zero hardcoded paths/values in production code
- Environment-specific configs working
- Config validation on startup (fail fast)

---

### Agent 4: Error Tracking Integration Specialist
**Duration:** 1-2 hours
**Files to Create:**
- `src/utils/error_handler.ts` (Sentry wrapper)
- `src/utils/error_boundary.ts` (React-style error boundaries)
- `tests/utils/error_handler.test.js`

**Files to Modify:**
- `main.js` (initialize Sentry, uncaught exception handler)
- All managers (wrap critical code in error boundaries)
- `src/js/services/transcription_service.js` (capture transcription errors)

**NPM Packages:**
- `@sentry/electron@^4.19.0`

**Sentry Configuration:**
```javascript
// src/utils/error_handler.js
const Sentry = require('@sentry/electron');
const config = require('config');
const logger = require('./logger');

function initializeErrorTracking() {
  if (!config.get('sentry.enabled')) {
    logger.info('Sentry disabled (local development)');
    return;
  }

  Sentry.init({
    dsn: config.get('sentry.dsn'),
    environment: process.env.NODE_ENV || 'development',
    release: `braindump@${config.get('app.version')}`,
    beforeSend(event) {
      // Sanitize sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
    integrations: [
      new Sentry.Integrations.Electron({
        ipcMode: Sentry.IPCMode.Both
      })
    ]
  });

  logger.info('Sentry initialized', {
    environment: process.env.NODE_ENV
  });
}

function captureError(error, context = {}) {
  logger.error('Error captured', { error, context });

  if (config.get('sentry.enabled')) {
    Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {}
    });
  }
}

module.exports = {
  initializeErrorTracking,
  captureError,
  Sentry
};
```

**Usage in Managers:**
```javascript
// src/js/services/transcription_service.js
const { captureError } = require('../utils/error_handler');

class TranscriptionService {
  async transcribe(audioPath) {
    try {
      // ... transcription logic
    } catch (error) {
      captureError(error, {
        tags: { component: 'transcription' },
        extra: {
          audioPath,
          fileSize: fs.statSync(audioPath).size,
          model: this.model
        }
      });
      throw error;  // Re-throw after capturing
    }
  }
}
```

**Global Error Handlers:**
```javascript
// main.js
const { initializeErrorTracking, captureError } = require('./src/utils/error_handler');

app.on('ready', () => {
  initializeErrorTracking();

  // Catch uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    captureError(error, { tags: { type: 'uncaughtException' } });
    app.quit();
  });

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason });
    captureError(reason, { tags: { type: 'unhandledRejection' } });
  });
});
```

**Test Coverage:**
- Test Sentry initialization (mocked)
- Test error capture with context
- Test sanitization of sensitive data
- Test disabled mode (local dev)

**Success Criteria:**
- All critical error paths captured
- Sensitive data sanitized (file paths ok, but no user data)
- Sentry disabled by default (opt-in for production)
- Zero errors lost in production

---

### Agent 5: TypeScript Migration Specialist
**Duration:** 6-7 hours (largest component of B.4)
**Files to Create:**
- `tsconfig.json` (TypeScript configuration)
- `types/ipc.d.ts` (IPC protocol types)
- `types/python-protocol.d.ts` (Python subprocess types)
- `types/database.d.ts` (Database schema types)
- `jest.config.ts` (TypeScript-aware Jest config)

**Files to Migrate (6 core files + main):**
1. `src/js/managers/window_manager.js` → `.ts`
2. `src/js/managers/shortcut_manager.js` → `.ts`
3. `src/js/managers/recorder_manager.js` → `.ts`
4. `src/js/services/transcription_service.js` → `.ts`
5. `src/js/ipc/handlers.js` → `.ts`
6. `src/database/database.js` → `.ts`
7. `main.js` → `main.ts`

**NPM Packages:**
- `typescript@^5.3.3`
- `@types/node@^20.10.6`
- `@types/better-sqlite3@^7.6.8`
- `ts-node@^10.9.2` (for testing)
- `ts-jest@^29.1.1` (Jest TypeScript support)

**Migration Strategy - 4 Phases:**

#### Phase 1: Setup TypeScript Infrastructure (1 hour)
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": [
    "src/**/*",
    "main.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests",
    "**/*.test.ts"
  ]
}
```

```json
// jest.config.ts
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'main.ts',
    '!src/**/*.d.ts',
  ],
};
```

#### Phase 2: Create Type Definitions (1.5 hours)
```typescript
// types/ipc.d.ts
export interface RecordingStartedEvent {
  timestamp: number;
}

export interface RecordingStoppedEvent {
  timestamp: number;
  audioPath: string;
  duration: number;
}

export interface TranscriptionStartedEvent {
  audioPath: string;
}

export interface TranscriptionCompleteEvent {
  audioPath: string;
  transcriptPath: string;
  text: string;
  duration: number;
  wordCount: number;
}

export interface TranscriptionErrorEvent {
  audioPath: string;
  error: string;
}

export type IPCChannel =
  | 'recording-started'
  | 'recording-stopped'
  | 'transcription-started'
  | 'transcription-complete'
  | 'transcription-error'
  | 'get-recordings'
  | 'search-recordings'
  | 'read-file'
  | 'play-audio'
  | 'view-file'
  | 'show-history'
  | 'show-recorder';
```

```typescript
// types/python-protocol.d.ts
export type RecorderCommand = 'start' | 'stop' | 'quit';

export type RecorderResponse =
  | ReadyResponse
  | RecordingStartedResponse
  | RecordingStoppedResponse
  | ErrorResponse;

export interface ReadyResponse {
  type: 'READY';
}

export interface RecordingStartedResponse {
  type: 'RECORDING_STARTED';
  timestamp: number;
}

export interface RecordingStoppedResponse {
  type: 'RECORDING_STOPPED';
  filename: string;
  duration?: number;
}

export interface ErrorResponse {
  type: 'ERROR';
  message: string;
}

export function parseRecorderResponse(line: string): RecorderResponse | null;
```

```typescript
// types/database.d.ts
export interface Recording {
  id: number;
  audio_path: string;
  transcript_path: string;
  transcript_text: string;
  created_at: string;
  duration?: number;
  word_count?: number;
}

export interface DatabaseSchema {
  recordings: Recording;
}

export interface SearchOptions {
  query?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'duration' | 'word_count';
  order?: 'ASC' | 'DESC';
}
```

#### Phase 3: Migrate Core Files (3 hours)
**Example: WindowManager Migration**

```typescript
// src/js/managers/window_manager.ts
import { BrowserWindow } from 'electron';
import * as path from 'path';

interface WindowConfig {
  width: number;
  height: number;
  title: string;
}

class WindowManager {
  private window: BrowserWindow | null = null;
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  public create(config: WindowConfig = { width: 800, height: 600, title: 'BrainDump Voice Processor' }): BrowserWindow {
    this.window = new BrowserWindow({
      width: config.width,
      height: config.height,
      title: config.title,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(this.baseDir, 'src', 'preload.js')
      }
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    return this.window;
  }

  public loadRecorderView(): void {
    if (!this.isValid()) {
      throw new Error('Cannot load view: window is destroyed or null');
    }
    this.window!.loadFile(path.join(this.baseDir, 'src', 'views', 'index.html'));
  }

  public loadHistoryView(): void {
    if (!this.isValid()) {
      throw new Error('Cannot load view: window is destroyed or null');
    }
    this.window!.loadFile(path.join(this.baseDir, 'src', 'views', 'history.html'));
  }

  public getWindow(): BrowserWindow | null {
    return this.window;
  }

  public isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  public destroy(): void {
    if (this.isValid()) {
      this.window!.destroy();
      this.window = null;
    }
  }
}

export default WindowManager;
```

**Example: RecorderManager Migration (Complex Event Emitter)**

```typescript
// src/js/managers/recorder_manager.ts
import { BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import { RecorderResponse, parseRecorderResponse } from '../../types/python-protocol';
import logger from '../utils/logger';

interface RecorderManagerEvents {
  'recordingComplete': (audioPath: string) => void;
}

declare interface RecorderManager {
  on<U extends keyof RecorderManagerEvents>(
    event: U, listener: RecorderManagerEvents[U]
  ): this;

  emit<U extends keyof RecorderManagerEvents>(
    event: U, ...args: Parameters<RecorderManagerEvents[U]>
  ): boolean;
}

class RecorderManager extends EventEmitter {
  private mainWindow: BrowserWindow;
  private baseDir: string;
  private recorderProcess: ChildProcess | null = null;
  private isRecording: boolean = false;

  constructor(mainWindow: BrowserWindow, baseDir: string) {
    super();
    this.mainWindow = mainWindow;
    this.baseDir = baseDir;
  }

  public start(): void {
    const pythonPath = path.join(this.baseDir, '.venv', 'bin', 'python');
    const recorderScript = path.join(this.baseDir, 'recorder.py');

    this.recorderProcess = spawn(pythonPath, [recorderScript], {
      cwd: this.baseDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    this.recorderProcess.stdout?.on('data', (data) => this.handleStdout(data));
    this.recorderProcess.stderr?.on('data', (data) => this.handleStderr(data));

    logger.info('Recorder process started', { pid: this.recorderProcess.pid });
  }

  private handleStdout(data: Buffer): void {
    const output = data.toString().trim();

    try {
      logger.debug('Recorder stdout', { output });
    } catch (e) {
      // Ignore EPIPE errors during shutdown
    }

    const response = parseRecorderResponse(output);

    if (response?.type === 'READY') {
      logger.info('Recorder ready');
      this.notifyUI('recorder-ready');
    } else if (response?.type === 'RECORDING_STARTED') {
      this.isRecording = true;
      this.notifyUI('recording-started', { timestamp: response.timestamp });
    } else if (response?.type === 'RECORDING_STOPPED') {
      this.isRecording = false;
      const audioPath = path.join(this.baseDir, 'outputs', 'audio', response.filename);
      this.notifyUI('recording-stopped', { audioPath });
      this.emit('recordingComplete', audioPath);
    }
  }

  private handleStderr(data: Buffer): void {
    const error = data.toString().trim();
    logger.error('Recorder error', { error });
  }

  public startRecording(): void {
    if (!this.recorderProcess || this.isRecording) {
      return;
    }
    this.recorderProcess.stdin?.write('start\n');
    logger.info('Recording start command sent');
  }

  public stopRecording(): void {
    if (!this.recorderProcess || !this.isRecording) {
      return;
    }
    this.recorderProcess.stdin?.write('stop\n');
    logger.info('Recording stop command sent');
  }

  private notifyUI(event: string, data: unknown = {}): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  public stop(): void {
    if (this.recorderProcess) {
      this.recorderProcess.stdin?.write('quit\n');
      this.recorderProcess.kill();
      logger.info('Recorder process stopped');
    }
  }
}

export default RecorderManager;
```

**Helper Function for Protocol Parsing:**

```typescript
// types/python-protocol.ts
import { RecorderResponse } from './python-protocol.d';

export function parseRecorderResponse(line: string): RecorderResponse | null {
  if (line === 'READY') {
    return { type: 'READY' };
  }

  if (line.startsWith('RECORDING_STARTED')) {
    return {
      type: 'RECORDING_STARTED',
      timestamp: Date.now()
    };
  }

  if (line.startsWith('RECORDING_STOPPED:')) {
    const filename = line.substring('RECORDING_STOPPED:'.length);
    return {
      type: 'RECORDING_STOPPED',
      filename: filename.trim()
    };
  }

  if (line.startsWith('ERROR:')) {
    const message = line.substring('ERROR:'.length);
    return {
      type: 'ERROR',
      message: message.trim()
    };
  }

  return null;
}
```

#### Phase 4: Update Build Scripts (0.5 hours)
```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "prebuild": "rm -rf dist",
    "start": "npm run build && electron dist/main.js",
    "dev": "tsc --watch & electron dist/main.js",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:e2e": "npm run build && playwright test",
    "test:e2e:debug": "npm run build && playwright test --debug",
    "typecheck": "tsc --noEmit"
  }
}
```

**Test Coverage:**
- Migrate all existing tests to TypeScript
- Add type-specific tests (verify interface contracts)
- Test compilation errors (negative tests)
- Verify source maps work for debugging

**Success Criteria:**
- `npm run build` compiles without errors
- All 119 unit tests pass (TypeScript versions)
- 14 E2E tests pass (using compiled dist/)
- Zero `any` types in strict mode
- 100% type coverage on public APIs

---

## Execution Strategy

### Timeline: 12-13 Hours

**Phase 1: Infrastructure (3-4 hours)**
- Agent 1 (Logging) - 2-3h
- Agent 3 (Config) - 1.5-2h
- Run in parallel

**Phase 2: Observability (3-4 hours)**
- Agent 2 (Metrics) - 2-3h
- Agent 4 (Error Tracking) - 1-2h
- Run in parallel

**Phase 3: TypeScript Migration (6-7 hours)**
- Agent 5 (TypeScript) - Sequential (cannot parallelize)
  - Phase 1: Setup (1h)
  - Phase 2: Type definitions (1.5h)
  - Phase 3: Migrate files (3h)
  - Phase 4: Build scripts (0.5h)

**Phase 4: Integration Testing (1 hour)**
- Run full test suite
- Fix any integration issues
- Create completion report

### Agent Deployment Order

**Wave 1 (Parallel):** Agents 1, 3
- Logging + Config are independent
- No shared file modifications
- Total: 3-4 hours

**Wave 2 (Parallel):** Agents 2, 4
- Metrics + Error Tracking can use new logger/config
- Independent file modifications
- Total: 3-4 hours

**Wave 3 (Sequential):** Agent 5
- TypeScript migration touches all files
- Must run after other agents complete
- Total: 6-7 hours

**Wave 4 (Manual):** Integration testing
- Total: 1 hour

---

## Technical Specifications

### NPM Packages to Install

| Package | Version | Purpose |
|---------|---------|---------|
| `winston` | ^3.11.0 | Structured logging |
| `winston-daily-rotate-file` | ^4.7.1 | Log rotation |
| `prom-client` | ^15.1.0 | Prometheus metrics |
| `config` | ^3.3.11 | Configuration management |
| `@sentry/electron` | ^4.19.0 | Error tracking |
| `typescript` | ^5.3.3 | TypeScript compiler |
| `@types/node` | ^20.10.6 | Node.js type definitions |
| `@types/better-sqlite3` | ^7.6.8 | SQLite type definitions |
| `ts-node` | ^10.9.2 | TypeScript execution |
| `ts-jest` | ^29.1.1 | Jest TypeScript support |

**Total:** 10 new dependencies

### Files to Create (14)

**Production Code (7):**
1. `src/utils/logger.ts`
2. `src/utils/metrics.ts`
3. `src/metrics/app_metrics.ts`
4. `src/utils/error_handler.ts`
5. `config/default.json`
6. `config/production.json`
7. `config/test.json`

**Type Definitions (3):**
8. `types/ipc.d.ts`
9. `types/python-protocol.d.ts`
10. `types/database.d.ts`

**Configuration (4):**
11. `tsconfig.json`
12. `jest.config.ts`
13. `config/development.json`
14. `config/custom-environment-variables.json`

### Files to Modify (20+)

**Managers (6):**
1. `src/js/managers/window_manager.js` → `.ts`
2. `src/js/managers/shortcut_manager.js` → `.ts`
3. `src/js/managers/recorder_manager.js` → `.ts`
4. `src/js/services/transcription_service.js` → `.ts`
5. `src/js/ipc/handlers.js` → `.ts`
6. `main.js` → `main.ts`

**Database:**
7. `src/database/database.js` → `.ts`

**Tests (119 test files):**
8. All `tests/**/*.test.js` → `.test.ts`

**Config:**
9. `package.json` (scripts, dependencies)
10. `.gitignore` (add `dist/`, `logs/`)

**Deleted (2):**
11. `src/config/paths.js` (replaced by config package)
12. `src/config/constants.js` (replaced by config package)

---

## Benefits Analysis

### 1. TypeScript Prevents Runtime Crashes

**Before (JavaScript):**
```javascript
// RecorderManager constructor
constructor(mainWindow, baseDir) {
  this.mainWindow = mainWindow;  // Could be anything
  this.baseDir = baseDir;
}

// Later...
this.mainWindow.webContents.send('event', data);  // 💥 Crashes if mainWindow is wrong type
```

**After (TypeScript):**
```typescript
constructor(mainWindow: BrowserWindow, baseDir: string) {
  this.mainWindow = mainWindow;  // Type enforced at compile time
  this.baseDir = baseDir;
}
```

**Prevented Errors:**
- Wrong argument types
- Null/undefined property access
- Missing required properties
- Interface contract violations
- Incorrect return types

### 2. Structured Logging Enables Production Debugging

**Before:**
```
Recording started
Error: transcription failed
```

**After:**
```json
{
  "timestamp": "2025-10-26T14:23:45.123Z",
  "level": "info",
  "message": "Recording started",
  "service": "braindump",
  "pid": 12345,
  "recordingId": "rec_20251026_142345"
}

{
  "timestamp": "2025-10-26T14:24:12.456Z",
  "level": "error",
  "message": "Transcription failed",
  "error": {
    "message": "Model file not found",
    "stack": "Error: ENOENT...",
    "code": "ENOENT"
  },
  "context": {
    "audioPath": "/path/to/recording.wav",
    "model": "ggml-base.bin",
    "fileSize": 2048576
  }
}
```

**Benefits:**
- Searchable with tools like `jq`, ELK, Splunk
- Automatic log rotation (prevent disk fill)
- Error correlation across components
- Production troubleshooting without user reports

### 3. Metrics Enable Proactive Monitoring

**Metrics Dashboard (Grafana example):**
```
Recording Duration (p95): 45s
Transcription Latency (avg): 1.2s
Error Rate: 0.3% (2/650 recordings)
Active Recordings: 0
Database Query Time (p99): 15ms
```

**Alerts:**
- Transcription latency > 5s → investigate model performance
- Error rate > 5% → system degradation
- Disk usage > 80% → log rotation not working

### 4. Configuration Management Simplifies Deployment

**Development:**
```bash
npm start  # Uses config/development.json
```

**Production:**
```bash
NODE_ENV=production npm start  # Uses config/production.json
```

**Environment Variables:**
```bash
export LOG_LEVEL=debug
export SENTRY_ENABLED=true
npm start  # Overrides config values
```

---

## Risk Assessment

### Risk #1: TypeScript Migration Breaks Tests
**Likelihood:** Medium
**Impact:** High
**Mitigation:**
- Migrate one file at a time
- Keep JavaScript versions until TypeScript passes tests
- Run full test suite after each file migration
- Use `tsc --noEmit` for type checking without compilation

### Risk #2: Performance Overhead from Logging/Metrics
**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Use asynchronous logging (Winston default)
- Metrics are in-memory (no I/O)
- Benchmark before/after with same workflow
- Add performance tests to E2E suite

### Risk #3: Configuration Complexity
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Comprehensive default.json covers all cases
- Fail-fast validation on startup
- Environment-specific overrides are minimal
- Document configuration in README

### Risk #4: Sentry Integration Bugs
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Sentry disabled by default (opt-in)
- All errors still logged to Winston
- Test with Sentry mock in unit tests
- Manual testing with real Sentry project

---

## Success Criteria

### Functional Requirements
✅ All 119 unit tests pass (TypeScript versions)
✅ All 14 E2E tests pass (using compiled `dist/`)
✅ `npm run build` compiles without TypeScript errors
✅ Application launches and records successfully
✅ Transcription workflow unchanged (user perspective)

### Code Quality
✅ Zero `console.log` in production code (replaced with logger)
✅ Zero hardcoded paths/values (moved to config)
✅ Zero `any` types in TypeScript (strict mode)
✅ 100% type coverage on public APIs
✅ All errors captured by Sentry wrapper

### Observability
✅ Logs output JSON format (parseable)
✅ Logs rotate daily (14-day retention)
✅ Metrics endpoint returns Prometheus format
✅ 5+ critical metrics instrumented (recording, transcription, errors)

### Documentation
✅ README updated with new scripts (`npm run build`, `npm run typecheck`)
✅ Configuration documentation (how to set env vars)
✅ Production deployment guide
✅ Sentry setup instructions (optional)

---

## Deliverables

### Production Code (7 files)
1. `src/utils/logger.ts` - Winston configuration
2. `src/utils/metrics.ts` - Prometheus metrics registry
3. `src/metrics/app_metrics.ts` - Application-specific metrics
4. `src/utils/error_handler.ts` - Sentry wrapper
5. `config/default.json` - Base configuration
6. `config/production.json` - Production overrides
7. `config/test.json` - Test overrides

### TypeScript Conversion (7 files)
8. `src/js/managers/window_manager.ts`
9. `src/js/managers/shortcut_manager.ts`
10. `src/js/managers/recorder_manager.ts`
11. `src/js/services/transcription_service.ts`
12. `src/js/ipc/handlers.ts`
13. `src/database/database.ts`
14. `main.ts`

### Type Definitions (3 files)
15. `types/ipc.d.ts`
16. `types/python-protocol.d.ts`
17. `types/database.d.ts`

### Configuration (4 files)
18. `tsconfig.json`
19. `jest.config.ts`
20. `config/development.json`
21. `config/custom-environment-variables.json`

### Tests (119 files)
22. All `tests/**/*.test.js` → `.test.ts` (migrated)

### Documentation (3 files)
23. `README.md` (updated with TypeScript build instructions)
24. `docs/CONFIGURATION.md` (new - configuration guide)
25. `docs/PRODUCTION_DEPLOYMENT.md` (new - deployment guide)

### Reports (1 file)
26. `reports/PHASE_B4_COMPLETION_REPORT.md`

---

## Post-B.4 State

### Production Readiness Score

| Category | Pre-B.4 | Post-B.4 | Improvement |
|----------|---------|----------|-------------|
| **Type Safety** | 0% | 100% | +100% |
| **Observability** | 20% | 95% | +75% |
| **Error Tracking** | 40% | 100% | +60% |
| **Configuration** | 50% | 100% | +50% |
| **Maintainability** | 85% | 95% | +10% |
| **Deployability** | 60% | 95% | +35% |

### Remaining Gaps (Phase B.5 - DevEx)
- Developer documentation (architecture guide)
- Pre-commit hooks (lint, format, type check)
- Release automation (version bumping, changelog)
- Contributor guidelines

---

## Approval Checklist

Before starting Phase B.4 execution:

- [ ] Review agent missions (5 agents)
- [ ] Confirm timeline (12-13 hours acceptable)
- [ ] Approve NPM package additions (10 packages)
- [ ] Approve file structure changes (7 new, 20 modified, 2 deleted)
- [ ] Confirm TypeScript migration approach (6 core files + main)
- [ ] Approve observability stack (Winston + Prometheus + Sentry)
- [ ] Confirm success criteria (tests passing, compilation successful)

---

**Status:** 📋 AWAITING APPROVAL

**Next Step:** User approves plan → Deploy 5 specialist agents in 3 waves

---
