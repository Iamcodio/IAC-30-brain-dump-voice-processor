# BrainDump Voice Processor - Development Plan

**Project:** SuperWhisper Clone MVP
**Status:** Planning Phase
**Date:** 2025-10-25
**Goal:** Build a 100% local voice-to-markdown transcription system

---

## Executive Summary

**Current State:** MVP is already COMPLETE and WORKING (per ARCHITECTURE.md)
- ✅ Voice recording with Ctrl+Y keyboard shortcut
- ✅ Whisper C++ transcription (436ms for 11 seconds)
- ✅ Markdown output generation
- ✅ Fully local processing

**Confusion Point:** The architecture documentation indicates the system is "Production Ready" with all MVP goals achieved. This development plan assumes we're either:
1. **Rebuilding from scratch** for learning/documentation purposes
2. **Validating the existing implementation** with our subagents
3. **Enhancing the existing MVP** with additional features

**Recommended Action:** Clarify with user which scenario applies before proceeding.

---

## Assumption: Validation & Enhancement Mode

This plan assumes we're **validating the existing implementation** and preparing for **Phase 2 enhancements**.

---

## Phase 0: Discovery & Validation (1-2 hours)

### Agent: superwhisper-integration-tester

**Purpose:** Understand current state and identify gaps

| Task | Description | Success Criteria | Effort |
|------|-------------|------------------|--------|
| 0.1 | Audit existing codebase | Map all components (main.js, recorder.py, transcribe.py, whisper_transcriber.py) | Complete file inventory | 15min |
| 0.2 | Verify dependencies | Check whisper-cli, PyAudio, PortAudio, models/ggml-base.bin | All dependencies present | 15min |
| 0.3 | Test existing functionality | Run full end-to-end test (record → transcribe → output) | Successful transcription | 30min |
| 0.4 | Document gaps | Identify missing features, broken components, or improvements needed | Gap analysis report | 30min |

**Dependencies:** None
**Deliverables:** Current state report with recommendations

---

## Phase 1: Backend Infrastructure (4-6 hours)

### Agent: whisper-backend-architect

**Purpose:** Build/validate Python services and Whisper integration

### 1.1 Python Environment Setup (30min)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 1.1.1 | Validate uv installation | Ensure uv is installed via Homebrew | `which uv` succeeds | None |
| 1.1.2 | Create virtual environment | `uv venv` in project root | `.venv/` directory exists | 1.1.1 |
| 1.1.3 | Install PyAudio | `uv pip install pyaudio` | Import succeeds | 1.1.2 |
| 1.1.4 | Verify PortAudio | Check system library availability | PyAudio can initialize | 1.1.3 |

### 1.2 Whisper C++ Integration (1-2 hours)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 1.2.1 | Install whisper-cpp | `brew install whisper-cpp` | `whisper-cli` in PATH | None |
| 1.2.2 | Download base model | Download ggml-base.bin (141MB) | Model file in models/ | 1.2.1 |
| 1.2.3 | Test CLI directly | Run whisper-cli on sample audio | Successful transcription | 1.2.2 |
| 1.2.4 | Verify Metal GPU | Check Metal acceleration enabled | Performance <500ms/10sec | 1.2.3 |

### 1.3 Audio Recording Service (2-3 hours)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 1.3.1 | Build recorder.py | Implement PyAudio callback-based recorder | WAV file created | 1.1.4 |
| 1.3.2 | Implement stdin protocol | Handle start/stop/quit commands | Protocol messages output | 1.3.1 |
| 1.3.3 | Configure audio specs | 44.1kHz, 16-bit, mono, 1024 buffer | Matches specification | 1.3.2 |
| 1.3.4 | Test standalone | Run recorder.py and verify output | Clean WAV files saved | 1.3.3 |

### 1.4 Transcription Service (1-2 hours)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 1.4.1 | Build whisper_transcriber.py | Wrapper class for whisper-cli | Transcription succeeds | 1.2.4 |
| 1.4.2 | Implement markdown formatting | Format with date, filename, content | Matches template | 1.4.1 |
| 1.4.3 | Build transcribe.py CLI wrapper | Command-line interface | Standalone execution works | 1.4.2 |
| 1.4.4 | Test end-to-end (Python only) | WAV → whisper-cli → markdown | Complete pipeline | 1.4.3 |

**Phase 1 Success Criteria:**
- ✅ Python environment fully configured
- ✅ Whisper C++ operational with Metal GPU
- ✅ recorder.py creates valid WAV files
- ✅ transcribe.py generates formatted markdown
- ✅ All components tested independently

---

## Phase 2: Frontend Application (3-4 hours)

### Agent: electron-ui-builder

**Purpose:** Build Electron app with keyboard shortcuts and IPC

### 2.1 Electron App Initialization (30min)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 2.1.1 | Install Electron | `npm install electron` | package.json updated | None |
| 2.1.2 | Create main.js | Basic Electron window | Window opens | 2.1.1 |
| 2.1.3 | Create index.html | Simple UI with status display | UI renders | 2.1.2 |
| 2.1.4 | Configure package.json | Add start script | `npm start` works | 2.1.3 |

### 2.2 Global Keyboard Shortcut (1 hour)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 2.2.1 | Register Ctrl+Y shortcut | Use globalShortcut API | Shortcut captures | 2.1.2 |
| 2.2.2 | Implement toggle logic | Start/stop recording state | State changes correctly | 2.2.1 |
| 2.2.3 | Handle accessibility permissions | macOS permission handling | Shortcut works system-wide | 2.2.2 |
| 2.2.4 | Test conflict detection | Check for conflicting shortcuts | Graceful handling | 2.2.3 |

### 2.3 IPC Protocol Implementation (1-2 hours)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 2.3.1 | Spawn Python recorder process | Use child_process.spawn | Process starts | Phase 1.3.4 |
| 2.3.2 | Implement stdin communication | Send start/stop/quit commands | Commands received | 2.3.1 |
| 2.3.3 | Parse stdout protocol | Handle READY, RECORDING_STARTED, RECORDING_STOPPED | State updates | 2.3.2 |
| 2.3.4 | Handle process lifecycle | Startup, shutdown, error recovery | Robust process management | 2.3.3 |

### 2.4 Transcription Trigger (30min)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 2.4.1 | Parse recording path | Extract WAV path from RECORDING_STOPPED | Path captured | 2.3.3 |
| 2.4.2 | Spawn transcriber process | Call transcribe.py with audio path | Transcription starts | Phase 1.4.4 |
| 2.4.3 | Handle transcription events | Process stdout/stderr | Status updates | 2.4.2 |
| 2.4.4 | Notify UI on completion | Send IPC to renderer | User notified | 2.4.3 |

### 2.5 UI Components (1 hour)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 2.5.1 | Status display | Show Ready/Recording/Transcribing | Visual feedback | 2.1.3 |
| 2.5.2 | IPC event listeners | Handle recording-started, recording-stopped | UI updates | 2.3.3 |
| 2.5.3 | Styling | Dark theme, clean design | Matches mockup | 2.5.2 |
| 2.5.4 | Keyboard hint | Display Ctrl+Y shortcut | User guidance | 2.5.3 |

**Phase 2 Success Criteria:**
- ✅ Electron app launches successfully
- ✅ Ctrl+Y shortcut registered and working
- ✅ IPC communication with Python established
- ✅ UI reflects recording state accurately
- ✅ Transcription auto-triggers after recording

---

## Phase 3: Integration & Testing (2-3 hours)

### Agent: superwhisper-integration-tester

**Purpose:** Validate end-to-end pipeline and performance

### 3.1 End-to-End Pipeline Tests (1 hour)

| Test ID | Scenario | Expected Result | Dependencies |
|---------|----------|-----------------|--------------|
| E2E-01 | Press Ctrl+Y → Record 5sec → Press Ctrl+Y | WAV saved, transcript generated | Phase 2 complete |
| E2E-02 | Multiple consecutive recordings | Each creates separate files | E2E-01 |
| E2E-03 | Very short recording (<1sec) | Handles gracefully | E2E-01 |
| E2E-04 | Long recording (>60sec) | No memory issues | E2E-01 |
| E2E-05 | Recording with background noise | Transcription quality acceptable | E2E-01 |

### 3.2 IPC Communication Tests (30min)

| Test ID | Scenario | Expected Result | Dependencies |
|---------|----------|-----------------|--------------|
| IPC-01 | Recorder process startup | READY message received | Phase 2.3 |
| IPC-02 | Start command | RECORDING_STARTED within 100ms | IPC-01 |
| IPC-03 | Stop command | RECORDING_STOPPED with path | IPC-02 |
| IPC-04 | Process crash recovery | Electron handles gracefully | IPC-01 |
| IPC-05 | Quit command | Clean shutdown | IPC-01 |

### 3.3 Performance Benchmarks (30min)

| Metric | Target | Measurement Method | Dependencies |
|--------|--------|-------------------|--------------|
| Recording start latency | <100ms | Time from Ctrl+Y to RECORDING_STARTED | Phase 2 complete |
| Transcription speed (10sec) | <500ms | Time from whisper-cli start to completion | Phase 1 complete |
| Model load time | <200ms | First transcription vs subsequent | Phase 1.2 |
| Memory usage (recording) | <50MB | Process monitor during recording | Phase 1.3 |
| Memory usage (transcription) | <200MB | Process monitor during transcription | Phase 1.4 |

### 3.4 Error Handling Tests (30min)

| Test ID | Scenario | Expected Result | Dependencies |
|---------|----------|-----------------|--------------|
| ERR-01 | Microphone permission denied | Graceful error message | Phase 1.3 |
| ERR-02 | Whisper model missing | Clear error with instructions | Phase 1.2 |
| ERR-03 | Disk full during recording | Stop and notify user | Phase 1.3 |
| ERR-04 | Invalid audio file | Transcription error handling | Phase 1.4 |
| ERR-05 | Python process killed | Restart or notify user | Phase 2.3 |

### 3.5 Integration Validation (30min)

| Task | Description | Success Criteria | Dependencies |
|------|-------------|------------------|--------------|
| 3.5.1 | File path validation | Verify outputs/audio and outputs/transcripts | Correct structure | All phases |
| 3.5.2 | Timestamp consistency | Check filename timestamps match | Consistent naming | All phases |
| 3.5.3 | Markdown format validation | Verify output matches template | Spec compliance | Phase 1.4 |
| 3.5.4 | Cleanup test files | Remove test outputs | Clean state | 3.5.3 |

**Phase 3 Success Criteria:**
- ✅ All E2E tests pass
- ✅ Performance targets met
- ✅ Error handling robust
- ✅ No memory leaks
- ✅ System ready for production use

---

## Phase 4: Documentation & Polish (1-2 hours)

### Agent: whisper-backend-architect (docs), electron-ui-builder (user guide)

### 4.1 Technical Documentation

| Task | Description | Deliverable | Effort |
|------|-------------|-------------|--------|
| 4.1.1 | Update ARCHITECTURE.md | Document actual implementation | Updated file | 30min |
| 4.1.2 | Document IPC protocol | Stdin/stdout message format | Protocol spec | 15min |
| 4.1.3 | API documentation | Python classes and methods | Docstrings | 30min |

### 4.2 User Documentation

| Task | Description | Deliverable | Effort |
|------|-------------|-------------|--------|
| 4.2.1 | Installation guide | Step-by-step setup | README section | 15min |
| 4.2.2 | Troubleshooting guide | Common issues and solutions | README section | 15min |
| 4.2.3 | Usage examples | Sample workflows | README section | 15min |

---

## Risk Mitigation

### High Risk Items

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Whisper model download fails | Blocker | Low | Document manual download; include checksum validation |
| PyAudio installation issues | Blocker | Medium | Detailed PortAudio setup guide; alternative audio libraries |
| Keyboard shortcut conflicts | Major | Medium | Allow customization; detect conflicts |
| Metal GPU not available | Major | Low | Fallback to CPU mode (with warning) |
| IPC process hang | Major | Low | Timeout handling; watchdog timer |

### Medium Risk Items

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Microphone permissions denied | Moderate | Medium | Clear permission request flow |
| Transcription quality poor | Moderate | Low | Document model upgrade path |
| Memory leak during long sessions | Moderate | Low | Resource monitoring; restart option |

---

## Success Metrics

### MVP Acceptance Criteria

- [ ] User can press Ctrl+Y to start/stop recording
- [ ] Audio is saved as WAV file in outputs/audio/
- [ ] Transcription is automatic after recording
- [ ] Markdown output in outputs/transcripts/
- [ ] Transcription completes in <500ms per 10 seconds
- [ ] Zero crashes during normal operation
- [ ] All error conditions handled gracefully

### Performance Targets

| Metric | MVP Target | Stretch Goal |
|--------|-----------|--------------|
| Recording latency | <100ms | <50ms |
| Transcription speed (10sec audio) | <500ms | <300ms |
| Model load time | <200ms | <100ms |
| Memory usage (total) | <300MB | <200MB |
| CPU usage (idle) | <5% | <2% |

---

## Timeline Estimates

### Sequential Timeline (One Developer)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Discovery | 1-2 hours | None |
| Phase 1: Backend | 4-6 hours | Phase 0 |
| Phase 2: Frontend | 3-4 hours | Phase 1 |
| Phase 3: Testing | 2-3 hours | Phase 2 |
| Phase 4: Documentation | 1-2 hours | Phase 3 |
| **Total** | **11-17 hours** | Sequential |

### Parallel Timeline (Three Subagents)

| Phase | Duration | Notes |
|-------|----------|-------|
| Phase 0 | 1-2 hours | Integration tester only |
| Phase 1 + Phase 2 | 4-6 hours | Backend and Frontend in parallel |
| Phase 3 | 2-3 hours | Integration testing |
| Phase 4 | 1-2 hours | Documentation |
| **Total** | **8-13 hours** | With parallelization |

---

## Subagent Responsibilities Summary

### whisper-backend-architect
- Python environment setup
- Whisper C++ integration
- Audio recording service (recorder.py)
- Transcription service (transcribe.py, whisper_transcriber.py)
- Backend documentation

**Estimated Effort:** 4-6 hours

### electron-ui-builder
- Electron app setup
- Keyboard shortcut implementation
- IPC protocol (Electron side)
- UI components and styling
- User documentation

**Estimated Effort:** 3-4 hours

### superwhisper-integration-tester
- Initial discovery and audit
- End-to-end pipeline tests
- IPC communication validation
- Performance benchmarking
- Error handling verification
- Final acceptance testing

**Estimated Effort:** 3-5 hours

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Clarify current state** - Is MVP already complete?
3. **Adjust scope** based on actual needs
4. **Assign subagents** to phases
5. **Execute Phase 0** (Discovery) first
6. **Iterate** based on findings

---

## Notes

- This plan assumes we're building from scratch or validating existing implementation
- Current ARCHITECTURE.md indicates MVP is already "Production Ready"
- Recommend running Phase 0 (Discovery) to understand true state
- Timeline estimates assume experienced developers with Claude Code assistance
- Parallel execution requires careful coordination of IPC protocol between agents

---

**Status:** Ready for review
**Approval Required:** Yes
**Next Action:** Await stakeholder feedback
