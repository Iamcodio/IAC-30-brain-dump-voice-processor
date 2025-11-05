# Accessibility Module - Quick Start Guide

## Build & Test (5 minutes)

### 1. Build the Module
```bash
cd /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor
npm run build:native
```

**Expected output**:
```
✅ build/Release/accessibility.node (87KB)
```

### 2. Grant Permissions
```bash
# Run the test
node test-accessibility.js

# You'll see: "Accessibility permissions not granted"
# Go to: System Preferences → Privacy & Security → Accessibility
# Add Terminal (or your app)
# Restart Terminal
```

### 3. Test Basic Functionality
```bash
# Edit test-accessibility.js:
# Uncomment the insertText test (lines ~60-65)

# Focus a text field in Chrome or TextEdit
node test-accessibility.js

# You should see: "Text insertion: ✅ SUCCESS"
# And "Hello from BrainDump!" appears in the text field
```

---

## Usage Examples

### Check Permissions
```javascript
const addon = require('./build/Release/accessibility.node');

if (!addon.hasAccessibilityPermissions()) {
    console.log('Requesting permissions...');
    addon.requestAccessibilityPermissions();
    // User must grant in System Preferences
}
```

### Detect Text Field
```javascript
const element = addon.getFocusedElement();

if (element.focused && element.isTextInput) {
    console.log(`Can insert text in ${element.appName}`);
    console.log(`Current value: "${element.value}"`);
    console.log(`Role: ${element.role}`);
}
```

### Insert Text
```javascript
const success = addon.insertText('Your transcribed text here');

if (success) {
    console.log('✅ Text inserted!');
} else {
    console.log('❌ Failed - check if field is focused');
}
```

### Monitor App Switches
```javascript
addon.startMonitoringActiveApp((appInfo) => {
    console.log(`Switched to: ${appInfo.appName}`);

    if (appInfo.bundleIdentifier === 'com.google.Chrome') {
        console.log('Browser is active - ready for auto-fill');
    }
});

// Later, stop monitoring
addon.stopMonitoringActiveApp();
```

---

## TypeScript Integration

```typescript
// types/accessibility.d.ts is already created
import * as accessibility from './build/Release/accessibility.node';

// Type-safe usage
const element: FocusedElement = accessibility.getFocusedElement();

if (element.isTextInput) {
    const success: boolean = accessibility.insertText('Hello!');
}
```

---

## Common Use Cases

### BrainDump Auto-Fill Flow
```javascript
// 1. User presses Ctrl+Y
// 2. Record audio → transcribe → get text

// 3. Check if we can auto-fill
const element = addon.getFocusedElement();

if (!element.focused) {
    console.log('No element focused - show manual copy UI');
    return;
}

if (!addon.isTextInputElement(element)) {
    console.log('Not a text field - show manual copy UI');
    return;
}

// 4. Auto-fill the transcription
const success = addon.insertText(transcribedText);

if (success) {
    console.log('✅ Auto-filled successfully');
} else {
    console.log('❌ Auto-fill failed - fallback to manual copy');
}
```

### Smart Context Detection
```javascript
let currentApp = null;

addon.startMonitoringActiveApp((appInfo) => {
    currentApp = appInfo;
    console.log(`Context: ${appInfo.appName}`);

    // Adjust behavior based on app
    switch (appInfo.bundleIdentifier) {
        case 'com.google.Chrome':
            console.log('Browser mode - enable web form detection');
            break;
        case 'com.apple.Notes':
            console.log('Notes mode - enable markdown formatting');
            break;
        case 'com.tinyspeck.slackmacgap':
            console.log('Slack mode - enable mention detection');
            break;
    }
});
```

---

## Troubleshooting

### Build Errors

**"node-gyp not found"**
```bash
npm install --save-dev node-gyp
```

**"node-addon-api not found"**
```bash
npm install --save-dev node-addon-api
```

**Xcode errors**
```bash
xcode-select --install
```

### Runtime Errors

**"Accessibility permissions not granted"**
```bash
# System Preferences → Privacy & Security → Accessibility
# Add Terminal or your app
# Restart the app
```

**insertText returns false**
```bash
# Verify element is focused
const element = addon.getFocusedElement();
console.log('Focused:', element.focused);

# Verify it's a text input
console.log('Is text input:', addon.isTextInputElement(element));

# Try a different app (Chrome, TextEdit, Safari)
```

**Module not loading**
```bash
# Rebuild
npm run build:native

# Check output
ls -lh build/Release/accessibility.node

# Test
node -e "console.log(require('./build/Release/accessibility.node'))"
```

---

## API Reference (Quick)

| Function | Returns | Description |
|----------|---------|-------------|
| `hasAccessibilityPermissions()` | boolean | Check if permissions granted |
| `requestAccessibilityPermissions()` | boolean | Open System Preferences |
| `getFocusedElement()` | object | Get focused element info |
| `isTextInputElement(element?)` | boolean | Check if text input |
| `insertText(text, element?)` | boolean | Insert text at cursor |
| `startMonitoringActiveApp(cb)` | boolean | Monitor app switches |
| `stopMonitoringActiveApp()` | boolean | Stop monitoring |

---

## Performance Tips

1. **Cache permissions check**: Call once at startup, not on every operation
2. **Debounce insertText**: Wait for typing to pause before injecting
3. **Use app monitoring**: Detect context switches efficiently
4. **Handle failures gracefully**: Always have a fallback UI

---

## Security Notes

- ✅ All processing is 100% local
- ✅ No network requests
- ✅ No telemetry
- ✅ User controls permissions
- ⚠️  Not compatible with App Sandbox
- ⚠️  Some apps block accessibility (security feature)

---

## Next Steps

1. ✅ Build module: `npm run build:native`
2. ✅ Grant permissions in System Preferences
3. ✅ Test with `test-accessibility.js`
4. 🔄 Integrate into BrainDump TypeScript code
5. 🔄 Implement auto-fill UI flow
6. 🔄 Test with real transcriptions

---

## Need Help?

- **Full docs**: See `README.md` in this directory
- **Type definitions**: See `types/accessibility.d.ts`
- **Implementation summary**: See `NATIVE_MODULE_IMPLEMENTATION.md`
- **Test script**: See `test-accessibility.js`

---

**Quick command to rebuild and test**:
```bash
npm run build:native && node test-accessibility.js
```
