# BrainDump V3.0 Stage A - Design Proposal
## Core C++ Engine Development

**Document Version:** 1.0
**Date:** 2025-11-07
**Status:** **DRAFT - Awaiting Product Team Approval**
**Author:** Claude Code (Lead Development Orchestrator)
**Reviewers:** Product Manager (IamCodio), Product Development Manager

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Context](#2-strategic-context)
3. [Architecture Overview](#3-architecture-overview)
4. [Module Specifications](#4-module-specifications)
5. [Decision Matrix](#5-decision-matrix)
6. [Git Strategy](#6-git-strategy)
7. [Preserved Logic from V2 C1](#7-preserved-logic-from-v2-c1)
8. [Sub-Agent Orchestration Plan](#8-sub-agent-orchestration-plan)
9. [Testing Strategy](#9-testing-strategy)
10. [Performance Targets](#10-performance-targets)
11. [Risk Analysis](#11-risk-analysis)
12. [Timeline & Milestones](#12-timeline--milestones)
13. [Definition of Done](#13-definition-of-done)
14. [Open Questions for Product Team](#14-open-questions-for-product-team)
15. [Approval Sign-Off](#15-approval-sign-off)

---

## 1. Executive Summary

### 1.1 Current State

**Version:** v2.5.0-beta1 (Phase C1 - Electron Prototype)
**Architecture:** Electron + TypeScript + Python hybrid
**Status:** Archived (successful prototype, strategic pivot approved)

**Key Metrics:**
- Bundle Size: 140MB
- Memory Usage: 150-200MB
- Startup Time: 3-5 seconds
- Platform: macOS only (desktop)
- Test Coverage: 92%

**Achievements:**
- Validated product concept (voice-activated local transcription)
- Proven technical feasibility (Whisper C++ + Metal GPU)
- Clean architecture (manager-based pattern, high test coverage)
- Founder story positioning confirmed

**Strategic Limitation:**
- Not suitable for mobile (Electron desktop-only)
- Excessive bundle size (140MB unjustifiable for simple recorder)
- Three-runtime complexity (Electron + Python + Native module)
- Limited reusability (TypeScript/Python not portable to iOS/Android)

### 1.2 Target State

**Version:** v3.0.0 Stage A (Core C++ Engine)
**Architecture:** C++17 core with C API bridge
**Deliverable:** Shared libraries (`libbraindump.dylib`, `libbraindump.so`)

**Target Metrics:**
- Library Size: <2MB stripped
- Memory Usage: <50MB
- Load Time: <1 second
- Platforms: macOS (Metal GPU), Linux (CPU fallback)
- Mobile-Ready: C API enables Swift/Kotlin/Rust/Dart bindings

**Strategic Benefits:**
1. **Reusability:** Single C++ core compiles for all platforms
2. **Performance:** 93% smaller, 70% less memory
3. **Mobile-Ready:** iOS/Android via FFI (Stage B)
4. **Maintainability:** One codebase vs. multi-runtime complexity
5. **Community Gift:** Open source C++ engine developers can build upon

### 1.3 Scope of This Proposal

**What This Document Covers:**
- Stage A implementation plan (C++ core engine only)
- Module specifications (Recorder, Transcriber, C API)
- Sub-agent orchestration strategy
- Decision points requiring product team input

**What This Document Does NOT Cover:**
- Stage B frontend implementation (Tauri/Swift/Kotlin - separate proposal)
- UI/UX design (headless library only)
- Deployment strategy (local development focus)
- Marketing/positioning (technical implementation only)

---

## 2. Strategic Context

### 2.1 Why Pivot from V2 C1?

**V2 C1 Success:**
- Proved the concept works
- Validated user workflow (Ctrl+Y → record → transcribe)
- Demonstrated Metal GPU acceleration feasibility
- Achieved high code quality (92% test coverage, PEP-8 compliant)

**V2 C1 Failure:**
- Bundle size unacceptable (140MB for a voice recorder)
- Memory footprint excessive (150-200MB idle)
- Three-runtime fragility (Electron ↔ Python ↔ Native crashes)
- Dead-end for mobile (Electron desktop-only)
- Maintenance burden (TypeScript + Python + C++ dependencies)

**V3.0 Strategic Rationale:**
- **Bell Labs Unix Philosophy:** Do one thing well (core engine = record + transcribe)
- **Composability:** C API allows any frontend (Tauri, Swift, Kotlin, Flutter)
- **Performance:** Native C++ eliminates Electron/Python overhead
- **Mobile Expansion:** Same core for iOS/Android (Stage B)
- **Community Value:** Open source C++ engine helps mental health community

### 2.2 Product Vision Alignment

**Core Mission:** "100% local, privacy-first voice-to-text for mental health journaling"

**V3.0 Stage A Enables:**
- Zero-cost operation (no cloud, no APIs)
- Privacy-first (all processing local)
- Platform expansion (Mac → iOS → Android → Linux)
- Developer ecosystem (C API for community extensions)

**Gift to Community:**
- People with mental health issues
- Drug addiction recovery journaling
- Privacy-conscious users
- Open source developers

---

## 3. Architecture Overview

### 3.1 System Design

```
┌─────────────────────────────────────────────────────────┐
│                    Stage B (Future)                     │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐           │
│  │  Tauri    │  │   Swift   │  │  Kotlin  │  (UIs)    │
│  │ (Rust+Web)│  │  (macOS)  │  │ (Android)│           │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘           │
│        │              │              │                  │
│        └──────────────┼──────────────┘                  │
│                       │                                  │
└───────────────────────┼──────────────────────────────────┘
                        │ C API (FFI)
┌───────────────────────┼──────────────────────────────────┐
│                 Stage A (This Proposal)                  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │          libbraindump.{dylib,so,dll}           │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────┐    │   │
│  │  │  Module 3: C API Bridge                │    │   │
│  │  │  - Opaque handles                       │    │   │
│  │  │  - Error codes                          │    │   │
│  │  │  - Memory management                    │    │   │
│  │  └────────────┬──────────────┬─────────────┘    │   │
│  │               │              │                   │   │
│  │  ┌────────────▼────────┐  ┌──▼──────────────┐  │   │
│  │  │  Module 1: Recorder │  │ Module 2:       │  │   │
│  │  │                     │  │ Transcriber     │  │   │
│  │  │  - PortAudio        │  │                 │  │   │
│  │  │  - WAV writer       │  │ - whisper.cpp   │  │   │
│  │  │  - Start/stop       │  │ - Metal GPU     │  │   │
│  │  │  - Error handling   │  │ - CPU fallback  │  │   │
│  │  └─────────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐    ┌───▼────┐    ┌───▼────────┐
    │ WAV     │    │ Whisper│    │  Markdown  │
    │ files   │    │ models │    │ transcripts│
    └─────────┘    └────────┘    └────────────┘
```

### 3.2 Module Breakdown

#### Module 1: Audio Recorder
**Purpose:** Capture microphone input, write WAV files
**Technology:** C++17 + PortAudio
**Inputs:** Start command, output path, duration (optional)
**Outputs:** WAV file (16kHz, mono, 16-bit PCM), status codes

**Public Interface:**
```cpp
namespace BrainDump {
    class Recorder {
    public:
        Recorder();
        ~Recorder();

        int start(const char* output_path);
        int stop();
        bool is_recording() const;
    };
}
```

**Dependencies:**
- PortAudio (system library)
- C++ standard library only

---

#### Module 2: Transcriber
**Purpose:** Convert audio files to text using Whisper
**Technology:** C++17 + whisper.cpp
**Inputs:** Audio file path, model file path, language (optional)
**Outputs:** Transcript text (UTF-8), status codes, timing info

**Public Interface:**
```cpp
namespace BrainDump {
    class Transcriber {
    public:
        Transcriber(const char* model_path);
        ~Transcriber();

        int transcribe(const char* audio_path, std::string& output);
        bool is_ready() const;
    };
}
```

**Dependencies:**
- whisper.cpp (git submodule in `external/`)
- Metal framework (macOS only)
- CUDA libraries (Linux with NVIDIA GPU, optional)

---

#### Module 3: C API Bridge
**Purpose:** Expose C interface for language interoperability
**Technology:** C++ implementation with `extern "C"` wrappers
**Why C API:** Swift/Kotlin/Rust FFI expects C functions (stable ABI)

**Public Interface:**
```c
// braindump.h
#ifdef __cplusplus
extern "C" {
#endif

// Opaque types
typedef struct BDRecorder BDRecorder;
typedef struct BDTranscriber BDTranscriber;

// Error codes
typedef enum {
    BD_SUCCESS = 0,
    BD_ERROR_INIT = -1,
    BD_ERROR_NO_DEVICE = -2,
    BD_ERROR_FILE_IO = -3,
    BD_ERROR_TRANSCRIBE = -4,
    BD_ERROR_INVALID_HANDLE = -5
} BDError;

// Recorder functions
BDRecorder* bd_recorder_create();
BDError bd_recorder_start(BDRecorder* recorder, const char* output_path);
BDError bd_recorder_stop(BDRecorder* recorder);
int bd_recorder_is_recording(BDRecorder* recorder);
void bd_recorder_destroy(BDRecorder* recorder);

// Transcriber functions
BDTranscriber* bd_transcriber_create(const char* model_path);
BDError bd_transcribe_file(BDTranscriber* transcriber,
                            const char* audio_path,
                            char** output_text);
int bd_transcriber_is_ready(BDTranscriber* transcriber);
void bd_transcriber_destroy(BDTranscriber* transcriber);

// Memory management
void bd_free_string(char* str);

#ifdef __cplusplus
}
#endif
```

**Memory Management Rules:**
1. Caller creates handles via `*_create()`
2. Caller destroys handles via `*_destroy()`
3. Library allocates strings, caller frees via `bd_free_string()`
4. All functions return error codes (except create/destroy)

---

### 3.3 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Language** | C++ | C++17 | Core implementation |
| **Build System** | CMake | 3.15+ | Cross-platform builds |
| **Audio Library** | PortAudio | Latest stable | Microphone capture |
| **Transcription** | whisper.cpp | v1.5.0+ | Speech-to-text |
| **GPU Acceleration** | Metal (macOS) | System | Hardware acceleration |
| **GPU Acceleration** | CUDA (Linux) | Optional | NVIDIA GPU support |
| **Testing** | GoogleTest | Optional | Unit tests (or custom) |
| **Memory Testing** | Valgrind | Latest | Leak detection |
| **Compiler (macOS)** | clang++ | Xcode 14+ | Apple toolchain |
| **Compiler (Linux)** | g++ | 9.0+ | GNU toolchain |

---

## 4. Module Specifications

### 4.1 Module 1: Audio Recorder (Detailed)

#### 4.1.1 Responsibilities

1. **Device Detection:** Automatically detect default microphone
2. **Audio Capture:** Record 16kHz mono PCM audio via callbacks
3. **WAV Writing:** Write valid WAV file with correct headers
4. **State Management:** Track recording state (idle/recording)
5. **Error Handling:** Return proper error codes for all failures

#### 4.1.2 Technical Specifications

**Audio Format:**
- Sample Rate: 16kHz (Whisper optimal)
- Channels: Mono (1 channel)
- Bit Depth: 16-bit PCM
- Buffer Size: 1024 frames (~64ms latency)

**File Format:**
- Container: WAV (RIFF)
- Encoding: PCM (uncompressed)
- Byte Order: Little-endian

**Performance Requirements:**
- CPU Usage: <1% during recording
- Latency: <100ms start time
- Memory: <10MB buffer

#### 4.1.3 Interface Design

```cpp
// recorder.h
#ifndef BRAINDUMP_RECORDER_H
#define BRAINDUMP_RECORDER_H

namespace BrainDump {

class Recorder {
public:
    Recorder();
    ~Recorder();

    // Start recording to specified file path
    // Returns: 0 on success, negative error code on failure
    int start(const char* output_path);

    // Stop recording and finalize WAV file
    // Returns: 0 on success, negative error code on failure
    int stop();

    // Check if currently recording
    // Returns: true if recording, false otherwise
    bool is_recording() const;

private:
    struct Impl;  // Pimpl idiom (hide PortAudio details)
    std::unique_ptr<Impl> pimpl;
};

} // namespace BrainDump

#endif // BRAINDUMP_RECORDER_H
```

#### 4.1.4 Implementation Strategy

**Files to Create:**
```
src/audio/
├── recorder.h              # Public interface (above)
├── recorder.cpp            # Implementation (Pimpl pattern)
├── portaudio_impl.h        # PortAudio wrapper (private)
├── portaudio_impl.cpp      # PortAudio initialization/callbacks
└── wav_writer.cpp          # WAV file format writer
```

**Key Implementation Details:**
1. **Pimpl Pattern:** Hide PortAudio types from public header
2. **RAII:** Acquire audio stream in constructor, release in destructor
3. **Callback-Based:** Use PortAudio streaming callback (not blocking reads)
4. **Thread-Safe:** Protect state changes with mutex (if needed)

#### 4.1.5 Preserved Logic from V2 C1

**From `archive/phase-c1-electron/recorder.py`:**
- Audio format specs (lines 71-78)
- Callback pattern (lines 108-126)
- Error handling approach (lines 154-168)
- Output directory structure (lines 91-95)

#### 4.1.6 Test Harness

```bash
# Test executable
./test_recorder <output.wav> <duration_seconds>

# Example
./test_recorder output.wav 5
# Expected output:
# Initializing recorder...
# Recording to output.wav for 5 seconds...
# Recording started
# Recording stopped
# WAV file size: 160044 bytes
# ✓ Test passed
```

**Test Verification:**
- File exists
- File size correct (~16KB per second)
- WAV header valid
- Audio playback works (manual verification)

#### 4.1.7 Acceptance Criteria

- [ ] Detects default microphone automatically
- [ ] Records 16kHz mono PCM audio
- [ ] Writes valid WAV file with correct headers
- [ ] Handles start/stop cleanly (no corruption)
- [ ] Returns proper error codes (device not found, file write failed, etc.)
- [ ] No memory leaks (valgrind clean)
- [ ] Compiles with `-Wall -Wextra -Werror` (zero warnings)
- [ ] Test harness passes on macOS and Linux

---

### 4.2 Module 2: Transcriber (Detailed)

#### 4.2.1 Responsibilities

1. **Model Loading:** Load Whisper GGML model from disk
2. **Audio Decoding:** Read WAV files, extract PCM data
3. **GPU Acceleration:** Use Metal (macOS) or CUDA (Linux) if available
4. **CPU Fallback:** Gracefully fallback to CPU if GPU unavailable
5. **Text Output:** Return UTF-8 transcript text

#### 4.2.2 Technical Specifications

**Model Support:**
- Format: GGML (whisper.cpp format)
- Models: ggml-tiny.bin, ggml-base.bin, ggml-small.bin
- Default: ggml-base.bin (141MB, best quality/speed trade-off)

**GPU Acceleration:**
- macOS: Metal (via Accelerate framework)
- Linux: CUDA (optional, NVIDIA GPU only)
- Fallback: CPU (always available)

**Performance Requirements:**
- Model Load Time: <500ms (first load only)
- Transcription Speed: <2 seconds for 10 seconds audio (M2 Mac + Metal)
- Transcription Speed: <5 seconds for 10 seconds audio (CPU only)
- Memory: <200MB during transcription

#### 4.2.3 Interface Design

```cpp
// transcriber.h
#ifndef BRAINDUMP_TRANSCRIBER_H
#define BRAINDUMP_TRANSCRIBER_H

#include <string>

namespace BrainDump {

class Transcriber {
public:
    // Load Whisper model from specified path
    // Throws exception if model load fails
    explicit Transcriber(const char* model_path);
    ~Transcriber();

    // Transcribe audio file to text
    // Returns: 0 on success, negative error code on failure
    // Output: UTF-8 text stored in 'output' parameter
    int transcribe(const char* audio_path, std::string& output);

    // Check if model is loaded and ready
    bool is_ready() const;

private:
    struct Impl;  // Pimpl idiom (hide whisper.cpp details)
    std::unique_ptr<Impl> pimpl;
};

} // namespace BrainDump

#endif // BRAINDUMP_TRANSCRIBER_H
```

#### 4.2.4 Implementation Strategy

**Files to Create:**
```
src/transcription/
├── transcriber.h           # Public interface (above)
├── transcriber.cpp         # Implementation (Pimpl pattern)
├── whisper_wrapper.h       # Whisper C++ wrapper (private)
└── whisper_wrapper.cpp     # Whisper API calls
```

**Key Implementation Details:**
1. **Pimpl Pattern:** Hide whisper.cpp types from public header
2. **RAII:** Load model in constructor, free in destructor
3. **GPU Detection:** Check for Metal/CUDA at runtime, fallback to CPU
4. **Error Handling:** Catch whisper.cpp errors, map to error codes

#### 4.2.5 Preserved Logic from V2 C1

**From `archive/phase-c1-electron/transcribe.py`:**
- Model path structure (line 53)
- Output format (markdown with metadata, lines 158-169)
- Duration extraction from WAV headers (lines 94-101)
- Error handling approach (lines 110-118)

#### 4.2.6 Test Harness

```bash
# Test executable
./test_transcriber <model_path> <audio_path>

# Example
./test_transcriber models/ggml-base.bin test.wav
# Expected output:
# Loading model: models/ggml-base.bin
# Model loaded successfully (Metal GPU detected)
# Transcribing: test.wav
# Transcript: "This is a test of the BrainDump transcription system."
# Transcription time: 436ms
# ✓ Test passed
```

**Test Verification:**
- Model loads without errors
- Transcript is non-empty
- Transcript contains expected text (for known audio sample)
- GPU acceleration detected (if available)
- CPU fallback works (if GPU disabled)

#### 4.2.7 Acceptance Criteria

- [ ] Loads ggml-base.bin model successfully
- [ ] Transcribes WAV files accurately (>90% word accuracy on clean audio)
- [ ] Uses Metal GPU on macOS (verify via system monitor)
- [ ] Falls back to CPU gracefully (test by disabling GPU)
- [ ] Returns UTF-8 text (support for international characters)
- [ ] Handles errors (missing file, corrupt audio, invalid model)
- [ ] No memory leaks (valgrind clean)
- [ ] Compiles with `-Wall -Wextra -Werror` (zero warnings)
- [ ] Test harness passes on macOS and Linux

---

### 4.3 Module 3: C API Bridge (Detailed)

#### 4.3.1 Responsibilities

1. **C++ Wrapping:** Wrap C++ classes in C-compatible functions
2. **Opaque Handles:** Use opaque pointers (hide C++ implementation)
3. **Error Codes:** Return integer error codes (no C++ exceptions)
4. **Memory Management:** Provide helper functions for cleanup
5. **Thread Safety:** Document thread-safety guarantees

#### 4.3.2 Technical Specifications

**ABI Stability:**
- Pure C interface (no C++ name mangling)
- Opaque types (forward declarations only)
- No STL types in public API (std::string → char*)
- Stable error codes (never change enum values)

**Memory Ownership:**
- **Handles:** Caller creates (`*_create`) and destroys (`*_destroy`)
- **Strings:** Library allocates, caller frees (`bd_free_string`)
- **Errors:** Always return error code (never throw exceptions)

#### 4.3.3 Interface Design

**See Section 3.2 (Module 3) for full interface.**

**Key Design Decisions:**
1. **Opaque Types:** `typedef struct BDRecorder BDRecorder;` (no struct definition in header)
2. **Error Enum:** Negative values for errors, 0 for success
3. **Double-Pointer Output:** `char** output_text` (caller receives allocated string)
4. **Destroy Always Succeeds:** `void bd_recorder_destroy()` (no error possible)

#### 4.3.4 Implementation Strategy

**Files to Create:**
```
include/
├── braindump.h             # Public C API
└── braindump_types.h       # Type definitions (error codes)

src/api/
├── c_api.cpp               # C API implementation
├── error_handling.cpp      # Error code mapping (C++ exceptions → error codes)
└── memory_management.cpp   # String allocation helpers
```

**Implementation Pattern:**
```cpp
// c_api.cpp
extern "C" {

// Create handle (C wrapper for C++ new)
BDRecorder* bd_recorder_create() {
    try {
        return reinterpret_cast<BDRecorder*>(new BrainDump::Recorder());
    } catch (...) {
        return nullptr;  // Creation failed
    }
}

// Start recording (C wrapper for C++ method)
BDError bd_recorder_start(BDRecorder* recorder, const char* output_path) {
    if (!recorder) return BD_ERROR_INVALID_HANDLE;
    try {
        auto* r = reinterpret_cast<BrainDump::Recorder*>(recorder);
        int result = r->start(output_path);
        return static_cast<BDError>(result);
    } catch (const std::exception& e) {
        // Log error internally
        return BD_ERROR_INIT;
    }
}

// Destroy handle (C wrapper for C++ delete)
void bd_recorder_destroy(BDRecorder* recorder) {
    if (recorder) {
        auto* r = reinterpret_cast<BrainDump::Recorder*>(recorder);
        delete r;
    }
}

} // extern "C"
```

#### 4.3.5 Test Harness

```bash
# Integration test (full pipeline)
./test_integration

# Expected output:
# === BrainDump Core Integration Test ===
#
# Test 1: Recording audio...
# ✓ Recording complete
#
# Test 2: Transcribing audio...
# ✓ Transcript: "This is a test recording."
#
# Test 3: Memory cleanup...
# ✓ All handles destroyed
#
# === All Tests Passed ===
```

**Test Verification:**
- All handles create successfully
- Recording works via C API
- Transcription works via C API
- Memory cleanup succeeds
- No leaks (valgrind clean)

#### 4.3.6 Acceptance Criteria

- [ ] Compiles as pure C (`gcc -std=c99`)
- [ ] No C++ exceptions cross boundary (all caught internally)
- [ ] All heap allocations documented (who allocates, who frees)
- [ ] Thread-safety documented (e.g., "Not thread-safe, use mutex")
- [ ] Error codes for all failure modes
- [ ] Test integration passes (record → transcribe → verify)
- [ ] No memory leaks (valgrind clean)
- [ ] API documented in header comments (Doxygen-compatible)

---

## 5. Decision Matrix

### 5.1 Whisper.cpp Integration

**Question:** How should we integrate whisper.cpp?

#### Option A: Git Submodule (Vendored)

**Description:** Add whisper.cpp as git submodule in `external/whisper.cpp`

**Pros:**
- **Reproducible Builds:** Exact version locked in repository
- **Full Control:** Can patch or modify whisper.cpp if needed
- **No System Dependency:** Works on any system (no Homebrew/apt needed)
- **Offline Builds:** No network required after initial clone

**Cons:**
- **Maintenance Burden:** Must manually update submodule for new versions
- **Larger Repository:** Adds ~50MB to git clone size
- **Build Time:** Must compile whisper.cpp from source (slower CI/CD)
- **Submodule Complexity:** Developers must remember `git submodule update --init`

**Maintenance Process:**
```bash
# Check for updates
cd external/whisper.cpp
git fetch
git log HEAD..origin/master  # Review changes

# Update to new version
git checkout v1.6.0
cd ../..
git add external/whisper.cpp
git commit -m "chore: update whisper.cpp to v1.6.0"
```

**Notification Strategy:**
- Subscribe to whisper.cpp GitHub releases (RSS feed)
- Dependabot can track submodule updates (GitHub feature)
- Manual quarterly review of upstream changes

---

#### Option B: System Dependency (Homebrew/apt)

**Description:** Link against system-installed whisper-cpp library

**Pros:**
- **Simple Setup:** `brew install whisper-cpp` (one command)
- **Faster Builds:** Pre-compiled binaries (no source compilation)
- **Automatic Updates:** System package manager handles updates
- **Smaller Repository:** No submodule (50MB smaller)

**Cons:**
- **Version Conflicts:** User's system version may differ from expected
- **Build Reproducibility:** Different versions on different machines
- **Platform Variability:** Homebrew vs. apt vs. dnf (different package names)
- **No Offline Builds:** Requires internet for initial setup

**CMake Detection:**
```cmake
# Find system whisper library
find_library(WHISPER_LIBRARY whisper)
find_path(WHISPER_INCLUDE_DIR whisper.h PATH_SUFFIXES whisper)

if(NOT WHISPER_LIBRARY)
    message(FATAL_ERROR "whisper-cpp not found. Install: brew install whisper-cpp")
endif()

target_link_libraries(braindump PRIVATE ${WHISPER_LIBRARY})
```

---

#### Option C: Hybrid Approach (Submodule + System Fallback)

**Description:** Prefer system dependency, fallback to submodule if not found

**Pros:**
- **Developer Flexibility:** Developers can choose their preferred method
- **CI Reproducibility:** CI uses submodule (locked version)
- **Production Simplicity:** Deployed apps use system library (smaller bundle)
- **Best of Both Worlds:** Convenience + control

**Cons:**
- **Complexity:** CMake logic more complex (two code paths)
- **Testing Burden:** Must test both code paths
- **Potential Bugs:** Subtle differences between system vs. submodule versions

**CMake Logic:**
```cmake
option(USE_SYSTEM_WHISPER "Use system-installed whisper-cpp" ON)

if(USE_SYSTEM_WHISPER)
    find_library(WHISPER_LIBRARY whisper)
    if(WHISPER_LIBRARY)
        message(STATUS "Using system whisper-cpp: ${WHISPER_LIBRARY}")
        target_link_libraries(braindump PRIVATE ${WHISPER_LIBRARY})
    else()
        message(STATUS "System whisper-cpp not found, using submodule")
        add_subdirectory(external/whisper.cpp)
        target_link_libraries(braindump PRIVATE whisper)
    endif()
else()
    message(STATUS "Using vendored whisper.cpp (submodule)")
    add_subdirectory(external/whisper.cpp)
    target_link_libraries(braindump PRIVATE whisper)
endif()
```

---

#### Recommendation: Option A (Git Submodule)

**Rationale:**
1. **Community Gift:** We want reproducible builds for contributors
2. **Mental Health Users:** Many have limited technical skills (system deps harder)
3. **CI/CD:** Locked versions prevent "works on my machine" issues
4. **Offline Development:** Users in recovery may have limited internet

**Trade-off Acceptance:**
- Accept maintenance burden (update submodule quarterly)
- Accept larger repo size (50MB is acceptable for this use case)
- Accept build time (whisper.cpp compiles in ~2 minutes)

**Implementation:**
```bash
# Add submodule
git submodule add https://github.com/ggerganov/whisper.cpp external/whisper.cpp
git submodule update --init --recursive

# Lock to stable version
cd external/whisper.cpp
git checkout v1.5.0
cd ../..
git add external/whisper.cpp
git commit -m "feat: add whisper.cpp v1.5.0 as submodule"
```

**Documentation:**
```markdown
# Building BrainDump

## Prerequisites
- CMake 3.15+
- C++17 compiler
- PortAudio (`brew install portaudio`)

## Clone with submodules
git clone --recurse-submodules https://github.com/you/braindump.git

## Or if already cloned
git submodule update --init --recursive

## Build
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

---

### 5.2 Linux Support Priority

**Question:** How important is Linux support in Stage A?

#### Option A: Must-Have (Block Stage A Completion)

**Description:** Stage A incomplete unless builds/runs on Ubuntu 22.04 and Fedora 39

**Pros:**
- **Wider Audience:** Linux users can use BrainDump immediately
- **Community Contribution:** Linux users more likely to contribute patches
- **Dogfooding:** Test cross-platform code early (prevent macOS lock-in)

**Cons:**
- **Timeline Risk:** Linux issues could delay Stage A completion
- **Testing Burden:** Must test on multiple Linux distros
- **GPU Complexity:** CUDA support optional but adds complexity

**Acceptance Criteria:**
- [ ] CMake builds on Ubuntu 22.04 (apt dependencies)
- [ ] CMake builds on Fedora 39 (dnf dependencies)
- [ ] All tests pass on Linux (CPU fallback mode)
- [ ] CUDA support optional (GPU acceleration nice-to-have)

---

#### Option B: Nice-to-Have (Best Effort)

**Description:** Focus on macOS, test on Linux if time permits

**Pros:**
- **Faster Stage A:** No delays from Linux-specific issues
- **Simpler Testing:** Single platform (macOS) to verify
- **Metal GPU Focus:** Optimize for M-series Macs first

**Cons:**
- **Platform Lock-in Risk:** macOS-specific code may creep in
- **Limited Testing:** May discover Linux issues late (in Stage B)
- **Community Exclusion:** Linux users can't test/contribute in Stage A

**Acceptance Criteria:**
- [ ] CMake builds on macOS (primary target)
- [ ] All tests pass on macOS
- [ ] Code designed for portability (no macOS-only APIs in core)
- [ ] Linux support attempted but not guaranteed

---

#### Option C: Defer to Stage B

**Description:** macOS only for Stage A, add Linux support in Stage B

**Pros:**
- **Maximum Speed:** Focus on single platform (fastest Stage A)
- **Metal Optimization:** Deep Metal GPU optimization without compromise
- **Tauri Alignment:** Tauri (Stage B frontend) handles Linux naturally

**Cons:**
- **Architecture Risk:** May need C++ refactoring later for Linux
- **Testing Gap:** No cross-platform validation until Stage B
- **Community Delay:** Linux users wait longer to participate

**Acceptance Criteria:**
- [ ] CMake builds on macOS only
- [ ] All tests pass on macOS
- [ ] Document Linux support as Stage B goal
- [ ] Design C API to be platform-agnostic (no macOS-specific types)

---

#### Recommendation: Option B (Nice-to-Have, Best Effort)

**Rationale:**
1. **Primary User Base:** macOS users (mental health journaling on Mac/iPhone)
2. **Risk Mitigation:** Attempt Linux support, but don't block on it
3. **Code Quality:** Write portable C++ (no macOS-only APIs in core)
4. **Stage B Synergy:** Tauri frontend (Stage B) will force Linux support anyway

**Implementation Strategy:**
- Write portable C++ from the start (no `#ifdef __APPLE__` in core logic)
- Use PortAudio (cross-platform by design)
- Test on Linux VM periodically (weekly CI builds)
- If Linux issues found, document as known issues (fix in Stage B)

**Success Criteria:**
- Stage A ships on macOS (guaranteed)
- Linux support 70% complete (best effort)
- No macOS-specific code in Module 1 or 2 (portable by design)
- C API is platform-agnostic (works on any platform)

---

### 5.3 Frontend Target Assumptions

**Question:** Which Stage B frontend should influence our C API design?

#### Option A: Tauri (Rust + Web UI)

**Description:** Design C API optimized for Rust FFI (Tauri backend)

**Pros:**
- **PRD Alignment:** PRD mentions Tauri as preferred frontend
- **Cross-Platform:** Single Tauri app for Mac/Linux/Windows
- **Web UI Reuse:** HTML/CSS/JS skills (large developer pool)
- **Rapid Prototyping:** Faster UI development than native Swift/Kotlin

**Cons:**
- **Bundle Size:** Larger than native (but still < Electron)
- **Platform Feel:** Web UI less native than SwiftUI/Jetpack Compose

**C API Implications:**
- Rust-friendly error handling (Result-like pattern)
- FFI-safe types (no complex structs)
- Clear ownership rules (Rust borrow checker compatibility)

---

#### Option B: Native Swift (macOS Only)

**Description:** Design C API optimized for Swift interop

**Pros:**
- **Best Performance:** Native macOS app (smallest bundle, fastest startup)
- **Platform Feel:** SwiftUI = native macOS look and feel
- **Apple Ecosystem:** Easy iOS port (Stage C)

**Cons:**
- **Platform Lock-in:** macOS/iOS only (no Linux/Android in Stage B)
- **Smaller Developer Pool:** Fewer Swift developers than web developers

**C API Implications:**
- Swift-friendly naming (matches Swift conventions)
- Bridging header considerations
- Memory management compatible with ARC

---

#### Option C: All Platforms Equally (Agnostic Design)

**Description:** Design C API to work equally well with Swift, Kotlin, Rust, Dart

**Pros:**
- **Maximum Flexibility:** Product team can choose any frontend later
- **Future-Proof:** No regrets if frontend choice changes
- **Community Friendly:** Different developers can build different frontends

**Cons:**
- **No Optimization:** API not optimized for any specific language
- **More Work:** Must consider all FFI constraints (lowest common denominator)

**C API Implications:**
- Pure C (no language-specific assumptions)
- Simple types only (int, char*, opaque pointers)
- No platform-specific types (e.g., no CFString, no JNI types)

---

#### Recommendation: Option C (Agnostic Design)

**Rationale:**
1. **Discovery Phase:** Product team still deciding on frontend (per your feedback)
2. **Community Gift:** Different frontends for different users (Mac/Linux/Android)
3. **No Regrets:** Pure C API works everywhere (future-proof)
4. **Bell Labs Philosophy:** Simple, composable interfaces (no assumptions)

**Implementation Guidelines:**
- Pure C types only (`int`, `char*`, opaque pointers)
- No platform-specific types (no `CFString`, `JNI`, `Box<T>`)
- Clear error codes (works in any language)
- Simple memory model (create/destroy, no complex ownership)

**Example:**
```c
// ✓ Good (works everywhere)
BDError bd_recorder_start(BDRecorder* recorder, const char* output_path);

// ✗ Bad (Swift-specific)
BDError bd_recorder_start(BDRecorder* recorder, CFStringRef output_path);

// ✗ Bad (Rust-specific)
BDError bd_recorder_start(BDRecorder* recorder, const RustString* output_path);
```

---

### 5.4 V2 C1 Archive Strategy

**Question:** How should we preserve the V2 C1 Electron code?

#### Option A: Branch in Main Repo

**Description:** Keep `archive/v2-electron` branch in same repository

**Pros:**
- **Easy Reference:** Developers can checkout and compare
- **Git History:** All history in one place
- **No Extra Repos:** Simpler organization

**Cons:**
- **Repo Bloat:** Old code in same repo (confusing for new contributors)
- **Branch Clutter:** Extra branches in `git branch -a` output

---

#### Option B: Separate Archive Repo

**Description:** Move to `IAC-30-brain-dump-v2-archived` repository

**Pros:**
- **Clean Separation:** Main repo only has V3 code
- **Clear Communication:** "This is archived" (repo name signals this)

**Cons:**
- **Extra Repos:** One more repo to manage
- **Lost Context:** Harder to reference V2 decisions

---

#### Option C: Delete Entirely (Tag Only)

**Description:** Tag `v2.5.0-beta1-archived` and delete code

**Pros:**
- **Cleanest Repo:** No old code at all
- **Fresh Start:** No baggage

**Cons:**
- **Lost Reference:** Hard to compare implementations
- **History Loss:** Can recover from git, but inconvenient

---

#### Recommendation: Option A (Branch in Main Repo)

**Rationale:**
1. **Per Your Feedback:** "Branch in main repo" selected
2. **Easy Reference:** Sub-agents can compare V2 vs V3 decisions
3. **Documentation:** This design proposal references V2 files (easier if in same repo)

**Implementation:**
```bash
# Tag current state
git tag v2.5.0-beta1-archived

# Create archive branch
git checkout -b archive/v2-electron
git push origin archive/v2-electron

# Clean main branch
git checkout main
git checkout -b v3-development
# (V3 implementation happens on v3-development)
```

---

## 6. Git Strategy

### 6.1 Branch Structure

```
main (currently v2.5.0-beta1)
├── archive/v2-electron (preserve V2 C1 for reference)
│   └── [All V2 code frozen, tagged v2.5.0-beta1-archived]
│
└── v3-development (new base branch for V3.0 Stage A)
    ├── stage-a-audio-recorder      # Sub-Agent 1: Module 1
    ├── stage-a-transcriber          # Sub-Agent 2: Module 2
    ├── stage-a-build-system         # Sub-Agent 3: CMake
    └── stage-a-c-api                # Sub-Agent 4: C API Bridge
```

### 6.2 Migration Steps

**Step 1: Archive V2 C1**
```bash
# Tag current state
git tag v2.5.0-beta1-final
git tag v2-electron-archived

# Create archive branch
git checkout -b archive/v2-electron
git push origin archive/v2-electron

# Document archival
echo "# V2 C1 Electron Prototype (Archived)" > ARCHIVED.md
echo "This branch is archived. See v3-development for active work." >> ARCHIVED.md
git add ARCHIVED.md
git commit -m "docs: mark V2 C1 as archived"
git push origin archive/v2-electron
```

**Step 2: Create V3 Base Branch**
```bash
# Switch to main
git checkout main

# Create V3 base branch
git checkout -b v3-development

# Clean slate (remove V2 artifacts)
rm -rf archive/phase-c1-electron/
rm package.json package-lock.json
rm -rf node_modules/
rm tsconfig.json

# Keep root documentation
# (CLAUDE.md, README.md, PRD-v3.0-STAGE-A.md, this design proposal)

# Initialize V3 structure
mkdir -p src/audio src/transcription src/api
mkdir -p include tests external models

# Commit clean slate
git add .
git commit -m "chore: initialize V3.0 Stage A clean slate"
git push origin v3-development
```

**Step 3: Create Feature Branches**
```bash
# From v3-development, create parallel feature branches
git checkout -b stage-a-audio-recorder v3-development
git push origin stage-a-audio-recorder

git checkout -b stage-a-transcriber v3-development
git push origin stage-a-transcriber

git checkout -b stage-a-build-system v3-development
git push origin stage-a-build-system

git checkout -b stage-a-c-api v3-development
git push origin stage-a-c-api
```

### 6.3 Commit Message Format

**Convention:**
```
[module] Brief description (imperative mood)

Detailed explanation of what changed and why.

- Bullet points for key changes
- Reference PRD sections if applicable
- Note preserved logic from V2 C1 (if applicable)

Signed-off-by: Sub-Agent Name <role@braindump.dev>
```

**Examples:**
```
[audio] Implement PortAudio-based recorder

Add real-time audio capture using PortAudio library.
Recording writes 16kHz mono PCM to WAV files.

- Callback-based streaming (1024-frame buffers)
- RAII pattern for audio stream lifecycle
- Preserved audio format specs from V2 C1 recorder.py:71-78

Signed-off-by: Audio Engineer <audio@braindump.dev>
```

```
[transcription] Integrate whisper.cpp with Metal GPU

Add whisper.cpp as git submodule, implement C++ wrapper.
Supports Metal GPU acceleration on macOS, CPU fallback on Linux.

- Whisper model loading (~500ms)
- Metal GPU detection and fallback logic
- Preserved model path structure from V2 C1 transcribe.py:53

Signed-off-by: Transcription Expert <ml@braindump.dev>
```

### 6.4 Pull Request Workflow

**Template:**
```markdown
## Description
Brief description of changes (1-2 sentences)

## Module
- [ ] Audio Recorder
- [ ] Transcriber
- [ ] C API Bridge
- [ ] Build System

## Changes
- Bullet list of key changes
- Reference PRD sections
- Note preserved logic from V2 C1

## Tests
- [ ] Unit tests pass
- [ ] Integration test passes (if applicable)
- [ ] No memory leaks (valgrind clean)
- [ ] Compiles with -Werror (zero warnings)

## Documentation
- [ ] Header comments updated
- [ ] README updated if needed
- [ ] Example code provided (if public API changed)

## Checklist
- [ ] Code follows C++ style guide (PRD section 5)
- [ ] No compiler warnings
- [ ] Git history is clean (no "fix typo" commits)
- [ ] Reviewed by orchestrator

## Orchestrator Review
- [ ] Enforces coding standards
- [ ] Verifies modularity
- [ ] Checks for Bell Labs principles
```

### 6.5 Merge Strategy

**Parallel Branches (Module 1, 2, 3):**
- Merge to `v3-development` when complete
- Orchestrator reviews all PRs before merge
- Require all tests pass (CI/CD gate)

**Sequential Branch (Module 4 - C API):**
- Depends on Module 1 + 2 merged
- Spawn after Module 1 + 2 complete
- Merge to `v3-development` when integration tests pass

**Final Merge:**
```bash
# When all modules complete
git checkout v3-development
git tag v3.0.0-stage-a

# Merge to main (Stage A release)
git checkout main
git merge v3-development
git push origin main
git push origin v3.0.0-stage-a
```

---

## 7. Preserved Logic from V2 C1

### 7.1 Audio Recording (Module 1)

**Source:** `archive/phase-c1-electron/recorder.py`

**Preserve:**
- **Audio Format** (lines 71-78):
  - Sample rate: 16kHz
  - Channels: Mono (1 channel)
  - Bit depth: 16-bit PCM
  - Buffer size: 1024 frames

- **Callback Pattern** (lines 108-126):
  - Non-blocking streaming
  - Real-time callback-based capture
  - Buffer accumulation in memory

- **Error Handling** (lines 154-168):
  - Structured error types
  - Graceful cleanup on errors
  - Informative error messages

- **Output Structure** (lines 91-95):
  - Path: `outputs/audio/recording_TIMESTAMP.wav`
  - Filename format: `recording_YYYY-MM-DD_HH-MM-SS.wav`

**Discard:**
- Python subprocess protocol (stdin/stdout commands)
- PyAudio-specific code
- Python logging module integration

---

### 7.2 Transcription (Module 2)

**Source:** `archive/phase-c1-electron/transcribe.py`

**Preserve:**
- **Model Path** (line 53):
  - Default: `models/ggml-base.bin`
  - Support for alternative models (tiny, small, medium)

- **Output Format** (lines 158-169):
  - Markdown format with metadata header
  - Date timestamp
  - Audio filename reference
  - Transcript text body

- **Duration Extraction** (lines 94-101):
  - Parse WAV header for audio duration
  - Display duration in metadata

- **Error Handling** (lines 110-118):
  - Validate file paths (prevent path traversal)
  - Check file existence
  - Handle corrupt audio files

**Discard:**
- Python subprocess wrapper (call whisper-cli binary)
- Node.js database integration
- PROTOCOL-based IPC output

---

### 7.3 State Management (C API Design)

**Source:** `archive/phase-c1-electron/main.ts`

**Preserve:**
- **State Machine** (lines 179-215):
  - States: idle → recording → processing → idle
  - Error state (transition from any state on error)
  - State change events

- **Error Propagation**:
  - Structured error codes
  - Clear error messages
  - Graceful degradation

**Discard:**
- Electron-specific IPC handlers
- TypeScript event emitters
- Manager-based architecture (replace with C++ classes)

---

### 7.4 Database Schema (Future Reference)

**Source:** `archive/phase-c1-electron/database.ts`

**Preserve (Document for Stage B):**
```typescript
{
  id: string,              // UUID
  filename: string,        // "recording_2025-11-07_14-30-45.wav"
  filepath: string,        // Absolute path
  timestamp: string,       // ISO 8601 format
  duration: number,        // Seconds (from WAV header)
  transcript: string,      // Full transcript text
  firstLine: string,       // First line (for UI preview)
  autoFillCount: number    // Optional (Stage B feature)
}
```

**Note:** Stage A does not include database. C API returns raw text.
Stage B frontend (Tauri/Swift/Kotlin) will implement database storage.

---

## 8. Sub-Agent Orchestration Plan

### 8.1 Phase 1: Parallel Development (Week 1)

**Goal:** Build Modules 1, 2, and 3 (Build System) simultaneously

#### Sub-Agent 1: Audio Engineer

**Branch:** `stage-a-audio-recorder`
**Context:** Voice recording expert, PortAudio specialist, C++ RAII patterns

**Task:**
Build Module 1 (Audio Recorder) per PRD section "Module 1: Audio Recorder"

**Deliverables:**
- `src/audio/recorder.h` (public interface)
- `src/audio/recorder.cpp` (implementation with Pimpl)
- `src/audio/portaudio_impl.h` (PortAudio wrapper, private)
- `src/audio/portaudio_impl.cpp` (PortAudio initialization/callbacks)
- `src/audio/wav_writer.cpp` (WAV file format writer)
- `tests/test_recorder.cpp` (test harness)

**Coding Standards:**
- C++17 standard
- Pimpl idiom (hide PortAudio types from public header)
- RAII pattern (acquire in constructor, release in destructor)
- Compiles with `-Wall -Wextra -Werror`

**Success Criteria:**
- [ ] Test harness passes on macOS
- [ ] Records 16kHz mono PCM audio
- [ ] Writes valid WAV files
- [ ] No memory leaks (valgrind clean)

**Blockers:** None (can start immediately)

**Reference Material:**
- PRD section "Module 1: Audio Recorder"
- V2 C1: `archive/phase-c1-electron/recorder.py` (lines 71-126)
- PortAudio documentation: http://portaudio.com/docs/

---

#### Sub-Agent 2: Transcription Expert

**Branch:** `stage-a-transcriber`
**Context:** ML engineer, Whisper specialist, GPU acceleration expert

**Task:**
Build Module 2 (Transcriber) per PRD section "Module 2: Transcriber"

**Deliverables:**
- `src/transcription/transcriber.h` (public interface)
- `src/transcription/transcriber.cpp` (implementation with Pimpl)
- `src/transcription/whisper_wrapper.h` (Whisper C++ wrapper, private)
- `src/transcription/whisper_wrapper.cpp` (Whisper API calls)
- `tests/test_transcriber.cpp` (test harness)

**Coding Standards:**
- C++17 standard
- Pimpl idiom (hide whisper.cpp types from public header)
- RAII pattern (load model in constructor, free in destructor)
- Compiles with `-Wall -Wextra -Werror`

**Success Criteria:**
- [ ] Test harness passes on macOS
- [ ] Loads ggml-base.bin model successfully
- [ ] Uses Metal GPU acceleration (verified via system monitor)
- [ ] Falls back to CPU gracefully (test by disabling GPU)
- [ ] No memory leaks (valgrind clean)

**Blockers:** None (can start immediately)

**Reference Material:**
- PRD section "Module 2: Transcriber"
- V2 C1: `archive/phase-c1-electron/transcribe.py` (lines 53-118)
- whisper.cpp examples: https://github.com/ggerganov/whisper.cpp/tree/master/examples

---

#### Sub-Agent 3: DevOps Engineer

**Branch:** `stage-a-build-system`
**Context:** Build systems expert, CMake specialist, cross-platform compilation

**Task:**
Build CMake configuration per PRD section "Build System"

**Deliverables:**
- `CMakeLists.txt` (root build configuration)
- `src/audio/CMakeLists.txt` (audio module)
- `src/transcription/CMakeLists.txt` (transcription module)
- `tests/CMakeLists.txt` (test suite)
- `external/whisper.cpp` (git submodule, per Decision 5.1)
- `.github/workflows/build.yml` (CI/CD pipeline, optional)

**Platform-Specific:**
- macOS: Link Metal framework, Accelerate framework
- Linux: Optional CUDA detection, CPU fallback

**Success Criteria:**
- [ ] CMake builds on macOS (Metal enabled)
- [ ] CMake builds on Linux (best effort, CPU fallback)
- [ ] `ctest` runs all tests
- [ ] Outputs `libbraindump.dylib` (macOS) and `libbraindump.so` (Linux)

**Blockers:** None (can start immediately, but coordinates with Sub-Agent 1 + 2)

**Reference Material:**
- PRD section "Build System"
- PRD section "Dependency Management"
- whisper.cpp CMake: https://github.com/ggerganov/whisper.cpp/blob/master/CMakeLists.txt

---

### 8.2 Phase 2: Integration (Week 2)

**Goal:** Build Module 4 (C API Bridge) and integration tests

#### Sub-Agent 4: Integration Specialist

**Branch:** `stage-a-c-api`
**Context:** API design expert, C/C++ interop specialist, FFI knowledge

**Dependencies:** Requires Module 1 + 2 complete (merged to `v3-development`)

**Task:**
Build Module 3 (C API Bridge) per PRD section "Module 3: C API Bridge"

**Deliverables:**
- `include/braindump.h` (public C API)
- `include/braindump_types.h` (type definitions, error codes)
- `src/api/c_api.cpp` (C API implementation)
- `src/api/error_handling.cpp` (error code mapping)
- `src/api/memory_management.cpp` (string allocation helpers)
- `tests/test_integration.cpp` (full pipeline test: record → transcribe)

**Coding Standards:**
- Pure C interface (`extern "C"`, compiles with `gcc -std=c99`)
- Opaque pointer types (no C++ types in public API)
- No C++ exceptions cross boundary (catch and convert to error codes)
- Clear memory ownership rules (documented in header comments)

**Success Criteria:**
- [ ] Compiles as pure C (`gcc -std=c99 -c include/braindump.h`)
- [ ] Integration test passes (record → transcribe → verify)
- [ ] No memory leaks (valgrind clean)
- [ ] API documented (Doxygen-compatible comments)

**Blockers:** Requires Module 1 + 2 merged to `v3-development`

**Reference Material:**
- PRD section "Module 3: C API Bridge"
- Decision 5.3 (Agnostic C API Design)
- V2 C1: `archive/phase-c1-electron/main.ts` (lines 179-215, state management)

---

### 8.3 Orchestrator Responsibilities

**As Lead Orchestrator (Claude Code), I will:**

**Planning Phase:**
- [x] Read PRD-v3.0-STAGE-A.md completely
- [x] Analyze V2 C1 implementation
- [x] Create detailed design proposal (this document)
- [ ] Present to Product Manager for approval
- [ ] Address feedback and revise

**Execution Phase (After Approval):**
1. **Spawn Agents:**
   - Spawn Sub-Agent 1, 2, 3 simultaneously (parallel development)
   - Provide each with their section of PRD + relevant V2 C1 references
   - Grant write access to respective feature branches

2. **Monitor Progress:**
   - Daily check-ins with sub-agents (progress updates)
   - Ensure coding standards followed (PRD section 5)
   - Review commits for Bell Labs principles (simple, modular, composable)

3. **Code Review:**
   - Review all PRs before merge to `v3-development`
   - Enforce zero warnings (`-Wall -Wextra -Werror`)
   - Verify no memory leaks (valgrind reports)
   - Check documentation completeness (header comments)

4. **Integration:**
   - After Module 1 + 2 merged, spawn Sub-Agent 4
   - Review C API design before implementation
   - Run integration tests
   - Verify cross-module compatibility

5. **Quality Gates:**
   - All tests pass on macOS (guaranteed)
   - Linux tests pass (best effort, per Decision 5.2)
   - Zero compiler warnings
   - Zero memory leaks
   - 100% function documentation in headers

6. **Delivery:**
   - Tag `v3.0.0-stage-a` when all acceptance criteria met
   - Generate release artifacts (libraries, test executables)
   - Update README with build instructions
   - Prepare handoff documentation for Stage B

**What I Do NOT Do:**
- Write implementation code myself (sub-agents do this)
- Skip documentation (enforce comprehensive docs)
- Allow sub-agents to violate coding standards
- Merge code without tests passing
- Create monolithic modules (enforce modularity)

---

### 8.4 Communication Protocol

**Sub-Agent → Orchestrator:**
- Progress updates (daily standup-style)
- Blockers (if any dependencies missing)
- Code review requests (when PR ready)
- Design questions (if PRD unclear)

**Orchestrator → Sub-Agent:**
- Feedback on PRs (coding standards, modularity)
- Unblock dependencies (coordinate with other agents)
- Clarify PRD requirements
- Approve merges to `v3-development`

**Orchestrator → Product Manager:**
- Weekly progress reports
- Escalate blockers (if external dependencies needed)
- Request clarification (if requirements ambiguous)
- Deliver Stage A completion (when Definition of Done met)

---

## 9. Testing Strategy

### 9.1 Test Coverage Goals

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **Unit Tests** | Each module independently | Custom test harnesses |
| **Integration Test** | Full pipeline (record → transcribe) | `test_integration.cpp` |
| **Memory Tests** | Valgrind clean (no leaks, no errors) | Valgrind, AddressSanitizer |
| **Performance Tests** | Transcription speed benchmarks | Time measurements |
| **Compiler Tests** | Zero warnings | `-Wall -Wextra -Werror` |

### 9.2 Test 1: Recorder Module

**Executable:** `tests/test_recorder.cpp`

**Usage:**
```bash
./test_recorder <output.wav> <duration_seconds>
```

**Test Steps:**
1. Create recorder handle
2. Start recording to specified file
3. Sleep for specified duration
4. Stop recording
5. Verify file exists
6. Verify file size correct (~16KB per second)
7. (Optional) Play audio to verify quality

**Expected Output:**
```
Initializing recorder...
Recording to output.wav for 5 seconds...
Recording started
Recording stopped
WAV file size: 160044 bytes (expected ~160000)
✓ Test passed
```

**Acceptance:**
- File exists after recording
- File size within 10% of expected size
- WAV header valid (verify with `file output.wav`)
- No memory leaks (run under valgrind)

---

### 9.3 Test 2: Transcriber Module

**Executable:** `tests/test_transcriber.cpp`

**Usage:**
```bash
./test_transcriber <model_path> <audio_path>
```

**Test Steps:**
1. Load Whisper model from specified path
2. Verify model loads successfully
3. Transcribe audio file
4. Print transcript to stdout
5. Show timing statistics (model load time, transcription time)

**Expected Output:**
```
Loading model: models/ggml-base.bin
Model loaded successfully (Metal GPU detected)
Transcribing: test.wav
Transcript: "This is a test of the BrainDump transcription system."
Transcription time: 436ms
✓ Test passed
```

**Acceptance:**
- Model loads without errors
- Transcript is non-empty
- Transcript contains expected text (for known audio sample)
- GPU acceleration detected (if available)
- CPU fallback works (if GPU disabled)
- No memory leaks (run under valgrind)

---

### 9.4 Test 3: Integration Test

**Executable:** `tests/test_integration.cpp`

**Usage:**
```bash
./test_integration
```

**Test Steps:**
1. **Record Audio:**
   - Create recorder handle
   - Start recording to `/tmp/test_recording.wav`
   - Record for 5 seconds
   - Stop recording
   - Verify file exists

2. **Transcribe Audio:**
   - Create transcriber handle
   - Load `models/ggml-base.bin`
   - Transcribe `/tmp/test_recording.wav`
   - Verify transcript is non-empty

3. **Cleanup:**
   - Destroy recorder handle
   - Destroy transcriber handle
   - Free transcript string

**Expected Output:**
```
=== BrainDump Core Integration Test ===

Test 1: Recording audio...
✓ Recording complete

Test 2: Transcribing audio...
✓ Transcript: "This is a test recording."

Test 3: Memory cleanup...
✓ All handles destroyed

=== All Tests Passed ===
```

**Acceptance:**
- Full pipeline completes without errors
- Transcript matches spoken audio (manual verification)
- No memory leaks (run under valgrind)

---

### 9.5 Memory Testing

**Tool:** Valgrind (or AddressSanitizer on macOS)

**Command:**
```bash
# Valgrind (Linux)
valgrind --leak-check=full \
         --show-leak-kinds=all \
         --track-origins=yes \
         --error-exitcode=1 \
         ./test_integration

# AddressSanitizer (macOS)
export ASAN_OPTIONS=detect_leaks=1
./test_integration  # Built with -fsanitize=address
```

**Expected Output:**
```
==12345== HEAP SUMMARY:
==12345==     in use at exit: 0 bytes in 0 blocks
==12345==   total heap usage: 1,234 allocs, 1,234 frees, 45,678 bytes allocated
==12345==
==12345== All heap blocks were freed -- no leaks are possible
==12345==
==12345== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 0 from 0)
```

**Acceptance:**
- Zero memory leaks
- Zero invalid memory accesses
- Zero uninitialized memory reads

---

### 9.6 Performance Testing

**Benchmark:** Transcription speed

**Setup:**
- Audio: 10-second recording (16kHz mono WAV)
- Model: ggml-base.bin (141MB)
- Platform: M2 Mac (Metal GPU)

**Command:**
```bash
time ./test_transcriber models/ggml-base.bin test_10s.wav
```

**Target Performance:**
- Model Load: <500ms (first load only)
- Transcription: <2 seconds (M2 Mac + Metal)
- Total Time: <2.5 seconds

**Actual Performance (V2 C1 baseline):**
- Transcription: 436ms for 11 seconds (25× realtime)
- Expected V3.0: Similar or better (less Python overhead)

---

### 9.7 Compiler Testing

**Flags:**
```bash
-Wall           # Enable all warnings
-Wextra         # Enable extra warnings
-Werror         # Treat warnings as errors
-pedantic       # Enforce strict ISO C++
```

**Command:**
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release \
               -DCMAKE_CXX_FLAGS="-Wall -Wextra -Werror -pedantic"
cmake --build build
```

**Acceptance:**
- Zero compiler warnings
- Zero errors
- Clean build on macOS and Linux (best effort)

---

## 10. Performance Targets

### 10.1 Comparison: V2 C1 vs V3.0 Stage A

| Metric | V2 C1 (Electron) | V3.0 Stage A (C++) | Improvement |
|--------|------------------|-------------------|-------------|
| **Bundle Size** | 140MB | <2MB (library only) | **99% smaller** |
| **Memory Usage (Idle)** | 150-200MB | <10MB | **95% less** |
| **Memory Usage (Recording)** | 150-200MB | <20MB | **90% less** |
| **Memory Usage (Transcribing)** | 200-250MB | <200MB | Similar |
| **Startup Time** | 3-5 seconds | <100ms (library load) | **97% faster** |
| **Recording Latency** | <100ms | <100ms | Same |
| **Transcription (10s audio)** | 436ms (M2 + Metal) | <2 seconds (target) | Similar |
| **CPU Usage (Recording)** | <2% | <1% | Marginal improvement |
| **CPU Usage (Transcribing)** | <5% (GPU) | <5% (GPU) | Same |
| **Platform Support** | macOS only | macOS + Linux | **New capability** |
| **Mobile Support** | None | iOS/Android ready (FFI) | **New capability** |

### 10.2 Success Criteria

**Stage A is successful if:**

1. **Code Quality:**
   - Zero compiler warnings (`-Wall -Wextra -Werror`)
   - Zero memory leaks (valgrind clean)
   - 100% function documentation in headers
   - Clean git history (no "fix typo" commits)

2. **Performance:**
   - Library size <2MB (stripped)
   - Memory usage <50MB (during recording + transcription)
   - Transcription speed <2 seconds for 10 seconds audio (M2 + Metal)
   - CPU usage <1% during recording

3. **Functionality:**
   - All 3 test harnesses pass
   - Integration test completes end-to-end
   - GPU acceleration verified on Mac (Metal)
   - CPU fallback works on Linux (best effort)
   - C API is C-compatible (compiles with `gcc -std=c99`)

4. **Documentation:**
   - README with build instructions
   - API reference in header files (Doxygen-compatible)
   - Architecture diagram included
   - Example usage code provided

---

## 11. Risk Analysis

### 11.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PortAudio platform issues | Medium | High | Test on Ubuntu/Fedora early, document issues |
| Whisper model loading slow | Low | Medium | Load once, keep in memory; offer smaller models |
| GPU acceleration not working | Medium | Medium | CPU fallback always available, clear docs |
| Memory leaks in C API | Low | High | Mandatory valgrind checks before merge |
| Linux build failures | Medium | Low | Best effort (per Decision 5.2), defer to Stage B |
| Sub-agent blocked | Low | Medium | Orchestrator unblocks, reassigns if needed |
| Timeline slip | Medium | Medium | Parallel development, weekly progress reviews |

### 11.2 Risk 1: PortAudio Platform Issues

**Description:** PortAudio may have platform-specific quirks on Linux

**Likelihood:** Medium (PortAudio is mature, but Linux audio is fragmented)
**Impact:** High (would block Linux support)

**Mitigation:**
1. Test on Ubuntu 22.04 and Fedora 39 early (Week 1)
2. Document known issues clearly in README
3. Fallback to ALSA (Linux native audio) if PortAudio fails
4. Accept Linux as "best effort" (per Decision 5.2)

**Contingency:**
- If PortAudio fails on Linux, defer Linux support to Stage B
- Tauri (Stage B frontend) may handle audio differently

---

### 11.3 Risk 2: Whisper Model Loading Slow

**Description:** Loading 141MB model may take >1 second

**Likelihood:** Low (V2 C1 loads in ~117ms)
**Impact:** Medium (slower startup, not a blocker)

**Mitigation:**
1. Load model once, keep in memory (singleton pattern)
2. Offer smaller models (ggml-tiny.bin = 75MB, faster load)
3. Document expected load times in README
4. Consider lazy loading (load on first transcription)

**Contingency:**
- Accept slower startup (1-2 seconds) as trade-off for accuracy
- Stage B frontend can show "Loading model..." progress indicator

---

### 11.4 Risk 3: GPU Acceleration Not Working

**Description:** Metal/CUDA may not work on all systems

**Likelihood:** Medium (Metal works on M-series Macs, but CUDA varies)
**Impact:** Medium (slower transcription, but CPU works)

**Mitigation:**
1. CPU fallback always available (graceful degradation)
2. Clear documentation on GPU setup (e.g., CUDA drivers)
3. Log which backend is being used (Metal/CUDA/CPU)
4. Test GPU detection in integration test

**Contingency:**
- Accept CPU-only on Linux (transcription 2-5× slower, still usable)
- Recommend GPU for heavy users (document in README)

---

### 11.5 Risk 4: Memory Leaks in C API

**Description:** Manual memory management in C API may introduce leaks

**Likelihood:** Low (with strict valgrind testing)
**Impact:** High (memory leaks unacceptable in production)

**Mitigation:**
1. Mandatory valgrind checks before PR merge
2. Clear ownership rules documented in header comments
3. Helper functions for cleanup (`bd_free_string`)
4. Integration test runs under valgrind (gate for Stage A completion)

**Contingency:**
- If leaks found, block Stage A until fixed (non-negotiable)
- Sub-Agent 4 (Integration Specialist) responsible for memory safety

---

### 11.6 Risk 5: Linux Build Failures

**Description:** CMake may fail on Linux due to missing dependencies

**Likelihood:** Medium (Linux is fragmented, many distros)
**Impact:** Low (Linux is "best effort" per Decision 5.2)

**Mitigation:**
1. Test on popular distros (Ubuntu 22.04, Fedora 39)
2. Document required packages (`apt-get install ...`)
3. Accept Linux as "best effort" (not a blocker for Stage A)

**Contingency:**
- If Linux fails, defer to Stage B (Tauri will force Linux support)
- Document Linux support as "experimental" in v3.0.0-stage-a release notes

---

### 11.7 Risk 6: Sub-Agent Blocked

**Description:** Sub-agent encounters blocker (missing dependency, unclear PRD)

**Likelihood:** Low (PRD is detailed, sub-agents are experts)
**Impact:** Medium (could delay parallel development)

**Mitigation:**
1. Orchestrator monitors progress daily
2. Unblock dependencies (coordinate with other agents)
3. Clarify PRD requirements if ambiguous
4. Reassign tasks if sub-agent stuck >1 day

**Contingency:**
- If Sub-Agent 1 or 2 blocked, other agents continue (parallel development)
- If Sub-Agent 3 (Build System) blocked, coordinate CMake issues

---

### 11.8 Risk 7: Timeline Slip

**Description:** Stage A takes longer than 2-3 weeks

**Likelihood:** Medium (software estimates are notoriously inaccurate)
**Impact:** Medium (delays Stage B, but not a product failure)

**Mitigation:**
1. Parallel development (Module 1, 2, 3 simultaneously)
2. Weekly progress reviews with Product Manager
3. Cut scope if needed (e.g., defer Linux to Stage B)

**Contingency:**
- If timeline slips, prioritize macOS + C API (core deliverable)
- Linux support can be added later (not blocking)

---

## 12. Timeline & Milestones

### 12.1 Overall Timeline

**Estimated Duration:** 2-3 weeks (with parallel sub-agents)

```
Week 1: Parallel Development
├── Day 1-2: Sub-Agent spawning, setup
├── Day 3-5: Module implementation
└── Day 6-7: Unit testing, PR reviews

Week 2: Integration & Polish
├── Day 8-9: Sub-Agent 4 (C API) implementation
├── Day 10-11: Integration testing
├── Day 12-13: Memory testing, bug fixes
└── Day 14: Documentation, release prep

Week 3 (Buffer): Contingency
└── Buffer for unexpected issues
```

### 12.2 Milestones

**Milestone 1: Parallel Modules Complete (End of Week 1)**
- [ ] Module 1 (Recorder) merged to `v3-development`
- [ ] Module 2 (Transcriber) merged to `v3-development`
- [ ] Module 3 (Build System) functional (CMake builds on macOS)
- [ ] Unit tests pass for Module 1 + 2

**Milestone 2: Integration Complete (Day 10)**
- [ ] Module 4 (C API) merged to `v3-development`
- [ ] Integration test passes (record → transcribe)
- [ ] Memory tests pass (valgrind clean)

**Milestone 3: Stage A Ready (Day 14)**
- [ ] All acceptance criteria met (see Section 13)
- [ ] Documentation complete (README, API docs, examples)
- [ ] Artifacts ready (libraries, test executables)
- [ ] Tagged as `v3.0.0-stage-a`

---

## 13. Definition of Done

### 13.1 Stage A Completion Checklist

**Code:**
- [ ] `src/audio/` module complete (Module 1)
- [ ] `src/transcription/` module complete (Module 2)
- [ ] `src/api/` C bridge complete (Module 4)
- [ ] `include/braindump.h` finalized (public C API)
- [ ] All files have copyright headers (MIT license)
- [ ] All functions documented in headers (Doxygen-compatible)

**Tests:**
- [ ] `test_recorder` passes on macOS
- [ ] `test_transcriber` passes on macOS
- [ ] `test_integration` passes on macOS
- [ ] Valgrind reports no leaks (all tests)
- [ ] All tests automated in CMake (`ctest`)

**Build:**
- [ ] CMake builds on macOS (Metal GPU enabled)
- [ ] CMake builds on Linux (best effort, CPU fallback)
- [ ] Metal GPU works on Mac (verified via system monitor)
- [ ] CPU fallback works on Linux (verified in VM)
- [ ] `make test` runs all tests successfully

**Documentation:**
- [ ] `README.md` with build instructions
- [ ] API reference in header files (`include/braindump.h`)
- [ ] Architecture diagram included (`docs/architecture.png`)
- [ ] Example usage code provided (`examples/basic_usage.c`)
- [ ] Migration notes from V2 C1 (this design proposal)

**Artifacts:**
- [ ] `libbraindump.dylib` (macOS shared library)
- [ ] `libbraindump.so` (Linux shared library, if applicable)
- [ ] Test executables (3 files: `test_recorder`, `test_transcriber`, `test_integration`)
- [ ] Whisper model download script (`scripts/download_models.sh`)
- [ ] Release tarball (source + prebuilt libraries)

**Performance:**
- [ ] Library size <2MB (stripped)
- [ ] Memory usage <50MB (during recording + transcription)
- [ ] Transcription <2 seconds for 10 seconds audio (M2 + Metal)
- [ ] Zero compiler warnings (`-Wall -Wextra -Werror`)

**Git:**
- [ ] Clean git history (no "WIP" or "fix typo" commits)
- [ ] All branches merged to `v3-development`
- [ ] Tagged as `v3.0.0-stage-a`
- [ ] Release notes written (`CHANGELOG.md` updated)

---

### 13.2 Acceptance Sign-Off

**Stage A is complete when:**

1. **Orchestrator (Claude Code) Approves:**
   - All acceptance criteria met
   - All tests passing
   - Code quality standards enforced
   - Documentation complete

2. **Product Manager (IamCodio) Approves:**
   - Strategic goals met (Bell Labs philosophy, community gift)
   - Performance targets achieved
   - Timeline acceptable
   - Ready for Stage B planning

**Sign-Off Format:**
```
Stage A Completion - Sign-Off

Orchestrator: ✓ Approved
- All tests passing (macOS)
- Zero memory leaks
- API documented
- Performance targets met

Product Manager: ✓ Approved
- Strategic goals achieved
- Timeline acceptable (X weeks)
- Ready for Stage B frontend development

Date: YYYY-MM-DD
Tag: v3.0.0-stage-a
```

---

## 14. Open Questions for Product Team

### 14.1 Decision Points Requiring Input

**Question 1: Whisper.cpp Integration**
- **Recommendation:** Git submodule (per Decision 5.1)
- **Alternatives:** System dependency, hybrid approach
- **Impact:** Build reproducibility, maintenance burden, developer experience
- **Request:** Approve recommendation or request alternative

**Question 2: Linux Support Priority**
- **Recommendation:** Nice-to-have (best effort, per Decision 5.2)
- **Alternatives:** Must-have (block Stage A), defer to Stage B
- **Impact:** Timeline, testing burden, platform coverage
- **Request:** Approve recommendation or adjust priority

**Question 3: Frontend Target**
- **Recommendation:** Agnostic C API (per Decision 5.3)
- **Alternatives:** Optimize for Tauri (Rust FFI), optimize for Swift
- **Impact:** API design, Stage B flexibility
- **Request:** Confirm agnostic design or specify frontend preference

**Question 4: V2 C1 Archival**
- **Recommendation:** Branch in main repo (per feedback)
- **Implementation:** `archive/v2-electron` branch
- **Request:** Confirm approval

**Question 5: Timeline Expectations**
- **Estimate:** 2-3 weeks (with parallel sub-agents)
- **Buffer:** Week 3 for unexpected issues
- **Request:** Confirm timeline acceptable or adjust expectations

**Question 6: Stage A Scope Adjustments**
- **Current Scope:** Modules 1, 2, 3 (Recorder, Transcriber, C API)
- **Optional Additions:** Database integration, configuration system, logging
- **Request:** Confirm scope or request additions

---

### 14.2 Clarifications Needed

**Clarification 1: Model Distribution**
- **Question:** Should we include ggml-base.bin in repository, or download on first use?
- **Context:** Model is 141MB (large for git), but required for functionality
- **Options:**
  - A) Include in repo (convenient, but large)
  - B) Download script (smaller repo, requires internet)
  - C) Git LFS (best of both, but requires LFS setup)
- **Request:** Choose option A, B, or C

**Clarification 2: Logging System**
- **Question:** Should Stage A include logging (e.g., error logs, debug output)?
- **Context:** V2 C1 had winston logging, useful for debugging
- **Options:**
  - A) No logging (defer to Stage B frontend)
  - B) Simple stderr logging (printf-style)
  - C) Structured logging (e.g., spdlog library)
- **Request:** Choose option A, B, or C

**Clarification 3: Configuration System**
- **Question:** Should Stage A support configuration (e.g., model path, output directory)?
- **Context:** V2 C1 had config files (default.json, development.json)
- **Options:**
  - A) No config (hardcoded defaults, paths via API)
  - B) Simple config file (JSON or YAML)
  - C) Defer to Stage B frontend
- **Request:** Choose option A, B, or C

**Clarification 4: Error Reporting Detail**
- **Question:** How verbose should error codes be?
- **Context:** C API returns error codes, but no exception messages
- **Options:**
  - A) Simple error codes only (e.g., `BD_ERROR_FILE_IO`)
  - B) Error codes + last error message (e.g., `bd_get_last_error()`)
  - C) Defer detailed errors to Stage B frontend
- **Request:** Choose option A, B, or C

---

## 15. Approval Sign-Off

### 15.1 Document Review

**This design proposal requires approval from:**

1. **Product Manager (IamCodio):**
   - Strategic alignment confirmed
   - Scope approved
   - Timeline acceptable
   - Decision matrix reviewed

2. **Product Development Manager (if different):**
   - Technical approach validated
   - Risk analysis reviewed
   - Resource allocation approved

**Review Process:**
1. Read this document in full
2. Annotate with feedback (comments, questions, concerns)
3. Review Decision Matrix (Section 5) - approve recommendations or request alternatives
4. Review Open Questions (Section 14) - provide answers
5. Sign off below when ready to proceed

---

### 15.2 Approval Form

```
DESIGN PROPOSAL APPROVAL - V3.0 Stage A

Document Version: 1.0
Date Reviewed: _______________

PRODUCT MANAGER (IamCodio)
☐ Approved - Proceed with implementation as proposed
☐ Approved with modifications (see feedback below)
☐ Rejected - Revise and resubmit

Signature: _______________  Date: _______________

Feedback/Modifications:
_________________________________________________________
_________________________________________________________
_________________________________________________________

PRODUCT DEVELOPMENT MANAGER
☐ Approved - Technical approach validated
☐ Approved with modifications (see feedback below)
☐ Rejected - Revise and resubmit

Signature: _______________  Date: _______________

Feedback/Modifications:
_________________________________________________________
_________________________________________________________
_________________________________________________________

DECISION MATRIX APPROVALS (Section 5):
☐ Whisper.cpp Integration: [Approved / Modify]
☐ Linux Support Priority: [Approved / Modify]
☐ Frontend Target: [Approved / Modify]
☐ V2 C1 Archival: [Approved / Modify]

OPEN QUESTIONS ANSWERS (Section 14):
- Model Distribution: [Option A / B / C]
- Logging System: [Option A / B / C]
- Configuration System: [Option A / B / C]
- Error Reporting: [Option A / B / C]

TIMELINE APPROVAL:
☐ 2-3 weeks acceptable
☐ Adjust timeline to: _____ weeks

NEXT STEPS AFTER APPROVAL:
1. Orchestrator creates git branches (Section 6.2)
2. Orchestrator spawns Sub-Agents 1, 2, 3 (Section 8.1)
3. Weekly progress reports to Product Manager
4. Stage A completion review (Section 13.2)
```

---

## 16. Next Steps (Post-Approval)

### 16.1 Immediate Actions

**After Product Manager approves this proposal:**

1. **Git Setup** (Day 1):
   - Tag V2 C1 as `v2.5.0-beta1-archived`
   - Create `archive/v2-electron` branch
   - Create `v3-development` branch
   - Create feature branches (`stage-a-*`)

2. **Sub-Agent Spawning** (Day 1-2):
   - Spawn Sub-Agent 1 (Audio Engineer)
   - Spawn Sub-Agent 2 (Transcription Expert)
   - Spawn Sub-Agent 3 (DevOps Engineer)
   - Provide each with PRD sections + V2 C1 references

3. **Monitoring Setup** (Day 2):
   - Daily standup protocol (async progress updates)
   - Code review process (PR template, approval workflow)
   - CI/CD setup (optional, GitHub Actions)

### 16.2 Weekly Progress Reports

**Format:**
```
Week N Progress Report - V3.0 Stage A

Module 1 (Audio Recorder):
- Status: [In Progress / Code Review / Merged]
- Blockers: [None / List blockers]
- Next Steps: [...]

Module 2 (Transcriber):
- Status: [...]
- Blockers: [...]
- Next Steps: [...]

Module 3 (Build System):
- Status: [...]
- Blockers: [...]
- Next Steps: [...]

Module 4 (C API):
- Status: [Not Started / Waiting for Module 1+2 / ...]
- Blockers: [...]
- Next Steps: [...]

Risks/Concerns:
- [Any new risks identified]

Timeline:
- On Track: [Yes / No]
- Estimated Completion: [Date]

Questions for Product Manager:
- [Any decisions needed]
```

---

## 17. Appendix

### 17.1 Reference Documents

1. **PRD-v3.0-STAGE-A.md** - Primary requirements document
2. **V2 C1 Archive** - `archive/phase-c1-electron/` (for reference)
3. **CLAUDE.md** - Project-level instructions
4. **CHANGELOG.md** - Historical context (V1 → V2 progression)

### 17.2 External Resources

1. **PortAudio Documentation:** http://portaudio.com/docs/
2. **whisper.cpp Repository:** https://github.com/ggerganov/whisper.cpp
3. **CMake Documentation:** https://cmake.org/documentation/
4. **Valgrind Manual:** https://valgrind.org/docs/manual/
5. **C++ Core Guidelines:** https://isocpp.github.io/CppCoreGuidelines/

### 17.3 Contact Information

**Product Manager:** IamCodio
**Lead Orchestrator:** Claude Code
**Technical Advisor:** Claude (system prompt provider)

**Escalation Path:**
1. Technical blockers → Ask Technical Advisor
2. Requirements unclear → Ask Product Manager
3. Sub-agent blocked → Orchestrator reassigns
4. External dependencies missing → Notify PM

---

## 18. Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-07 | Claude Code | Initial design proposal |

---

**END OF DESIGN PROPOSAL**

---

## Product Team: Please Review and Approve

This document is now ready for your review. Please:

1. **Read thoroughly** (focus on Sections 3-5, 8, 14)
2. **Annotate with feedback** (questions, concerns, suggestions)
3. **Answer open questions** (Section 14)
4. **Sign off** (Section 15.2) when ready to proceed

**Estimated Review Time:** 45-60 minutes

**Questions?** Contact Lead Orchestrator (Claude Code) for clarifications.

---

Thank you for your partnership in building BrainDump V3.0 as a gift to the mental health community. 🧠💙
