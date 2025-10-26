# Phase C Technical Implementation Plan
## BrainDump Voice Processor v2.5.0

**Document Version:** 1.0
**Date:** 2025-10-26
**Status:** AWAITING APPROVAL
**Based on:** PRD_v2_FOCUSED.md, PHASE_C_FEATURES.md
**Prerequisites:** Phase B.4 complete (100% test coverage, TypeScript migration)

---

## Executive Summary

Phase C implements 9 features across 3 priority tiers, focusing on **reducing cognitive load** for neurodiverse users. Total effort: 51-71 hours for complete MVP.

**Core Philosophy:** Every feature must reduce stress, not add to it.

**Release Strategy:**
- **C.1 (beta1):** C-001 only - validate auto-fill core value (1 week)
- **C.2 (beta2):** C-001 to C-003 - complete core UX (2 weeks)
- **C.3 (public):** C-001 to C-006/C-009 - full MVP (1 month)

---

## Phase C.1: Auto-Fill Foundation (15-20 hours)

### Objective
Implement C-001 (Auto-Fill Text Fields) - the #1 feature request that eliminates manual paste friction.

### Technical Architecture

#### macOS Accessibility API Integration
```typescript
// src/services/accessibility_service.ts
class AccessibilityService {
  private activeElement: AXUIElement | null
  private textFieldMonitor: NSWorkspace observer

  // Monitor active application and focused element
  async monitorActiveTextField(): Promise<void>

  // Inject text into focused field
  async fillTextField(text: string): Promise<boolean>

  // Check if current field supports text input
  async isTextFieldActive(): Promise<boolean>

  // Request accessibility permissions
  async requestPermissions(): Promise<boolean>
}
```

#### IPC Protocol Extensions
```typescript
// New IPC channels
ipcMain.handle('autofill-get-last-transcript', async () => string)
ipcMain.handle('autofill-inject-text', async (event, text) => boolean)
ipcMain.handle('accessibility-check-permissions', async () => boolean)
ipcMain.handle('accessibility-request-permissions', async () => void)
```

#### Database Schema Update
```typescript
// Add to Recording interface
interface Recording {
  // ... existing fields
  autoFillCount: number         // Track usage
  lastAutoFillTimestamp?: string
}
```

### Implementation Tasks

**C1.1: macOS Accessibility Service (8-10h)**
- [ ] Research NSAccessibility API in Node.js native modules
- [ ] Create native addon using node-gyp for AX API access
- [ ] Implement text field detection
- [ ] Implement text injection
- [ ] Add permission request flow
- [ ] Handle permission denial gracefully
- [ ] Test on macOS 12, 13, 14, 15

**C1.2: Auto-Fill Manager (4-6h)**
- [ ] Create AutoFillManager class
- [ ] Listen for text field focus events
- [ ] Fetch last transcript from database
- [ ] Trigger text injection
- [ ] Add per-app whitelist/blacklist
- [ ] Implement debouncing (prevent double-fill)
- [ ] Add logging for debugging

**C1.3: Settings UI (2-3h)**
- [ ] Add "Auto-Fill" section to settings
- [ ] Toggle: Enable/Disable auto-fill
- [ ] Per-app blacklist editor
- [ ] Permission status indicator
- [ ] Test mode (fill with "test text")

**C1.4: Testing (1-2h)**
- [ ] Unit tests for AccessibilityService
- [ ] Unit tests for AutoFillManager
- [ ] E2E tests for common apps:
  - Chrome (Google Docs, Gmail)
  - Safari (Notes, Messages)
  - Slack
  - VS Code
  - TextEdit

### Acceptance Criteria
- ✅ Works in Chrome, Safari, Firefox
- ✅ Works in Electron apps (Slack, VS Code)
- ✅ Works in native macOS apps (Notes, Messages)
- ✅ Fails gracefully when permissions denied
- ✅ User can disable per-app
- ✅ <100ms injection latency
- ✅ 90%+ app compatibility rate

### Risks & Mitigation
- **Risk:** Accessibility API changes between macOS versions
  - **Mitigation:** Test on 4 macOS versions, fallback to clipboard paste
- **Risk:** Security restrictions prevent text injection
  - **Mitigation:** Comprehensive permission checks, clear error messages
- **Risk:** Performance impact from constant monitoring
  - **Mitigation:** Debounce events, lazy initialization

---

## Phase C.2: Core UX Completion (6-9 hours)

### Objective
Implement C-002 (Visual Indicator) and C-003 (Quick Playback) to complete core user experience.

### C-002: Visual Recording Indicator (2-3h)

#### Implementation Tasks

**C2.1: Tray Icon System (1-2h)**
- [ ] Design 3 icon states: idle (gray), recording (red pulse), error (yellow)
- [ ] Create icon assets (PNG, 22x22 for Retina)
- [ ] Implement Electron Tray API
- [ ] Add icon state transitions
- [ ] Add animation for recording state (CSS pulse)

**C2.2: Tray Menu (0.5-1h)**
- [ ] Add context menu:
  - Show Window
  - Recording Status (disabled, shows current state)
  - ---
  - Quit
- [ ] Add tooltip showing last action
- [ ] Handle tray icon click (show/hide window)

**C2.3: State Synchronization (0.5h)**
- [ ] Listen to recorder events
- [ ] Update tray icon on state change
- [ ] Test latency (<100ms requirement)

**Testing:**
- [ ] Visual QA on all 3 states
- [ ] Click behavior tests
- [ ] Menu interaction tests
- [ ] State sync timing tests

**Acceptance Criteria:**
- ✅ Icon visible in macOS menu bar
- ✅ Status updates within 100ms
- ✅ Tooltip shows last action
- ✅ Right-click menu works

---

### C-003: Quick Playback Review (4-6h)

#### Technical Architecture

```typescript
// src/services/playback_service.ts
class PlaybackService {
  private audioPlayer: AVAudioPlayer | null

  // Play last N seconds of recording
  async playLastNSeconds(seconds: number): Promise<void>

  // Play specific recording
  async playRecording(audioPath: string): Promise<void>

  // Stop playback
  async stop(): Promise<void>

  // Get playback status
  isPlaying(): boolean
}
```

#### Implementation Tasks

**C3.1: Audio Playback Service (2-3h)**
- [ ] Implement AVAudioPlayer wrapper (or use HTML5 audio)
- [ ] Add fade in/out (500ms ramps)
- [ ] Respect system volume
- [ ] Handle playback errors
- [ ] Cleanup on app quit

**C3.2: Global Hotkey Registration (1h)**
- [ ] Register Ctrl+Option+Y (non-conflicting)
- [ ] Handle hotkey during recording (play previous)
- [ ] Handle hotkey when no recordings exist
- [ ] Add visual feedback (icon flicker?)

**C3.3: Last 10 Seconds Logic (1h)**
- [ ] Read audio file duration
- [ ] Calculate start position (duration - 10s)
- [ ] If duration < 10s, play full recording
- [ ] Seek to start position
- [ ] Play with fade in

**C3.4: Testing (0.5-1h)**
- [ ] Unit tests for PlaybackService
- [ ] E2E test for hotkey trigger
- [ ] Test with recordings <10s
- [ ] Test during active recording
- [ ] Test error cases (file not found)

**Acceptance Criteria:**
- ✅ Plays last 10 seconds (or full if shorter)
- ✅ Works while recording (plays previous)
- ✅ Volume respects system settings
- ✅ Hotkey doesn't conflict
- ✅ Smooth fade in/out

---

## Phase C.3: Quality-of-Life Features (10-14 hours)

### Objective
Implement C-004, C-005, C-006 to add forgiveness and organization.

### C-004: Undo Last Recording (3-4h)

#### Implementation Tasks

**C4.1: Delete Functionality (1.5-2h)**
- [ ] Add "Delete" button to history view (trash icon)
- [ ] Implement confirmation dialog
- [ ] Delete audio file + transcript + DB entry
- [ ] Handle file deletion errors gracefully
- [ ] Update UI immediately after delete

**C4.2: Undo Timer (1-1.5h)**
- [ ] Show toast notification: "Recording deleted. Undo?"
- [ ] 5-second countdown timer
- [ ] Restore files if undo clicked
- [ ] Move to trash instead of permanent delete
- [ ] Clear trash on app quit

**C4.3: Testing (0.5h)**
- [ ] Unit tests for delete operation
- [ ] E2E test for undo flow
- [ ] Test file restoration
- [ ] Test trash cleanup

**Acceptance Criteria:**
- ✅ Delete button in history view
- ✅ Confirmation dialog
- ✅ Removes audio + transcript + DB entry
- ✅ Undo within 5 seconds
- ✅ Visual feedback on delete

---

### C-005: Favorites/Pin (4-6h)

#### Database Schema Update
```typescript
interface Recording {
  // ... existing fields
  starred: boolean
  starredAt?: string
}
```

#### Implementation Tasks

**C5.1: Database Changes (1h)**
- [ ] Add `starred` column (boolean, default false)
- [ ] Add `starredAt` column (timestamp)
- [ ] Create migration script
- [ ] Update Recording interface

**C5.2: UI Implementation (2-3h)**
- [ ] Add star icon to history view
- [ ] Toggle starred state on click
- [ ] Sort starred recordings to top
- [ ] Add "Starred" filter button
- [ ] Animate star icon on toggle

**C5.3: Persistence (0.5h)**
- [ ] Update database on star toggle
- [ ] Load starred state on app start
- [ ] Include in export

**C5.4: Testing (0.5-1h)**
- [ ] Unit tests for star toggle
- [ ] Test sorting logic
- [ ] E2E test for star workflow
- [ ] Test persistence across restarts

**Acceptance Criteria:**
- ✅ Star icon in history view
- ✅ Pinned recordings sort to top
- ✅ Persist in database
- ✅ Export includes starred status
- ✅ Smooth animation

---

### C-006: Simple Tags (Max 3) (8-10h)

#### Database Schema Update
```typescript
interface Recording {
  // ... existing fields
  tags: string[]  // Max 3 items
}

// New table for autocomplete
interface Tag {
  name: string
  usageCount: number
  lastUsed: string
}
```

#### Implementation Tasks

**C6.1: Tag Data Model (2h)**
- [ ] Add `tags` column (JSON array)
- [ ] Create `tags` table for autocomplete
- [ ] Enforce max 3 tags constraint
- [ ] Create migration script

**C6.2: Tag Input UI (3-4h)**
- [ ] Add tag input field to history view
- [ ] Implement autocomplete dropdown
- [ ] Show existing tags as chips
- [ ] Enforce max 3 tags
- [ ] Add tag removal (click X on chip)
- [ ] Prevent duplicate tags

**C6.3: Tag Filter UI (2-3h)**
- [ ] Add tag filter bar above history
- [ ] Show all tags with counts
- [ ] Click to filter by tag
- [ ] Multi-tag filtering (AND logic)
- [ ] Clear filters button

**C6.4: Testing (1h)**
- [ ] Unit tests for tag constraints
- [ ] Unit tests for autocomplete
- [ ] E2E test for tag workflow
- [ ] Test filter combinations

**Acceptance Criteria:**
- ✅ Tag input in history view
- ✅ Autocomplete from previous tags
- ✅ Filter by tag
- ✅ Max 3 tags enforced
- ✅ Intuitive UX (no decision paralysis)

---

## Phase C.4: Advanced Features (Optional) (15-22 hours)

### Objective
Implement C-007, C-008, C-009 if time permits or based on beta feedback.

### C-007: Re-transcribe (8-12h)

#### Implementation Tasks

**C7.1: Model Management (3-4h)**
- [ ] Download script for multiple models (base, small, medium)
- [ ] Model storage: `models/` directory
- [ ] Model selector UI in settings
- [ ] Show model sizes and accuracy tradeoffs

**C7.2: Re-transcription Service (3-4h)**
- [ ] Add "Re-transcribe" button in history view
- [ ] Model selection dialog
- [ ] Progress indicator with percentage
- [ ] Update transcript in database
- [ ] Keep original as backup

**C7.3: Comparison UI (1-2h)**
- [ ] Show before/after diff
- [ ] Highlight changes
- [ ] Rollback option

**C7.4: Testing (1-2h)**
- [ ] Test with all 3 models
- [ ] Test progress updates
- [ ] Test rollback
- [ ] Test concurrent re-transcriptions

**Acceptance Criteria:**
- ✅ Re-transcribe button in history
- ✅ Model selector (base, small, medium)
- ✅ Progress indicator
- ✅ Compare before/after
- ✅ Rollback option

---

### C-008: Export to Markdown (4-6h)

#### Implementation Tasks

**C8.1: Export Service (2-3h)**
- [ ] Add "Export" button in history view
- [ ] Multi-select recordings
- [ ] Generate .md file per recording
- [ ] Include metadata (date, tags, starred)
- [ ] File naming: `transcript_YYYY-MM-DD_HH-MM-SS.md`

**C8.2: Export UI (1-2h)**
- [ ] Checkbox selection in history
- [ ] "Select All" / "Select None" buttons
- [ ] Export destination picker
- [ ] Progress indicator for bulk exports

**C8.3: Testing (1h)**
- [ ] Test single export
- [ ] Test bulk export
- [ ] Test metadata inclusion
- [ ] Test file naming

**Acceptance Criteria:**
- ✅ Export button in history
- ✅ Select multiple recordings
- ✅ Generates one .md per recording
- ✅ Includes metadata
- ✅ User chooses destination

---

### C-009: Batch Delete Old (3-4h)

#### Implementation Tasks

**C9.1: Retention Settings (1-2h)**
- [ ] Add retention period setting (default: 90 days)
- [ ] Settings UI: dropdown with presets (7, 30, 90, 180 days)
- [ ] "Never delete" option
- [ ] Exclude starred recordings checkbox

**C9.2: Cleanup Service (1-2h)**
- [ ] Run on app startup
- [ ] Calculate cutoff date
- [ ] Query recordings older than cutoff
- [ ] Exclude starred recordings
- [ ] Show confirmation with count
- [ ] Delete files and DB entries

**C9.3: Testing (0.5h)**
- [ ] Test retention logic
- [ ] Test starred exclusion
- [ ] Test confirmation dialog
- [ ] Test edge cases (no old recordings)

**Acceptance Criteria:**
- ✅ Settings panel with retention period
- ✅ Confirmation dialog showing count
- ✅ Does not delete starred recordings
- ✅ Runs on app startup
- ✅ Easy cleanup UX

---

## Testing Strategy

### Unit Testing
**Target:** 85%+ coverage for new code
**Tools:** Jest, ts-jest
**Scope:**
- All services (AccessibilityService, PlaybackService, AutoFillManager)
- Tag validation logic
- Export formatting
- Retention calculations

### E2E Testing
**Tools:** Playwright
**Scope:**
- Auto-fill in 10+ apps
- Tray icon interactions
- Playback hotkey
- Delete + undo flow
- Tag creation and filtering
- Export workflows
- Retention cleanup

### Beta Testing
**Phase:** C.1, C.2, C.3
**Users:** 5 → 10 → 20 users
**Focus:**
- Does auto-fill work reliably?
- Does visual indicator reduce anxiety?
- Do tags add value or confusion?
- Performance on real-world usage

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Auto-fill latency | <100ms | Time from focus to text injection |
| Tray icon update | <100ms | Time from state change to icon update |
| Playback start | <200ms | Time from hotkey to audio start |
| Tag autocomplete | <50ms | Time to show dropdown |
| Export (10 files) | <2s | Time to generate 10 .md files |
| App launch | <2s | Cold start to ready state |

---

## Migration & Deployment

### Database Migrations
**C.1:** Add `autoFillCount`, `lastAutoFillTimestamp`
**C.3:** Add `starred`, `starredAt`
**C.3:** Add `tags` column and `tags` table

### Native Addon Build
**Requirement:** node-gyp for macOS Accessibility API
**Build:** `npm run build:native`
**Distribution:** Include .node file in packaged app

### App Signing & Notarization
**Requirement:** macOS Gatekeeper compliance
**Process:**
1. Sign with Apple Developer ID
2. Notarize with Apple
3. Staple notarization ticket
4. Package as .dmg

---

## Success Criteria

### Phase C.1 Complete When:
- ✅ C-001 works in 90%+ of tested apps
- ✅ <100ms auto-fill latency
- ✅ Permission flow UX tested
- ✅ 5 beta users report "saves time"
- ✅ Zero regressions from Phase B

### Phase C.2 Complete When:
- ✅ Tray icon updates within 100ms
- ✅ Playback hotkey works reliably
- ✅ 10 beta users validate UX improvements
- ✅ Performance targets met

### Phase C.3 Complete When:
- ✅ Delete + undo flow tested
- ✅ Tag UX validated (no decision paralysis)
- ✅ All features integrated smoothly
- ✅ Ready for public release

### Phase C Complete When:
- ✅ All priority 1 & 2 features shipped
- ✅ Beta users report: "Reduced my stress"
- ✅ 5+ uses per week (per user)
- ✅ <5% feature confusion
- ✅ Zero critical bugs
- ✅ Mac App Store ready (if pursuing)

---

## Timeline Estimates

### Conservative Estimates
| Phase | Features | Effort | Duration |
|-------|----------|--------|----------|
| C.1 | C-001 | 15-20h | 1 week |
| C.2 | C-002, C-003 | 6-9h | 3-4 days |
| C.3 | C-004, C-005, C-006 | 15-20h | 1 week |
| C.4 | C-007, C-008, C-009 | 15-22h | 1 week |
| **Total** | **All 9** | **51-71h** | **3-4 weeks** |

### Aggressive Estimates (parallel work)
| Phase | Features | Effort | Duration |
|-------|----------|--------|----------|
| C.1 | C-001 | 15-20h | 4-5 days |
| C.2 | C-002, C-003 | 6-9h | 2 days |
| C.3 | C-004, C-005, C-006 | 15-20h | 4-5 days |
| C.4 | C-007, C-008, C-009 | 15-22h | 4-5 days |
| **Total** | **All 9** | **51-71h** | **2-3 weeks** |

---

## Risk Assessment

### High Priority Risks

**Risk 1: macOS Accessibility API Compatibility**
- **Likelihood:** Medium
- **Impact:** Critical (C-001 fails)
- **Mitigation:**
  - Test on macOS 12, 13, 14, 15
  - Fallback to clipboard paste
  - Clear permission instructions
  - Consider native Swift helper app

**Risk 2: Auto-Fill App Compatibility**
- **Likelihood:** High
- **Impact:** High (core feature unreliable)
- **Mitigation:**
  - Test top 20 apps used by target users
  - Implement per-app blacklist
  - Document known limitations
  - Add manual paste fallback

**Risk 3: Performance Regression**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:**
  - Benchmark after each phase
  - Profile with Instruments
  - Lazy load accessibility service
  - Debounce event handlers

### Medium Priority Risks

**Risk 4: Feature Creep**
- **Likelihood:** High
- **Impact:** Medium (delays launch)
- **Mitigation:**
  - Strict PRD adherence
  - No mid-sprint additions
  - Beta feedback informs v3.0, not v2.5

**Risk 5: Beta User Engagement**
- **Likelihood:** Medium
- **Impact:** Medium (poor feedback quality)
- **Mitigation:**
  - Recruit from engaged communities
  - Incentivize (free lifetime access)
  - Weekly check-ins
  - Clear feedback templates

---

## Dependencies

### External Libraries
- **node-gyp:** Native addon compilation
- **@nut-tree/nut-js:** Cross-platform automation (fallback)
- **electron-store:** Settings persistence (already in use)

### System Requirements
- **macOS 12+** (Monterey or later)
- **Accessibility permissions** granted by user
- **Whisper models:** base (141MB), small (466MB), medium (1.5GB)

### Development Tools
- **Xcode Command Line Tools:** For native addon build
- **Apple Developer ID:** For code signing
- **Playwright:** For E2E testing

---

## Open Questions (To Resolve During Implementation)

1. **C-001:** Auto-fill on focus vs. explicit hotkey?
   - **Decision:** Focus-based (less friction), with toggle in settings

2. **C-003:** Use AVAudioPlayer (native) or HTML5 audio?
   - **Decision:** HTML5 audio (simpler, cross-platform)

3. **C-006:** Tag input inline or modal?
   - **Decision:** Inline (less disruptive)

4. **C-007:** Which Whisper models to support?
   - **Decision:** base (default), small, medium (benchmark first)

5. **C-009:** Retention period default?
   - **Decision:** 90 days (validated with beta users)

---

## Appendix: File Structure Changes

```
src/
├── services/
│   ├── accessibility_service.ts       [NEW - C.1]
│   ├── autofill_manager.ts           [NEW - C.1]
│   ├── playback_service.ts           [NEW - C.2]
│   ├── export_service.ts             [NEW - C.4]
│   └── retention_service.ts          [NEW - C.4]
├── ui/
│   ├── tray.ts                       [NEW - C.2]
│   ├── settings/
│   │   ├── autofill_settings.ts     [NEW - C.1]
│   │   └── retention_settings.ts    [NEW - C.4]
│   └── history/
│       ├── tag_input.ts             [NEW - C.3]
│       └── tag_filter.ts            [NEW - C.3]
├── native/
│   └── accessibility/               [NEW - C.1]
│       ├── binding.gyp
│       └── accessibility.mm (Objective-C++)
└── migrations/
    ├── 003_add_autofill_fields.sql  [NEW - C.1]
    ├── 004_add_starred.sql          [NEW - C.3]
    └── 005_add_tags.sql             [NEW - C.3]
```

---

## Next Steps

1. **Await approval** of this technical plan
2. **Set up development environment** for Phase C.1
   - Install Xcode Command Line Tools
   - Configure node-gyp
   - Research macOS Accessibility API examples
3. **Create feature branch:** `feature/phase-c1-autofill`
4. **Begin implementation** of C-001 (Auto-Fill Text Fields)

---

**Status:** AWAITING APPROVAL
**Document Owner:** Technical Lead
**Approved by:** _Pending_
**Start Date:** _TBD after approval_
