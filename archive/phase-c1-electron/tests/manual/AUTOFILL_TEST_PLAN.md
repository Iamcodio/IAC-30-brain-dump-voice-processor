# Auto-Fill Manual Test Plan

**Version:** 1.0
**Date:** 2025-01-26
**Tester:** _________________
**BrainDump Version:** 2.1.0

---

## Test Environment

### Prerequisites Checklist
- [ ] macOS 12+ installed (Version: _________)
- [ ] BrainDump app built and ready (`npm run build`)
- [ ] Microphone permissions granted
- [ ] Test applications installed:
  - [ ] Google Chrome
  - [ ] Safari
  - [ ] Firefox (optional)
  - [ ] VS Code (optional)
  - [ ] TextEdit (native)
  - [ ] Notes (native)
  - [ ] Messages (optional)
  - [ ] Slack (optional)
  - [ ] Notion (optional)

### Test Data Setup
- [ ] Sample transcript ready: "This is a test auto-fill transcript for BrainDump"
- [ ] Long transcript ready: 1000+ character text
- [ ] Special characters text: "Test with émojis 🎉 symbols @#$% and \"quotes\""
- [ ] Multiline text: "Line 1\nLine 2\nLine 3"

---

## Test 1: Permission Flow

**Objective:** Verify accessibility permission request and grant flow

### Steps
1. Launch BrainDump app
2. Navigate to Settings (if settings UI exists) or check permission status
3. Note initial permission status: [ ] Granted [ ] Not Granted
4. Click "Request Permissions" or equivalent button
5. Verify System Preferences opens to: Privacy & Security → Accessibility
6. Grant permission to BrainDump
7. Return to app

### Expected Results
- [ ] Permission status initially shows "Not Granted"
- [ ] System Preferences opens to correct panel
- [ ] After granting, app shows "Granted" status
- [ ] No errors or crashes

### Actual Results
```
Notes:



```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 2: Auto Mode - Google Chrome

**Objective:** Verify automatic auto-fill in Chrome browser

### Steps
1. Create test recording:
   - Press Ctrl+Y
   - Say: "This is a test auto-fill transcript for BrainDump"
   - Press Ctrl+Y to stop
   - Wait for transcription to complete
2. Verify auto-fill settings:
   - Mode: Auto (not Manual)
   - Enabled: Yes
3. Open Google Chrome
4. Navigate to: https://www.google.com
5. Click in the search field
6. Wait up to 2 seconds

### Expected Results
- [ ] Text auto-fills within 1 second
- [ ] Text matches transcript: "This is a test auto-fill transcript for BrainDump"
- [ ] No errors or crashes
- [ ] Field contains the full transcript

### Actual Results
```
Time to fill: _____ ms
Text filled:



```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 3: Auto Mode - Safari

**Objective:** Verify automatic auto-fill in Safari browser

### Steps
1. Use same recording from Test 2
2. Open Safari
3. Navigate to: https://www.google.com
4. Click in the search field
5. Wait up to 2 seconds

### Expected Results
- [ ] Text auto-fills within 1 second
- [ ] Text is correct
- [ ] No errors or crashes

### Actual Results
```
Time to fill: _____ ms
Text filled:



```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 4: Manual Trigger Mode

**Objective:** Verify manual trigger mode (Ctrl+Shift+V)

### Steps
1. Open Settings
2. Change mode to "Manual" (requireManualTrigger: true)
3. Create new recording: "Manual fill test content"
4. Open Chrome
5. Navigate to: https://www.google.com
6. Click in search field
7. Wait 3 seconds (verify NO auto-fill)
8. Press Ctrl+Shift+V
9. Observe results

### Expected Results
- [ ] No automatic fill occurs when field is focused
- [ ] After pressing Ctrl+Shift+V, text fills immediately
- [ ] Text is correct
- [ ] No errors

### Actual Results
```
Auto-fill occurred without shortcut? [ ] Yes [ ] No
Fill occurred after shortcut? [ ] Yes [ ] No
Text filled:



```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 5: Blacklist Functionality

**Objective:** Verify app blacklist prevents auto-fill

### Steps
1. Switch back to Auto mode
2. Open Settings
3. Add to blacklist: `com.apple.TextEdit`
4. Create recording: "Should not appear in TextEdit"
5. Open TextEdit
6. Create new document
7. Click in text area
8. Wait 3 seconds
9. Remove TextEdit from blacklist
10. Click in text area again

### Expected Results
- [ ] With TextEdit blacklisted, NO auto-fill occurs
- [ ] After removing from blacklist, auto-fill DOES occur
- [ ] No errors

### Actual Results
```
Fill occurred while blacklisted? [ ] Yes [ ] No
Fill occurred after removing? [ ] Yes [ ] No

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 6: Debouncing

**Objective:** Verify debouncing prevents double-fills

### Steps
1. Ensure Auto mode enabled
2. Create recording: "Debounce test"
3. Open Chrome → google.com
4. Click in search field (auto-fill should occur)
5. Immediately click outside field (blur)
6. Immediately click back in field (within 500ms)
7. Observe if second fill occurs

### Expected Results
- [ ] First focus triggers auto-fill
- [ ] Second focus within 500ms does NOT trigger fill (debounced)
- [ ] Field still contains text from first fill
- [ ] No errors

### Actual Results
```
First fill occurred? [ ] Yes [ ] No
Second fill occurred? [ ] Yes [ ] No (Expected: No)

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 7: App Compatibility Matrix

**Objective:** Test auto-fill across 10 different applications

### Test Procedure
For each app:
1. Create recording: "Test auto-fill for [AppName]"
2. Open application
3. Focus a text input field
4. Verify auto-fill occurs within 1 second
5. Record result

### Results Table

| App | Bundle ID | Type | Tested | Result | Time (ms) | Notes |
|-----|-----------|------|--------|--------|-----------|-------|
| Google Chrome | com.google.Chrome | Browser | [ ] | PASS / FAIL | ___ | |
| Safari | com.apple.Safari | Browser | [ ] | PASS / FAIL | ___ | |
| Firefox | org.mozilla.firefox | Browser | [ ] | PASS / FAIL | ___ | |
| VS Code | com.microsoft.VSCode | Editor | [ ] | PASS / FAIL | ___ | |
| Slack | com.tinyspeck.slackmacgap | Electron | [ ] | PASS / FAIL | ___ | |
| Notion | notion.id | Electron | [ ] | PASS / FAIL | ___ | |
| Obsidian | md.obsidian | Electron | [ ] | PASS / FAIL | ___ | |
| TextEdit | com.apple.TextEdit | Native | [ ] | PASS / FAIL | ___ | |
| Notes | com.apple.Notes | Native | [ ] | PASS / FAIL | ___ | |
| Messages | com.apple.MobileSMS | Native | [ ] | PASS / FAIL | ___ | |

### Success Criteria
- [ ] 9/10 apps working (90%+ compatibility)
- [ ] Average fill time <100ms
- [ ] No crashes

**Overall Compatibility Score:** ___/10 (___%)

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 8: Performance Testing

**Objective:** Verify auto-fill performance meets targets

### Test 8A: Small Transcript (<100 chars)
1. Create recording: "Quick test"
2. Open Chrome, focus search field
3. Measure time to fill (use stopwatch or observe)

**Result:** _____ ms (Target: <100ms)
**Status:** [ ] PASS [ ] FAIL

### Test 8B: Medium Transcript (~500 chars)
1. Create recording with 500-character transcript
2. Focus text field
3. Measure time to fill

**Result:** _____ ms (Target: <100ms)
**Status:** [ ] PASS [ ] FAIL

### Test 8C: Large Transcript (1000 chars)
1. Create recording with 1000-character transcript
2. Focus text field
3. Measure time to fill

**Result:** _____ ms (Target: <100ms)
**Status:** [ ] PASS [ ] FAIL

### Test 8D: Repeat 10 Times
1. Focus field, verify fill
2. Blur and refocus (wait >500ms)
3. Repeat 10 times
4. Verify consistent performance

**Average time:** _____ ms
**All within 100ms?** [ ] Yes [ ] No
**Status:** [ ] PASS [ ] FAIL

---

## Test 9: Error Handling

**Objective:** Verify graceful error handling

### Test 9A: Permission Revocation
1. Start with permissions granted
2. Open System Preferences → Privacy & Security → Accessibility
3. Uncheck BrainDump while app is running
4. Focus a text field in Chrome
5. Observe behavior

**Expected Results:**
- [ ] App shows error notification
- [ ] No crash
- [ ] Guidance provided to re-enable permissions

**Actual Results:**
```
Error shown? [ ] Yes [ ] No
App crashed? [ ] Yes [ ] No
Guidance provided? [ ] Yes [ ] No

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

### Test 9B: Empty Transcript
1. Create recording but don't speak (or speak very quietly)
2. Wait for transcription
3. Focus text field

**Expected Results:**
- [ ] No fill occurs (empty transcript)
- [ ] No error or crash

**Actual Results:**
```
Fill occurred? [ ] Yes [ ] No (Expected: No)
Error? [ ] Yes [ ] No

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

### Test 9C: App Switch During Fill
1. Create recording
2. Focus text field in Chrome
3. Immediately switch to another app (Cmd+Tab)
4. Observe behavior

**Expected Results:**
- [ ] No crash
- [ ] No errors in logs

**Actual Results:**
```
Crash? [ ] Yes [ ] No
Errors? [ ] Yes [ ] No

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 10: Edge Cases

**Objective:** Verify handling of edge cases

### Test 10A: Special Characters
1. Create recording: "Test with émojis 🎉 symbols @#$% and \"quotes\""
2. Focus text field
3. Verify all characters preserved

**Expected Results:**
- [ ] All characters fill correctly
- [ ] Emojis preserved: 🎉
- [ ] Symbols preserved: @#$%
- [ ] Quotes preserved: " "

**Actual Results:**
```
Characters correct? [ ] Yes [ ] No

Issues:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

### Test 10B: Multiline Text
1. Create recording with multiple sentences/lines
2. Focus text field (textarea in TextEdit)
3. Verify line breaks preserved

**Expected Results:**
- [ ] Line breaks preserved
- [ ] All lines present

**Actual Results:**
```
Line breaks preserved? [ ] Yes [ ] No

Text filled:




```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

### Test 10C: Very Long Transcript (5000+ chars)
1. Create recording with very long content
2. Focus text field
3. Verify complete fill

**Expected Results:**
- [ ] All text fills
- [ ] No truncation
- [ ] Performance acceptable (<150ms)

**Actual Results:**
```
All text filled? [ ] Yes [ ] No
Time: _____ ms

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

### Test 10D: Rapid Focus Changes
1. Open Chrome with multiple input fields
2. Create recording
3. Rapidly click between 5 different text fields
4. Observe behavior

**Expected Results:**
- [ ] No crashes
- [ ] Debouncing works
- [ ] No double-fills

**Actual Results:**
```
Crashes? [ ] Yes [ ] No
Double fills? [ ] Yes [ ] No

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 11: Settings Persistence

**Objective:** Verify settings persist across app restarts

### Steps
1. Configure settings:
   - Enabled: Yes
   - Mode: Manual
   - Debounce: 1000ms
   - Blacklist: ["com.test.app1", "com.test.app2"]
2. Note settings
3. Quit BrainDump completely
4. Relaunch BrainDump
5. Check settings

### Expected Results
- [ ] All settings retained
- [ ] Enabled: Yes
- [ ] Mode: Manual
- [ ] Debounce: 1000ms
- [ ] Blacklist: ["com.test.app1", "com.test.app2"]

### Actual Results
```
Settings retained? [ ] Yes [ ] No

Discrepancies:




```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Test 12: Usage Statistics

**Objective:** Verify usage tracking

### Steps
1. Create recording (note ID or timestamp)
2. Perform auto-fill 3 times:
   - Focus field, verify fill
   - Wait >500ms
   - Focus field again, verify fill
   - Repeat once more
3. Check recording history or database
4. Verify usage count

### Expected Results
- [ ] Usage count shows 3
- [ ] Last fill timestamp updated
- [ ] No errors

### Actual Results
```
Usage count: _____ (Expected: 3)
Timestamp updated? [ ] Yes [ ] No

Notes:


```

**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED

---

## Overall Test Summary

### Test Results Overview

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Permission Flow | PASS / FAIL | |
| 2 | Auto Mode - Chrome | PASS / FAIL | |
| 3 | Auto Mode - Safari | PASS / FAIL | |
| 4 | Manual Trigger Mode | PASS / FAIL | |
| 5 | Blacklist | PASS / FAIL | |
| 6 | Debouncing | PASS / FAIL | |
| 7 | App Compatibility | PASS / FAIL | ___/10 apps |
| 8 | Performance | PASS / FAIL | Avg: ___ms |
| 9 | Error Handling | PASS / FAIL | |
| 10 | Edge Cases | PASS / FAIL | |
| 11 | Settings Persistence | PASS / FAIL | |
| 12 | Usage Statistics | PASS / FAIL | |

### Pass/Fail Summary
- **Total Tests:** 12 main tests + sub-tests
- **Passed:** _____
- **Failed:** _____
- **Blocked:** _____
- **Pass Rate:** _____%

### Acceptance Criteria Status
- [ ] ✅ Unit coverage >90%
- [ ] ✅ E2E pass for 9/10 apps (90%+ compatibility)
- [ ] ✅ Edge cases handled gracefully
- [ ] ✅ Performance <100ms average
- [ ] ✅ Compatibility matrix documented

### Critical Issues Found
```
1.

2.

3.

```

### Non-Critical Issues Found
```
1.

2.

3.

```

### Recommendations
```




```

### Tested By
**Name:** _________________
**Date:** _________________
**Signature:** _________________

### Reviewed By
**Name:** _________________
**Date:** _________________
**Signature:** _________________

---

## Appendix A: Troubleshooting Guide

### Auto-fill not working
1. Check accessibility permissions (System Preferences)
2. Verify auto-fill enabled in settings
3. Check if app is blacklisted
4. Verify recording has transcript content
5. Check logs for errors

### Performance issues
1. Check transcript length (>10,000 chars fails)
2. Verify system resources available
3. Check for other accessibility tools interfering
4. Review logs for errors

### App-specific issues
1. Some apps may have special text field types
2. Try different input fields in the app
3. Check app's accessibility settings
4. Report incompatible apps for investigation

---

## Appendix B: Bundle ID Reference

Common app bundle IDs for testing:

- **Chrome:** com.google.Chrome
- **Safari:** com.apple.Safari
- **Firefox:** org.mozilla.firefox
- **VS Code:** com.microsoft.VSCode
- **TextEdit:** com.apple.TextEdit
- **Notes:** com.apple.Notes
- **Mail:** com.apple.mail
- **Messages:** com.apple.MobileSMS
- **Slack:** com.tinyspeck.slackmacgap
- **Notion:** notion.id
- **Obsidian:** md.obsidian
- **1Password:** com.1password.1password
- **Keychain Access:** com.apple.keychainaccess

---

**End of Test Plan**
