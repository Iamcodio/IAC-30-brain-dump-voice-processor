# IPC Routes Fix Plan - Critical Issue Resolution

**Date:** 2025-10-26
**Priority:** CRITICAL
**Estimated Time:** 2-3 hours

---

## Root Cause Analysis

### The Core Problem

**Issue:** `main.ts` uses `webContents.on('ipc-message')` to listen for IPC events
**Why it's broken:** This is the WRONG direction!

```typescript
// WHAT'S HAPPENING NOW (WRONG):
// RecorderManager sends TO renderer:
this.mainWindow.webContents.send('recording-started');

// Main.ts tries to listen FROM renderer:
mainWindow.webContents.on('ipc-message', (_event, channel) => {
  if (channel === 'recording-started') { ... }
});
```

**The problem:** `webContents.send()` sends TO the renderer process. The main process cannot intercept these messages by listening on `webContents.on('ipc-message')`.

**What `webContents.on('ipc-message')` actually does:**
- Listens for messages FROM renderer TO main (opposite direction)
- Used for monitoring IPC traffic for debugging
- DEPRECATED in Electron 13+

---

## The Fix: Event-Driven Architecture

### Solution Architecture

Instead of using IPC for internal communication, use Node.js EventEmitter:

```
┌─────────────────┐
│ RecorderManager │
│  (EventEmitter) │
└────────┬────────┘
         │ emit('recordingStarted')
         │
    ┌────▼────────────────┐
    │   Main.ts           │
    │  (Event Listeners)  │
    └────┬──────────┬─────┘
         │          │
         │          └──────────────┐
         │                         │
    ┌────▼──────────┐    ┌────────▼──────────┐
    │  TrayManager  │    │ OverlayManager    │
    └───────────────┘    └───────────────────┘
```

**IPC is ONLY for:**
- Renderer → Main communication (user clicks button)
- Main → Renderer updates (show result in UI)

**Internal events use EventEmitter:**
- RecorderManager state changes
- TranscriptionService completion
- Cross-manager coordination

---

## Implementation Plan

### Step 1: Make RecorderManager an EventEmitter

**File:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/src/js/managers/recorder_manager.ts`

**Changes:**
```typescript
import { EventEmitter } from 'events';

class RecorderManager extends EventEmitter {
  // ... existing code ...

  private handleStdout(data: Buffer): void {
    const output = data.toString().trim();

    if (output === 'RECORDING_STARTED') {
      // Emit internal event for main.ts to listen
      this.emit('recordingStarted');

      // Also notify renderer for UI updates
      this.notifyUI('recording-started');
    }
    else if (output.startsWith('RECORDING_STOPPED:')) {
      const filename = output.split(':')[1];

      // Emit internal event
      this.emit('recordingStopped', filename);

      // Notify renderer
      this.notifyUI('recording-stopped');
    }
  }
}
```

**Note:** RecorderManager already has a custom event emitter (lines 330-345), so we just need to expand it.

### Step 2: Make TranscriptionService an EventEmitter

**File:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/src/js/services/transcription_service.ts`

**Changes:**
```typescript
import { EventEmitter } from 'events';

class TranscriptionService extends EventEmitter {
  // ... existing code ...

  public async transcribe(audioPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      transcriber.on('close', (code: number | null) => {
        if (code === EXIT_CODES.SUCCESS) {
          // Read the transcript file to get the text
          const transcriptText = this.readTranscriptFile(transcriptPath);

          // Emit internal event with full data
          this.emit('transcriptionComplete', {
            audioPath,
            transcriptPath,
            text: transcriptText
          });

          // Notify renderer (for backward compatibility)
          this.notifyUI('transcription-complete');

          resolve(transcriptPath!);
        }
      });
    });
  }

  private readTranscriptFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      logger.error('Failed to read transcript', { error });
      return '';
    }
  }
}
```

### Step 3: Refactor main.ts Event Wiring

**File:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/main.ts`

**Replace lines 202-262 with:**
```typescript
private wireRecorderEvents(): void {
  if (!this.recorderManager || !this.trayManager || !this.overlayManager) {
    errorHandler.notify(
      ErrorLevel.WARNING,
      'Application.wireRecorderEvents',
      ERROR_TYPES.VALIDATION_ERROR,
      'Cannot wire events: managers not initialized'
    );
    return;
  }

  // Recording started: idle → recording
  this.recorderManager.on('recordingStarted', () => {
    logger.debug('Recording started - updating tray and showing overlay');
    this.trayManager!.setState('recording');
    this.trayManager!.startRecordingAnimation();

    // Show overlay window in recording state
    this.overlayManager!.createOverlay();
    this.overlayManager!.showOverlay();
    this.overlayManager!.setState('recording');
  });

  // Recording stopped: recording → processing
  this.recorderManager.on('recordingStopped', (filename: string) => {
    logger.debug('Recording stopped - updating tray and overlay', { filename });
    this.trayManager!.stopRecordingAnimation();
    this.trayManager!.setState('processing');

    // Switch overlay to result state (transcribing)
    this.overlayManager!.setState('result', {
      status: 'transcribing'
    });
  });

  // Transcription complete: processing → idle
  this.transcriptionService!.on('transcriptionComplete', (result: any) => {
    logger.debug('Transcription complete - updating tray and showing result', {
      transcriptPath: result.transcriptPath
    });
    this.trayManager!.setState('idle');

    // Show transcription result in overlay
    this.overlayManager!.setState('result', {
      status: 'complete',
      text: result.text,
      file: result.transcriptPath
    });

    // Auto-hide overlay after 10 seconds
    setTimeout(() => {
      this.overlayManager!.setState('minimized');
    }, 10000);
  });

  // Error handling
  this.recorderManager.on('error', (error: Error) => {
    logger.error('Recorder error - updating tray and hiding overlay', { error });
    this.trayManager!.stopRecordingAnimation();
    this.trayManager!.setState('error', 'Check app for details');
    this.overlayManager!.hideOverlay();
  });

  this.transcriptionService!.on('error', (error: Error) => {
    logger.error('Transcription error - updating tray and hiding overlay', { error });
    this.trayManager!.setState('error', 'Transcription failed');
    this.overlayManager!.setState('result', {
      status: 'error',
      text: `Error: ${error.message}`
    });
  });

  logger.info('Recorder events wired to TrayManager and OverlayManager');
}
```

### Step 4: Fix Preload Security Issues

**File:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/src/preload.js`

**Add missing overlay APIs (around line 105):**
```javascript
// Overlay controls
overlayStop: () => {
  ipcRenderer.send('overlay-stop');
},
overlayCancel: () => {
  ipcRenderer.send('overlay-cancel');
},
```

### Step 5: Update overlay.js to Use Preload API

**File:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/src/renderer/overlay.js`

**Replace lines 1-7 (remove direct ipcRenderer import):**
```javascript
/**
 * Overlay Waveform Visualizer
 *
 * Renders real-time audio waveform in the overlay window.
 */

// NO MORE: const { ipcRenderer } = require('electron');
// USE: window.electronAPI instead
```

**Replace lines 91-96 (use preload API):**
```javascript
// Button handlers
stopBtn.addEventListener('click', () => {
  window.electronAPI.overlayStop();  // Changed
});

cancelBtn.addEventListener('click', () => {
  window.electronAPI.overlayCancel();  // Changed
});
```

**Replace lines 71-88 (use preload API):**
```javascript
// IPC listeners - use preload API
window.electronAPI.onAudioData((audioData) => {
  waveform.updateData(audioData);
});

// Note: No update-progress listener needed (not implemented in preload)
// Remove or add to preload if needed

// Note: set-mode should use overlay-state-change instead
window.electronAPI.onOverlayStateChange((state, data) => {
  if (state === 'result') {
    waveform.setMode('transcribing');
    statusText.textContent = 'Transcribing...';
    stopBtn.disabled = true;
  } else if (state === 'recording') {
    waveform.setMode('recording');
    statusText.textContent = 'Recording...';
    stopBtn.disabled = false;
  }
});
```

---

## Testing Checklist

After implementing fixes:

### Test 1: Recording Started Flow
```bash
# Action: Press Ctrl+Y
# Expected Console Output:
# - "Recording started - updating tray and showing overlay"
# Expected UI:
# - Overlay appears in bottom-right corner
# - Tray icon starts pulsing animation
# - Overlay shows "Recording..." text
```

### Test 2: Recording Stopped Flow
```bash
# Action: Press Ctrl+Y again (stop recording)
# Expected Console Output:
# - "Recording stopped - updating tray and overlay"
# Expected UI:
# - Overlay switches to "Transcribing..." mode
# - Tray icon stops pulsing, shows processing state
# - Stop button becomes disabled
```

### Test 3: Transcription Complete Flow
```bash
# Wait for transcription to finish
# Expected Console Output:
# - "Transcription complete - updating tray and showing result"
# Expected UI:
# - Overlay shows transcription text
# - Tray icon returns to idle state
# - Overlay auto-hides after 10 seconds
```

### Test 4: Overlay Controls
```bash
# Start recording, then click Stop button
# Expected:
# - Recording stops
# - Same flow as Ctrl+Y stop

# Start recording, then click Cancel button
# Expected:
# - Recording stops
# - Overlay hides immediately
# - No transcription happens
```

### Test 5: Error Handling
```bash
# Simulate error: Kill Python process during recording
# Expected Console Output:
# - "Recorder error - updating tray and hiding overlay"
# Expected UI:
# - Tray shows error state
# - Overlay hides
```

---

## Files to Modify

1. ✅ **recorder_manager.ts** - Add EventEmitter events
2. ✅ **transcription_service.ts** - Add EventEmitter + read transcript text
3. ✅ **main.ts** - Replace webContents.on() with EventEmitter listeners
4. ✅ **preload.js** - Add overlayStop/overlayCancel APIs
5. ✅ **overlay.js** - Remove ipcRenderer, use window.electronAPI

---

## Migration Notes

### Breaking Changes
- RecorderManager now extends EventEmitter (TypeScript change)
- TranscriptionService now extends EventEmitter (TypeScript change)
- main.ts event wiring completely rewritten

### Backward Compatibility
- IPC messages to renderer (`recording-started`, etc.) are KEPT for UI updates
- Existing renderer listeners will continue to work
- Only main process event handling changes

### Risk Assessment
- **Low Risk:** EventEmitter is standard Node.js API
- **Medium Risk:** Main.ts refactor touches core application flow
- **Mitigation:** Incremental testing after each step

---

## Rollback Plan

If fixes break existing functionality:

```bash
# Revert to previous commit:
git checkout HEAD~1 main.ts
git checkout HEAD~1 src/js/managers/recorder_manager.ts
git checkout HEAD~1 src/js/services/transcription_service.ts
git checkout HEAD~1 src/preload.js
git checkout HEAD~1 src/renderer/overlay.js
```

---

## Next Steps After Fix

1. **Run full E2E test** (manual recording flow)
2. **Update PHASE_D_ARCHITECTURE.md** with new event flow
3. **Create integration test** for event wiring
4. **Document event contract** in CLAUDE.md
5. **Consider adding:** Event flow diagram (Mermaid)

---

## Additional Enhancements (Optional)

### Enhancement 1: Waveform Visualization
**Decision needed:** Keep or remove?
- **Keep:** Requires Python recorder to stream audio chunks
- **Remove:** Simplifies architecture, reduces complexity

### Enhancement 2: Progress Bar
**Current:** No transcription progress updates
**Enhancement:** Add progress callback from whisper-cli (if supported)
**Priority:** Low (transcriptions are fast, <5 seconds)

### Enhancement 3: Overlay Animations
**Current:** Basic state transitions
**Enhancement:** Smooth fade-in/fade-out, slide animations
**Priority:** Low (polish feature)

---

## Success Criteria

✅ **All 11 IPC routes working end-to-end**
✅ **No deprecated API usage**
✅ **Secure preload API (no direct ipcRenderer in renderer)**
✅ **Clean event-driven architecture**
✅ **Full recording → transcription → display flow working**
✅ **All tests pass (manual + automated)**

---

## Timeline

- **Step 1-2:** 30 minutes (EventEmitter refactors)
- **Step 3:** 45 minutes (main.ts rewrite + testing)
- **Step 4-5:** 30 minutes (preload + overlay.js security fixes)
- **Testing:** 45 minutes (full E2E flow)
- **Total:** ~2.5 hours
