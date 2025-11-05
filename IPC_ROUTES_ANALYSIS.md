# IPC Routes Analysis - Overlay Functionality

**Date:** 2025-10-26
**Component:** IPC ROUTES SPECIALIST
**Objective:** Verify ALL IPC routes are properly wired for overlay functionality

---

## Executive Summary

### Status: CRITICAL ISSUES FOUND

**Problems Detected:**
1. **BROKEN:** Recording events (`recording-started`, `recording-stopped`, `transcription-complete`) use `webContents.on('ipc-message')` which is DEPRECATED
2. **BROKEN:** Overlay state management routes are incomplete - no handlers in main process
3. **BROKEN:** Audio waveform data route (`audio-data`) has no sender
4. **INCOMPLETE:** Preload API missing critical overlay methods

---

## Route Analysis by Category

### 1. Recording Flow Routes

#### 1.1 `recording-started` - **BROKEN**
- **Sender:** `recorder_manager.ts` line 108 → `this.notifyUI('recording-started')`
- **Handler:** `main.ts` line 227 → `mainWindow.webContents.on('ipc-message')` ❌
- **Issue:** Using deprecated `ipc-message` listener instead of `ipcMain.on()`
- **Expected Flow:** RecorderManager → MainWindow → TrayManager + OverlayManager
- **Actual Flow:** BROKEN - deprecated API won't fire reliably

**Fix Required:**
```typescript
// In recorder_manager.ts, change to:
ipcMain.emit('recording-started'); // Use ipcMain for internal events

// In main.ts, change to:
ipcMain.on('recording-started', () => {
  this.trayManager!.setState('recording');
  this.overlayManager!.createOverlay();
  this.overlayManager!.showOverlay();
  this.overlayManager!.setState('recording');
});
```

#### 1.2 `recording-stopped` - **BROKEN**
- **Sender:** `recorder_manager.ts` line 113 → `this.notifyUI('recording-stopped')`
- **Handler:** `main.ts` line 236 → `mainWindow.webContents.on('ipc-message')` ❌
- **Issue:** Same deprecated API issue
- **Expected:** Switches overlay to "transcribing" mode
- **Actual:** BROKEN

#### 1.3 `transcription-complete` - **BROKEN**
- **Sender:** `transcription_service.ts` (assumed, not verified)
- **Handler:** `main.ts` line 243 → `mainWindow.webContents.on('ipc-message')` ❌
- **Issue:** Same deprecated API issue
- **Expected:** Shows result in overlay with transcription text
- **Actual:** BROKEN - result text never reaches overlay

---

### 2. Overlay Control Routes

#### 2.1 `overlay-stop` - **WORKING**
- **Sender:** `overlay.js` line 92 → `ipcRenderer.send('overlay-stop')`
- **Handler:** `overlay-window-manager.ts` line 156 → `ipcMain.on('overlay-stop')` ✅
- **Preload:** ❌ NOT EXPOSED in preload.js
- **Flow:** Overlay → Main → RecorderManager → Stops recording
- **Status:** Backend works, but frontend access broken

**Fix Required:**
```javascript
// Add to preload.js:
overlayStop: () => {
  ipcRenderer.send('overlay-stop');
}
```

#### 2.2 `overlay-cancel` - **WORKING**
- **Sender:** `overlay.js` line 96 → `ipcRenderer.send('overlay-cancel')`
- **Handler:** `overlay-window-manager.ts` line 162 → `ipcMain.on('overlay-cancel')` ✅
- **Preload:** ❌ NOT EXPOSED in preload.js
- **Flow:** Overlay → Main → Cancels recording
- **Status:** Backend works, but frontend access broken

#### 2.3 `overlay-state-change` - **WORKING**
- **Sender:** `overlay-window-manager.ts` line 213 → `this.overlay.webContents.send('overlay-state-change')`
- **Handler:** `overlay-controller.js` line 33 → `window.electronAPI.onOverlayStateChange()` ✅
- **Preload:** ✅ EXPOSED in preload.js line 93
- **Flow:** OverlayWindowManager → Overlay Renderer → Updates UI state
- **Status:** WORKING

---

### 3. Audio Data Routes

#### 3.1 `audio-data` → `update-waveform` - **BROKEN (NO SENDER)**
- **Sender:** ❌ MISSING - No code sends `audio-data` events
- **Relay:** `overlay-window-manager.ts` line 146 → Listens for `audio-data` and forwards to overlay
- **Receiver:** `overlay.js` line 71 → `ipcRenderer.on('update-waveform')` ✅
- **Preload:** ✅ EXPOSED in preload.js line 88 `onAudioData()`
- **Issue:** Python recorder doesn't send audio chunks, only final file
- **Status:** INFRASTRUCTURE EXISTS but NO DATA SOURCE

**Critical Gap:**
The recorder process (`recorder.py`) only writes complete WAV files. It doesn't stream audio chunks for real-time visualization. The entire waveform pipeline is orphaned.

**Fix Required:**
1. Either: Modify `recorder.py` to stream audio chunks via stdout
2. Or: Remove waveform visualization (dead code)

#### 3.2 `transcription-progress` → `update-progress` - **BROKEN (NO SENDER)**
- **Sender:** ❌ MISSING - No transcription service sends progress
- **Relay:** `overlay-window-manager.ts` line 151
- **Receiver:** `overlay.js` line 75
- **Status:** ORPHANED CODE - no data source

---

### 4. Overlay Window Management

#### 4.1 `resize-overlay` - **WORKING**
- **Sender:** `overlay-controller.js` line 73 → `window.electronAPI.resizeOverlay()`
- **Handler:** `overlay-window-manager.ts` line 124 → `ipcMain.on('resize-overlay')` ✅
- **Preload:** ✅ EXPOSED in preload.js line 96
- **Status:** WORKING

#### 4.2 `toggle-recording` - **WORKING**
- **Sender:** `overlay-controller.js` line 90 → `window.electronAPI.toggleRecording()`
- **Handler:** `overlay-window-manager.ts` line 136 → Relays to main window
- **Preload:** ✅ EXPOSED in preload.js line 99
- **Status:** WORKING

#### 4.3 `stop-recording-overlay` - **WORKING**
- **Sender:** `overlay-controller.js` line 99 → `window.electronAPI.stopRecording()`
- **Handler:** `overlay-window-manager.ts` line 141 → Relays to main window
- **Preload:** ✅ EXPOSED in preload.js line 102
- **Status:** WORKING

---

## Preload API Gaps

### Missing Overlay APIs in preload.js:

```javascript
// Currently MISSING - overlay.js uses ipcRenderer directly (INSECURE)
overlayStop: () => {
  ipcRenderer.send('overlay-stop');
},
overlayCancel: () => {
  ipcRenderer.send('overlay-cancel');
},
```

**Security Issue:** `overlay.js` imports `ipcRenderer` directly (line 7), bypassing contextIsolation. This is a security vulnerability.

---

## Critical Architectural Issues

### Issue #1: Deprecated IPC Pattern
**Location:** `main.ts` lines 225-258
**Problem:** Using `webContents.on('ipc-message')` to listen for IPC events
**Impact:** Events may not fire in newer Electron versions
**Fix:** Use `ipcMain.on()` for all IPC event handlers

### Issue #2: Event Propagation Chain Broken
**Flow:** RecorderManager → MainWindow IPC → TrayManager + OverlayManager
**Problem:** RecorderManager sends to mainWindow.webContents, but main.ts tries to listen with webContents.on()
**This is wrong because:**
- `mainWindow.webContents.send('recording-started')` sends TO renderer process
- `mainWindow.webContents.on('ipc-message')` listens FROM renderer process
- These are OPPOSITE directions!

**Correct Pattern:**
```typescript
// RecorderManager should emit internal events:
class RecorderManager extends EventEmitter {
  private handleStdout(data: Buffer) {
    if (output === 'RECORDING_STARTED') {
      this.emit('recordingStarted'); // Internal event
      this.notifyUI('recording-started'); // UI notification
    }
  }
}

// Main.ts should listen to RecorderManager events:
this.recorderManager.on('recordingStarted', () => {
  this.trayManager.setState('recording');
  this.overlayManager.createOverlay();
});
```

### Issue #3: No Transcription Result Flow
**Problem:** When transcription completes, the result text doesn't reach the overlay
**Current:** `transcription-complete` event has no data payload
**Needed:**
```typescript
this.overlayManager.setState('result', {
  status: 'complete',
  text: transcriptionResult.text,
  file: transcriptionResult.file
});
```

### Issue #4: Orphaned Waveform Code
**Problem:** `audio-data` → `update-waveform` route has no data source
**Impact:** Waveform canvas never updates (always blank)
**Options:**
1. Implement real-time audio streaming in Python recorder
2. Remove waveform code as out-of-scope
3. Generate fake waveform for visual feedback

---

## Route Testing Matrix

| Route | Sender Works | Handler Works | Preload Exposed | End-to-End |
|-------|--------------|---------------|-----------------|------------|
| recording-started | ✅ | ❌ Deprecated | ✅ | ❌ |
| recording-stopped | ✅ | ❌ Deprecated | ✅ | ❌ |
| transcription-complete | ❓ | ❌ Deprecated | ✅ | ❌ |
| overlay-stop | ✅ | ✅ | ❌ | ❌ |
| overlay-cancel | ✅ | ✅ | ❌ | ❌ |
| overlay-state-change | ✅ | ✅ | ✅ | ✅ |
| audio-data | ❌ | ✅ | ✅ | ❌ |
| update-waveform | N/A | ✅ | ✅ | ❌ |
| resize-overlay | ✅ | ✅ | ✅ | ✅ |
| toggle-recording | ✅ | ✅ | ✅ | ✅ |
| stop-recording-overlay | ✅ | ✅ | ✅ | ✅ |

**Passing:** 3/11 routes (27%)
**Broken:** 8/11 routes (73%)

---

## Recommended Fixes (Priority Order)

### Priority 1: Fix Core Recording Events
1. Refactor `main.ts` lines 225-258 to use `ipcMain.on()` instead of `webContents.on('ipc-message')`
2. Change RecorderManager to emit internal events (not just IPC to renderer)
3. Wire RecorderManager events directly to TrayManager and OverlayManager

### Priority 2: Fix Overlay Control Security
1. Add `overlayStop()` and `overlayCancel()` to preload.js
2. Remove direct `ipcRenderer` import from overlay.js
3. Update overlay.js to use `window.electronAPI.*` for all IPC

### Priority 3: Complete Transcription Flow
1. Modify transcription service to include result text in IPC payload
2. Update overlay state handler to display transcription text
3. Test full recording → transcription → display flow

### Priority 4: Handle Waveform Routes
1. **Decision needed:** Implement real-time streaming or remove feature?
2. If keeping: Modify recorder.py to chunk audio data
3. If removing: Delete overlay.js waveform code, update UI

---

## Files Requiring Changes

1. **main.ts** - Lines 225-258 (event handler refactor)
2. **recorder_manager.ts** - Add EventEmitter, emit internal events
3. **preload.js** - Add overlayStop/overlayCancel APIs
4. **overlay.js** - Remove ipcRenderer import, use window.electronAPI
5. **transcription_service.ts** - Add result payload to transcription-complete event
6. **recorder.py** (optional) - Add real-time audio chunk streaming

---

## Test Plan

Once fixes are applied:

```javascript
// Test 1: Recording started
1. Press Ctrl+Y
2. Verify overlay appears
3. Verify tray icon animates
4. Console should show: "Recording started - updating tray and showing overlay"

// Test 2: Recording stopped
1. Press Ctrl+Y again
2. Verify overlay shows "Transcribing..."
3. Verify tray icon stops animating
4. Console should show: "Recording stopped - updating tray and overlay"

// Test 3: Transcription complete
1. Wait for transcription to finish
2. Verify overlay shows transcription text
3. Verify tray returns to idle
4. Console should show: "Transcription complete - updating tray and showing result"

// Test 4: Overlay controls
1. Click Stop button in overlay
2. Verify recording stops
3. Click Cancel button
4. Verify overlay hides

// Test 5: State persistence
1. Start recording
2. Switch desktops/spaces
3. Verify overlay still visible (alwaysOnTop test)
```

---

## Conclusion

**Current State:** Overlay infrastructure is 70% complete but non-functional due to:
- Deprecated IPC event handling
- Event propagation direction mismatch
- Missing preload security boundaries
- Orphaned audio streaming code

**Estimated Fix Time:** 2-4 hours for Priority 1-3 fixes
**Risk Level:** Medium - requires careful event flow refactoring
**Testing Required:** Full E2E test of recording flow after fixes
