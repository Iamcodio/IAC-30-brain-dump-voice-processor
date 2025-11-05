# Quick Start: Testing v2.5.0-beta1

**Purpose:** Get the app running and verify the "Holy Shit" moment in 5 minutes

---

## Prerequisites Check (1 minute)

```bash
# Verify you're in the project root
pwd
# Should show: /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor

# Check builds are complete
ls dist/main.js
ls build/Release/accessibility.node

# If either is missing, rebuild:
npm run build && npm run build:native
```

---

## Launch the App (30 seconds)

```bash
# Clean start (optional but recommended)
rm -f src/data/recordings.json

# Launch
npm start
```

**Expected:**
- App launches in ~2 seconds
- Main window opens with recorder view
- Gray tray icon appears in menu bar

**If fails:** Check console for errors, ensure microphone permissions granted

---

## The "Holy Shit" Moment Test (2 minutes)

### 1. Record Your Voice (20 seconds)

1. Press `Ctrl+Y`
   - ✅ Tray icon turns red and pulses
   - ✅ Waveform appears and animates

2. Speak clearly: _"This is a test of the BrainDump auto-fill feature"_
   - ✅ Waveform bars respond to your voice
   - ✅ Green bars during normal speech

3. Press `Ctrl+Y` again
   - ✅ Tray stops pulsing, turns blue
   - ✅ Status shows "Transcribing..."

4. Wait 2-3 seconds
   - ✅ Tray turns gray (idle)
   - ✅ Transcript appears in window

---

### 2. Test Auto-Fill (30 seconds)

**Method 1: Chrome/Safari**
1. Open browser
2. Go to google.com
3. Click in search field
4. **CRITICAL:** Does text appear instantly?

**Method 2: Notes.app**
1. Open Notes
2. Create new note
3. Click in note body
4. **CRITICAL:** Does text appear instantly?

**If text doesn't appear:**
- macOS may prompt for Accessibility permissions
- Open System Preferences > Privacy & Security > Accessibility
- Enable BrainDump
- Try again

**If still doesn't work:**
- Check Settings view - does it show permissions status?
- Check console logs for errors

---

### 3. Verify Tray States (30 seconds)

Test the tray icon visual feedback:

1. **Idle State:**
   - Tray should be gray
   - Tooltip: "BrainDump - Ready to record"

2. **Recording State:**
   - Press Ctrl+Y
   - Tray should turn red and pulse
   - Tooltip: "BrainDump - Recording..."

3. **Processing State:**
   - Press Ctrl+Y to stop
   - Tray should turn blue (no pulse)
   - Tooltip: "BrainDump - Processing transcript..."

4. **Return to Idle:**
   - Wait for transcription
   - Tray should turn gray
   - Tooltip: "BrainDump - Ready to record"

---

### 4. Verify Waveform (30 seconds)

1. Press Ctrl+Y to start recording
2. **Speak normally:** Bars should be green
3. **Speak loudly:** Bars should turn yellow/red
4. **Stop speaking:** After 2s, silence warning should appear
5. Press Ctrl+Y to stop
6. Waveform should clear

---

## Quick Checks (30 seconds)

### Navigation
- Click "History" → Should see list of recordings
- Click "Settings" → Should see auto-fill settings
- Click "Recorder" → Should return to main view

### Settings
- Toggle "Enable Auto-Fill" OFF → Auto-fill should stop working
- Toggle "Enable Auto-Fill" ON → Auto-fill should work again

### Tray Menu
- Right-click tray icon
- Menu should show:
  - Status (gray dot, "Idle - Ready to record")
  - Show Window
  - Hide Window
  - Quit BrainDump

---

## Success Criteria

### ✅ Basic Functionality
- [ ] App launches without errors
- [ ] Recording starts/stops with Ctrl+Y
- [ ] Transcription completes successfully
- [ ] Transcript appears in history

### ✅ Auto-Fill (The Key Feature)
- [ ] Text appears in focused text fields
- [ ] Injection happens instantly (<100ms)
- [ ] Works in multiple apps (Chrome, Notes, etc.)
- [ ] No clipboard pollution

### ✅ Visual Feedback
- [ ] Tray icon shows 4 states correctly
- [ ] Tray pulse animation smooth
- [ ] Waveform animates during recording
- [ ] Waveform colors change with volume

### ✅ User Experience
- [ ] Flow feels smooth and natural
- [ ] No confusing errors or delays
- [ ] "Holy Shit" moment achieved
- [ ] Total time from launch to first auto-fill: < 60 seconds

---

## Common Issues & Quick Fixes

### "Auto-fill doesn't work"
1. Check Settings → Permission status
2. Grant Accessibility permission in System Preferences
3. Restart BrainDump
4. Try again

### "Tray icon doesn't appear"
1. Check menu bar (may be hidden if too many icons)
2. Restart app
3. Check console for tray creation errors

### "Waveform doesn't show"
1. Check that you're on the Recorder view (not History or Settings)
2. Check browser console (F12) for canvas errors
3. Should fall back to text indicator if canvas fails

### "Transcription fails"
1. Speak for at least 1-2 seconds
2. Check microphone permissions
3. Verify Whisper model downloaded: `ls models/ggml-base.bin`
4. Check console for Python errors

---

## Performance Expectations

**Normal Performance:**
- App launch: 1-2 seconds
- Recording start: <200ms
- Transcription (10s audio): 1-2 seconds
- Auto-fill injection: <100ms (feels instant)
- Tray state update: <100ms (feels instant)

**If slower than expected:**
- First launch may be slower (macOS initialization)
- First transcription may be slower (model loading)
- First auto-fill may be slower (Accessibility API initialization)
- Subsequent operations should be fast

---

## Next Steps After Quick Test

### If Everything Works ✅
1. Run full E2E test suite (see E2E_TEST_PLAN.md)
2. Test in all your daily apps
3. Try edge cases (long transcripts, special characters, etc.)
4. Report successes and any issues

### If Something Doesn't Work ❌
1. Note the exact issue
2. Check console logs
3. Try to reproduce
4. Report with details:
   - macOS version
   - What didn't work
   - Console errors (if any)
   - Steps to reproduce

---

## Reporting Results

**Create a quick summary:**
```
BrainDump v2.5.0-beta1 Quick Test Results
-----------------------------------------
Date: [DATE]
Tester: [YOUR NAME]
macOS: [VERSION]
Hardware: [M1/M2/Intel]

✅/❌ App launched
✅/❌ Recording worked
✅/❌ Transcription worked
✅/❌ Auto-fill worked
✅/❌ Tray states correct
✅/❌ Waveform animated

"Holy Shit" moment achieved: ✅/❌
Time to first auto-fill: ____ seconds

Issues:
1. [ISSUE DESCRIPTION]
2. [ISSUE DESCRIPTION]

Notes:
[ANY ADDITIONAL FEEDBACK]
```

**Post to:**
- GitHub Issues (bugs)
- GitHub Discussions (feedback)
- Direct message to Keith

---

## Full Testing (Optional)

If quick test passes and you want to do comprehensive testing:
1. See **E2E_TEST_PLAN.md** for full test suite
2. Allow 30-45 minutes for complete testing
3. Test all 6 categories
4. Measure performance benchmarks
5. Document all findings

---

**Happy Testing! 🎉**

Remember: The goal is to feel that "Holy shit, this is amazing!" moment. If you don't feel it, we want to know why!

---

*Quick Start Guide - BrainDump v2.5.0-beta1*
