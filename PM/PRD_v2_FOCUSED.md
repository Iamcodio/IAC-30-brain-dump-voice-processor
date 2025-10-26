# Product Requirements Document (PRD)
## BrainDump Voice Processor v2.5.0

**Document Version:** v2.0  
**Date:** 2025-10-26  
**Status:** Planning  
**Owner:** Product Development Manager  

---

## Executive Summary

**Product:** BrainDump Voice Processor  
**Vision:** Zero-friction voice-to-text for neurodiverse users  
**Target:** ADHD, autism, PTSD communities  
**Core Value:** Reduce cognitive load, not add to it  

---

## Current State (v2.1.0)

### What Works ✅
- Voice recording (Ctrl+Y toggle)
- Whisper C++ transcription (Metal GPU accelerated)
- Local processing (100% private)
- History view with search
- 92% test coverage
- Production-ready architecture

### What's Missing ❌
- Auto-paste functionality
- Visual recording feedback
- Playback review
- Any quality-of-life features

---

## Product Goals

### Primary Goal
**Eliminate cognitive friction in capturing thoughts**

### Success Metrics
- 5+ uses per week (sticky usage)
- User feedback: "Reduced my stress"
- Zero feature confusion
- Auto-fill works in 90%+ of apps

---

## Target Users

### Primary Persona: "Alex"
- **Profile:** 28, software developer, ADHD
- **Pain Points:**
  - Forgets thoughts between speaking and typing
  - Manual paste adds friction
  - Uncertainty creates anxiety ("Am I recording?")
  - Reviewing transcripts is tedious

- **Jobs to Be Done:**
  - Capture fleeting thoughts instantly
  - Get text into apps without thinking
  - Confirm system is working
  - Fix mistakes easily

---

## Phase C: MVP Feature Set (v2.5.0)

### Priority 1: MUST HAVE 🔴

#### C-001: Auto-Fill Text Fields ⭐
**Problem:** Manual paste adds friction  
**Solution:** Click in text field → last transcript auto-fills  
**Value:** Zero cognitive load to paste  
**Technical:**
- macOS Accessibility API
- Monitor active text field
- Inject text on focus
- Works in: browsers, Slack, Notes, etc.

**Acceptance Criteria:**
- Works in Chrome, Safari, Firefox
- Works in Electron apps (Slack, VS Code)
- Works in native macOS apps (Notes, Messages)
- Fails gracefully (permission denied → notify user)
- User can disable per-app

**Effort:** 15-20 hours

---

#### C-002: Visual Recording Indicator
**Problem:** "Am I recording?" uncertainty creates anxiety  
**Solution:** System tray icon shows status  
**Value:** Visual confirmation, always visible  
**Technical:**
- Electron tray API
- Icons: idle (gray), recording (red pulse), error (yellow)
- Click to show/hide window

**Acceptance Criteria:**
- Icon visible in macOS menu bar
- Status updates within 100ms
- Tooltip shows last action
- Right-click menu (Show Window, Quit)

**Effort:** 2-3 hours

---

#### C-003: Quick Playback Review
**Problem:** Can't verify what was captured  
**Solution:** Press key to hear last 10 seconds  
**Value:** Confidence boost  
**Technical:**
- macOS AVFoundation
- Global hotkey (Ctrl+Option+Y)
- Fade in/out audio

**Acceptance Criteria:**
- Plays last 10 seconds (or full if shorter)
- Works while recording (plays previous recording)
- Volume respects system settings
- Hotkey doesn't conflict

**Effort:** 4-6 hours

---

### Priority 2: SHOULD HAVE 🟡

#### C-004: Undo Last Recording
**Problem:** User regrets what they said  
**Solution:** Delete button in history  
**Value:** Forgiveness reduces anxiety  

**Acceptance Criteria:**
- "Delete" button in history view
- Confirmation dialog
- Removes audio + transcript + DB entry
- Undo within 5 seconds

**Effort:** 3-4 hours

---

#### C-005: Favorites/Pin
**Problem:** Important recordings get lost in history  
**Solution:** Star icon to pin recordings  
**Value:** Important things stay accessible  

**Acceptance Criteria:**
- Star icon in history view
- Pinned recordings sort to top
- Persist in database
- Export includes starred status

**Effort:** 4-6 hours

---

#### C-006: Simple Tags (Max 3)
**Problem:** Basic categorization needed  
**Solution:** Add 1-3 word tags to recordings  
**Value:** Simple organization without decision paralysis  
**Constraint:** MAX 3 tags per recording  

**Acceptance Criteria:**
- Tag input in history view
- Autocomplete from previous tags
- Filter by tag
- Max 3 tags enforced

**Effort:** 8-10 hours

---

### Priority 3: NICE TO HAVE 🟢

#### C-007: Re-transcribe
**Problem:** Base model missed words  
**Solution:** Re-run with larger model  
**Value:** Recovery from poor transcription  

**Acceptance Criteria:**
- "Re-transcribe" button in history
- Model selector (base, small, medium)
- Progress indicator
- Compare before/after

**Effort:** 8-12 hours

---

#### C-008: Export to Markdown
**Problem:** Want to use transcripts elsewhere  
**Solution:** Bulk export to .md files  
**Value:** Workflow integration  

**Acceptance Criteria:**
- "Export" button in history
- Select multiple recordings
- Generates one .md file per recording
- Includes metadata (date, tags)

**Effort:** 4-6 hours

---

#### C-009: Batch Delete Old
**Problem:** History clutters over time  
**Solution:** Delete recordings older than X days  
**Value:** Easy cleanup  

**Acceptance Criteria:**
- Settings panel with retention period
- Confirmation dialog showing count
- Does not delete starred recordings
- Runs on app startup

**Effort:** 3-4 hours

---

## What We're NOT Building

### Removed Features (22 total)
- ❌ AI summarization → adds cognitive load
- ❌ Collaboration/sharing → adds complexity
- ❌ Custom workflows → decision fatigue
- ❌ Advanced search → simple is better
- ❌ Multi-language → focus on English first
- ❌ Cloud sync → privacy concerns
- ❌ Mobile app → desktop first
- ❌ Calendar integration → scope creep
- ❌ Email integration → scope creep
- ❌ Slack integration → scope creep
- ❌ Custom hotkeys → config fatigue
- ❌ Themes → vanity feature
- ❌ Analytics/tracking → privacy violation
- ❌ Social features → unnecessary
- ❌ Plugins/extensions → over-engineering

**Decision Rule:** If it adds cognitive load → NO

---

## Technical Requirements

### Platform
- macOS 12+ (Monterey or later)
- Apple Silicon (M1/M2/M3) preferred
- Intel Macs supported (no GPU acceleration)

### Dependencies
- Electron 28+
- Python 3.11+
- Whisper C++ with Metal support
- Better-sqlite3 for database

### Performance Targets
- App launch: <2 seconds
- Recording start: <200ms
- Transcription: <1 second per 10 seconds of audio
- Auto-fill latency: <100ms

### Privacy
- 100% local processing
- No telemetry/analytics
- No network calls (except updates)
- User data never leaves device

---

## Release Plan

### v2.5.0-beta1 (C-001 only)
**Timeline:** 1 week after Phase B  
**Scope:** Auto-fill text fields only  
**Goal:** Validate core value proposition  
**Users:** 5 beta testers  

### v2.5.0-beta2 (C-001 to C-003)
**Timeline:** 2 weeks after beta1  
**Scope:** Auto-fill + visual indicator + playback  
**Goal:** Complete core UX  
**Users:** 10-15 beta testers  

### v2.5.0 (Public Release)
**Timeline:** 1 month after beta2  
**Scope:** C-001 to C-006 (or C-009 if time permits)  
**Goal:** Production launch  
**Distribution:** Direct download, Mac App Store (if approved)  

---

## Success Criteria

### Phase C Complete When:
✅ C-001 works in 90%+ of apps  
✅ Visual indicator never lags  
✅ Playback works reliably  
✅ All features tested by beta users  
✅ Zero regressions from Phase B  
✅ Performance targets met  

### Product-Market Fit When:
✅ 5+ uses per week (per user)  
✅ Qualitative feedback: "Reduced my stress"  
✅ <5% feature confusion (user tests)  
✅ Organic referrals from beta users  

---

## Risks & Mitigation

### Risk: macOS Accessibility API breaks
**Likelihood:** Medium  
**Impact:** Critical (C-001 fails)  
**Mitigation:** Test on multiple macOS versions, fallback to manual paste

### Risk: Performance regression from TypeScript
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:** Benchmark Phase B.4 vs Phase B.3

### Risk: Feature creep during C implementation
**Likelihood:** High  
**Impact:** Medium (delays launch)  
**Mitigation:** Strict PRD adherence, no mid-sprint additions

---

## Open Questions

1. Should C-001 auto-fill on click or on explicit hotkey? → TBD with beta users
2. What's the right Whisper model for re-transcription? → base/small/medium benchmarks
3. Mac App Store submission timeline? → Research requirements in Phase C
4. Pricing model for v3.0? → Decide after PMF validation

---

## Appendix: Effort Summary

| Feature | Priority | Effort | Cumulative |
|---------|----------|--------|------------|
| C-001 | Must Have | 15-20h | 15-20h |
| C-002 | Must Have | 2-3h | 17-23h |
| C-003 | Must Have | 4-6h | 21-29h |
| C-004 | Should Have | 3-4h | 24-33h |
| C-005 | Should Have | 4-6h | 28-39h |
| C-006 | Should Have | 8-10h | 36-49h |
| C-007 | Nice to Have | 8-12h | 44-61h |
| C-008 | Nice to Have | 4-6h | 48-67h |
| C-009 | Nice to Have | 3-4h | 51-71h |

**Minimum MVP (C-001 to C-003):** 21-29 hours  
**Complete v2.5.0 (all 9):** 51-71 hours  

---

**Status:** APPROVED  
**Next Action:** Complete Phase B.4, then start C-001  
**Document Owner:** Product Development Manager
