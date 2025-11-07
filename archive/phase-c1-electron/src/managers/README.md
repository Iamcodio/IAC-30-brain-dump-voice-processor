# AutoFillManager

**Status:** ✅ Complete
**Issue:** #28
**Dependencies:** AccessibilityService (#27)

## Overview

The AutoFillManager orchestrates auto-fill functionality by coordinating:
- **AccessibilityService** - Text field monitoring and injection
- **Database** - Transcript retrieval and usage tracking
- **Configuration** - User settings and blacklist management

## Features

- ✅ Automatic text field detection and filling
- ✅ Manual fill trigger support (Ctrl+Shift+V)
- ✅ Application blacklist (password managers)
- ✅ Debouncing to prevent double-fills
- ✅ Usage statistics tracking
- ✅ Comprehensive error handling
- ✅ Permission management
- ✅ Settings hot-reload

## Files

```
src/managers/
├── autofill_manager.ts         # Main implementation
├── INTEGRATION_EXAMPLE.ts      # Usage examples
└── README.md                   # This file

src/migrations/
└── 006_add_autofill_tracking.sql  # Database schema

config/
└── default.json                # Configuration (autoFill section)
```

## Configuration

Settings are loaded from `config/default.json`:

```json
{
  "autoFill": {
    "enabled": true,
    "requireManualTrigger": false,
    "debounceMs": 500,
    "blacklistedApps": [
      "com.apple.keychainaccess",
      "com.1password.1password",
      "com.agilebits.onepassword7"
    ]
  }
}
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Master enable/disable switch |
| `requireManualTrigger` | boolean | `false` | If true, only fills on Ctrl+Shift+V |
| `debounceMs` | number | `500` | Minimum milliseconds between fills |
| `blacklistedApps` | string[] | `[...]` | Bundle IDs to never auto-fill |

## Database Schema

Migration `006_add_autofill_tracking.sql` adds:

```sql
ALTER TABLE recordings ADD COLUMN autoFillCount INTEGER DEFAULT 0;
ALTER TABLE recordings ADD COLUMN lastAutoFillTimestamp TEXT DEFAULT NULL;
```

### Recording Fields

| Field | Type | Description |
|-------|------|-------------|
| `autoFillCount` | INTEGER | Number of times this recording was auto-filled |
| `lastAutoFillTimestamp` | TEXT | ISO 8601 timestamp of last fill |

## Usage

### Basic Setup

```typescript
import { AutoFillManager } from './managers/autofill_manager';
import database from './database';

const manager = new AutoFillManager(database);

// Start (requires accessibility permissions)
try {
  await manager.start();
  console.log('Auto-fill active');
} catch (error) {
  console.error('Permissions required:', error.message);
}

// Stop
await manager.stop();
```

### Update Settings

```typescript
manager.updateSettings({
  blacklistedApps: ['com.newapp.secure'],
  debounceMs: 1000
});
```

### Manual Fill (Ctrl+Shift+V)

```typescript
const success = await manager.performManualFill();
if (success) {
  console.log('Filled with last transcript');
}
```

### Global Shortcut Integration

```typescript
// In main.js (Electron)
const { globalShortcut } = require('electron');

globalShortcut.register('Control+Shift+V', async () => {
  await autoFillManager.performManualFill();
});
```

## Auto-Fill Logic

### Decision Flow

Auto-fill triggers when ALL conditions are met:

1. ✅ Settings enabled (`settings.enabled === true`)
2. ✅ Auto mode (`!settings.requireManualTrigger`)
3. ✅ App not blacklisted (`!blacklistedApps.includes(bundleId)`)
4. ✅ Field supports injection (`event.canInject === true`)
5. ✅ Debounce threshold met (`timeSinceLastFill >= debounceMs`)

### Blacklist

Default blacklisted apps:
- `com.apple.keychainaccess` - macOS Keychain
- `com.1password.1password` - 1Password 8
- `com.agilebits.onepassword7` - 1Password 7

Add more via `updateSettings()` or config file.

## API Reference

### Constructor

```typescript
constructor(database: Database)
```

Creates manager instance. Loads config but doesn't start monitoring.

### Methods

#### `start(): Promise<void>`

Start monitoring for text field focus events. Requires accessibility permissions.

**Throws:** Error if permissions not granted

```typescript
await manager.start();
```

#### `stop(): Promise<void>`

Stop monitoring and clean up. Safe to call multiple times.

```typescript
await manager.stop();
```

#### `performAutoFill(): Promise<boolean>`

Attempt auto-fill with last transcript. Respects all settings and conditions.

**Returns:** `true` if fill succeeded, `false` otherwise

```typescript
const success = await manager.performAutoFill();
```

#### `performManualFill(): Promise<boolean>`

Manual fill (ignores `requireManualTrigger` setting). Used for Ctrl+Shift+V.

**Returns:** `true` if fill succeeded, `false` otherwise

```typescript
const success = await manager.performManualFill();
```

#### `updateSettings(newSettings: Partial<AutoFillSettings>): void`

Update settings. Merges with existing. Auto-stops if disabled.

```typescript
manager.updateSettings({
  enabled: false,
  debounceMs: 1000
});
```

#### `isActive(): boolean`

Check if manager is running.

**Returns:** `true` if monitoring active, `false` otherwise

```typescript
if (manager.isActive()) {
  console.log('Running');
}
```

## Error Handling

All errors are caught and logged. The manager never throws during operation, only on `start()` if permissions missing.

### Permission Errors

```typescript
try {
  await manager.start();
} catch (error) {
  // Guide user to grant permissions
  console.error('Grant permissions in:');
  console.error('System Preferences > Privacy & Security > Accessibility');
}
```

### Runtime Errors

- Database errors: Logged, auto-fill skipped
- Injection errors: Logged, returns `false`
- Tracking errors: Logged, doesn't block auto-fill

## Logging

All operations are logged with context:

```typescript
// Startup
logger.info('AutoFillManager initialized', { enabled, debounceMs, ... });
logger.info('AutoFillManager started successfully', { autoMode });

// Auto-fill events
logger.info('Auto-fill completed successfully', { app, textLength });
logger.debug('Auto-fill skipped - app blacklisted', { bundleId, appName });

// Tracking
logger.debug('Auto-fill usage tracked', { recordingId, autoFillCount });

// Errors
logger.error('Error performing auto-fill', { error });
```

## Testing

See `INTEGRATION_EXAMPLE.ts` for test scenarios:

1. Basic usage
2. Settings management
3. Manual fill
4. Global shortcut integration
5. Error handling
6. Application lifecycle

## Acceptance Criteria

✅ Settings load correctly from config
✅ Auto-fill triggers when all conditions met
✅ Blacklist prevents fills
✅ Debouncing works (prevents double-fill)
✅ Database updates correctly
✅ Handles no recordings gracefully
✅ Manual fill works (ignores requireManualTrigger)
✅ Stops cleanly on stop()

## Next Steps

To integrate into BrainDump:

1. **Import in main.js:**
   ```typescript
   import { AutoFillManager } from './managers/autofill_manager';
   import database from './database';

   const autoFillManager = new AutoFillManager(database);
   ```

2. **Start on app ready:**
   ```typescript
   app.whenReady().then(async () => {
     try {
       await autoFillManager.start();
     } catch (error) {
       // Show permission prompt to user
     }
   });
   ```

3. **Register Ctrl+Shift+V:**
   ```typescript
   globalShortcut.register('Control+Shift+V', async () => {
     await autoFillManager.performManualFill();
   });
   ```

4. **Clean up on quit:**
   ```typescript
   app.on('will-quit', async () => {
     await autoFillManager.stop();
   });
   ```

## Support

- **Issue:** #28
- **Dependencies:** AccessibilityService (#27)
- **Related:** Issue #29 (Main process integration)
