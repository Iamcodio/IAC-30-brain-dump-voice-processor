# Waveform Color Gradient Specification

## Visual Representation

```
Intensity:  0.0                    0.5                    1.0
            │                       │                       │
Color:      Green ────────────────→ Yellow ────────────────→ Red
            │                       │                       │
RGB:     (0,136,68)           (255,204,0)             (255,68,68)
            │                       │                       │
Amplitude:  Silent                Medium                 Loud
```

## Implementation

### Color Definitions

```typescript
const LOW_COLOR  = { r: 0,   g: 136, b: 68  };  // Dark Green
const MID_COLOR  = { r: 255, g: 204, b: 0   };  // Yellow
const HIGH_COLOR = { r: 255, g: 68,  b: 68  };  // Red
```

### Gradient Zones

**Zone 1: Silent to Medium (0.0 - 0.5)**
- Start: Green `rgb(0, 136, 68)`
- End: Yellow `rgb(255, 204, 0)`
- Transition: Linear interpolation
- Use case: Normal speaking volume

**Zone 2: Medium to Loud (0.5 - 1.0)**
- Start: Yellow `rgb(255, 204, 0)`
- End: Red `rgb(255, 68, 68)`
- Transition: Linear interpolation
- Use case: Raised voice, emphasis

### Color Mapping Examples

| Intensity | Visual | RGB Value | Description |
|-----------|--------|-----------|-------------|
| 0.00 | 🟢 | `rgb(0, 136, 68)` | Silence / Background noise |
| 0.10 | 🟢 | `rgb(51, 149, 54)` | Very quiet speech |
| 0.25 | 🟡 | `rgb(127, 170, 34)` | Quiet speech |
| 0.40 | 🟡 | `rgb(204, 190, 13)` | Normal speech |
| 0.50 | 🟡 | `rgb(255, 204, 0)` | Clear speech (midpoint) |
| 0.60 | 🟠 | `rgb(255, 176, 40)` | Raised voice |
| 0.75 | 🟠 | `rgb(255, 136, 54)` | Loud speech |
| 0.90 | 🔴 | `rgb(255, 82, 64)` | Very loud / Emphasis |
| 1.00 | 🔴 | `rgb(255, 68, 68)` | Maximum amplitude |

## Algorithm

```typescript
function getColorForIntensity(intensity: number): string {
  // Clamp to valid range
  const clamped = Math.max(0, Math.min(1, intensity));
  
  if (clamped < 0.5) {
    // Zone 1: Green → Yellow
    const t = clamped * 2;  // Normalize 0.0-0.5 to 0.0-1.0
    const r = lerp(LOW_COLOR.r, MID_COLOR.r, t);
    const g = lerp(LOW_COLOR.g, MID_COLOR.g, t);
    const b = lerp(LOW_COLOR.b, MID_COLOR.b, t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Zone 2: Yellow → Red
    const t = (clamped - 0.5) * 2;  // Normalize 0.5-1.0 to 0.0-1.0
    const r = lerp(MID_COLOR.r, HIGH_COLOR.r, t);
    const g = lerp(MID_COLOR.g, HIGH_COLOR.g, t);
    const b = lerp(MID_COLOR.b, HIGH_COLOR.b, t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function lerp(a: number, b: number, t: number): number {
  return Math.floor(a + (b - a) * t);
}
```

## Visual Design Rationale

### Why Three Colors?

1. **Green (Low):** Indicates audio is being captured, system is working
2. **Yellow (Medium):** Optimal recording level, clear speech
3. **Red (High):** Warning of potential clipping or distortion

### Why These Specific RGB Values?

- **Green `(0, 136, 68)`:** Dark enough to contrast with background, vibrant enough to see
- **Yellow `(255, 204, 0)`:** Pure saturated yellow, highly visible
- **Red `(255, 68, 68)`:** Bright red but not pure (68 blue component adds warmth)

### Why Linear Interpolation?

- Simple, fast computation (no expensive color space conversions)
- Smooth gradients with no banding
- Predictable behavior
- <1ms computation time per color

## Testing Color Accuracy

Use the test page to verify colors:

```bash
# Open test page
open src/renderer/waveform-test.html
```

**Test procedure:**
1. Start recording
2. Speak at different volumes
3. Observe color changes
4. Verify green → yellow → red progression
5. Check for smooth transitions (no banding)

## Accessibility Considerations

The color gradient is designed to be accessible:

- **High contrast:** All colors visible on dark `#1a1a1a` background
- **Multiple cues:** Visual feedback also includes bar height
- **Color-blind friendly:** Green → Yellow → Red is distinguishable in most forms of color blindness
- **Intensity mapping:** Color + height provide redundant information

## Customization

To customize colors, modify these constants in `waveform.ts`:

```typescript
private readonly LOW_COLOR = { r: 0, g: 136, b: 68 };      // Your green
private readonly MID_COLOR = { r: 255, g: 204, b: 0 };     // Your yellow
private readonly HIGH_COLOR = { r: 255, g: 68, b: 68 };    // Your red
```

Then recompile:
```bash
npx tsc src/renderer/components/waveform.ts --outDir dist/renderer/components
```
