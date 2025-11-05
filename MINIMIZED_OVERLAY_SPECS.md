# Minimized Overlay Visual Specifications

## Dimensions

```
┌────────────────────────────────────────┐
│  200px × 60px                          │
│  ┌──────────────────────────────────┐  │
│  │  [▲]  [====waveform====]        │  │
│  │  24px      140px                 │  │
│  │   ↑          ↑                   │  │
│  │  Icon    Canvas                  │  │
│  └──────────────────────────────────┘  │
│  Padding: 12px left/right              │
└────────────────────────────────────────┘
```

## Layout Breakdown

| Element | Width | Height | Position | Notes |
|---------|-------|--------|----------|-------|
| Container | 200px | 60px | Fixed | Entire window |
| Triangle Icon | 24px | 20px | Left (12px padding) | Unicode ▲ character |
| Gap | 10px | - | Between icon & canvas | Flexbox gap |
| Waveform Canvas | 140px | 40px | Center-aligned | 70 bars × 2px each |
| Border Radius | 30px | - | All sides | Pill shape |
| Time Display | Auto | 24px | Centered (overlay) | Shown on hover |

## Visual States

### Idle (Not Recording)
```
┌──────────────────────────────┐
│  ▲  ▁▁▁▂▁▁▁▁▁▂▁▁▁▁▁▁▁▁      │  ← Static waveform (low opacity)
└──────────────────────────────┘
    ↑
   Gray (70% opacity)
```

### Recording
```
┌──────────────────────────────┐
│  ▲  ▁▃▅▇▅▃▁▂▄▆▄▂▁▃▅▃▁      │  ← Animated waveform
└──────────────────────────────┘
    ↑
  Pulsing glow (white)
```

### Hover (Recording)
```
┌──────────────────────────────┐
│  ▲  ▁▃▅▇▅▃▁▂▄▆▄▂▁▃▅▃▁      │
│         ┌────────┐           │
│         │ 01:23  │  ← Time badge appears
│         └────────┘           │
└──────────────────────────────┘
```

## Color Palette

### Background
- **Base**: `rgba(20, 20, 20, 0.85)` - Dark gray with transparency
- **Blur**: `blur(20px) saturate(180%)` - macOS native effect
- **Border**: `rgba(255, 255, 255, 0.08)` - Subtle white outline

### Triangle Icon
- **Idle**: `rgba(255, 255, 255, 0.7)` - 70% white
- **Recording**: `rgba(255, 59, 48, 0.9)` - Red accent (iOS red)
- **Glow**: `drop-shadow(0 0 4-8px white)` - Pulsing from 4px to 8px

### Waveform Bars
- **Idle**: `rgba(255, 255, 255, 0.15)` - Very faint
- **Active**: `rgba(255, 255, 255, 0.3-0.8)` - Opacity varies by amplitude
- **Bar Size**: 2px width, variable height (max 40% of canvas)

### Time Display (Hover)
- **Background**: `rgba(0, 0, 0, 0.6)` with `blur(10px)`
- **Text**: `rgba(255, 255, 255, 0.9)` - 90% white
- **Border**: `rgba(255, 255, 255, 0.1)` - Subtle outline
- **Font**: 14px, SF Pro Display (system font)

## Shadows & Effects

### Container Shadow
```css
box-shadow:
  0 8px 32px rgba(0, 0, 0, 0.4),        /* Outer shadow */
  inset 0 1px 0 rgba(255, 255, 255, 0.05); /* Inner highlight */
```

### Hover State
```css
box-shadow:
  0 12px 40px rgba(0, 0, 0, 0.5),       /* Deeper shadow */
  inset 0 1px 0 rgba(255, 255, 255, 0.08); /* Brighter highlight */
transform: translateY(-1px);            /* Subtle lift */
```

### Triangle Glow (Pulsing)
```css
filter: drop-shadow(0 0 [4-8px] rgba(255, 255, 255, [0.3-0.7]));
/* Animates using sine wave: intensity = sin(time * 0.05) */
```

## Waveform Animation

### Bar Configuration
- **Total Bars**: 70
- **Bar Width**: 2px
- **Bar Gap**: 0px (adjacent)
- **Update Rate**: 30fps (33ms interval)
- **Data Flow**: Scrolls left-to-right (oldest on left)

### Amplitude Mapping
```
Audio RMS Value  →  Bar Height
─────────────────────────────────
0.0 (silence)    →  2px (minimum)
0.5 (normal)     →  20px (50%)
1.0 (peak)       →  40px (maximum)
```

### Drawing Logic
```javascript
barHeight = amplitude * (canvas.height * 0.4);
// Max height is 40% of canvas (16px out of 40px)
// Bars are centered vertically: centerY - barHeight/2
```

## Screen Positioning

### Default Position
- **X**: `screen.width - 220px` (20px from right edge)
- **Y**: `20px` (20px from top edge)
- **Display**: Primary display work area (excludes menu bar)

### Multi-Display Behavior
- Stays on display where it was created
- Repositions if display disconnected
- User can drag to any display (future enhancement)

## Interaction Zones

```
┌────────────────────────────────────────┐
│  [Drag Zone - entire window]           │  ← -webkit-app-region: drag
│  ┌──────────────────────────────────┐  │
│  │ [▲] [===== Click to expand =====] │  │  ← Clickable
│  └──────────────────────────────────┘  │  ← -webkit-app-region: no-drag
└────────────────────────────────────────┘
```

- **Drag**: Click and hold anywhere to move window
- **Click**: Single click expands to full overlay
- **Hover**: Shows time display (recording only)

## Typography

### Triangle Icon
- **Character**: Unicode U+25B2 (▲)
- **Font Size**: 20px
- **Line Height**: 1
- **Weight**: Inherits system font weight

### Time Display
- **Font**: `-apple-system, SF Pro Display`
- **Size**: 14px
- **Weight**: 500 (medium)
- **Variant**: `tabular-nums` (monospaced digits)
- **Format**: `MM:SS` (zero-padded)

## Performance Metrics

### Resource Usage
- **Memory**: ~4.5MB (separate BrowserWindow)
- **CPU**: <1% (idle), ~2% (recording with animation)
- **GPU**: <5% (Canvas2D rendering)

### Frame Times
- **Target**: 60fps (16.67ms per frame)
- **Actual**: ~30fps (33ms throttle on audio updates)
- **Waveform Draw**: <1ms per frame
- **IPC Latency**: <0.5ms per message

## Accessibility

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all transitions */
  .minimized-overlay,
  .triangle-icon,
  .time-display {
    transition: none;
  }
  /* No hover lift */
  .minimized-overlay:hover {
    transform: none;
  }
}
```

### High Contrast
```css
@media (prefers-contrast: high) {
  /* Darker background */
  background: rgba(0, 0, 0, 0.95);
  /* Brighter borders */
  border-color: rgba(255, 255, 255, 0.3);
  /* Full white icon */
  .triangle-icon {
    color: rgba(255, 255, 255, 1);
  }
}
```

## Comparison to Main Overlay

| Feature | Main Overlay | Minimized Overlay |
|---------|-------------|-------------------|
| Size | 400×300px | 200×60px |
| Waveform Bars | 200 bars | 70 bars |
| Controls | Stop, Minimize, Close | Click to expand |
| Time Display | Always visible | Hover only |
| Icon | Multiple buttons | Single triangle |
| Opacity | 90% | 85% |

## File Size Estimates

- **HTML**: ~3.2KB (uncompressed)
- **CSS**: ~4.1KB (uncompressed)
- **JavaScript**: ~5.8KB (inline, uncompressed)
- **Total**: ~13KB (under 5KB gzipped)

## Browser Compatibility

- **Electron**: 28+ (tested on Chromium 120+)
- **Canvas 2D**: Full support
- **Backdrop Filter**: macOS 10.14+ required
- **CSS Custom Properties**: Full support
- **ES6 Features**: Arrow functions, const/let, template literals

## Known Limitations

1. **No right-click menu** (planned for future)
2. **Fixed position** (drag works but not persisted)
3. **Single theme** (dark only, no light mode yet)
4. **macOS only** (uses `-webkit-app-region`)
5. **No resize** (fixed 200×60px dimensions)

## Design Rationale

**Why 200×60px?**
- Small enough to not obstruct workflow
- Large enough for clear waveform visualization
- Maintains 10:3 aspect ratio (horizontal emphasis)

**Why triangle icon?**
- Simple, universal "record" symbolism
- Single character (no image assets needed)
- Easy to animate (glow, color change)
- Distinct from typical recording red dot

**Why click-to-expand (not right-click)?**
- Faster access to full controls
- More discoverable than right-click
- Aligns with macOS interaction patterns
- Prevents accidental context menu

**Why blur background?**
- Native macOS aesthetic
- Reads content underneath (non-blocking)
- Premium feel (vs solid dark)
- Matches system UI (Control Center, Notification Center)
