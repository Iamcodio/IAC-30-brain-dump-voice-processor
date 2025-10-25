# Quick Start Guide - Phase 2 Features

## What's New in Phase 2

1. **Plain Text Transcripts** - Every transcription now creates TWO files:
   - `.txt` - Raw text only (perfect for Claude Desktop)
   - `.md` - Formatted markdown (for documentation)

2. **Recording Database** - All recordings tracked in JSON database with:
   - Audio duration
   - Timestamp
   - First line preview
   - File paths
   - Searchable metadata

## Getting Started

### First Time Setup

Run the migration to add existing recordings to the database:

```bash
node migrate_recordings.js
```

### Daily Usage

Everything works exactly as before! No changes needed to your workflow:

1. **Record audio** (Ctrl+Y hotkey)
2. **Transcription happens automatically**
3. **Two files created**:
   - `outputs/transcripts/transcript_2025-10-25_031746.txt` ← NEW!
   - `outputs/transcripts/transcript_2025-10-25_031746.md`

### Using Plain Text Files

For your Claude Desktop workflow:

```bash
# Copy plain text to clipboard (macOS)
cat outputs/transcripts/transcript_2025-10-25_031746.txt | pbcopy

# View all plain text files
ls outputs/transcripts/*.txt
```

### Searching Recordings

```javascript
const database = require('./src/database');

// Search for recordings containing "Claude"
const results = await database.search('Claude');
console.log(results);

// Get all recordings (newest first)
const all = await database.getAll();

// Get specific recording
const recording = await database.getById('rec_1761377412820');
```

## File Locations

- **Audio Files**: `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/outputs/audio/`
- **Plain Text**: `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/outputs/transcripts/*.txt`
- **Markdown**: `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/outputs/transcripts/*.md`
- **Database**: `/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/src/data/recordings.json`

## Testing

```bash
# Test database operations
node test_database.js

# Test main.js compatibility
node test_database_class.js

# Test full pipeline
node test_integration.js
```

## Troubleshooting

### Database not updating?
Run migration again:
```bash
node migrate_recordings.js
```

### Missing .txt files?
Old recordings (before Phase 2) only have .md files. New recordings will have both.

### Check database contents:
```bash
cat src/data/recordings.json | python -m json.tool
```

## Key Features

✅ **Backward Compatible** - MVP works exactly the same
✅ **Plain Text** - Ready for Claude Desktop workflow
✅ **Searchable** - Find recordings by content
✅ **Metadata** - Duration, timestamps, file paths tracked
✅ **No Breaking Changes** - Everything still works!

---

**Questions?** See `PHASE_2_IMPLEMENTATION_SUMMARY.md` for full technical details.
