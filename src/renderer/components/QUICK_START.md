# Waveform Visualizer - Quick Start Guide

## 30-Second Setup

```typescript
// 1. Import
import { WaveformVisualizer } from './components/waveform.js';

// 2. Create
const canvas = document.getElementById('waveform');
const visualizer = new WaveformVisualizer(canvas);

// 3. Initialize
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
await visualizer.initFromStream(stream);

// 4. Start
visualizer.start();

// 5. Stop (when done)
visualizer.stop();
visualizer.cleanup();
```

## HTML Setup

```html
<canvas id="waveform"></canvas>
<script type="module">
  import { WaveformVisualizer } from './components/waveform.js';
  // ... use it
</script>
```

## Key Methods

| Method | When to Use |
|--------|-------------|
| `new WaveformVisualizer(canvas)` | Once, at initialization |
| `await initFromStream(stream)` | Once, after getting mic access |
| `start()` | When recording starts |
| `stop()` | When recording pauses |
| `cleanup()` | When permanently done |

## Common Patterns

### Start Recording
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
await visualizer.initFromStream(stream);
visualizer.start();
```

### Stop Recording
```typescript
visualizer.stop();
```

### Complete Cleanup
```typescript
visualizer.cleanup();
stream.getTracks().forEach(t => t.stop());
```

## Performance Tips

- ✅ Call `cleanup()` when done (prevents memory leaks)
- ✅ Reuse same visualizer instance (don't create multiple)
- ✅ Stop media stream tracks when finished
- ✅ Monitor FPS in production (should be 30fps)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Black screen | Check mic permissions |
| Error on start | Call `initFromStream()` first |
| Memory growing | Call `cleanup()` when done |
| Choppy animation | Close other tabs, check CPU |

## Test Page

Open in browser: `src/renderer/waveform-test.html`

## Full Docs

See: `src/renderer/components/README.md`
