# Floating Overlay Window Implementation Guide

**Date:** 2025-10-26  
**Priority:** CRITICAL  
**Status:** Implementation Required

---

## Problem Statement

Current implementation attempts to use CSS z-index and DOM manipulation to create a floating overlay. **This is the wrong approach.**

**Requirements:**
1. Floating overlay window that sits above ALL system windows
2. Real-time waveform visualization during recording
3. Progress indicator during transcription
4. SuperWhisper-style appearance (dark, blurred, minimal)

---

## Architecture Solution

**This is NOT a CSS/DOM problem. This is an Electron window management problem.**

### Key Insight
- ❌ CSS z-index (doesn't work across OS windows)
- ❌ React portals (still same window)
- ❌ DOM manipulation (wrong layer)
- ✅ **Separate Electron BrowserWindow with native window APIs**

---

## Implementation Part 1: Overlay Window Manager

### File: `src/main/overlay-window-manager.ts`

```typescript
import { BrowserWindow, screen, ipcMain } from 'electron';

export class OverlayWindowManager {
  private overlay: BrowserWindow | null = null;

  createOverlay(): void {
    if (this.overlay) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    this.overlay = new BrowserWindow({
      width: 600,
      height: 200,
      x: Math.floor((width - 600) / 2),
      y: 100,
      
      // CRITICAL: These settings make it float above ALL windows
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: true,
      
      // macOS specific
      vibrancy: 'dark',
      visualEffectState: 'active',
      level: 'floating',
      skipTaskbar: true,
      
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    this.overlay.loadFile('src/renderer/overlay.html');
    this.overlay.setAlwaysOnTop(true, 'floating');
    this.overlay.setIgnoreMouseEvents(true, { forward: true });
    this.setupIPC();
  }

  private setupIPC(): void {
    if (!this.overlay) return;

    ipcMain.on('audio-data', (event, audioData: Uint8Array) => {
      this.overlay?.webContents.send('update-waveform', audioData);
    });

    ipcMain.on('transcription-progress', (event, progress: number) => {
      this.overlay?.webContents.send('update-progress', progress);
    });

    ipcMain.on('overlay-stop', () => {
      this.hideOverlay();
      BrowserWindow.getAllWindows()[0]?.webContents.send('stop-recording');
    });

    ipcMain.on('overlay-cancel', () => {
      this.hideOverlay();
      BrowserWindow.getAllWindows()[0]?.webContents.send('cancel-recording');
    });
  }

  showOverlay(): void {
    this.overlay?.show();
    this.overlay?.focus();
  }

  hideOverlay(): void {
    this.overlay?.hide();
  }

  setMode(mode: 'recording' | 'transcribing'): void {
    this.overlay?.webContents.send('set-mode', mode);
  }

  destroy(): void {
    this.overlay?.close();
    this.overlay = null;
  }
}
```

---

## Implementation Part 2: Overlay HTML

### File: `src/renderer/overlay.html`

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: transparent;
      -webkit-app-region: drag;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }

    .overlay-container {
      width: 600px;
      height: 200px;
      background: rgba(30, 30, 30, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .waveform-container {
      flex: 1;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .progress-background {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 0.1) 0%, 
        rgba(59, 130, 246, 0.2) 100%);
      transition: width 0.3s ease;
      z-index: 0;
    }

    canvas {
      width: 100%;
      height: 120px;
      position: relative;
      z-index: 1;
    }

    .controls {
      height: 60px;
      background: rgba(20, 20, 20, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 0 20px;
      -webkit-app-region: no-drag;
    }

    button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    button.stop {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
    }

    button.stop:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    .status-text {
      position: absolute;
      top: 10px;
      right: 20px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      z-index: 2;
    }
  </style>
</head>
<body>
  <div class="overlay-container">
    <div class="waveform-container">
      <div class="progress-background" id="progress-bg"></div>
      <canvas id="waveform"></canvas>
      <span class="status-text" id="status-text">Recording...</span>
    </div>
    <div class="controls">
      <button id="stop-btn" class="stop">Stop (Ctrl+Y)</button>
      <button id="cancel-btn">Cancel (Esc)</button>
    </div>
  </div>

  <script src="overlay.js"></script>
</body>
</html>
```

---

## Implementation Part 3: Waveform Visualizer

### File: `src/renderer/overlay.js`

```javascript
const { ipcRenderer } = require('electron');

class WaveformVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = 560;
    this.height = 120;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.dataArray = new Uint8Array(64);
    this.mode = 'recording';
  }

  updateData(audioData) {
    this.dataArray = audioData;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const barWidth = 8;
    const barGap = 2;
    const barCount = Math.floor(this.width / (barWidth + barGap));
    const centerY = this.height / 2;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * this.dataArray.length);
      const value = this.dataArray[dataIndex] / 255;
      const barHeight = value * (this.height / 2);

      const x = i * (barWidth + barGap);
      const color = this.getColorForValue(value);

      ctx.fillStyle = color;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
    }
  }

  getColorForValue(value) {
    if (value < 0.3) {
      return `rgba(34, 197, 94, ${0.4 + value})`;
    } else if (value < 0.7) {
      return `rgba(234, 179, 8, ${0.6 + value * 0.4})`;
    } else {
      return `rgba(239, 68, 68, ${0.8 + value * 0.2})`;
    }
  }

  setMode(mode) {
    this.mode = mode;
  }
}

const waveform = new WaveformVisualizer('waveform');
const progressBg = document.getElementById('progress-bg');
const statusText = document.getElementById('status-text');
const stopBtn = document.getElementById('stop-btn');
const cancelBtn = document.getElementById('cancel-btn');

ipcRenderer.on('update-waveform', (event, audioData) => {
  waveform.updateData(audioData);
});

ipcRenderer.on('update-progress', (event, progress) => {
  progressBg.style.width = `${progress}%`;
});

ipcRenderer.on('set-mode', (event, mode) => {
  waveform.setMode(mode);
  if (mode === 'transcribing') {
    statusText.textContent = 'Transcribing...';
    stopBtn.disabled = true;
  } else {
    statusText.textContent = 'Recording...';
    stopBtn.disabled = false;
  }
});

stopBtn.addEventListener('click', () => {
  ipcRenderer.send('overlay-stop');
});

cancelBtn.addEventListener('click', () => {
  ipcRenderer.send('overlay-cancel');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ipcRenderer.send('overlay-cancel');
  }
});
```

---

## Implementation Part 4: Integration with Main Process

### Modify: `src/main.ts`

```typescript
import { OverlayWindowManager } from './main/overlay-window-manager';

const overlayManager = new OverlayWindowManager();

ipcMain.on('recording-started', () => {
  overlayManager.createOverlay();
  overlayManager.showOverlay();
  overlayManager.setMode('recording');
});

ipcMain.on('recording-stopped', () => {
  overlayManager.setMode('transcribing');
});

ipcMain.on('transcription-complete', () => {
  overlayManager.hideOverlay();
});

app.on('before-quit', () => {
  overlayManager.destroy();
});
```

---

## Implementation Part 5: Audio Data Pipeline

### Modify: Recording code to send audio data

```typescript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const sendAudioData = () => {
      analyser.getByteFrequencyData(dataArray);
      ipcRenderer.send('audio-data', dataArray);
      requestAnimationFrame(sendAudioData);
    };
    
    sendAudioData();
  });
```

---

## Key Features Explained

### 1. Waveform Visualization
- Real-time frequency data from Web Audio API
- Color gradient: green → yellow → red based on amplitude
- 64 bars, smooth animation at 60fps

### 2. Progress Indicator
- Blue gradient background behind waveform
- Width grows 0-100% during transcription
- Smooth CSS transition

### 3. Window Behavior
- `alwaysOnTop: true` - floats above ALL windows
- `level: 'floating'` - macOS window level
- `vibrancy: 'dark'` - native macOS blur
- `setIgnoreMouseEvents()` - click-through transparent areas

### 4. Two Modes
- **Recording mode:** Waveform animates, Stop/Cancel active
- **Transcribing mode:** Progress bar fills, Stop disabled

---

## Documentation Links

**Electron BrowserWindow:**
https://www.electronjs.org/docs/latest/api/browser-window

**macOS Window Levels:**
https://www.electronjs.org/docs/latest/api/browser-window#winsetalwaysontopflag-level-relativelevel

**Web Audio API:**
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## Testing Checklist

- [ ] Window appears on top of all apps (Chrome, Finder, etc)
- [ ] Waveform animates during recording
- [ ] Progress bar fills during transcription
- [ ] Stop button works
- [ ] Cancel button works
- [ ] Esc key cancels
- [ ] Window draggable by waveform area
- [ ] Buttons clickable (not draggable)
- [ ] Transparent areas click-through
- [ ] Native macOS blur visible

---

**END OF DOCUMENT**
