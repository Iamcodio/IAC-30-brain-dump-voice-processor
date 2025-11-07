# Tauri Migration Research - SuperWhisper Clone Findings

**Date:** 2025-11-07  
**Tokens Used:** ~95K  
**Status:** Phase C1 analysis + clone research complete

---

## Phase C1 Electron - What Worked

✅ **Overlay Window Implementation**
- Frameless, transparent window
- macOS `floating` window level (always on top)
- `visibleOnAllWorkspaces: true` with `visibleOnFullScreen: true`
- Bottom-right positioning (20px from edges)
- State transitions: minimized (80x80) → recording (300x120) → result (400x200)

✅ **Architecture**
- ShortcutManager → OverlayWindowManager separation
- IPC communication working (overlay-state-change events)
- Waveform visualization functional
- 92% test coverage achieved

---

## Phase C1 Electron - What Failed

❌ **Critical UX Issues (From PM)**
- **Hotkey triggered BOTH app window AND floating overlay**
  - User: "The actual app came up as well as the floating menu bar"
  - Expected: Only floating overlay appears, main app stays hidden
  
- **Overlay didn't overlay full-screen apps**
  - User: "The menu bar didn't go over full screen elements"
  - Electron's `visibleOnFullScreen: true` didn't fully work
  
- **Window focus issues**
  - User has to click in text box first, then trigger hotkey
  - Not seamless - requires manual cursor positioning

❌ **Bundle/Performance**
- 140MB bundle size (Electron bloat)
- 150-200MB memory usage
- 2-3 second startup time

---

## Tauri Requirements (To Fix Electron Issues)

### 1. Menu Bar App (Not Window App)
```
System Menu Bar
    ↓
Triangle Icon
    ↓
Click → Dropdown Menu
    ├── Start/Stop Recording
    ├── History...
    ├── Settings...
    └── Quit
```

**NO main app window visible at all until user clicks menu bar icon.**

### 2. Floating Overlay Behavior
```
User presses Cmd+Y (global hotkey)
    ↓
ONLY overlay appears (frameless, 80x80 minimized state)
    ↓
User speaks
    ↓
Overlay shows waveform (300x120 recording state)
    ↓
User presses Cmd+Y again (or Stop button)
    ↓
Overlay disappears
    ↓
Transcription → clipboard automatically
```

**Requirements:**
- Must appear OVER full-screen apps (true system overlay)
- Must NOT activate main app window
- Must float above everything (including fullscreen videos, games, etc.)

### 3. Auto-Paste (Non-Negotiable)
- No manual Cmd+V
- Transcription goes to clipboard
- User focuses ANY text field → auto-paste happens
- Requires macOS Accessibility permissions

---

## SuperWhisper Clone Analysis

### Best Clone Found: OpenSuperWhisper (Starmel)
**Repo:** https://github.com/Starmel/OpenSuperWhisper
**Tech:** macOS app, Rust + Swift, whisper.cpp

**Key Features:**
- Global keyboard shortcuts (`cmd + \``)
- Real-time transcription
- Menu bar app (not dock app)
- Uses whisper.cpp with Metal GPU

**What We Can Learn:**
- Swift/Obj-C for macOS native overlay (they did this)
- Rust for whisper.cpp integration (they did this)
- Menu bar icon pattern (we need this)

### Other Notable Clones

**WhisperTrigger (Linux)**
- https://github.com/RetroTrigger/whispertrigger
- System tray app with hotkeys
- AppImage distribution

**Open-Super-Whisper (Python)**
- https://github.com/TakanariShimbo/open-super-whisper
- Cross-platform (Windows, macOS, Linux)
- Uses PyInstaller for builds
- Global hotkey support

---

## Tauri 2.0 Capabilities (Need to Verify)

### Menu Bar API
```rust
// Tauri can create menu bar apps
use tauri::menu::Menu;
use tauri::tray::TrayIcon;
```

### Floating Window
```rust
// Tauri window options
Window::builder()
    .always_on_top(true)
    .decorations(false)
    .transparent(true)
    .skip_taskbar(true)
```

**Question:** Does Tauri's `always_on_top` work over macOS fullscreen apps?
- Electron's didn't fully work
- May need native macOS APIs via Rust

### Global Hotkeys
```rust
// Tauri has global-hotkey plugin
use tauri_plugin_global_shortcut::GlobalShortcutExt;
```

---

## Critical Unknowns (Need Research)

1. **Tauri menu bar mode:** Does Tauri 2.0 support menu bar-only apps (no dock icon)?
2. **Fullscreen overlay:** Can Tauri windows appear over macOS fullscreen apps?
3. **Auto-paste:** How to detect text field focus system-wide in Rust/Tauri?
4. **Window activation:** Can we prevent main app window from activating on hotkey?

---

## Next Steps (Saturday Morning)

### Research Tasks (2-3 hours)
1. Read Tauri 2.0 docs on menu bar apps
2. Test Tauri window always-on-top over fullscreen
3. Research macOS Accessibility API for auto-paste (Rust CGEvent?)
4. Look at Starmel's OpenSuperWhisper Swift code for overlay pattern

### Proof of Concept (4-6 hours)
1. Create Tauri menu bar app (no window)
2. Add global hotkey (Cmd+Y)
3. Show/hide floating overlay on hotkey
4. Verify overlay appears over fullscreen browser tab

**DO NOT start building until we verify Tauri can do what Electron couldn't.**

---

## Key Learnings

### What Electron Taught Us
- Frameless windows work well
- IPC architecture was solid
- Window level APIs exist but incomplete
- Bundle size is unacceptable

### What Tauri Must Achieve
- 10MB bundle (vs 140MB Electron)
- True fullscreen overlay (Electron failed)
- Menu bar mode (no dock icon)
- No window activation on hotkey

---

## Reference Links

**Tauri Docs:**
- Menu/Tray: https://v2.tauri.app/plugin/tray/
- Global Shortcuts: https://v2.tauri.app/plugin/global-shortcut/
- Window Management: https://v2.tauri.app/reference/javascript/window/

**macOS APIs (for Rust FFI if needed):**
- NSWindow level: https://developer.apple.com/documentation/appkit/nswindow/level
- Accessibility: https://developer.apple.com/documentation/applicationservices/axuielement

**SuperWhisper Clones:**
- OpenSuperWhisper (best): https://github.com/Starmel/OpenSuperWhisper
- Awesome Whisper list: https://github.com/sindresorhus/awesome-whisper

---

**Document Status:** Research Phase Complete  
**Next Action:** Verify Tauri capabilities before building  
**Estimated Time to Build:** 1.5 days if Tauri can do everything
