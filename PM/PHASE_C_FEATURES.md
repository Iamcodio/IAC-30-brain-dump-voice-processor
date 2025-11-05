# Phase C: MVP Feature Set

**Version:** v2.5.0  
**Follows:** v3.0.0 (Phase B complete)  
**Timeline:** TBD after Phase B  
**Focus:** Reduce cognitive load for neurodiverse users  

---

## Core Philosophy

**Every feature must answer:** Does this reduce stress or add stress?

If it adds stress → cut it.

---

## 9 Features (Prioritized)

### Priority 1: MUST HAVE 🔴

**C-001: Auto-Fill Text Fields** ⭐ **#1 FEATURE**
- Click in any text field → last transcript fills in
- **Value:** Zero cognitive load to paste
- **Effort:** 15-20 hours
- **Technical:** macOS accessibility API + global hotkey

**C-002: Visual Recording Indicator**
- System tray icon shows recording status
- **Value:** Never wonder "am I recording?"
- **Effort:** 2-3 hours

**C-003: Quick Playback Review**
- Press key to hear last 10 seconds
- **Value:** Confidence boost
- **Effort:** 4-6 hours

---

### Priority 2: SHOULD HAVE 🟡

**C-004: Undo Last Recording**
- Delete if user regrets what they said
- **Value:** Forgiveness reduces anxiety
- **Effort:** 3-4 hours

**C-005: Favorites/Pin**
- Star important recordings
- **Value:** Important things don't get lost
- **Effort:** 4-6 hours

**C-006: Simple Tags (Max 3)**
- Add 1-3 word tags
- **Value:** Simple categorization
- **Effort:** 8-10 hours
- **Constraint:** MAX 3 tags (prevent decision paralysis)

---

### Priority 3: NICE TO HAVE 🟢

**C-007: Re-transcribe**
- Re-run with larger model if needed
- **Value:** Recover from poor transcription
- **Effort:** 8-12 hours

**C-008: Export to Markdown**
- One-click export to .md file
- **Value:** Workflow integration
- **Effort:** 4-6 hours

**C-009: Batch Delete Old**
- Delete recordings older than X days
- **Value:** Easy cleanup
- **Effort:** 3-4 hours

---

## Total Effort

**Minimum (C-001 to C-003):** 21-29 hours  
**Full MVP (C-001 to C-009):** 51-73 hours  

---

## What We're NOT Building

Removed 22 features from v1 backlog:
- ❌ AI summarization (adds cognitive load)
- ❌ Collaboration (complexity)
- ❌ Custom workflows (decision fatigue)
- ❌ Advanced search (simple is better)
- ❌ Multi-language (focus first)
- ❌ Cloud anything (trust issues)

**Rule:** If it adds cognitive load → NO.

---

## User Testing Plan

### Beta Group (10-20 users)
- Recruit from ADHD/autism/PTSD communities
- Weekly check-ins
- Focus: Does this reduce stress?

### Success Metrics
- Used 5+ days per week
- User reports: "Reduced my stress"
- Zero confusion about features
- Auto-fill works in 90%+ of apps

---

## Release Plan

### v2.5.0-beta1
- C-001 only (auto-fill)
- Test with 5 users
- Iterate based on feedback

### v2.5.0-beta2
- C-001 to C-003
- Test with 10 users

### v2.5.0 (Public)
- C-001 to C-006 (or C-009 if time permits)
- Announce to communities

---

**Status:** PLANNED  
**Next:** Complete Phase B first  
**Owner:** PM
