# Playwright E2E Testing Manual
**Created:** 2025-10-26 10:14:23 GMT (Dublin)  
**Project:** IAC-30 Brain Dump Voice Processor  
**Purpose:** Train sub-agent for parallel overlay testing

---

## Quick Start

```bash
# Run tests with UI and headed browser
npx playwright test --ui --headed

# Run specific test file
npx playwright test tests/e2e/quick-overlay-test.spec.ts --ui --headed

# Run with specific browser
npx playwright test --browser=chromium --headed
```

---

## Key Metrics to Collect

From test execution, measure:
- **CPU%** - Process CPU usage during recording
- **Memory** - RAM consumption in MB
- **FPS** - Waveform animation frame rate (target: 60fps)
- **Latency** - Time between events in milliseconds

---

## Test Structure

```typescript
import { test, expect } from '@playwright/test';

test('Overlay workflow', async ({ page }) => {
  // 1. Launch app
  await page.goto('about:blank');
  
  // 2. Trigger overlay (Ctrl+Y)
  await page.keyboard.press('Control+Y');
  
  // 3. Verify overlay visible
  const overlay = await page.locator('.overlay-container');
  await expect(overlay).toBeVisible();
  
  // 4. Measure performance
  const metrics = await page.evaluate(() => performance.getEntries());
  console.log('Performance:', metrics);
});
```

---

## Critical Test Cases

### 1. Overlay Creation
```typescript
test('Ctrl+Y creates overlay window', async ({ page }) => {
  await page.keyboard.press('Control+Y');
  await expect(page.locator('.overlay-minimized')).toBeVisible();
});
```

### 2. Verify Cross-Workspace Visibility
```typescript
test('Overlay visible on current workspace', async ({ page }) => {
  // Overlay should float above ALL apps
  const isAlwaysOnTop = await page.evaluate(() => {
    return window.electronAPI.isOverlayAlwaysOnTop();
  });
  expect(isAlwaysOnTop).toBe(true);
});
```

### 3. Full Workflow
```typescript
test('Recording → waveform → transcription', async ({ page }) => {
  // Start recording
  await page.keyboard.press('Control+Y');
  await page.click('#record-btn');
  
  // Verify waveform animates
  const canvas = await page.locator('#waveform');
  await expect(canvas).toBeVisible();
  
  // Stop recording
  await page.keyboard.press('Control+Y');
  
  // Verify transcription appears
  await page.waitForSelector('.transcript-text', { timeout: 5000 });
});
```

### 4. Performance Metrics
```typescript
test('Collect performance metrics', async ({ page }) => {
  const startTime = Date.now();
  
  // Start recording
  await page.keyboard.press('Control+Y');
  
  // Monitor CPU and Memory
  const metrics = await page.evaluate(() => {
    return {
      cpu: performance.measure('cpu'),
      memory: performance.memory?.usedJSHeapSize || 0,
      fps: 60 // Calculate from animation frames
    };
  });
  
  const latency = Date.now() - startTime;
  
  console.log('CPU:', metrics.cpu);
  console.log('Memory:', metrics.memory / 1024 / 1024, 'MB');
  console.log('FPS:', metrics.fps);
  console.log('Latency:', latency, 'ms');
});
```

---

## Playwright Config

**File:** `playwright.config.ts`

```typescript
export default {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    headless: false,  // Always headed for overlay testing
    viewport: null,
    launchOptions: {
      args: ['--disable-blink-features=AutomationControlled']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ]
};
```

---

## Common Commands

```bash
# UI mode with headed browser (RECOMMENDED)
npx playwright test --ui --headed

# Single test file
npx playwright test quick-overlay-test.spec.ts --headed

# Debug mode
npx playwright test --debug

# Show report
npx playwright show-report

# Codegen (record test)
npx playwright codegen
```

---

## Performance Targets

- **App launch:** <2s
- **Recording start:** <200ms
- **Transcription:** >10x real-time
- **Auto-fill injection:** <100ms
- **Tray state update:** <100ms
- **CPU during recording:** <10%
- **Memory during recording:** <200MB
- **Waveform FPS:** 60fps

---

## Debugging Tips

1. **Use UI mode:** `--ui` flag shows test execution visually
2. **Keep headed:** `--headed` shows actual browser window
3. **Add console.log():** Metrics appear in Playwright UI console
4. **Use page.pause():** Stops execution for manual inspection
5. **Screenshots:** `await page.screenshot({ path: 'debug.png' })`

---

## Current Test Status (from images)

✅ **quick-overlay-test.spec.ts exists**  
⏳ **TODO items:**
- FIX: Overlay window manager (vibrancy, floating level, click through)
- Rebuild TypeScript with new overlay settings
- Test Ctrl+Y creates overlay window (Playwright)
- Verify overlay visible on current workspace
- Test full workflow: recording → waveform → transcription
- Collect performance metrics (CPU%, Memory, FPS, latency)

---

## File Locations

- **Test files:** `/tests/e2e/*.spec.ts`
- **Overlay files:** `/src/renderer/overlay-*.html`
- **Main process:** `/src/main/overlay-window-manager.ts`
- **Config:** `/playwright.config.ts`

---

## Quick Reference

**Run E2E tests NOW:**
```bash
cd /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor
npx playwright test --ui --headed
```

**Expected behavior:**
1. Test launches Electron app
2. Presses Ctrl+Y
3. Overlay window appears floating above ALL windows
4. Recording starts → waveform animates
5. Recording stops → transcription appears
6. Metrics collected and logged

---

**End of Manual** - Ready for sub-agent training
