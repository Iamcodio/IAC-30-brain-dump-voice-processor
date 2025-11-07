# Tray Icon Integration Guide

This guide shows how to integrate the menu bar tray icons into the BrainDump Voice Processor Electron app.

## Overview

The app needs to display different tray icons based on the application state:
- **Idle**: Ready to record
- **Recording**: Audio recording in progress
- **Processing**: Transcribing audio with Whisper
- **Error**: An error occurred

## Implementation Steps

### 1. Create TrayManager Class

Create a new manager class to handle tray icon state:

**File**: `src/js/managers/tray_manager.js`

```javascript
const { Tray, nativeImage, Menu } = require('electron');
const path = require('path');

/**
 * TrayManager
 *
 * Manages the macOS menu bar tray icon and context menu.
 */
class TrayManager {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.tray = null;
    this.currentState = 'idle';
  }

  /**
   * Initialize the tray icon.
   */
  initialize() {
    const iconPath = path.join(this.baseDir, 'assets/tray/tray-idle.png');
    const icon = this.createTemplateImage(iconPath);

    this.tray = new Tray(icon);
    this.tray.setToolTip('BrainDump Voice Processor');

    // Create context menu
    this.updateContextMenu();
  }

  /**
   * Create a template image from a path.
   *
   * @param {string} iconPath - Path to icon file
   * @returns {NativeImage} Template image
   */
  createTemplateImage(iconPath) {
    const icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true); // Important for macOS theme adaptation
    return icon;
  }

  /**
   * Set the tray icon state.
   *
   * @param {string} state - One of: idle, recording, processing, error
   */
  setState(state) {
    const validStates = ['idle', 'recording', 'processing', 'error'];
    if (!validStates.includes(state)) {
      console.warn(`Invalid tray state: ${state}`);
      return;
    }

    this.currentState = state;
    const iconPath = path.join(this.baseDir, `assets/tray/tray-${state}.png`);
    const icon = this.createTemplateImage(iconPath);
    this.tray.setImage(icon);

    // Update tooltip
    const tooltips = {
      idle: 'BrainDump - Ready',
      recording: 'BrainDump - Recording...',
      processing: 'BrainDump - Transcribing...',
      error: 'BrainDump - Error'
    };
    this.tray.setToolTip(tooltips[state]);
  }

  /**
   * Update the context menu.
   */
  updateContextMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Status: ${this.currentState.charAt(0).toUpperCase() + this.currentState.slice(1)}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Start Recording',
        click: () => {
          // Trigger recording via IPC or direct call
        },
        enabled: this.currentState === 'idle'
      },
      {
        label: 'Stop Recording',
        click: () => {
          // Trigger stop via IPC or direct call
        },
        enabled: this.currentState === 'recording'
      },
      { type: 'separator' },
      {
        label: 'Show Window',
        click: () => {
          // Show main window
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          require('electron').app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Destroy the tray icon.
   */
  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = { TrayManager };
```

### 2. Integrate into main.js

Update the Application class to include TrayManager:

```javascript
const { TrayManager } = require('./src/js/managers/tray_manager');

class Application {
  constructor() {
    // ... existing code ...
    this.trayManager = null;
  }

  async initialize() {
    try {
      // ... existing initialization ...

      // Initialize tray icon
      this.trayManager = new TrayManager(this.baseDir);
      this.trayManager.initialize();

      // Wire state changes to tray icon
      this.recorderManager.on('recordingStarted', () => {
        this.trayManager.setState('recording');
      });

      this.recorderManager.on('recordingComplete', () => {
        this.trayManager.setState('processing');
      });

      this.transcriptionService.on('transcriptionComplete', () => {
        this.trayManager.setState('idle');
      });

      this.recorderManager.on('error', () => {
        this.trayManager.setState('error');
      });

      this.transcriptionService.on('error', () => {
        this.trayManager.setState('error');
      });

    } catch (error) {
      errorHandler.handleException('Application.initialize', error, true);
    }
  }

  cleanup() {
    try {
      // ... existing cleanup ...

      // Destroy tray icon
      if (this.trayManager) {
        this.trayManager.destroy();
      }

    } catch (error) {
      errorHandler.handleException(CONTEXTS.APP_WILL_QUIT, error);
    }
  }
}
```

### 3. Add Event Emitters

Ensure RecorderManager and TranscriptionService emit the necessary events:

**RecorderManager**:
```javascript
// When recording starts
this.emit('recordingStarted');

// When recording completes
this.emit('recordingComplete', audioPath);

// On error
this.emit('error', error);
```

**TranscriptionService**:
```javascript
// When transcription completes
this.emit('transcriptionComplete', transcriptPath);

// On error
this.emit('error', error);
```

### 4. Test the Integration

1. **Start the app**: `npm start`
2. **Verify idle icon**: Check menu bar shows microphone icon
3. **Start recording**: Press Ctrl+Y, icon should change to recording state
4. **Stop recording**: Press Ctrl+Y again, icon should change to processing state
5. **Wait for transcription**: Icon should return to idle when complete
6. **Test theme switching**:
   - System Preferences > General > Appearance
   - Switch between Light and Dark modes
   - Verify icon is visible in both

### 5. Optional: Add Pulsing Animation

For extra polish, make the recording icon pulse:

```javascript
class TrayManager {
  constructor(baseDir) {
    // ... existing code ...
    this.pulseInterval = null;
  }

  setState(state) {
    // Clear any existing pulse
    this.stopPulse();

    // ... existing state setting code ...

    // Start pulse for recording state
    if (state === 'recording') {
      this.startPulse();
    }
  }

  startPulse() {
    let showIcon = true;
    this.pulseInterval = setInterval(() => {
      if (showIcon) {
        const iconPath = path.join(this.baseDir, 'assets/tray/tray-recording.png');
        const icon = this.createTemplateImage(iconPath);
        this.tray.setImage(icon);
      } else {
        const iconPath = path.join(this.baseDir, 'assets/tray/tray-idle.png');
        const icon = this.createTemplateImage(iconPath);
        this.tray.setImage(icon);
      }
      showIcon = !showIcon;
    }, 500); // Pulse every 500ms
  }

  stopPulse() {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
  }

  destroy() {
    this.stopPulse();
    // ... existing destroy code ...
  }
}
```

## Testing Checklist

- [ ] Idle icon appears on app launch
- [ ] Icon changes to recording when Ctrl+Y pressed
- [ ] Icon changes to processing after recording stops
- [ ] Icon returns to idle after transcription completes
- [ ] Icon changes to error if transcription fails
- [ ] Icon is visible on light menu bar (light mode)
- [ ] Icon is visible on dark menu bar (dark mode)
- [ ] @2x icons are crisp on Retina displays
- [ ] Tooltip text updates with state
- [ ] Context menu works correctly
- [ ] Icon cleans up on app quit

## Troubleshooting

### Icon not appearing
- Verify file paths are correct
- Check `assets/tray/` directory exists
- Ensure PNG files were generated successfully

### Icon looks blurry on Retina
- Verify @2x files exist
- Check file naming: `tray-idle@2x.png` (not `tray-idle-2x.png`)

### Icon not adapting to dark mode
- Ensure `setTemplateImage(true)` is called
- Verify icons use black on transparent (not colored)

### Icons too small/large
- Standard size should be 22x22px
- Retina size should be 44x44px
- Do NOT use other sizes

## References

- [Electron Tray Documentation](https://www.electronjs.org/docs/latest/api/tray)
- [Electron NativeImage Documentation](https://www.electronjs.org/docs/latest/api/native-image)
- [macOS Human Interface Guidelines - Menu Bar Extras](https://developer.apple.com/design/human-interface-guidelines/menu-bar-extras)
