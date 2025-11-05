# Minimal Test Suite Report

**Date:** 2025-10-26
**Objective:** Create a minimal, working test suite to avoid fixture chaos from running 150 tests simultaneously

---

## Summary

✅ **SUCCESS** - Created a minimal test suite that runs reliably with NO fixture errors

### Test Results

```
Running 4 tests using 1 worker

✅ App launched
  ✓  1 tests/e2e/minimal-test.spec.ts:20:5 › App launches successfully (171ms)
✅ Window count: 1
  ✓  2 tests/e2e/minimal-test.spec.ts:26:5 › Main window is visible (2ms)
Initial window count: 1
✅ Window count after overlay: 2
  ✓  3 tests/e2e/minimal-test.spec.ts:32:5 › Can show recording overlay (1.0s)
Windows after creating overlay: 2
✅ Windows after transcription complete: 2
  ✓  4 tests/e2e/minimal-test.spec.ts:53:5 › Can hide recording overlay (3.0s)

  4 passed (5.2s)
```

---

## Key Findings

### 1. Fixture Error Root Cause
- Running 150 tests in parallel caused fixture lifecycle chaos
- Multiple ElectronApplication instances competing for resources
- Solution: Use `--workers=1` and build up test suite gradually

### 2. Proper IPC Event Triggering
The overlay window is triggered by **IPC message events**, not direct method calls:

```typescript
// WRONG (doesn't trigger overlay creation)
mainWindow.webContents.send('show-recording-overlay');

// CORRECT (triggers overlay via ipc-message listener)
mainWindow.webContents.emit('ipc-message', null, 'recording-started');
```

### 3. Window Lifecycle States

| Event | Window Count | Overlay State |
|-------|-------------|---------------|
| App launch | 1 | Not created |
| `recording-started` | 2 | Recording (red pulse) |
| `transcription-complete` | 2 | Result (with auto-hide) |

### 4. Test Architecture Pattern

**Working Pattern:**
```typescript
let electronApp: ElectronApplication;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/main.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  });
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test('Test name', async () => {
  // Trigger events via evaluate
  await electronApp.evaluate(async ({ BrowserWindow }) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    mainWindow.webContents.emit('ipc-message', null, 'event-name');
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  // Verify results
  const windows = electronApp.windows();
  expect(windows.length).toBe(2);
});
```

---

## Test Coverage

### ✅ Currently Tested
1. App launches successfully
2. Main window is visible
3. Overlay window creation on recording start
4. Overlay persistence through transcription lifecycle

### 🔄 Next to Add (Gradual Build-up)
1. Tray icon state changes
2. Keyboard shortcut registration
3. Settings window creation
4. History window functionality
5. Audio recording integration
6. Transcription pipeline end-to-end

---

## Recommendations

### Immediate Actions
1. **Use minimal test suite as baseline** - `/tests/e2e/minimal-test.spec.ts`
2. **Add ONE test at a time** - Don't jump back to 150 tests
3. **Keep `--workers=1`** - Prevents fixture conflicts
4. **Clean processes between runs** - `pkill -9 electron playwright`

### Test Development Strategy
```bash
# Start with minimal suite
npx playwright test tests/e2e/minimal-test.spec.ts --headed --workers=1

# Add new test to minimal-test.spec.ts
# Run again to verify

# Once stable, create separate test files for different features
# tests/e2e/tray-functionality.spec.ts
# tests/e2e/settings-window.spec.ts
# tests/e2e/recording-pipeline.spec.ts

# Eventually run all with: --workers=1 still recommended
```

### Anti-Patterns to Avoid
❌ Don't run all tests until individual suites are stable
❌ Don't use parallel workers for Electron tests (fixture conflicts)
❌ Don't trigger overlay with `.send()` - use `.emit('ipc-message', ...)`
❌ Don't forget cleanup between test runs (`pkill -9 electron`)

---

## Files Created

**New File:**
- `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/tests/e2e/minimal-test.spec.ts`

**Purpose:**
- Baseline test suite for incremental development
- Template for proper Electron testing patterns
- Reference for IPC event triggering

---

## Next Steps

1. Add tray icon tests to minimal suite
2. Add settings window tests
3. Add recording pipeline tests (with mocked audio)
4. Create separate test files once each feature is stable
5. Eventually integrate into CI/CD with `--workers=1`

**Goal:** Build a comprehensive test suite without fixture chaos by adding tests incrementally and testing each addition.
