# Waveform Visualizer - Testing Instructions

## Quick Test (2 minutes)

1. **Open Test Page**
   ```bash
   # From project root
   open src/renderer/waveform-test.html
   ```

2. **Click "Start Recording"**
   - Grant microphone permissions when prompted
   - You should see a dark canvas appear

3. **Speak into Microphone**
   - Observe the waveform bars animating
   - Quiet speech → Green bars
   - Normal speech → Yellow bars
   - Loud speech → Red bars

4. **Verify Performance**
   - Check FPS counter shows ~30fps
   - CPU usage should be <5%
   - Memory should be ~8-9MB

5. **Test Stop/Restart**
   - Click "Stop Recording" → waveform should freeze
   - Click "Restart" → should clear and be ready to start again

## Expected Results

✅ **PASS Criteria:**
- Waveform displays immediately on start
- Bars animate smoothly at 30fps
- Colors change with volume (green → yellow → red)
- No console errors
- CPU usage <5%
- Memory stable (no continuous growth)

❌ **FAIL Criteria:**
- Black screen with no animation
- Console errors
- Choppy/stuttering animation
- High CPU usage (>10%)
- Memory growing continuously
- Browser crash/freeze

## Detailed Test Plan (10 minutes)

### 1. Initialization Test

**Test:** Canvas creation and setup
```javascript
// Should see:
- Canvas dimensions: 800×120
- Background color: Dark gray (#1a1a1a)
- No errors in console
```

**Pass:** ✅ Canvas appears with dark background
**Fail:** ❌ No canvas or console errors

---

### 2. Audio Input Test

**Test:** Microphone access and stream initialization
```javascript
// Click "Start Recording"
// Should see:
- Browser permission dialog
- Status changes to "Recording"
- Audio Context info populated
- FFT Size: 256
- Frequency Bins: 128
```

**Pass:** ✅ All info displayed correctly
**Fail:** ❌ Permission denied or info missing

---

### 3. Waveform Animation Test

**Test:** Real-time visualization
```javascript
// Speak at different volumes:
1. Whisper (very quiet)
2. Normal speaking voice
3. Raised voice / shout

// Should see:
1. Small green bars
2. Medium yellow bars
3. Tall red bars
```

**Pass:** ✅ Colors and heights change appropriately
**Fail:** ❌ No change or wrong colors

---

### 4. Performance Test

**Test:** CPU and memory efficiency
```javascript
// Monitor for 5 minutes:
- FPS should stay at 30 (±2)
- CPU should stay <5%
- Memory should stay <10MB
- Frame time should stay <35ms

// Test with:
- Continuous speech
- Silence periods
- Variable volume
```

**Pass:** ✅ All metrics within range
**Fail:** ❌ Any metric exceeds limits

---

### 5. Color Gradient Test

**Test:** Verify gradient accuracy
```javascript
// Speak at these volumes and verify colors:

Volume: Silent     → Expected: Green   rgb(0, 136, 68)
Volume: Very quiet → Expected: Green   rgb(~50, ~150, ~50)
Volume: Quiet      → Expected: Yellow  rgb(~130, ~170, ~30)
Volume: Normal     → Expected: Yellow  rgb(255, 204, 0)
Volume: Raised     → Expected: Orange  rgb(255, ~175, ~40)
Volume: Loud       → Expected: Red     rgb(255, ~80, ~65)
Volume: Very loud  → Expected: Red     rgb(255, 68, 68)
```

**Pass:** ✅ Smooth color transitions, no banding
**Fail:** ❌ Abrupt color changes or wrong colors

---

### 6. Lifecycle Test

**Test:** Start, stop, cleanup
```javascript
// Sequence:
1. Click "Start Recording" → Should start
2. Speak → Should see waveform
3. Click "Stop Recording" → Should freeze
4. Should NOT see errors in console
5. Click "Restart" → Should clear
6. Click "Start Recording" again → Should work normally

// Repeat 3 times to test for memory leaks
```

**Pass:** ✅ Works correctly all 3 times, stable memory
**Fail:** ❌ Errors on restart or memory growth

---

### 7. Error Handling Test

**Test:** Graceful error handling
```javascript
// Test 1: Deny microphone permission
- Click "Start Recording"
- Deny permission
- Should see: Error message (not browser crash)

// Test 2: Stop without start
- Refresh page
- Click "Stop Recording" (without starting)
- Should see: No error, button disabled

// Test 3: Multiple starts
- Click "Start Recording"
- Click "Start Recording" again (without stop)
- Should see: Warning in console, no crash
```

**Pass:** ✅ All errors handled gracefully
**Fail:** ❌ Any crashes or unhandled errors

---

### 8. Browser Compatibility Test

**Test:** Cross-browser support
```javascript
// Test in each browser:
- Chrome 119+
- Firefox 120+
- Safari 17+
- Edge 119+

// All should work identically
```

**Pass:** ✅ Works in all browsers
**Fail:** ❌ Fails in any browser

---

## Performance Benchmarks

### Target Metrics (M2 MacBook Air)

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| FPS | 30fps | 28-32fps | <25fps |
| Frame Time | 33ms | <35ms | >40ms |
| CPU Usage | 3-4% | <5% | >8% |
| Memory Start | 8MB | <10MB | >12MB |
| Memory (5min) | 9MB | <12MB | >15MB |
| Latency | 60ms | <100ms | >150ms |

### How to Measure

**FPS:** Displayed in test page (real-time)
**CPU:** Activity Monitor → Chrome Helper (Renderer)
**Memory:** Chrome DevTools → Performance Monitor
**Latency:** Clap and observe visual delay

---

## Troubleshooting Guide

### Problem: No waveform visible

**Symptoms:** Black canvas, no bars
**Causes:**
1. Microphone permissions denied
2. No audio input detected
3. Wrong audio device selected

**Solutions:**
1. Check System Preferences → Security & Privacy → Microphone
2. Verify microphone is working (test in another app)
3. Check browser settings for default audio input

---

### Problem: Choppy animation

**Symptoms:** FPS <25, stuttering bars
**Causes:**
1. Too many browser tabs open
2. High CPU usage from other apps
3. GPU acceleration disabled

**Solutions:**
1. Close unnecessary tabs/apps
2. Check Activity Monitor for CPU hogs
3. Chrome → Settings → System → Use hardware acceleration

---

### Problem: Wrong colors

**Symptoms:** No green, or all red, or no color changes
**Causes:**
1. Microphone volume too high/low
2. Color gradient logic error
3. Canvas rendering issue

**Solutions:**
1. Adjust system microphone volume
2. Check console for errors
3. Try different browser

---

### Problem: Memory leak

**Symptoms:** Memory grows continuously
**Causes:**
1. Cleanup not called
2. Animation loop not stopped
3. Multiple visualizer instances

**Solutions:**
1. Click "Restart" to test cleanup
2. Check console for warnings
3. Refresh page and try again

---

### Problem: High CPU usage

**Symptoms:** CPU >10%, fan spinning
**Causes:**
1. Frame rate not limited
2. Multiple instances running
3. Other tabs using CPU

**Solutions:**
1. Check FPS counter (should be ~30)
2. Close other tabs
3. Restart browser

---

## Test Report Template

Copy and fill out after testing:

```
WAVEFORM VISUALIZER TEST REPORT
================================

Date: ___________
Tester: ___________
Browser: ___________
OS: ___________

QUICK TEST (2 min)
------------------
[ ] Canvas displays           PASS / FAIL
[ ] Microphone access works   PASS / FAIL
[ ] Waveform animates         PASS / FAIL
[ ] Colors change correctly   PASS / FAIL
[ ] Performance acceptable    PASS / FAIL

DETAILED TEST (10 min)
---------------------
[ ] Initialization Test       PASS / FAIL
[ ] Audio Input Test          PASS / FAIL
[ ] Waveform Animation Test   PASS / FAIL
[ ] Performance Test          PASS / FAIL
[ ] Color Gradient Test       PASS / FAIL
[ ] Lifecycle Test            PASS / FAIL
[ ] Error Handling Test       PASS / FAIL
[ ] Browser Compatibility     PASS / FAIL

PERFORMANCE METRICS
-------------------
Average FPS:     _____ fps   (Target: 30)
Frame Time:      _____ ms    (Target: <33)
CPU Usage:       _____ %     (Target: <5)
Memory Start:    _____ MB    (Target: <10)
Memory (5min):   _____ MB    (Target: <12)
Latency:         _____ ms    (Target: <100)

ISSUES FOUND
------------
1. ___________
2. ___________
3. ___________

OVERALL VERDICT
---------------
[ ] PASS - Ready for production
[ ] PASS WITH NOTES - Minor issues, acceptable
[ ] FAIL - Critical issues, needs fixes

Notes:
___________
___________
___________

Signature: ___________
```

---

## Automated Testing (Future)

For continuous integration, consider:

```javascript
// Playwright/Puppeteer test
test('waveform visualizer renders', async ({ page }) => {
  await page.goto('src/renderer/waveform-test.html');
  await page.click('#startBtn');

  // Grant permissions programmatically
  await page.context().grantPermissions(['microphone']);

  // Verify canvas exists
  const canvas = await page.$('#waveform');
  expect(canvas).not.toBeNull();

  // Verify animation started
  const status = await page.textContent('#status');
  expect(status).toContain('Recording');

  // Check performance
  const fps = await page.textContent('#fps');
  expect(parseInt(fps)).toBeGreaterThan(25);
});
```

---

**Questions?** See `/src/renderer/components/README.md` for full documentation.
