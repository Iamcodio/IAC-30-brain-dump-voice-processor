# Phase C.1 End-to-End Test Plan

**Version:** v2.5.0-beta1
**Test Date:** TBD (Awaiting Manual Execution)
**Tester:** TBD

---

## Overview

This document provides step-by-step instructions for manually testing the complete Phase C.1 integration. These tests verify that all features work together seamlessly to deliver the "Holy Shit" moment.

**Estimated Time:** 30-45 minutes for complete test suite

---

## Pre-Test Setup

### 1. Clean Environment
```bash
# Remove any existing database
rm -f src/data/recordings.json

# Clear logs
rm -rf ~/Library/Logs/BrainDump/*

# Verify builds are fresh
npm run build && npm run build:native
```

### 2. System Requirements Check
- [ ] macOS 12 (Monterey) or later
- [ ] Microphone available
- [ ] ~200MB free disk space
- [ ] No other instance of BrainDump running

### 3. Reset Permissions (Optional)
If you want to test permission flows from scratch:
```bash
# Reset microphone permission
tccutil reset Microphone

# Reset accessibility permission
tccutil reset Accessibility
```

---

## Test 1: Complete User Journey ("Holy Shit" Moment)

**Objective:** Verify the complete flow from launch to auto-fill in <60 seconds

**Prerequisites:**
- Clean app state
- Microphone permission granted
- Accessibility permission granted (or ready to grant)

### Steps

#### 1.1 Launch Application
```bash
npm start
```

**Expected:**
- [ ] App launches within 2 seconds
- [ ] Tray icon appears in menu bar (gray, idle state)
- [ ] Main window opens showing recorder view
- [ ] Waveform container visible (placeholder state)
- [ ] Status shows "Ready - Press Ctrl+Y to start"

**Actual:**
- Launch time: _____ seconds
- Tray icon state: _____
- Main window visible: _____
- Issues: _____

---

#### 1.2 Start Recording
**Action:** Press `Ctrl+Y`

**Expected:**
- [ ] Tray icon changes to red
- [ ] Tray icon starts pulsing animation (500ms interval)
- [ ] Waveform appears and starts animating
- [ ] Status shows "Recording..."
- [ ] Red recording indicator visible
- [ ] Start latency <200ms

**Actual:**
- Tray icon state: _____
- Tray pulse animation: _____
- Waveform visible: _____
- Start latency: _____ ms
- Issues: _____

---

#### 1.3 Speak Into Microphone
**Action:** Say clearly: _"This is a test of the auto-fill feature in BrainDump"_

**Expected:**
- [ ] Waveform bars respond to voice
- [ ] Bars turn green during normal speech
- [ ] Bars turn yellow during loud speech
- [ ] Volume percentage updates in real-time
- [ ] Animation smooth (30fps, no stuttering)

**Actual:**
- Waveform responsiveness: _____
- Color changes correct: _____
- Volume percentage accurate: _____
- Animation quality: _____
- Issues: _____

---

#### 1.4 Test Silence Detection
**Action:** Stop speaking for 3 seconds

**Expected:**
- [ ] After 2 seconds, silence warning appears
- [ ] Warning message clear
- [ ] Waveform still animating (even if flat)

**Actual:**
- Silence warning appeared: _____
- Timing accurate: _____
- Issues: _____

---

#### 1.5 Stop Recording
**Action:** Press `Ctrl+Y` again

**Expected:**
- [ ] Tray animation stops immediately
- [ ] Tray icon changes to blue (processing)
- [ ] Waveform stops and clears
- [ ] Status shows "Transcribing..."
- [ ] Stop latency <200ms

**Actual:**
- Tray animation stopped: _____
- Tray icon blue: _____
- Waveform cleared: _____
- Stop latency: _____ ms
- Issues: _____

---

#### 1.6 Wait for Transcription
**Action:** Wait for Whisper to complete

**Expected:**
- [ ] Transcription completes within ~2-3 seconds (for 5s audio)
- [ ] Tray icon changes to gray (idle)
- [ ] Status shows "Ready - Press Ctrl+Y to start"
- [ ] New transcript appears in history view

**Actual:**
- Transcription time: _____ seconds
- Tray returned to idle: _____
- Transcript visible: _____
- Transcript accuracy: _____
- Issues: _____

---

#### 1.7 Navigate to History
**Action:** Click "History" in navigation

**Expected:**
- [ ] History view loads
- [ ] Latest transcript visible at top
- [ ] Preview shows first line
- [ ] Timestamp correct
- [ ] Duration shown

**Actual:**
- History loaded: _____
- Transcript visible: _____
- Preview text: _____
- Issues: _____

---

#### 1.8 Test Auto-Fill (The "Holy Shit" Moment)
**Action:**
1. Open Safari or Chrome
2. Navigate to google.com (or any site with a text field)
3. Click in the search field

**Expected (if permissions granted):**
- [ ] Text appears in field within 100ms
- [ ] Text matches transcript exactly
- [ ] No clipboard pollution
- [ ] User reaction: "Holy shit, this is amazing!"

**Expected (if permissions NOT granted):**
- [ ] macOS permission dialog appears
- [ ] Dialog explains accessibility permission needed
- [ ] User can grant permission in System Preferences

**Actual:**
- Auto-fill worked: _____
- Injection latency: _____ ms
- Text correct: _____
- Permission dialog shown: _____
- Issues: _____

---

#### 1.9 Test Auto-Fill in Multiple Apps
**Action:** Test in the following apps (if available):

**Chrome/Safari:**
- [ ] Google search field
- [ ] Gmail compose
- [ ] Google Docs

**Native Apps:**
- [ ] Notes.app
- [ ] TextEdit
- [ ] Mail.app

**Developer Tools:**
- [ ] VS Code
- [ ] Slack
- [ ] Obsidian or Notion

**Result:**
| App | Auto-Fill Worked | Latency (ms) | Notes |
|-----|------------------|--------------|-------|
| Chrome (Google) | | | |
| Gmail | | | |
| Notes.app | | | |
| TextEdit | | | |
| VS Code | | | |
| Slack | | | |

**Success Rate:** _____ / _____ apps (target: 90%)

---

#### 1.10 Measure Complete Journey Time
**Start:** App launch
**End:** First successful auto-fill

**Target:** <60 seconds
**Actual:** _____ seconds

**Met target:** _____

---

## Test 2: Error Handling Scenarios

**Objective:** Verify graceful error handling in failure cases

### 2.1 Deny Microphone Permission

**Setup:**
```bash
# Reset microphone permission
tccutil reset Microphone
# Relaunch app
npm start
```

**Action:** Try to start recording (Ctrl+Y)

**Expected:**
- [ ] Permission dialog appears
- [ ] If denied, clear error message shown
- [ ] Tray shows error state (yellow)
- [ ] App does not crash
- [ ] User can retry after granting permission

**Actual:**
- Permission dialog shown: _____
- Error message clear: _____
- Tray state correct: _____
- App stable: _____
- Issues: _____

---

### 2.2 Deny Accessibility Permission

**Setup:**
1. Open System Preferences
2. Go to Privacy & Security → Accessibility
3. Disable BrainDump (if enabled)

**Action:** Try to auto-fill

**Expected:**
- [ ] Auto-fill does not occur
- [ ] Settings UI shows "Permission Required" message
- [ ] App continues to work normally
- [ ] Recording still functional
- [ ] No crashes

**Actual:**
- Auto-fill blocked: _____
- Settings UI accurate: _____
- App stable: _____
- Recording works: _____
- Issues: _____

---

### 2.3 Trigger Transcription Failure

**Action:**
1. Record very short audio (<0.5s)
2. OR record silence only

**Expected:**
- [ ] Tray shows error state (yellow)
- [ ] Error message logged
- [ ] App returns to idle state
- [ ] Next recording works normally

**Actual:**
- Error handled: _____
- Tray state correct: _____
- Recovery successful: _____
- Issues: _____

---

### 2.4 Test Blacklisted App

**Action:**
1. Open System Preferences (or add it to blacklist in settings)
2. Click in a text field in System Preferences

**Expected:**
- [ ] Auto-fill does NOT occur
- [ ] No error shown (silent skip)
- [ ] Logs show blacklist skip message

**Actual:**
- Auto-fill skipped: _____
- Logs correct: _____
- Issues: _____

---

## Test 3: Performance Validation

**Objective:** Measure actual performance metrics

### 3.1 App Launch Time

**Action:** Measure time from `npm start` to main window visible

**Measurements:** (Run 3 times, take average)
1. _____ seconds
2. _____ seconds
3. _____ seconds

**Average:** _____ seconds
**Target:** <2 seconds
**Met:** _____

---

### 3.2 Recording Start Latency

**Action:** Measure time from Ctrl+Y press to waveform first frame

**Method:** Use macOS stopwatch or screen recording

**Measurements:** (Run 5 times, take average)
1. _____ ms
2. _____ ms
3. _____ ms
4. _____ ms
5. _____ ms

**Average:** _____ ms
**Target:** <200ms
**Met:** _____

---

### 3.3 Transcription Performance

**Action:** Record 10 seconds of speech, measure transcription time

**Measurements:** (Run 3 times)
| Run | Audio Duration | Transcription Time | Speed Ratio |
|-----|----------------|---------------------|-------------|
| 1 | 10s | _____ s | _____ x |
| 2 | 10s | _____ s | _____ x |
| 3 | 10s | _____ s | _____ x |

**Average Speed:** _____ x real-time
**Target:** >10x real-time
**Met:** _____

---

### 3.4 Auto-Fill Injection Latency

**Action:** Measure time from text field focus to text appearing

**Method:** Use screen recording with frame-by-frame analysis

**Measurements:** (Run 10 times in different apps)
| App | Latency (ms) |
|-----|--------------|
| Chrome | _____ |
| Safari | _____ |
| Notes | _____ |
| TextEdit | _____ |
| VS Code | _____ |
| Average | _____ |

**Average:** _____ ms
**Target:** <100ms
**Met:** _____

---

### 3.5 Tray Icon State Update

**Action:** Measure time from recording stop to tray color change

**Measurements:** (Run 5 times)
1. _____ ms
2. _____ ms
3. _____ ms
4. _____ ms
5. _____ ms

**Average:** _____ ms
**Target:** <100ms
**Met:** _____

---

### 3.6 Resource Usage

**Action:** Monitor Activity Monitor during 2-minute recording session

**Measurements:**

**Idle State:**
- CPU: _____ %
- Memory: _____ MB

**Recording (with waveform):**
- CPU: _____ %
- Memory: _____ MB

**Transcribing:**
- CPU: _____ %
- Memory: _____ MB

**Targets:**
- CPU (recording): <10%
- Memory (idle): <150MB
- Memory (recording): <200MB

**Met:** _____

---

## Test 4: Manual Trigger Mode

**Objective:** Verify Ctrl+Shift+V manual auto-fill

### 4.1 Enable Manual Mode

**Action:**
1. Open Settings
2. Set "Require Manual Trigger" to ON
3. Save settings

**Expected:**
- [ ] Settings saved
- [ ] Auto-fill no longer automatic

---

### 4.2 Test Manual Fill

**Action:**
1. Record a transcript
2. Click in a text field
3. Press Ctrl+Shift+V

**Expected:**
- [ ] Text field does NOT auto-fill on focus
- [ ] Pressing Ctrl+Shift+V fills text
- [ ] Latency <100ms

**Actual:**
- Auto mode disabled: _____
- Manual trigger worked: _____
- Latency: _____ ms
- Issues: _____

---

## Test 5: Settings UI Functionality

**Objective:** Verify all settings UI controls work

### 5.1 Navigate to Settings

**Action:** Click "Settings" in navigation

**Expected:**
- [ ] Settings view loads
- [ ] All controls visible
- [ ] Current settings populated

---

### 5.2 Toggle Auto-Fill Enable/Disable

**Action:**
1. Toggle "Enable Auto-Fill" OFF
2. Try to auto-fill
3. Toggle "Enable Auto-Fill" ON
4. Try to auto-fill

**Expected:**
- [ ] When OFF, auto-fill does not occur
- [ ] When ON, auto-fill works
- [ ] Settings persist across restarts

**Actual:**
- Toggle OFF worked: _____
- Toggle ON worked: _____
- Settings persisted: _____
- Issues: _____

---

### 5.3 Add App to Blacklist

**Action:**
1. Add "com.google.Chrome" to blacklist
2. Save settings
3. Try to auto-fill in Chrome

**Expected:**
- [ ] App added to list
- [ ] Auto-fill skipped in Chrome
- [ ] Auto-fill still works in other apps

**Actual:**
- Blacklist add worked: _____
- Chrome blocked: _____
- Other apps work: _____
- Issues: _____

---

### 5.4 Check Permissions Status

**Action:** View permission status in Settings UI

**Expected:**
- [ ] Shows "Granted" if permissions enabled
- [ ] Shows "Not Granted" if permissions disabled
- [ ] "Request Permissions" button functional

**Actual:**
- Status accurate: _____
- Request button works: _____
- Issues: _____

---

## Test 6: Edge Cases & Stress Testing

### 6.1 Very Long Transcript (>1000 words)

**Action:** Record 2-3 minutes of continuous speech

**Expected:**
- [ ] Transcription completes successfully
- [ ] Auto-fill injects full text
- [ ] No truncation
- [ ] No performance degradation

**Actual:**
- Transcript length: _____ words
- Auto-fill worked: _____
- Issues: _____

---

### 6.2 Special Characters in Transcript

**Action:** Speak text with symbols: "Test @ #hashtag $100 50% https://example.com"

**Expected:**
- [ ] Transcription captures symbols
- [ ] Auto-fill preserves symbols
- [ ] No escaping issues

**Actual:**
- Symbols preserved: _____
- Issues: _____

---

### 6.3 Rapid Recording Sessions

**Action:** Record 10 transcripts in quick succession (<5s between)

**Expected:**
- [ ] All recordings saved
- [ ] No crashes
- [ ] Latest transcript always auto-fills
- [ ] No memory leaks

**Actual:**
- Recordings saved: _____ / 10
- App stable: _____
- Correct transcript auto-filled: _____
- Memory usage stable: _____
- Issues: _____

---

### 6.4 App Restart Persistence

**Action:**
1. Configure settings (disable auto-fill, add blacklist)
2. Quit app
3. Relaunch app
4. Check settings

**Expected:**
- [ ] Settings persisted
- [ ] Auto-fill state correct
- [ ] Blacklist intact

**Actual:**
- Settings persisted: _____
- Issues: _____

---

## Summary & Sign-Off

### Test Results Overview

| Test Category | Pass Rate | Notes |
|---------------|-----------|-------|
| Complete User Journey | _____ % | |
| Error Handling | _____ % | |
| Performance Validation | _____ % | |
| Manual Trigger Mode | _____ % | |
| Settings UI | _____ % | |
| Edge Cases | _____ % | |

**Overall Pass Rate:** _____ %

---

### Critical Issues Found

1. _____
2. _____
3. _____

---

### Non-Critical Issues Found

1. _____
2. _____
3. _____

---

### Performance Summary

| Metric | Target | Actual | Met |
|--------|--------|--------|-----|
| App launch | <2s | _____ s | _____ |
| Recording start | <200ms | _____ ms | _____ |
| Transcription speed | >10x | _____ x | _____ |
| Auto-fill latency | <100ms | _____ ms | _____ |
| Tray update | <100ms | _____ ms | _____ |
| CPU (recording) | <10% | _____ % | _____ |
| Memory (idle) | <150MB | _____ MB | _____ |
| Memory (recording) | <200MB | _____ MB | _____ |

---

### Beta Release Recommendation

**Ready for Beta Release:** ☐ YES / ☐ NO / ☐ WITH CAVEATS

**Blocker Issues:** _____

**Recommended Actions:**
1. _____
2. _____
3. _____

---

### Tester Sign-Off

**Tested By:** _____________________
**Date:** _____________________
**macOS Version:** _____________________
**Hardware:** _____________________
**Signature:** _____________________

---

*End of E2E Test Plan*
