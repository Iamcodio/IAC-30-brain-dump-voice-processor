# UI Components

## TrayManager

The `TrayManager` class manages the macOS menu bar (system tray) icon with visual state feedback and quick access controls.

### Features

- **4 Visual States**: Idle, Recording, Processing, Error
- **Recording Animation**: Smooth 500ms pulse effect
- **Auto-scaling Icons**: Retina @2x support
- **Theme Adaptation**: Light/dark menu bar support
- **Context Menu**: Show/hide window, quit app
- **Performance**: Sub-100ms state transitions

### Usage

```typescript
import { TrayManager } from './ui/tray_manager';
import { WindowManager } from './js/managers/window_manager';

// Initialize
const windowManager = new WindowManager(__dirname);
windowManager.create();

const trayManager = new TrayManager(windowManager);
trayManager.create();

// Update states
trayManager.setState('idle');           // Gray icon, ready
trayManager.setState('recording');      // Red icon
trayManager.startRecordingAnimation();  // Pulse effect
trayManager.stopRecordingAnimation();
trayManager.setState('processing');     // Blue icon
trayManager.setState('error');          // Error icon
trayManager.setState('idle');           // Back to gray

// Custom message
trayManager.setState('processing', 'Transcribing 45s audio...');

// Cleanup
trayManager.destroy();
```

### Icon Assets

Requires PNG icons in `/assets/tray/`:
- `tray-idle.png` / `tray-idle@2x.png`
- `tray-recording.png` / `tray-recording@2x.png`
- `tray-processing.png` / `tray-processing@2x.png`
- `tray-error.png` / `tray-error@2x.png`

### API

#### `constructor(windowManager: WindowManager)`
Initialize with WindowManager dependency.

#### `create(): void`
Create the tray icon. Must be called after Electron app 'ready' event.

#### `setState(state: TrayState, message?: string): void`
Update tray state and visual appearance.
- `state`: 'idle' | 'recording' | 'processing' | 'error'
- `message`: Optional custom tooltip message

#### `startRecordingAnimation(): void`
Start 500ms pulse animation (recording icon ↔ idle icon).

#### `stopRecordingAnimation(): void`
Stop pulse animation and restore current state icon.

#### `destroy(): void`
Clean up tray and free resources.

### Context Menu

Right-click the tray icon to access:
- **Status** (disabled, shows current state)
- **Show Window** (enabled when hidden)
- **Hide Window** (enabled when visible)
- **Quit BrainDump**

### Click Behavior

- **Left Click**: Show/focus window
- **Right Click**: Show context menu

### Integration Example

```typescript
// In main.ts
import { app } from 'electron';
import { WindowManager } from './js/managers/window_manager';
import { TrayManager } from './ui/tray_manager';
import { RecorderManager } from './js/managers/recorder_manager';

let trayManager: TrayManager;

app.on('ready', () => {
  const windowManager = new WindowManager(__dirname);
  windowManager.create();

  trayManager = new TrayManager(windowManager);
  trayManager.create();

  const recorderManager = new RecorderManager(windowManager);

  // Connect recorder events to tray
  recorderManager.on('recording-started', () => {
    trayManager.setState('recording');
    trayManager.startRecordingAnimation();
  });

  recorderManager.on('recording-stopped', () => {
    trayManager.stopRecordingAnimation();
    trayManager.setState('processing');
  });

  recorderManager.on('transcription-complete', () => {
    trayManager.setState('idle');
  });

  recorderManager.on('error', () => {
    trayManager.setState('error');
  });
});

app.on('quit', () => {
  trayManager.destroy();
});
```

### Performance Notes

- Icon loading: ~50ms (one-time on initialization)
- State transitions: <100ms
- Animation overhead: Negligible (~1% CPU)
- Memory: ~2MB (includes all icon variants)

### Error Handling

All public methods include try/catch blocks and log errors via Winston logger. The tray gracefully degrades if icons are missing (uses empty placeholders).

### Logging

Logs to Winston logger with context:
- Tray created/destroyed
- State changes with timestamps
- Icon load failures
- Animation start/stop
- Context menu interactions
