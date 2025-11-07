# UI Screenshots Guide

## How to Test the History UI

### 1. Start the Application
```bash
cd /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor
npm start
```

### 2. Recording View (index.html)

You should see:
```
┌────────────────────────────────────────────────────┐
│ BrainDump Voice Processor    [View History]        │
├────────────────────────────────────────────────────┤
│                                                     │
│          Ready - Press Ctrl+Y to start             │
│                                                     │
│    ╔════════════════════════════════════╗          │
│    ║                                    ║          │
│    ║         Waveform Canvas            ║          │
│    ║                                    ║          │
│    ╚════════════════════════════════════╝          │
│                                                     │
└────────────────────────────────────────────────────┘
```

### 3. Click "View History" Button

The view switches to history.html:

```
┌──────────────────────────────────────────────────────────────┐
│ BrainDump History    [Search...        ] [+ New Recording]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Oct 25, 08:30 AM                          (5 sec)      │  │
│  │ Hello hello hello hello hello hello hello hello...     │  │
│  │ [▶ Play] [📄 View] [📋 Copy]                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Oct 25, 08:28 AM                          (10 sec)     │  │
│  │ Hi, Clody Cody, baby. How you doing, Clody Cody?...    │  │
│  │ [▶ Play] [📄 View] [📋 Copy]                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Oct 25, 03:17 AM                          (21 sec)     │  │
│  │ Oh, I'm in love with a man called Claude. He's not...  │  │
│  │ [▶ Play] [📄 View] [📋 Copy]                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4. Test Search Functionality

Type "Claude" in search box:

```
┌──────────────────────────────────────────────────────────────┐
│ BrainDump History    [Claude           ] [+ New Recording]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Oct 25, 03:17 AM                          (21 sec)     │  │
│  │ Oh, I'm in love with a man called Claude. He's not...  │  │
│  │ [▶ Play] [📄 View] [📋 Copy]                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  (Only matching recordings shown)                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 5. Test Clipboard Copy

Click the "📋 Copy" button:

```
┌──────────────────────────────────────────────────────────────┐
│ BrainDump History    [Search...        ] [+ New Recording]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  (Recording list...)                                         │
│                                                               │
│                                              ┌──────────────┐ │
│                                              │ ✓ Copied to  │ │
│                                              │   clipboard! │ │
│                                              └──────────────┘ │
└──────────────────────────────────────────────────────────────┘
                                              (Toast notification
                                               appears 3 seconds)
```

### 6. Empty State (No Recordings)

If database is empty:

```
┌──────────────────────────────────────────────────────────────┐
│ BrainDump History    [Search...        ] [+ New Recording]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│                                                               │
│                         🎤                                    │
│                                                               │
│                  No recordings yet                            │
│                                                               │
│          Press Ctrl+Y to start your first recording          │
│                                                               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 7. Loading State

When first loading:

```
┌──────────────────────────────────────────────────────────────┐
│ BrainDump History    [Search...        ] [+ New Recording]   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│                                                               │
│                         ⟳                                     │
│                   (Spinning loader)                           │
│                                                               │
│                  Loading recordings...                        │
│                                                               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Color Scheme (Dark Theme)

- **Background:** #1a1a1a (Very dark gray)
- **Cards:** #2a2a2a (Dark gray)
- **Borders:** #3a3a3a (Medium gray)
- **Text:** #ffffff (White)
- **Accent:** #4caf50 (Green)
- **Secondary:** #888888 (Light gray for metadata)

## Button States

### Normal
```
┌──────────┐
│   Copy   │  (Gray background)
└──────────┘
```

### Hover
```
┌──────────┐
│   Copy   │  (Lighter gray, slightly raised)
└──────────┘
```

### Active (Pressed)
```
┌──────────┐
│   Copy   │  (Pressed down 1px)
└──────────┘
```

## Testing Checklist

Run through these steps:

1. ✅ Start app and verify recorder view loads
2. ✅ Click "View History" - should switch views
3. ✅ Verify all recordings are listed
4. ✅ Check that newest recording is at top
5. ✅ Hover over recording items - should highlight
6. ✅ Type in search box - should filter results
7. ✅ Click "📋 Copy" - should copy and show toast
8. ✅ Paste into another app - verify text copied correctly
9. ✅ Click "▶ Play" - should open audio file
10. ✅ Click "📄 View" - should open transcript
11. ✅ Click "+ New Recording" - should return to recorder
12. ✅ Press Ctrl+Y - should still work globally

## Expected Behavior

### Navigation Flow
```
Recorder View ──[View History]──> History View
      ↑                              │
      └───────[New Recording]────────┘
```

### Search Behavior
- Searches transcript content (case-insensitive)
- Searches timestamps
- Updates in real-time as you type
- Shows empty state if no matches

### Copy Behavior
1. Reads transcript file from disk
2. Extracts only the transcript text (skips metadata)
3. Copies to system clipboard
4. Shows green toast notification
5. Toast auto-dismisses after 3 seconds

### Play Behavior
- Uses macOS default audio player
- Opens file via `shell.openPath()`
- Works even if app is in background

## Troubleshooting

### If history view is blank:
1. Check browser console for errors (Cmd+Option+I)
2. Verify database.js exists
3. Check that recordings.json has data

### If copy doesn't work:
1. Verify transcript file exists on disk
2. Check browser console for permission errors
3. Try clicking again

### If navigation doesn't work:
1. Check that both index.html and history.html exist
2. Verify IPC handlers in main.js
3. Look for errors in terminal running Electron

## Files to Inspect

- **UI Template:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/history.html`
- **UI Logic:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/history.js`
- **Database:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/database.js`
- **IPC Handlers:** `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/main.js`

## Success Indicators

You'll know it's working when:
- ✅ History view loads without errors
- ✅ All recordings are visible
- ✅ Search filters the list
- ✅ Copy puts text in clipboard
- ✅ Navigation works both ways
- ✅ UI is smooth and responsive
- ✅ No console errors

Enjoy testing! 🎉
