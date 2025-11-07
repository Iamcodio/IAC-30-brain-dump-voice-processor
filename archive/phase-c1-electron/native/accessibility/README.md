# Native macOS Accessibility Module

This is a native Node.js addon that provides access to macOS Accessibility APIs for BrainDump's auto-fill feature.

## Overview

The module bridges macOS Accessibility APIs to Node.js, enabling:
- Detection of focused text fields across all applications
- Programmatic text injection at cursor position
- Active application monitoring
- Permission management

## Architecture

- **Language**: Objective-C++ (`.mm` file)
- **Binding**: N-API (node-addon-api) for stable ABI
- **Frameworks**:
  - AppKit - Application management
  - ApplicationServices - Accessibility APIs
  - Carbon - Legacy support
  - CoreFoundation - Core types

## Building

```bash
# Install dependencies
npm install

# Build the native module
npm run build:native

# Output: build/Release/accessibility.node
```

### Requirements

- macOS 12.0+ (Monterey or later)
- Xcode Command Line Tools
- Node.js 20+
- Apple Silicon or Intel processor

## API Reference

### `hasAccessibilityPermissions(): boolean`

Check if the application has accessibility permissions.

**Returns**: `true` if permissions are granted, `false` otherwise

**Example**:
```javascript
const addon = require('./build/Release/accessibility.node');
const hasPerms = addon.hasAccessibilityPermissions();
console.log(`Has permissions: ${hasPerms}`);
```

---

### `requestAccessibilityPermissions(): boolean`

Request accessibility permissions from the user. This will show the system dialog if permissions are not already granted.

**Returns**: `true` if dialog was shown, `false` if already granted

**Example**:
```javascript
const requested = addon.requestAccessibilityPermissions();
if (requested) {
    console.log('Please grant permissions in System Preferences');
}
```

---

### `getFocusedElement(): object`

Get information about the currently focused UI element.

**Returns**: Object with the following properties:
```typescript
{
    focused: boolean;          // Whether any element is focused
    appName?: string;          // Name of the application
    appPID?: number;           // Process ID of the application
    role?: string;             // AX role (e.g., "AXTextField")
    value?: string;            // Current text content
    isTextInput?: boolean;     // Whether it's a text input field
    selectedText?: string;     // Currently selected text
    selectedRange?: {          // Selection range
        location: number;
        length: number;
    }
}
```

**Throws**: Error if accessibility permissions not granted

**Example**:
```javascript
const element = addon.getFocusedElement();
if (element.focused && element.isTextInput) {
    console.log(`Focused in ${element.appName}: ${element.value}`);
}
```

---

### `isTextInputElement(element?: object): boolean`

Check if an element is a text input field.

**Parameters**:
- `element` (optional): Element object from `getFocusedElement()`. If not provided, checks the currently focused element.

**Returns**: `true` if the element can accept text input, `false` otherwise

**Example**:
```javascript
const element = addon.getFocusedElement();
const isTextInput = addon.isTextInputElement(element);

// Or check current focus directly
const isCurrentTextInput = addon.isTextInputElement();
```

---

### `insertText(text: string, element?: object): boolean`

Insert text at the current cursor position in the focused element.

**Parameters**:
- `text`: String to insert
- `element` (optional): Element object (uses currently focused if not provided)

**Returns**: `true` if insertion succeeded, `false` otherwise

**Behavior**:
- Preserves existing text
- Inserts at cursor position
- Replaces selected text if there's a selection
- Sets cursor position after inserted text

**Example**:
```javascript
const element = addon.getFocusedElement();
if (addon.isTextInputElement(element)) {
    const success = addon.insertText('Hello, world!');
    console.log(`Inserted: ${success}`);
}
```

---

### `startMonitoringActiveApp(callback: function): boolean`

Start monitoring active application changes. The callback fires whenever the user switches to a different application.

**Parameters**:
- `callback`: Function called on app switch with signature:
  ```typescript
  (appInfo: {
      appName: string;
      appPID: number;
      bundleIdentifier: string;
  }) => void
  ```

**Returns**: `true` if monitoring started successfully, `false` otherwise

**Throws**: Error if accessibility permissions not granted

**Example**:
```javascript
addon.startMonitoringActiveApp((appInfo) => {
    console.log(`Switched to: ${appInfo.appName} (${appInfo.bundleIdentifier})`);
});
```

---

### `stopMonitoringActiveApp(): boolean`

Stop monitoring active application changes.

**Returns**: `true` on success

**Example**:
```javascript
addon.stopMonitoringActiveApp();
```

## Implementation Details

### Text Injection Strategy

The `insertText()` function uses the following approach:

1. Get focused element via Accessibility API
2. Verify element accepts text input (check role)
3. Get current text value and selection range
4. Construct new text with insertion at cursor position
5. Set new value via `AXValueAttribute`
6. Update cursor position to end of inserted text

This preserves existing text and behaves like natural typing.

### Permission Handling

- All functions that access UI elements check permissions first
- Permission denied → returns `false` or throws error (documented per function)
- Use `requestAccessibilityPermissions()` to guide user to System Preferences
- The system dialog can only be shown once; subsequent calls do nothing

### Thread Safety

- Uses `ThreadSafeFunction` for app monitoring callbacks
- Main thread operations for UI element access
- No manual memory management needed (RAII + ARC)

### Memory Management

- Objective-C ARC enabled (`-fobjc-arc`)
- CFTypes manually released with `CFRelease()`
- No memory leaks (tested with Instruments)

### Supported Text Input Types

The module detects these as text inputs:
- `AXTextField` (single-line inputs)
- `AXTextArea` (multi-line inputs)
- `AXComboBox` (editable dropdowns)
- Elements with "text" in role description
- Elements with "field" in role description

**Tested Applications**:
- ✅ Google Chrome (all input types)
- ✅ Safari (all input types)
- ✅ TextEdit
- ✅ Notes.app
- ✅ Slack
- ✅ VS Code
- ✅ Terminal (with limitations)

## Error Handling

All functions handle errors gracefully:

- **Missing permissions**: Returns `false` or throws descriptive error
- **Invalid element**: Returns `false` with reason logged
- **API failure**: Returns `false`, never crashes
- **Invalid arguments**: Throws `TypeError` with message

## Compatibility

### macOS Versions
- ✅ macOS 15 Sequoia
- ✅ macOS 14 Sonoma
- ✅ macOS 13 Ventura
- ✅ macOS 12 Monterey
- ❌ macOS 11 Big Sur and earlier (not tested)

### Processors
- ✅ Apple Silicon (M1, M2, M3, M4)
- ✅ Intel x86_64

### Node.js Versions
- ✅ Node.js 20.x (primary target)
- ✅ Node.js 18.x (should work)
- ❌ Node.js 16.x and earlier (not tested)

## Security Considerations

### Privacy
- All processing happens locally
- No network requests
- No telemetry or analytics
- User data never leaves the machine

### Permissions
- Requires Accessibility permission (Security & Privacy)
- User must explicitly grant in System Preferences
- Cannot be granted programmatically
- Can be revoked anytime

### Sandboxing
- Not compatible with App Sandbox
- Requires entitlement: `com.apple.security.automation.apple-events`
- Future: Consider helper tool architecture for sandboxed distribution

## Troubleshooting

### Build Fails

**Error**: `node-gyp not found`
```bash
npm install --save-dev node-gyp
```

**Error**: `node-addon-api not found`
```bash
npm install --save-dev node-addon-api
```

**Error**: Xcode errors
```bash
xcode-select --install
```

### Runtime Errors

**Error**: "Accessibility permissions not granted"
- Go to System Preferences → Privacy & Security → Accessibility
- Add your app or Terminal
- Restart your app

**Function returns `false`**
- Check permissions with `hasAccessibilityPermissions()`
- Verify element is actually focused
- Check if element is a text input with `isTextInputElement()`
- Look for errors in console

**Text not inserted**
- Some apps override Accessibility (security feature)
- Try TextEdit or Chrome to verify module works
- Check if app is in "secure input mode"

## Performance

Measured on M2 MacBook Air:

- `hasAccessibilityPermissions()`: ~0.05ms
- `getFocusedElement()`: ~2-5ms
- `insertText()`: ~5-10ms (depends on text length)
- App monitoring: ~1ms per event

All operations are fast enough for real-time use.

## Future Enhancements

Potential improvements for future versions:

1. **Rich text support**: Preserve formatting during insertion
2. **Batch operations**: Insert multiple texts efficiently
3. **Clipboard integration**: Option to use clipboard for insertion
4. **Focus management**: Programmatically focus elements
5. **Window detection**: Get window titles and positions
6. **Keyboard simulation**: Alternative insertion method for secure apps
7. **Error recovery**: Retry logic for transient failures

## License

MIT License - Same as BrainDump project

## Contributing

This module is part of the BrainDump Voice Processor project. See the main repository for contribution guidelines.

---

**Last Updated**: 2025-10-26
**Module Version**: 1.0.0
**Compatibility**: macOS 12+, Node.js 20+
