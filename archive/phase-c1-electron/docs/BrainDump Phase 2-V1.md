BrainDump Phase 2: History Interface & Audio Playback Guide
Version: 1.0
Created: 2025-10-25 05:04 IST
Phase 1 Status: ✅ Complete - Voice Recording + Whisper Transcription
Phase 2 Goal: SuperWhisper-style history interface with audio playback

Table of Contents

GitHub Concepts (ELI12)
SuperWhisper UX Analysis
Phase 2 Features
Implementation Plan
Technical Decisions
Success Criteria


GitHub Concepts (ELI12) {#github-concepts}
Issues = Project To-Do List
Think of GitHub Issues like a task list for your project. Each issue tracks one thing that needs to be built or fixed.
Example Issues:

Issue #1: Add history view with audio playback
Issue #2: Change output from markdown to plain text
Issue #3: Add keyboard shortcut customization

What each issue contains:

Title (what needs to be done)
Description (why it matters, how to do it)
Assignees (who's working on it)
Labels (tags like "enhancement", "bug", "phase-2")
Status (open/in-progress/closed)
Comments (discussion, updates, questions)

Branches = Parallel Workspaces
Branches let you make changes without breaking the working code. Think of it like making a copy of your LEGO project to experiment with, while keeping the original safe.
Structure:
main branch              = Stable, working code (Phase 1 MVP)
feature/history-view     = New history interface being built
feature/audio-player     = Audio player being added
bugfix/transcript-error  = Fixing a bug
Typical Workflow:

Create branch from main → git checkout -b feature/history-view
Build feature in branch
Test it works
Create Pull Request (PR) to review changes
Merge back into main when ready
Delete feature branch (cleanup)

Why branches matter:

Main branch stays stable
Can work on multiple features at once
Easy to abandon experiments that don't work
Clear history of what changed and why

Gists = Quick Code Snippets
Gists are like Pastebin - quick way to share code snippets or notes. Not needed for this project.

SuperWhisper UX Analysis {#superwhisper-ux}
What We Learned from Research
Key UX Patterns to Clone:

Menu bar presence - Always accessible, minimal UI that lives in menu bar
History/Library view - Browse past recordings with search/filter capability
JSON storage - Each recording stored as structured data for easy access
Reprocess capability - Apply different "modes" to existing recordings
File transcription - Can upload audio files for transcription
Mode switching - Different output formats (email, note, message, etc.)

How You Use SuperWhisper
Your workflow:

Hit keyboard shortcut
Record voice
Process transcript
Copy text
Paste to Claude Desktop for interaction
Claude processes with brain dump prompts

What You Need:

Raw transcript text (not fancy AI formatting - Claude does that)
Access to history/archive of past recordings
Audio playback to review what you said
Quick copy-paste workflow

What You DON'T Need:

AI post-processing in the app (Claude handles it)
Email/message formatting modes
Cloud sync (local-first)


Phase 2 Features {#phase-2-features}
1. Plain Text Output Mode
Current State: Markdown with headers/formatting
markdown# Brain Dump Transcript

**Date:** 2025-10-25 04:30:00
**Audio File:** recording_2025-10-25_04-30-00.wav
**Duration:** 154 seconds
**Transcription Model:** Whisper Base (English)

---

[Transcribed text here...]
```

**Target State:** Raw transcript text optimized for Claude paste
```
Okay so let me think about the architecture for this brain dump processor...
```

**Implementation:**
- Save both versions:
  - `transcript_*.txt` = Plain text (for Claude paste)
  - `transcript_*.md` = Formatted markdown (for archiving)
- Frontend shows plain text by default
- Add toggle to view formatted version

### 2. Frontend History Interface

**SuperWhisper-style library view:**
```
┌─────────────────────────────────────────────────────┐
│ BrainDump History                    [🔍 Search]    │
│                                       [+ New]        │
├─────────────────────────────────────────────────────┤
│                                                       │
│ ● 2025-10-25 04:30 AM               Duration: 2m 34s│
│   "Okay so let me think about the architecture..."  │
│   [▶ Play] [📄 View] [📋 Copy] [💾 Download]       │
│                                                       │
├─────────────────────────────────────────────────────┤
│                                                       │
│ ● 2025-10-25 03:15 AM               Duration: 5m 12s│
│   "SuperWhisper replacement, fucking brilliant..."  │
│   [▶ Play] [📄 View] [📋 Copy] [💾 Download]       │
│                                                       │
├─────────────────────────────────────────────────────┤
│                                                       │
│ ● 2025-10-24 23:45 PM              Duration: 10m 03s│
│   "Let me think through this Claude context..."     │
│   [▶ Play] [📄 View] [📋 Copy] [💾 Download]       │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Features:**
- **List view** - All past recordings (newest first by default)
- **Metadata display** - Date, time, duration, first line preview
- **Search** - Filter by text content or date
- **Sort options** - By date, duration, or relevance
- **Actions per recording:**
  - ▶ Play - Play audio inline
  - 📄 View - Open full transcript
  - 📋 Copy - Copy plain text to clipboard
  - 💾 Download - Save files locally

**Search & Filter:**
```
Search: [architecture________________________] [🔍]

Filters: 
☐ Today  ☐ This Week  ☐ This Month
Sort by: [Date (newest) ▼]
```

### 3. Audio Playback Component

**Embedded player for each recording:**
```
┌─────────────────────────────────────────────┐
│  🔊 recording_2025-10-25_04-30-00.wav       │
│  ▶  ━━━━━━━●━━━━━━  2:15 / 2:34           │
│  [1x] [Volume: ▓▓▓▓▓▓▓░░░]                 │
└─────────────────────────────────────────────┘
```

**Features:**
- Play/pause controls
- Progress bar (seekable)
- Current time / total duration
- Playback speed control (0.5x, 1x, 1.5x, 2x)
- Volume control
- Link to download original WAV file

**Nice-to-Have (Phase 3):**
- Waveform visualization
- Playback position markers
- Keyboard shortcuts (spacebar = play/pause, arrows = skip)

### 4. Dual Interface Modes

**Two main views in the app:**

#### A) Record Mode (Current)
```
┌──────────────────────────────────────┐
│  BrainDump Voice Processor           │
│  ────────────────────────────────    │
│                                       │
│  Status: Ready                        │
│  Press Ctrl+Y to start recording     │
│                                       │
│  [History]                            │
└──────────────────────────────────────┘
```

**While Recording:**
```
┌──────────────────────────────────────┐
│  🔴 Recording...        00:42         │
│  ────────────────────────────────    │
│  ~~~∿~~∿~~~∿∿~~∿~∿∿~∿~~∿∿~~∿~~     │
│                                       │
│  Press Ctrl+Y to stop                │
│                                       │
│  [Show History]                       │
└──────────────────────────────────────┘
```

#### B) History Mode (New)
```
┌──────────────────────────────────────┐
│  Recent Recordings      [🔍][+ New]  │
│  ────────────────────────────────    │
│  ┌─────────────────────────────────┐ │
│  │ 2025-10-25 04:30    (2m 34s)   │ │
│  │ [▶] "Okay so let me think..."  │ │
│  ├─────────────────────────────────┤ │
│  │ 2025-10-25 03:15    (5m 12s)   │ │
│  │ [▶] "SuperWhisper replacement"│ │
│  └─────────────────────────────────┘ │
│                                       │
│  [Back to Recording]                  │
└──────────────────────────────────────┘
Mode Toggle:

Button in UI: "Show History" / "Back to Recording"
Keyboard shortcut: Ctrl+H (for History)
Click on recording list item opens detail view


Implementation Plan {#implementation-plan}
Step 1: Create GitHub Issue
Issue Template:
markdownTitle: Phase 2 - History View + Audio Playback

Description:
Add SuperWhisper-style history interface to BrainDump processor.

Features:
- [ ] History list view showing all past recordings
- [ ] Search and filter functionality
- [ ] Audio playback component
- [ ] Plain text output alongside markdown
- [ ] Toggle between Record/History modes
- [ ] Copy transcript to clipboard

Labels: enhancement, phase-2
Milestone: v2.0.0
Assignee: @Iamcodio
Create via GitHub CLI:
bashgh issue create \
  --title "Phase 2 - History View + Audio Playback" \
  --body-file issue-template.md \
  --label "enhancement,phase-2" \
  --milestone "v2.0.0"
Step 2: Create Feature Branch
bash# Ensure we're on main and up to date
git checkout main
git pull origin main

# Create new feature branch
git checkout -b feature/history-view

# Verify we're on the right branch
git branch
# * feature/history-view
#   main
Step 3: Build Components
A) Backend Changes
1. Create recordings database (JSON)
javascript// src/data/recordings.json
{
  "recordings": [
    {
      "id": "rec_1730248200000",
      "timestamp": "2025-10-25T04:30:00Z",
      "duration": 154,
      "audioFile": "outputs/audio/recording_2025-10-25_04-30-00.wav",
      "transcriptTxt": "outputs/transcripts/transcript_2025-10-25_04-30-00.txt",
      "transcriptMd": "outputs/transcripts/transcript_2025-10-25_04-30-00.md",
      "firstLine": "Okay so let me think about the architecture...",
      "metadata": {
        "model": "whisper-base",
        "language": "en"
      }
    }
  ]
}
2. Add database methods (Node.js)
javascript// src/database.js
const fs = require('fs');
const path = require('path');

class RecordingsDB {
  constructor(dbPath = './src/data/recordings.json') {
    this.dbPath = dbPath;
  }

  // Load all recordings
  getAll() {
    const data = fs.readFileSync(this.dbPath, 'utf8');
    return JSON.parse(data).recordings;
  }

  // Add new recording
  add(recording) {
    const db = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
    db.recordings.unshift(recording); // Add to start (newest first)
    fs.writeFileSync(this.dbPath, JSON.stringify(db, null, 2));
  }

  // Search recordings
  search(query) {
    const recordings = this.getAll();
    return recordings.filter(r => 
      r.firstLine.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Get by ID
  getById(id) {
    const recordings = this.getAll();
    return recordings.find(r => r.id === id);
  }
}

module.exports = RecordingsDB;
3. Modify transcribe.py to save metadata
python# After transcription completes, save to database
import json
import os
from datetime import datetime

def save_recording_metadata(audio_path, transcript_path, duration, first_line):
    recording = {
        "id": f"rec_{int(datetime.now().timestamp() * 1000)}",
        "timestamp": datetime.now().isoformat(),
        "duration": duration,
        "audioFile": audio_path,
        "transcriptTxt": transcript_path.replace('.md', '.txt'),
        "transcriptMd": transcript_path,
        "firstLine": first_line[:100] + "..." if len(first_line) > 100 else first_line,
        "metadata": {
            "model": "whisper-base",
            "language": "en"
        }
    }
    
    db_path = './src/data/recordings.json'
    with open(db_path, 'r') as f:
        db = json.load(f)
    
    db['recordings'].insert(0, recording)
    
    with open(db_path, 'w') as f:
        json.dump(db, f, indent=2)
B) Frontend Changes
1. Create history.html
html<!DOCTYPE html>
<html>
<head>
    <title>BrainDump History</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #1a1a1a;
            color: #ffffff;
            padding: 20px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .search-box {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #444;
            background: #2a2a2a;
            color: #fff;
            width: 300px;
        }
        .recording-item {
            background: #2a2a2a;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .recording-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .recording-actions {
            display: flex;
            gap: 10px;
        }
        button {
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            background: #4a90e2;
            color: white;
            cursor: pointer;
        }
        button:hover {
            background: #357abd;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>BrainDump History</h1>
        <div>
            <input type="text" class="search-box" placeholder="Search recordings..." id="search">
            <button onclick="newRecording()">+ New Recording</button>
        </div>
    </div>
    
    <div id="recordings-list"></div>

    <script src="history.js"></script>
</body>
</html>
2. Create history.js
javascriptconst { ipcRenderer } = require('electron');

// Load recordings on page load
window.addEventListener('DOMContentLoaded', () => {
    loadRecordings();
});

async function loadRecordings(query = '') {
    const recordings = await ipcRenderer.invoke('get-recordings', query);
    renderRecordings(recordings);
}

function renderRecordings(recordings) {
    const container = document.getElementById('recordings-list');
    container.innerHTML = '';
    
    recordings.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'recording-item';
        item.innerHTML = `
            <div class="recording-header">
                <div>
                    <strong>${formatDate(rec.timestamp)}</strong>
                    <span style="color: #888; margin-left: 10px;">
                        ${formatDuration(rec.duration)}
                    </span>
                </div>
            </div>
            <div style="margin-bottom: 10px; color: #ccc;">
                "${rec.firstLine}"
            </div>
            <div class="recording-actions">
                <button onclick="playAudio('${rec.audioFile}')">▶ Play</button>
                <button onclick="viewTranscript('${rec.id}')">📄 View</button>
                <button onclick="copyTranscript('${rec.transcriptTxt}')">📋 Copy</button>
                <button onclick="downloadFile('${rec.audioFile}')">💾 Download</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// Search functionality
document.getElementById('search').addEventListener('input', (e) => {
    loadRecordings(e.target.value);
});

// Action functions
function playAudio(path) {
    ipcRenderer.send('play-audio', path);
}

function viewTranscript(id) {
    ipcRenderer.send('view-transcript', id);
}

function copyTranscript(path) {
    ipcRenderer.invoke('read-file', path).then(text => {
        navigator.clipboard.writeText(text);
        // Show toast notification
        showToast('Transcript copied to clipboard!');
    });
}

function downloadFile(path) {
    ipcRenderer.send('download-file', path);
}

function newRecording() {
    ipcRenderer.send('show-recorder');
}

// Helper functions
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

function showToast(message) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4a90e2;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        animation: fadeIn 0.3s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
3. Update main.js with IPC handlers
javascriptconst RecordingsDB = require('./src/database.js');
const db = new RecordingsDB();

// IPC Handlers for history
ipcMain.handle('get-recordings', (event, query) => {
    if (query) {
        return db.search(query);
    }
    return db.getAll();
});

ipcMain.on('play-audio', (event, path) => {
    // Open audio player window or use system player
    shell.openPath(path);
});

ipcMain.on('view-transcript', (event, id) => {
    const recording = db.getById(id);
    // Open transcript viewer window
});

ipcMain.handle('read-file', (event, path) => {
    return fs.readFileSync(path, 'utf8');
});

// Add mode switching
let currentWindow = null;

function showRecorderWindow() {
    // Show/create recorder window (index.html)
}

function showHistoryWindow() {
    // Show/create history window (history.html)
}

ipcMain.on('show-recorder', () => showRecorderWindow());
ipcMain.on('show-history', () => showHistoryWindow());
```

#### C) File Structure After Phase 2
```
IAC-30-brain-dump-voice-processor/
├── main.js                      # Electron main process (updated)
├── index.html                   # Record mode UI
├── history.html                 # History mode UI (new)
├── history.js                   # History UI logic (new)
├── recorder.py                  # Voice recorder
├── transcribe.py                # Transcription (updated)
├── package.json
├── .venv/
├── models/
│   └── ggml-base.bin
├── src/
│   ├── database.js              # Database methods (new)
│   ├── data/
│   │   └── recordings.json      # Recordings DB (new)
│   └── python/
│       ├── audio/
│       └── transcription/
├── outputs/
│   ├── audio/                   # WAV files
│   ├── transcripts/
│   │   ├── *_raw.txt            # Plain text (new)
│   │   └── *.md                 # Markdown
│   └── metadata/
│       └── recordings.json      # Metadata store (new)
└── docs/
    └── PHASE_2_GUIDE.md         # This document
Step 4: Test End-to-End
Test Checklist:

 Record new voice → Appears in history
 Search recordings by text
 Filter by date range
 Play audio from history
 View full transcript
 Copy plain text to clipboard
 Download audio file
 Toggle between Record/History modes
 Keyboard shortcuts work
 Both .txt and .md files created

Step 5: Merge to Main
bash# Commit all changes
git add .
git commit -m "feat: add history view with audio playback (Phase 2)"

# Push feature branch
git push origin feature/history-view

# Create Pull Request on GitHub
gh pr create \
  --title "Phase 2: History View + Audio Playback" \
  --body "Implements SuperWhisper-style history interface" \
  --base main \
  --head feature/history-view

# After review, merge PR
gh pr merge feature/history-view --merge

# Delete feature branch
git branch -d feature/history-view
git push origin --delete feature/history-view

# Tag release
git tag -a v2.0.0 -m "Phase 2: History interface complete"
git push origin v2.0.0

Technical Decisions {#technical-decisions}
1. Plain Text + Markdown Dual Output
Decision: Save both formats
Files created per recording:

transcript_TIMESTAMP.txt - Plain text (for Claude paste)
transcript_TIMESTAMP.md - Formatted markdown (for archiving)

Rationale:

User wants plain text for Claude Desktop workflow
Markdown useful for long-term archiving with metadata
Minimal storage overhead (text files are tiny)
Easy to implement (write twice during transcription)

2. JSON Database for Metadata
Decision: Use JSON file for recordings database
Format:
json{
  "recordings": [
    {
      "id": "rec_1730248200000",
      "timestamp": "2025-10-25T04:30:00Z",
      "duration": 154,
      "audioFile": "path/to/audio.wav",
      "transcriptTxt": "path/to/transcript.txt",
      "transcriptMd": "path/to/transcript.md",
      "firstLine": "Preview text...",
      "metadata": {
        "model": "whisper-base",
        "language": "en"
      }
    }
  ]
}
Rationale:

Simple, human-readable
No external dependencies (no SQLite setup)
Easy to backup/sync
Fast for small datasets (<10,000 recordings)
Can migrate to SQLite later if needed

When to migrate to SQLite:



1,000 recordings (search becomes slow)


Need complex queries
Multiple concurrent users

3. HTML5 Audio Player (MVP)
Decision: Start with native <audio> element
HTML:
html<audio controls>
  <source src="recording.wav" type="audio/wav">
</audio>
```

**Rationale:**
- Zero dependencies
- Works immediately
- Good enough for Phase 2 MVP
- Can upgrade later

**Future Enhancement (Phase 3):**
- Wavesurfer.js for waveform visualization
- Custom controls with keyboard shortcuts
- Playback speed control
- Progress markers

### 4. Electron Multi-Window Architecture

**Decision:** Single window with view swapping

**Approach:**
- One Electron window
- Load different HTML files:
  - `index.html` - Record mode
  - `history.html` - History mode
- Use `window.loadFile()` to switch

**Alternative Considered:** Multiple windows
- More complex state management
- Higher memory usage
- Not needed for MVP

**Rationale:**
- Simpler state management
- Lower resource usage
- Faster view transitions
- Easier to implement keyboard shortcuts

### 5. File Naming Convention

**Decision:** Timestamp-based naming

**Format:**
- Audio: `recording_YYYY-MM-DD_HH-MM-SS.wav`
- Text: `transcript_YYYY-MM-DD_HH-MM-SS.txt`
- Markdown: `transcript_YYYY-MM-DD_HH-MM-SS.md`

**Example:**
```
recording_2025-10-25_04-30-00.wav
transcript_2025-10-25_04-30-00.txt
transcript_2025-10-25_04-30-00.md
Rationale:

Sorts chronologically in file system
No ID conflicts (timestamp = unique)
Human-readable
Compatible with all OS filesystems


Success Criteria {#success-criteria}
MVP Requirements (Phase 2 Complete)
Must Have:

 History view shows all past recordings
 Can play audio from history view
 Can copy plain text transcript with one click
 Search/filter functionality works
 Toggle between Record/History mode
 Plain text output (.txt) saved alongside markdown (.md)
 Database tracks all recordings with metadata

Performance:

History list loads in <1 second
Search returns results in <500ms
Audio playback starts immediately
UI remains responsive with 100+ recordings

User Experience:

Zero friction copying transcript to clipboard
One-click audio playback
Clear visual feedback for all actions
No data loss between sessions

Nice-to-Have (Post-MVP)
Phase 3 Enhancements:

Waveform visualization
Keyboard shortcuts for everything
Bulk actions (delete, export)
Tags/categories
Export to CSV/JSON
Cloud sync (optional)
Mobile companion app


Timeline Estimate
Development Time
Assuming focused work sessions:
TaskTime EstimateDatabase implementation2 hoursHistory HTML/CSS2 hoursHistory JavaScript logic3 hoursIPC handlers in main.js1 hourUpdate transcription pipeline1 hourAudio player integration1 hourPlain text output30 minutesTesting & debugging2 hoursDocumentation updates1 hourTotal~13-14 hours
Realistic Timeline:

Weekend build: 2 days (Saturday + Sunday)
Evening builds: 4-5 evenings
One week part-time: Comfortable pace


Risk Mitigation
RiskImpactMitigationJSON file corruptionHighImplement backup on every write, validate JSON before savingLarge file handlingMediumTest with 100+ recordings early, profile performanceAudio playback issuesMediumTest multiple audio formats, provide error messagesSearch performanceLowStart simple, optimize if needed (debounce, indexing)Context window exhaustionMediumUse this guide from project files, not paste into chat

Next Steps

✅ Create this guide (complete)
Save to Claude Desktop project files
Create GitHub Issue for Phase 2
Create branch: feature/history-view
Start building database layer
Build history HTML/JS
Integrate with existing recorder
Test end-to-end
Merge to main and release v2.0.0


Built by: Codio × Claude Sonnet 4.5
Project: IAC-30-brain-dump-voice-processor
GitHub: https://github.com/Iamcodio/IAC-30-brain-dump-voice-processor
Phase 1: ✅ Complete (Voice → Whisper → Markdown)
Phase 2: 🚧 In Progress (History + Audio Playback)