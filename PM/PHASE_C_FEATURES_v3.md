# Phase C: Core Features & UX Polish (v3)

**Version:** v3.0  
**Updated:** 2025-10-26 02:10 IST
**Status:** PLANNING
**Focus:** Essential features that make BrainDump killer

---

## Core Philosophy

**Every feature must reduce stress, not add to it.**

**Ship fast. Polish later.**

---

## Phase C Features

### Critical (Ship Blockers) 🔴

**C-001: Auto-Fill Text Fields** ⭐
Click in any text field → last transcript auto-fills
**Why:** THE killer feature. Zero friction paste.

**C-002: System Tray Indicator**
Always-visible icon showing: idle / recording / processing
**Why:** Never wonder "am I recording?"

**C-003: Waveform Visualization**
Real-time waveform while recording
**Why:** Visual confidence it's working

---

### Important (Quality of Life) 🟡

**C-004: Custom Keyboard Shortcuts**
Let users set their own hotkeys (default: Ctrl+Y)
**Why:** Accessibility, prevent conflicts

**C-005: Transcript Editing**
Click transcript to edit inline, save changes
**Why:** Fix errors without external tools

**C-006: Simple Tags (Max 3)**
Add up to 3 tags per recording, filter by tag
**Why:** Basic organization without overwhelm

---

### Nice to Have (Polish) 🟢

**C-007: Export Formats**
Export as: Markdown, JSON, CSV, SRT
**Why:** Workflow integration

**C-008: Batch Operations**
- Delete multiple recordings
- Export multiple recordings
- **Concatenate for reports:** Weekly summary, monthly summary
**Why:** Efficiency, reporting

**C-009: Playback Speed Control**
Adjust speed: 0.5x - 2x
**Why:** Quick review

**C-010: Favorites/Star**
Star important recordings, sort to top
**Why:** Quick access to key items

**C-011: Dark Mode**
Toggle light/dark theme
**Why:** Modern UX, eye comfort

---

## What's NOT in Phase C

**Saved for Phase D:**
- RAG (search semantic context across transcripts)
- LLM integration (Claude API, OpenRouter)
- Prompt templates/folders
- End-of-day summary automation
- 4D Value Vortex classification

**Reason:** Ship core features first, AI layer after users love the basics

---

## Sub-Phases

### Phase C.1: The Essentials
**Features:** C-001, C-002, C-003
**Goal:** Killer first impression
**Ship:** v2.5.0-beta1

### Phase C.2: Power User
**Features:** C-004, C-005, C-006
**Goal:** Customization + editing
**Ship:** v2.5.0-beta2

### Phase C.3: Polish
**Features:** C-007 through C-011
**Goal:** Complete UX
**Ship:** v2.5.0 (public)

---

## Database Schema Changes

```sql
-- New columns
ALTER TABLE recordings ADD COLUMN starred INTEGER DEFAULT 0;
ALTER TABLE recordings ADD COLUMN tags TEXT DEFAULT '';
ALTER TABLE recordings ADD COLUMN edited_transcript TEXT DEFAULT NULL;
ALTER TABLE recordings ADD COLUMN last_played_at TEXT DEFAULT NULL;
ALTER TABLE recordings ADD COLUMN playback_speed REAL DEFAULT 1.0;
```

---

## Success Criteria

**Phase C.1 Complete:**
✅ Auto-fill works in 90%+ apps
✅ Tray icon updates <100ms
✅ Waveform displays smoothly

**Phase C.2 Complete:**
✅ Users can customize hotkeys
✅ Transcript editing saves correctly
✅ Tags filter accurately

**Phase C.3 Complete:**
✅ All 11 features working
✅ Batch export creates weekly/monthly reports
✅ E2E tests passing
✅ Beta users love it

---

## Key Technical Decisions

**Auto-Fill (C-001):**
- macOS Accessibility API
- Requires user permission (System Preferences → Privacy)
- Fallback: Copy to clipboard if permission denied

**Waveform (C-003):**
- Web Audio API + Canvas
- 30fps refresh rate
- Low CPU overhead

**Batch Concatenation (C-008):**
- Weekly: All transcripts from past 7 days → single MD file
- Monthly: All transcripts from past 30 days → single MD file
- Include: Date headers, word count, tags

---

## First Impression Goal

**New user experience:**
1. Download → Install → Launch (30 seconds)
2. Press Ctrl+Y → See waveform → Record (10 seconds)
3. Stop → Transcript appears (5 seconds)
4. Click in browser → Text auto-fills ⚡
5. Reaction: "Holy shit, this is amazing"

**That's what Phase C delivers.**

---

**Status:** APPROVED  
**Next:** Claude Code creates technical implementation plan  
**Owner:** Product Development Manager
