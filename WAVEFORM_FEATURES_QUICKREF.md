# Waveform Features - Quick Reference Card

## 🎯 New Features at a Glance

### Volume Level Indicator
**What:** Real-time volume percentage in bottom-right corner
**Colors:**
- 🔘 Gray (< 20%) - Too quiet, speak louder
- 🟢 Green (20-50%) - Perfect level
- 🟡 Yellow (50-80%) - Getting loud
- 🔴 Red (> 80%) - Too loud, reduce volume

**When to use:** Monitor audio levels while recording to ensure optimal quality

---

### Silence Detection
**What:** Warning appears after 2 seconds of no audio
**Display:** Red overlay with "⚠️ No audio detected"
**Threshold:** 5% volume level

**When to use:** Know immediately if your microphone isn't picking up audio

---

### Performance Monitoring
**What:** Background FPS tracking with console warnings
**Target:** 30 FPS (smooth animation)
**Warning:** Logs to console if FPS < 20

**When to use:** Monitor performance during long recording sessions

---

### Responsive Sizing
**What:** Waveform automatically resizes with window
**Range:** 600px - 1200px width
**Behavior:** Maintains quality at all sizes

**When to use:** Resize window to fit your workflow, waveform adapts

---

## 🔧 Developer API

### Check Current State
```javascript
const state = window.__waveformManager.getState();
// Returns: { isRecording, currentVolume, currentFps, silenceWarning }
```

### Monitor in Real-Time
```javascript
setInterval(() => {
  const fps = window.__waveformManager.waveform.getCurrentFps();
  const vol = window.__waveformManager.waveform.getCurrentVolume();
  console.log(`FPS: ${fps}, Volume: ${Math.round(vol * 100)}%`);
}, 1000);
```

### Manual Resize
```javascript
window.__waveformManager.waveform.resize(600, 100);
```

---

## 📊 Performance Targets

| Metric | Target | Warning |
|--------|--------|---------|
| FPS | 30 | < 20 |
| CPU | < 3% | > 10% |
| Memory | < 5MB | > 20MB |

---

## 🧪 Quick Test

1. **Start app:** `npm start`
2. **Press:** `Ctrl+Y` to record
3. **Look for:** Volume % in bottom-right
4. **Stay silent:** Wait 2 seconds for warning
5. **Speak:** Warning disappears
6. **Resize:** Window scales waveform

---

## 📁 Files Changed

- `src/renderer/components/waveform.ts` (+120 lines)
- `src/renderer-waveform.js` (+25 lines)

---

## 🎓 Tips

**Good Volume Levels:**
- Whisper/quiet speech: 15-25% (gray/green)
- Normal speech: 30-50% (green)
- Loud speech: 55-75% (yellow)
- Yelling: > 80% (red - too loud!)

**Silence Warning:**
- Appears after 2 seconds
- Helps catch microphone issues early
- Disappears immediately when audio detected

**Performance:**
- FPS should stay 30 during recording
- If FPS drops, check Activity Monitor
- Close other apps if performance degrades

---

## 🐛 Troubleshooting

**Volume meter shows 0%:**
- Check microphone permissions
- Verify correct input device selected
- Test with `Ctrl+Y` and speak

**Silence warning won't go away:**
- Speak louder (> 5% threshold)
- Check microphone is working
- Verify microphone permissions

**Low FPS warning:**
- Close CPU-intensive apps
- Reduce window size
- Check for browser extensions

**Waveform not resizing:**
- Try manual resize in console
- Check window resize listener
- Verify container has size

---

## 📞 Support

**Test Suite:** `test_waveform_console.js`
**Full Docs:** `WAVEFORM_POLISH_COMPLETE.md`
**Test Results:** `test_waveform_polish.md`

---

Last Updated: 2025-10-26
Version: 2.1.0 (Phase B)
