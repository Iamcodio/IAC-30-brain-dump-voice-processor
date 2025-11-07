# Tray Icon Visual Reference

This document provides a text-based description of each icon design for quick reference.

## Icon States

### 1. Idle (tray-idle.png)
```
State: App ready, not recording
Visual: Simple microphone with subtle sound waves
Elements:
  - Microphone capsule (rounded rectangle)
  - Microphone stand (curved line + vertical line + base)
  - Subtle sound waves on both sides (low opacity)
Color: Black on transparent
Usage: Default state when app is launched and ready
```

**Visual Description**:
- Clean, minimalist microphone
- Two small curved sound wave lines (left and right)
- Professional and unobtrusive

---

### 2. Recording (tray-recording.png)
```
State: Currently recording audio
Visual: Microphone with recording indicator + bold sound waves
Elements:
  - Microphone capsule (rounded rectangle)
  - Microphone stand (curved line + vertical line + base)
  - Recording indicator (filled circle in top-right)
  - Bold sound waves on both sides
Color: Black on transparent
Usage: Active while Ctrl+Y recording is in progress
```

**Visual Description**:
- Same microphone base as idle
- Prominent filled circle (recording dot) in top-right corner
- Bolder, more visible sound waves
- Clearly indicates "active recording"

**Animation Suggestion**:
Can pulse between recording and idle icons every 500ms for visual feedback

---

### 3. Processing (tray-processing.png)
```
State: Transcribing audio with Whisper
Visual: Microphone with spinner indicator
Elements:
  - Microphone capsule (rounded rectangle)
  - Microphone stand (curved line + vertical line + base)
  - Processing spinner (3 dots in circular pattern, varying opacity)
  - Single subtle sound wave (left side)
Color: Black on transparent
Usage: Active while Whisper is transcribing the audio file
```

**Visual Description**:
- Same microphone base as idle
- Three dots arranged in a partial circle (spinner style)
- Dots have different opacity (1.0, 0.7, 0.5) suggesting rotation
- Conveys "working/processing"

**Animation Suggestion**:
Can rotate the spinner dots for smooth animation (optional)

---

### 4. Error (tray-error.png)
```
State: An error occurred
Visual: Microphone with exclamation mark indicator
Elements:
  - Microphone capsule (rounded rectangle)
  - Microphone stand (curved line + vertical line + base)
  - Error indicator (exclamation mark in circle, top-right)
    - Circle outline
    - Vertical line (exclamation stem)
    - Dot (exclamation dot)
Color: Black on transparent
Usage: Displayed when recording or transcription fails
```

**Visual Description**:
- Same microphone base as idle
- Exclamation mark inside a circle (top-right)
- Clear alert/warning symbol
- Distinct from other states

**Note**: Even though state is "error", icon remains black (not red/yellow).
macOS will render it appropriately for light/dark menu bars.

---

## Size Specifications

All icons exist in two sizes:

**Standard (Non-Retina)**:
- Filename: `tray-{state}.png`
- Dimensions: 22×22 pixels
- Use: Standard displays

**Retina (High DPI)**:
- Filename: `tray-{state}@2x.png`
- Dimensions: 44×44 pixels
- Use: Retina displays (automatically selected by macOS)

## Template Image Format

All icons use the **template image** format:
- Icons are pure black (#000000) on transparent background
- macOS automatically inverts colors for dark menu bars
- No manual color handling needed

**Light Menu Bar**:
- Icon appears black
- Background is light gray

**Dark Menu Bar**:
- Icon appears white (auto-inverted by macOS)
- Background is dark gray/black

## File Sizes

Highly optimized PNG files:
- Idle: ~252 bytes (22×22), ~455 bytes (44×44)
- Recording: ~326 bytes (22×22), ~580 bytes (44×44)
- Processing: ~275 bytes (22×22), ~499 bytes (44×44)
- Error: ~317 bytes (22×22), ~629 bytes (44×44)

Total: ~3.5 KB for all 8 files

## Design Rationale

### Why These Designs?

1. **Microphone Base**: Universal symbol for voice/audio recording
2. **Consistent Core**: All icons share the same microphone to maintain recognition
3. **State Indicators**: Top-right corner reserved for status indicators
4. **Sound Waves**: Indicate audio activity (bold when active, subtle when idle)
5. **Minimalism**: Simple geometric shapes ensure clarity at 22×22px

### Visibility Testing

Icons were designed to be recognizable at 22×22px:
- No fine details that disappear at small size
- Bold outlines (1.5px stroke width minimum)
- High contrast elements
- Distinct state indicators

### Accessibility

- Template image format ensures proper contrast in all themes
- State indicators are positioned consistently (top-right)
- Each state has a unique visual signature
- Icons remain recognizable even without color

## Editing Icons

To modify the icons:

1. Edit the SVG source files in `assets/tray/`
2. Use any vector graphics editor (Illustrator, Figma, Inkscape)
3. Keep elements black (#000000) on transparent background
4. Maintain 22×22 viewBox
5. Regenerate PNGs: `node scripts/generate-tray-icons.js`

## Quick Preview

To preview all icons visually:

```bash
# Open assets/tray folder in Finder
open assets/tray/

# Preview all PNGs at once
qlmanage -p assets/tray/*.png
```

Or use macOS Quick Look (select files and press spacebar).
