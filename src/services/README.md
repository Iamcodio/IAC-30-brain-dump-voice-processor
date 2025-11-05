# AccessibilityService - Quick Reference

## Overview

The `AccessibilityService` is a TypeScript wrapper around BrainDump's native macOS Accessibility module. It provides a clean, type-safe API for monitoring text field focus and injecting text.

## Quick Start

```typescript
import { AccessibilityService } from './services/accessibility_service';

const service = new AccessibilityService();

// 1. Check permissions
if (!await service.ensurePermissions()) {
  console.log('Grant permissions in System Preferences');
  return;
}

// 2. Listen for text field focus
service.on('text-field-focused', async (event) => {
  if (event.canInject) {
    await service.injectText('Your text here');
  }
});

// 3. Start monitoring
service.startMonitoring();
```

## API Reference

### Methods

#### `ensurePermissions(): Promise<boolean>`
Check and request accessibility permissions.

**Returns**: `true` if granted, `false` otherwise

```typescript
const granted = await service.ensurePermissions();
```

---

#### `startMonitoring(): void`
Start monitoring for text field focus events.

**Emits**: `text-field-focused` events

```typescript
service.startMonitoring();
```

---

#### `stopMonitoring(): void`
Stop monitoring for text field focus events.

```typescript
service.stopMonitoring();
```

---

#### `injectText(text: string): Promise<boolean>`
Inject text into the currently focused text field.

**Parameters**:
- `text`: String to inject (max 10,000 chars)

**Returns**: `true` if successful, `false` otherwise

**Validates**:
- Text is not empty
- Text is not too long
- Text field is focused
- Field supports injection

```typescript
const success = await service.injectText('Hello World!');
```

---

#### `isActive(): boolean`
Check if monitoring is currently active.

**Returns**: `true` if monitoring, `false` otherwise

```typescript
if (service.isActive()) {
  console.log('Monitoring active');
}
```

---

#### `getLastFocusedField(): TextFieldFocusEvent | null`
Get the last focused text field information.

**Returns**: Event object or `null`

```typescript
const field = service.getLastFocusedField();
if (field?.canInject) {
  console.log('Can inject into', field.appName);
}
```

---

#### `destroy(): void`
Clean up and shutdown the service.

**Call before app shutdown**

```typescript
service.destroy();
```

---

### Events

#### `text-field-focused`

Emitted when a text input field gains focus.

**Event Data**:
```typescript
interface TextFieldFocusEvent {
  bundleId: string;       // com.google.Chrome
  appName: string;        // Google Chrome
  windowTitle: string;    // New Tab
  elementRole: string;    // AXTextField
  canInject: boolean;     // true if injection possible
  timestamp: string;      // ISO 8601
  appPID: number;         // Process ID
  value?: string;         // Current text value
  selectedText?: string;  // Selected text
}
```

**Usage**:
```typescript
service.on('text-field-focused', (event) => {
  console.log('App:', event.appName);
  console.log('Role:', event.elementRole);
  console.log('Can inject:', event.canInject);
});
```

---

## Common Patterns

### Auto-fill on Transcription Complete

```typescript
class TranscriptionService {
  private accessibility: AccessibilityService;

  async onTranscriptionComplete(transcript: string) {
    const field = this.accessibility.getLastFocusedField();

    if (field?.canInject) {
      const success = await this.accessibility.injectText(transcript);

      if (success) {
        this.showNotification('Auto-filled!');
      } else {
        this.showManualPaste(transcript);
      }
    } else {
      this.showManualPaste(transcript);
    }
  }
}
```

### Conditional Auto-fill

```typescript
service.on('text-field-focused', async (event) => {
  // Only auto-fill in certain apps
  const allowedApps = ['Chrome', 'Safari', 'TextEdit'];

  if (event.canInject && allowedApps.some(app => event.appName.includes(app))) {
    await service.injectText(transcript);
  }
});
```

### Error Handling

```typescript
// The service handles all errors gracefully
// No try/catch needed - it never throws

const success = await service.injectText('test');
if (!success) {
  // Injection failed - show manual paste UI
  showManualPasteDialog();
}
```

### Monitoring Lifecycle

```typescript
// App startup
await service.ensurePermissions();
service.startMonitoring();

// App shutdown
service.stopMonitoring();
service.destroy();
```

---

## Error Handling

The service **never crashes**. All errors are:
- Logged to Winston logger
- Reported to Sentry (if enabled)
- Returned as `false` or `null`

```typescript
// No permissions? Returns false
const granted = await service.ensurePermissions(); // false

// Module failed to load? Returns false
const success = await service.injectText('test'); // false

// No field focused? Returns null
const field = service.getLastFocusedField(); // null
```

---

## Logging

All operations are logged:

**Info**: Success events
```
Native accessibility module loaded successfully
Text field focused {"app":"Chrome","role":"AXTextField"}
Text injected successfully {"app":"Chrome","textLength":42}
```

**Warn**: Non-critical issues
```
Accessibility permissions not granted
Cannot inject text - no text field focused
```

**Error**: Failures
```
Failed to load native accessibility module
Cannot start monitoring - native module not loaded
```

---

## Requirements

- macOS 12+ (Monterey or later)
- Accessibility permissions granted
- Native module built (`npm run build:native`)

---

## Troubleshooting

### Module not loading
```
Error: Cannot find module 'accessibility.node'
```

**Solution**: Build native module
```bash
npm run build:native
```

---

### Permissions denied
```
Accessibility permissions not granted
```

**Solution**: Grant in System Preferences
1. Open System Preferences
2. Privacy & Security → Accessibility
3. Add your app/Terminal
4. Restart app

---

### Injection not working
```
Text injection failed
```

**Possible causes**:
- No text field focused
- App blocks injection (secure field)
- Field is read-only
- Permissions revoked

**Solution**: Check `lastFocusedField.canInject`

---

## Architecture

```
┌─────────────────────────────────────┐
│   AccessibilityService (TypeScript) │
│   - Type safety                      │
│   - Error handling                   │
│   - Event emission                   │
│   - Integration                      │
└─────────────┬───────────────────────┘
              │
              │ require()
              ▼
┌─────────────────────────────────────┐
│   accessibility.node (Native)        │
│   - Objective-C++                    │
│   - macOS Accessibility APIs         │
│   - N-API bindings                   │
└─────────────┬───────────────────────┘
              │
              │ AX APIs
              ▼
┌─────────────────────────────────────┐
│   macOS Accessibility Framework      │
│   - System-level access              │
│   - UI element detection             │
│   - Text injection                   │
└─────────────────────────────────────┘
```

---

## Performance

- Permission check: **~0.05ms**
- Get focused element: **2-5ms**
- Insert text: **5-10ms**
- Event emission: **<1ms**

Fast enough for real-time use ✅

---

## Type Definitions

Full TypeScript support with IntelliSense:

```typescript
import { AccessibilityService, TextFieldFocusEvent } from './services/accessibility_service';

const service: AccessibilityService = new AccessibilityService();

service.on('text-field-focused', (event: TextFieldFocusEvent) => {
  // event is fully typed
  const app: string = event.appName;
  const canInject: boolean = event.canInject;
});
```

---

## Testing

```bash
# Compile TypeScript
npx tsc

# Run test suite
node test-accessibility-service.js
```

---

## Support

- **Documentation**: `ISSUE_27_COMPLETE.md`
- **Native Module**: `native/accessibility/README.md`
- **Type Definitions**: `dist/src/services/accessibility_service.d.ts`
- **Test Script**: `test-accessibility-service.js`
