# Waveform Audio Pipeline Test Guide

**Purpose**: Verify that the overlay waveform visualization correctly displays real-time audio from the microphone.

---

## Quick Test (30 seconds)

### 1. Start Application
```bash
cd /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor
npm start
```

### 2. Trigger Recording
- Press **Ctrl+Y** (or Cmd+Y on macOS)
- Overlay window should appear in bottom-right corner

### 3. Grant Microphone Permission
- Browser will prompt: "BrainDump wants to access your microphone"
- Click **Allow**

### 4. Verify Waveform
- You should see animated green/yellow/red bars
- **Speak into microphone** - bars should react to your voice
- **Stay silent** - bars should be minimal (green, low height)
- **Speak loudly** - bars should turn yellow/red and increase in height

### 5. Stop Recording
- Press **Ctrl+Y** again
- Waveform should stop animating
- Overlay should hide or show transcription result

---

## Expected Visual Behavior

### Normal Operation
```
┌─────────────────────────────────────────┐
│  🔴 Recording              0:05          │
│                                         │
│  ████ ██ ███ ██ ████ ███ ██ ███ ██     │  ← Animated bars
│  (Green when quiet, Yellow/Red when loud)│
│                                         │
│         [Stop (Ctrl+Y)]                 │
└─────────────────────────────────────────┘
```

### Color Transitions
- **Green bars** (quiet): 0-30% intensity
- **Yellow bars** (medium): 30-70% intensity
- **Red bars** (loud): 70-100% intensity

### Animation
- Bars update at ~30 FPS
- Smooth color transitions
- Bars grow/shrink based on audio amplitude

---

## Console Output Verification

### Expected Logs (in Overlay DevTools)

1. **On Overlay Load:**
   ```
   Overlay visualizer script loaded
   Overlay initializing...
   Waveform visualizer created
   ```

2. **On DOM Ready:**
   ```
   Overlay DOM loaded, starting visualization...
   Starting recording visualization...
   ```

3. **After Permission Grant:**
   ```
   Microphone access granted
   WaveformVisualizer initialized: 128 frequency bins
   WaveformVisualizer started
   ```

4. **During Recording:**
   ```
   (No errors, smooth animation)
   ```

5. **On Stop:**
   ```
   Stopping recording visualization...
   WaveformVisualizer stopped
   WaveformVisualizer cleaned up
   Visualization stopped
   ```

---

## Troubleshooting

### Issue: No waveform appears

**Check 1: Microphone Permission**
```javascript
// In overlay DevTools console:
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('✅ Mic access OK:', stream.getAudioTracks()))
  .catch(err => console.error('❌ Mic error:', err))
```

**Check 2: Canvas Element**
```javascript
// In overlay DevTools console:
console.log('Canvas:', document.getElementById('waveform'))
console.log('Waveform object:', waveform)
```

**Check 3: Audio Context**
```javascript
// In overlay DevTools console:
console.log('AudioContext state:', waveform?.audioContext?.state)
// Should be 'running'
```

### Issue: Waveform not animating

**Check 1: Animation Loop**
```javascript
// In overlay DevTools console:
console.log('Is running:', waveform?.isRunning)
console.log('Animation ID:', waveform?.animationId)
```

**Check 2: Frequency Data**
```javascript
// In overlay DevTools console:
waveform?.analyser?.getByteFrequencyData(new Uint8Array(128))
// Should return non-zero values when speaking
```

### Issue: Permission denied

**Solution 1: Reset Permissions**
1. Open Chrome settings: `chrome://settings/content/microphone`
2. Remove BrainDump from blocked list
3. Restart app and grant permission

**Solution 2: Check System Preferences**
1. System Preferences → Security & Privacy → Privacy
2. Select "Microphone" from left sidebar
3. Ensure "Electron" or "BrainDump" is checked

### Issue: Bars don't change color

**Check Color Calculation:**
```javascript
// In overlay DevTools console:
waveform.getColorForIntensity(0.2)  // Should be green
waveform.getColorForIntensity(0.5)  // Should be yellow
waveform.getColorForIntensity(0.9)  // Should be red
```

---

## Performance Testing

### Check Frame Rate
```javascript
// In overlay DevTools console:
let frameCount = 0;
let lastTime = performance.now();

const checkFPS = () => {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    console.log('FPS:', frameCount);
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(checkFPS);
};
checkFPS();
```
**Expected**: ~30 FPS

### Check CPU Usage
```bash
# In terminal while recording:
top -pid $(pgrep -f "Electron")
```
**Expected**: 2-5% CPU for waveform visualization

---

## Advanced Testing

### Test Microphone Input Levels
```javascript
// In overlay DevTools console:
const testMicLevel = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 256;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const checkLevel = () => {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
    console.log('Mic level:', avg.toFixed(2), '/255');
    setTimeout(checkLevel, 100);
  };
  checkLevel();
};
testMicLevel();
```

### Test Color Gradient
```javascript
// In overlay DevTools console:
for (let i = 0; i <= 10; i++) {
  const intensity = i / 10;
  const color = waveform.getColorForIntensity(intensity);
  console.log(`${(intensity * 100).toFixed(0)}%: ${color}`);
}
```
**Expected Output:**
```
0%: rgb(34, 197, 94)    // Green
10%: rgb(74, 193, 82)
20%: rgb(114, 189, 70)
30%: rgb(154, 185, 58)
40%: rgb(194, 181, 46)
50%: rgb(234, 179, 8)   // Yellow
60%: rgb(236, 147, 8)
70%: rgb(238, 115, 8)
80%: rgb(239, 83, 38)
90%: rgb(239, 51, 53)
100%: rgb(239, 68, 68)  // Red
```

---

## Integration Testing

### Test Full Recording Flow

1. **Start Recording** (Ctrl+Y)
   - ✅ Overlay appears
   - ✅ Microphone permission granted
   - ✅ Waveform animating
   - ✅ Python recorder process starts

2. **Speak for 5 seconds**
   - ✅ Waveform bars react to voice
   - ✅ Recording timer increments
   - ✅ Audio being captured (check console for "Recording...")

3. **Stop Recording** (Ctrl+Y)
   - ✅ Waveform stops animating
   - ✅ Microphone released
   - ✅ Python recorder saves WAV file
   - ✅ Transcription starts

4. **Check Output Files**
   ```bash
   ls -lh /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/outputs/audio/
   ls -lh /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/outputs/transcripts/
   ```
   - ✅ WAV file created with correct timestamp
   - ✅ Markdown transcript created after transcription

---

## Regression Testing

### Ensure Old Functionality Still Works

**Test 1: Recording without overlay**
- Start app
- Press Ctrl+Y
- Close overlay immediately
- Audio should still be recorded

**Test 2: Multiple recordings**
- Record 3 times in a row
- Each should have waveform
- Each should save WAV file
- No memory leaks

**Test 3: Error handling**
- Deny microphone permission
- Recording should still work (Python captures audio)
- Overlay should show graceful error message

---

## Success Criteria

All of the following must be true:

- ✅ Overlay shows waveform canvas
- ✅ Microphone permission prompt appears
- ✅ After permission grant, bars animate
- ✅ Bars respond to audio input (speak = taller bars)
- ✅ Colors transition: Green → Yellow → Red
- ✅ Animation runs at ~30 FPS
- ✅ Recording still saves WAV file
- ✅ Transcription still works
- ✅ Cleanup happens when overlay closes
- ✅ No console errors

---

## Debugging Tips

### Enable Verbose Logging
Add to overlay.js temporarily:
```javascript
// After line 127 in render()
console.log('Frame:', {
  isRunning: this.isRunning,
  dataArrayLength: this.dataArray?.length,
  maxAmplitude: Math.max(...this.dataArray),
  avgAmplitude: this.dataArray.reduce((a,b) => a+b) / this.dataArray.length
});
```

### Visualize Audio Data
```javascript
// In overlay DevTools console:
setInterval(() => {
  if (waveform?.dataArray) {
    const max = Math.max(...waveform.dataArray);
    const avg = waveform.dataArray.reduce((a,b) => a+b) / waveform.dataArray.length;
    console.log('📊', '█'.repeat(Math.floor(max/10)), `Max: ${max}, Avg: ${avg.toFixed(1)}`);
  }
}, 100);
```

### Check Microphone Device
```javascript
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const mics = devices.filter(d => d.kind === 'audioinput');
    console.log('Available microphones:', mics);
  });
```

---

## Final Checklist

Before closing this test session:

- [ ] Waveform displays correctly
- [ ] Audio visualization works
- [ ] Colors transition properly
- [ ] Recording still creates WAV files
- [ ] Transcription still works
- [ ] No memory leaks (check Activity Monitor)
- [ ] No console errors
- [ ] Documentation updated

---

**Test completed on**: _____________
**Tester**: _____________
**Result**: ✅ Pass / ❌ Fail
**Notes**: _____________
