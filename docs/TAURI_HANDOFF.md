# BrainDump 3.0 - Tauri Framework Handoff

**Date:** 2025-11-05  
**From:** Phase C1 (Electron Experiment)  
**To:** Phase 3.1 (Tauri + Rust + Svelte)  
**PM:** IamCodio  
**Technical Lead:** Claude Code (Web + Subagents)

---

## Executive Summary

**Mission:** Build a 10MB privacy-first voice recorder that replaces SuperWhisper (€132/year).

**Phase C1 Status:** ✅ Successful experiment, strategically archived  
**Phase 3.1 Goal:** Port core functionality to Tauri + Rust + Svelte  
**Target:** Cross-platform (Mac/Windows/Linux) with 10MB bundle

---

## Phase C1: What We Built & Learned

### What Worked ✅
- **Architecture patterns:** Audio capture → transcription → storage → UI
- **Whisper C++ integration:** Metal GPU acceleration (436ms for 11s audio)
- **Privacy-first design:** 100% local processing
- **Test coverage:** 92% (excellent baseline)
- **Database design:** SQLite with full-text search
- **Privacy profiles:** Designed (not implemented, saved for Phase 3.3)

### What Didn't Work ❌
- **Bundle size:** 140MB (Electron bloat)
- **Python subprocess:** Added complexity, slower startup
- **TypeScript sprawl:** Too many config files, build complexity
- **Memory usage:** ~200MB idle (Electron overhead)

### Key Learnings 💡
1. **Python subprocess = unnecessary complexity** → Rust native wins
2. **Electron = bloat we don't need** → Tauri gives native performance
3. **Privacy profiles = future feature** → Focus on core MVP first
4. **Test coverage = essential** → Maintain 90%+ in Rust
5. **SuperWhisper UX = benchmark** → Simple, fast, reliable

---

## Why Tauri? (Technical Justification)

| Aspect | Electron (Phase C1) | Tauri (Phase 3.1) |
|--------|---------------------|-------------------|
| Bundle Size | 140MB | ~10MB target |
| Memory (idle) | ~200MB | ~50MB target |
| Startup Time | 2-3 seconds | <500ms target |
| Backend | Python subprocess | Rust native |
| Cross-platform | ✅ | ✅ |
| Mobile Ready | ❌ | ✅ (Rust core reusable) |

**ROI:** Same functionality, 14x smaller, 4x faster, mobile-ready architecture.

---

## Technical Stack (Phase 3.1)

### Backend: Rust
- **Audio capture:** `cpal` crate (cross-platform, low-level)
- **Transcription:** `whisper-rs` (Whisper C++ bindings)
- **Storage:** `rusqlite` (SQLite wrapper)
- **Async runtime:** `tokio` (for audio streaming)
- **IPC:** Tauri commands (built-in, type-safe)

### Frontend: Svelte
- **Why not React:** PM preference (IamCodio dislikes React)
- **Why Svelte:** Lightweight (5KB), fast, elegant, reactive
- **State management:** Svelte stores (built-in)
- **Styling:** CSS (no framework needed)

### Framework: Tauri
- **Version:** 1.x (stable)
- **Language:** Rust backend, Svelte frontend
- **Build:** Single binary per platform
- **Updater:** Built-in (for future auto-updates)

---

## Architecture Overview

### Directory Structure (Target)
```
IAC-30-brain-dump-voice-processor/
├── README.md
├── Cargo.toml                   # Rust dependencies
├── tauri.conf.json             # Tauri configuration
├── package.json                # Frontend dependencies
│
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── audio/              # Audio capture module
│   │   │   ├── recorder.rs
│   │   │   └── mod.rs
│   │   ├── transcription/      # Whisper integration
│   │   │   ├── whisper.rs
│   │   │   └── mod.rs
│   │   ├── storage/            # Database layer
│   │   │   ├── db.rs
│   │   │   └── mod.rs
│   │   └── commands/           # Tauri IPC commands
│   │       ├── recording.rs
│   │       ├── transcription.rs
│   │       └── mod.rs
│   └── Cargo.toml
│
├── src/                         # Svelte frontend
│   ├── App.svelte              # Root component
│   ├── main.js                 # Entry point
│   ├── lib/
│   │   ├── components/
│   │   │   ├── RecordButton.svelte
│   │   │   ├── HistoryList.svelte
│   │   │   └── AudioPlayer.svelte
│   │   └── stores/
│   │       └── recordings.js
│   └── assets/
│
├── models/
│   └── ggml-base.bin           # Whisper model (from Phase C1)
│
├── docs/
│   ├── strategic-pivot-v3.md   # Strategic context
│   └── MIGRATION_GUIDE.md      # Electron → Tauri lessons
│
└── archive/
    └── phase-c1-electron/      # Everything from Phase C1
```

### Design Patterns
- **MVC-ish:** Rust models, Svelte views, Tauri commands as controllers
- **Repository pattern:** Database abstraction (`RecordingRepository`)
- **Event-driven:** Audio events → transcription events → UI updates
- **Error handling:** Result types, no unwrap() in production code

### Data Flow
```
User Action (UI)
    ↓
Svelte Component
    ↓
Tauri Command (IPC)
    ↓
Rust Backend (Business Logic)
    ↓
Storage Layer (SQLite)
    ↓
Return Result
    ↓
Update Svelte Store
    ↓
Re-render UI
```

---

## Core Functionality (MVP - Phase 3.1)

### Recording Flow
1. User hits global hotkey (Cmd+Shift+Space)
2. Rust `cpal` captures audio stream
3. WAV file saved to `outputs/audio/`
4. Visual feedback (waveform/timer)
5. User stops recording (hotkey again)

### Transcription Flow
1. Recording stopped → trigger transcription
2. Rust calls `whisper-rs` with WAV file
3. Whisper C++ processes (Metal GPU)
4. Text returned to Rust
5. Save to SQLite + markdown file
6. Update UI with transcript

### History/Playback Flow
1. User opens history view
2. Load recordings from SQLite
3. Display list (date, duration, first line)
4. Click to play audio (HTML5 audio element)
5. Click to copy transcript (clipboard API)

---

## What To Port From Phase C1

### Keep (Concepts, Not Code)
- ✅ Database schema (recordings table, full-text search)
- ✅ File naming convention (recording_YYYY-MM-DD_HH-MM-SS.wav)
- ✅ Dual output (plain text + markdown)
- ✅ Keyboard shortcuts (global hotkeys)
- ✅ Minimal UI design (focus on task, not distraction)

### Don't Port (Leave in Archive)
- ❌ Python subprocess logic (rewrite in Rust)
- ❌ Electron IPC complexity (Tauri is simpler)
- ❌ TypeScript types (Rust has strong typing)
- ❌ Node.js dependencies (only Svelte build tools needed)

### Reference (Learn From, Don't Copy)
- 📚 Test structure (adapt to Rust `#[test]` modules)
- 📚 Error handling patterns (adapt to Rust `Result<T, E>`)
- 📚 Database queries (adapt to `rusqlite`)

---

## Phase 3.1 Implementation Plan

### Step 1: Project Setup (2-4 hours)
```bash
# Install Tauri CLI
cargo install tauri-cli

# Create Tauri project
cargo tauri init

# Configure for Svelte
npm install -D svelte @sveltejs/vite-plugin-svelte
```

**Deliverable:** Empty Tauri app that launches

### Step 2: Audio Capture (4-6 hours)
**Port:** `recorder.py` → `src-tauri/src/audio/recorder.rs`

**Key changes:**
- Python `pyaudio` → Rust `cpal`
- Blocking subprocess → async Rust streams
- Manual WAV writing → Rust `hound` crate

**Deliverable:** Rust function that records audio to WAV file

### Step 3: Whisper Integration (4-6 hours)
**Port:** `transcribe.py` → `src-tauri/src/transcription/whisper.rs`

**Key changes:**
- Python subprocess → `whisper-rs` bindings
- Manual path handling → Rust PathBuf
- Error handling → Result types

**Deliverable:** Rust function that transcribes WAV → text

### Step 4: Database Layer (3-4 hours)
**Port:** `database.ts` → `src-tauri/src/storage/db.rs`

**Key changes:**
- better-sqlite3 (Node) → rusqlite
- Promises → Result types
- TypeScript interfaces → Rust structs

**Deliverable:** `RecordingRepository` with CRUD operations

### Step 5: Tauri Commands (2-3 hours)
**Create:** `src-tauri/src/commands/*.rs`

**Commands needed:**
- `start_recording()` → Audio capture
- `stop_recording()` → Save + trigger transcription
- `get_recordings()` → Query database
- `get_transcript(id)` → Load transcript
- `play_audio(path)` → Return audio file path

**Deliverable:** Rust backend callable from Svelte

### Step 6: Svelte UI (6-8 hours)
**Port:** `index.html`, `history.html` → Svelte components

**Components:**
- `RecordButton.svelte` - Main record/stop button
- `RecordingStatus.svelte` - Waveform/timer display
- `HistoryList.svelte` - List of past recordings
- `AudioPlayer.svelte` - Playback controls
- `Settings.svelte` - Keyboard shortcuts, privacy tier

**Deliverable:** Working UI that calls Tauri commands

### Step 7: End-to-End Testing (4-6 hours)
- Record audio → verify WAV file created
- Transcribe → verify text matches audio
- Save to database → verify query returns result
- Play audio → verify playback works
- Copy transcript → verify clipboard works

**Deliverable:** Full pipeline working

### Step 8: Build & Package (2-3 hours)
```bash
# Build for macOS (Apple Silicon)
cargo tauri build --target aarch64-apple-darwin

# Build for macOS (Intel)
cargo tauri build --target x86_64-apple-darwin

# Verify bundle size
ls -lh src-tauri/target/release/bundle/macos/*.app
```

**Target:** <15MB .app bundle (10MB core + 5MB Whisper model)

**Deliverable:** Installable .app for macOS

---

## Development Workflow

### Daily Flow
1. **Morning:** Review strategic-pivot-v3.md, check GitHub issues
2. **Build session:** Step-pause-step with Claude Code
3. **Test:** Run end-to-end test after each module
4. **Commit:** Small, focused commits with clear messages
5. **Document:** Update MIGRATION_GUIDE.md with learnings

### Token Management
- **Max Plan:** 200K tokens (5× Pro)
- **Strategy:** Use Claude Code subagents for specialized tasks
- **Avoid:** Long context dumps, repeated explanations
- **Prefer:** Focused questions, specific code reviews

### Subagent Strategy
- **rust-expert:** Rust code reviews, best practices
- **audio-engineer:** Audio capture, cpal integration
- **tauri-architect:** Tauri patterns, IPC design
- **test-writer:** Write Rust tests, ensure coverage

---

## Key Constraints

### Technical
- **Rust stable only** (no nightly features)
- **Whisper model:** Use existing ggml-base.bin (141MB)
- **Audio format:** WAV (44.1kHz, 16-bit, mono)
- **Database:** SQLite (single file, no server)
- **Platforms:** macOS first, Windows/Linux later

### UX
- **SuperWhisper parity:** Match or exceed UX simplicity
- **<100ms latency:** Hotkey response, UI updates
- **<500ms startup:** App launch to ready state
- **Visual feedback:** Always show recording status
- **No interruptions:** User controls start/stop

### Privacy
- **100% local:** No cloud, no telemetry, no phone home
- **User-owned data:** All files in user's home directory
- **Transparent:** Privacy tier (local/cloud) clearly shown
- **Optional:** Cloud features opt-in only (Phase 3.3+)

---

## Success Metrics (Phase 3.1)

### Must Have (Launch Blockers)
- ✅ 10MB bundle size (±2MB tolerance)
- ✅ <500ms startup time
- ✅ Records audio via hotkey
- ✅ Transcribes with Whisper C++
- ✅ Saves to database
- ✅ Displays history
- ✅ Plays audio
- ✅ Copies transcript to clipboard

### Should Have (Quality Goals)
- 90%+ test coverage (Rust)
- Zero crashes in 100 recording sessions
- <2% transcription errors (vs Whisper baseline)
- Hotkey works 100% of time

### Could Have (Nice-to-Have)
- Waveform visualization
- Real-time transcription preview
- Multiple audio input device selection
- Custom keyboard shortcuts

---

## File Locations (Important!)

### Project Root
```
/Users/kjd/01-projects/IAC-30-brain-dump-voice-processor/
```

### Key Files
- **Strategic doc:** `docs/strategic-pivot-v3.md`
- **Whisper model:** `models/ggml-base.bin`
- **Phase C1 archive:** `archive/phase-c1-electron/`
- **Sample recordings:** `outputs/audio/sample*.wav`

### Build Outputs
- **Dev build:** `src-tauri/target/debug/`
- **Release build:** `src-tauri/target/release/`
- **macOS .app:** `src-tauri/target/release/bundle/macos/`

---

## Common Pitfalls (Avoid These!)

### 1. Copying Electron Patterns
**Wrong:** Port TypeScript IPC → Rust  
**Right:** Use Tauri's built-in command system

### 2. Over-Engineering
**Wrong:** Add features not in MVP scope  
**Right:** Stick to Phase 3.1 deliverables

### 3. Token Burn
**Wrong:** Dump entire codebase into chat  
**Right:** Step-pause-step, focused questions

### 4. Ignoring Tests
**Wrong:** "I'll add tests later"  
**Right:** Write tests alongside code (TDD)

### 5. Python-isms in Rust
**Wrong:** `.unwrap()` everywhere, mutable globals  
**Right:** Result types, ownership patterns, immutability

---

## Technical References

### Official Documentation
- **Rust:** https://doc.rust-lang.org/book/
- **Tauri:** https://tauri.app/v1/guides/
- **Svelte:** https://svelte.dev/docs
- **cpal:** https://docs.rs/cpal/latest/cpal/
- **whisper-rs:** https://github.com/tazz4843/whisper-rs
- **rusqlite:** https://docs.rs/rusqlite/latest/rusqlite/

### Phase C1 Reference
- **Archive:** `archive/phase-c1-electron/`
- **Learnings:** Read, don't copy
- **Tests:** Structure reference only

### Community Resources
- **Tauri Discord:** https://discord.com/invite/tauri
- **Rust Users Forum:** https://users.rust-lang.org/

---

## Next Steps (Immediate)

### 1. Environment Setup
```bash
# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Verify
cargo tauri --version
```

### 2. Create Tauri Project
```bash
cd /Users/kjd/01-projects/IAC-30-brain-dump-voice-processor
cargo tauri init
# Select: Svelte, JavaScript, npm
```

### 3. First Milestone: "Hello World"
- Launch Tauri app
- Display "BrainDump 3.0" in Svelte UI
- Close app
- **Goal:** Prove toolchain works

### 4. Second Milestone: Audio Capture
- Record 5 seconds of audio
- Save to WAV file
- Verify playback in VLC
- **Goal:** Core audio working

### 5. Third Milestone: Transcription
- Transcribe test WAV
- Display text in UI
- **Goal:** Whisper integration working

---

## Communication Style (For Claude Code)

### Do
- ✅ Explain trade-offs (why X over Y?)
- ✅ Call out risks early
- ✅ Use ELI12 explanations (Feynman method)
- ✅ One code block at a time (step-pause-step)
- ✅ Provide working examples

### Don't
- ❌ Assume prior context (start fresh)
- ❌ Multiple code blocks in one response
- ❌ Comments inside code blocks (explain outside)
- ❌ Apologize excessively (just fix it)
- ❌ Corporate speak (be direct)

---

## Questions? Start Here

### "Where do I begin?"
→ Read this document, then run environment setup commands above.

### "What's the first code to write?"
→ `src-tauri/src/audio/recorder.rs` - Port Python recorder to Rust cpal.

### "How do I test audio capture?"
→ Use `cargo test` for unit tests, manual test with VLC for integration.

### "What if I'm stuck?"
→ Step-pause-step: Ask one focused question at a time.

### "What's the deadline?"
→ No deadlines. Quality > speed. Step-pause-step approach.

---

## Final Notes

### This Is Not Just Code
BrainDump is a **black box recorder for people in crisis**. Privacy and reliability are non-negotiable. Every decision should ask: "Does this serve someone in their darkest moment?"

### Phase C1 Was Worth It
We learned what doesn't work. That's valuable. Electron taught us to value simplicity. Python taught us to value native code. TypeScript taught us to value Rust's type system.

### Phase 3.1 Is A Fresh Start
Clean slate. No technical debt. Do it right the first time. Build quality from the foundation.

### Remember The Mission
Replace SuperWhisper. Free, private, reliable. For people who need it most.

---

**Document Version:** 1.0  
**Created:** 2025-11-05  
**Author:** Claude Sonnet 4.5 + IamCodio  
**Status:** Living Document  
**Next Review:** After Phase 3.1 completion
