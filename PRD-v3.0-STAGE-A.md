# BrainDump 3.0 - Product Requirements Document
## Stage A: Core Engine Development

**Version:** 3.0.0  
**Date:** 2025-11-07  
**Status:** Ready for Implementation  
**Lead Orchestrator:** Claude Code  
**Development Philosophy:** Bell Labs Unix - Do One Thing Well

---

## ORCHESTRATOR ROLE DEFINITION

**Claude Code - Lead Development Orchestrator**

**Your Role:**
- **NOT** a coder - you are an **orchestrator**
- Spawn and manage sub-agents (audio-engineer, transcription-expert, integration-specialist)
- Ensure sub-agents work in parallel where possible
- Review code for quality, not write it yourself
- Enforce coding standards across all sub-agents
- Coordinate dependencies between modules
- Verify deliverables against acceptance criteria

**Your Responsibilities:**
1. Read this PRD completely before making any decisions
2. Create a detailed implementation plan
3. Identify which tasks can run in parallel
4. Spawn appropriate sub-agents with clear contexts
5. Review all code for modularity and documentation
6. Ensure Bell Labs principles (simple, modular, composable)
7. Run tests and verify deliverables
8. Maintain clean git history with meaningful commits

**You Do NOT:**
- Write implementation code yourself
- Skip documentation
- Allow sub-agents to violate coding standards
- Merge code without tests passing
- Create monolithic modules

---

## PROJECT CONTEXT

**What We're Building:**
A voice recording and transcription engine that serves as the core for multiple platform-specific applications.

**What This Is:**
- Voice-activated RAG (Retrieval-Augmented Generation) application
- Core C++ engine that compiles to shared libraries
- Foundation for native apps on Mac, iOS, Android, Linux
- Open source core that developers can build upon

**What This Is NOT:**
- A complete user-facing application (that's Stage B)
- A web application (no HTML/CSS/JS in this stage)
- A containerized service (bare metal only)

**Target Platforms:**
- macOS (primary development target)
- Linux (Ubuntu 22.04+, Fedora 39+)
- Windows (deferred to later stage)

---

## TECHNICAL PHILOSOPHY

### Bell Labs Unix Principles

**Do One Thing Well:**
Each module has ONE job:
- Recorder: Capture audio → WAV file
- Transcriber: WAV file → Text
- API: Expose functions to other languages

**Make It Composable:**
Modules connect through clean interfaces:
```
recorder.h → transcriber.h → database.h
```

**Keep It Simple:**
- No unnecessary abstractions
- Direct hardware access (no containers)
- Minimal dependencies
- Clear error handling

**Document Everything:**
- Header files are self-documenting
- Function comments explain WHY, not WHAT
- README for build instructions
- Architecture diagrams included

---

## STAGE A OBJECTIVES

**Deliverable:** Working C++ core engine with C API

**Output Artifacts:**
1. `libbraindump.so` (Linux shared library)
2. `libbraindump.dylib` (macOS shared library)
3. Test suite (3 test executables, all passing)
4. API documentation (header files + README)
5. Build system (CMake configuration)

**Success Criteria:**
- Compiles with zero warnings (-Wall -Wextra -Werror)
- All tests pass
- No memory leaks (valgrind clean)
- GPU acceleration works on Mac (Metal)
- CPU fallback works on Linux
- API is C-compatible (no C++ name mangling)

---

## MODULE BREAKDOWN

### Module 1: Audio Recorder
**Purpose:** Capture microphone input, write WAV files

**Technology:**
- C++ (standard: C++17)
- PortAudio library (cross-platform audio I/O)

**Inputs:**
- Start command
- Output file path
- Duration (optional, or manual stop)

**Outputs:**
- WAV file (16kHz, mono, 16-bit PCM)
- Status codes (success/error)

**Interface:**
```cpp
// recorder.h
namespace BrainDump {
    class Recorder {
    public:
        Recorder();
        ~Recorder();
        
        int start(const char* output_path);
        int stop();
        bool is_recording() const;
        
    private:
        struct Impl;
        std::unique_ptr<Impl> pimpl;
    };
}
```

**Dependencies:**
- PortAudio (system library or bundled)
- Standard C++ library only

**Test Harness:**
```bash
./test_recorder output.wav 5
# Records 5 seconds of audio
# Verifies WAV file format
# Plays back audio (optional)
```

**Acceptance Criteria:**
- [ ] Detects default microphone automatically
- [ ] Records 16kHz mono PCM audio
- [ ] Writes valid WAV file with correct headers
- [ ] Handles start/stop cleanly
- [ ] Returns proper error codes
- [ ] No memory leaks
- [ ] Compiles with -Wall -Wextra -Werror

**Files to Create:**
```
src/audio/
├── recorder.h              # Public interface
├── recorder.cpp            # Implementation
├── portaudio_impl.h        # PortAudio wrapper (private)
├── portaudio_impl.cpp      # PortAudio implementation
└── wav_writer.cpp          # WAV file format writer

tests/
└── test_recorder.cpp       # Test harness
```

---

### Module 2: Transcriber
**Purpose:** Convert audio files to text using Whisper

**Technology:**
- C++ (standard: C++17)
- whisper.cpp (Whisper C++ implementation)
- GPU acceleration (Metal on Mac, CUDA on Linux, CPU fallback)

**Inputs:**
- Audio file path (WAV format)
- Model file path (ggml-base.bin)
- Language (default: auto-detect)

**Outputs:**
- Transcript text (UTF-8 string)
- Status codes (success/error)
- Timing information (optional)

**Interface:**
```cpp
// transcriber.h
namespace BrainDump {
    class Transcriber {
    public:
        Transcriber(const char* model_path);
        ~Transcriber();
        
        int transcribe(const char* audio_path, std::string& output);
        bool is_ready() const;
        
    private:
        struct Impl;
        std::unique_ptr<Impl> pimpl;
    };
}
```

**Dependencies:**
- whisper.cpp (git submodule in external/)
- Metal framework (macOS only)
- CUDA libraries (Linux with NVIDIA GPU, optional)

**Test Harness:**
```bash
./test_transcriber models/ggml-base.bin test.wav
# Loads Whisper model
# Transcribes test.wav
# Prints transcript to stdout
# Shows timing statistics
```

**Acceptance Criteria:**
- [ ] Loads ggml-base.bin model successfully
- [ ] Transcribes WAV files accurately
- [ ] Uses Metal GPU on macOS
- [ ] Falls back to CPU gracefully
- [ ] Returns UTF-8 text
- [ ] Handles errors (missing file, corrupt audio)
- [ ] No memory leaks
- [ ] Compiles with -Wall -Wextra -Werror

**Files to Create:**
```
src/transcription/
├── transcriber.h           # Public interface
├── transcriber.cpp         # Implementation
├── whisper_wrapper.h       # Whisper C++ wrapper (private)
└── whisper_wrapper.cpp     # Whisper implementation

tests/
└── test_transcriber.cpp    # Test harness
```

---

### Module 3: C API Bridge
**Purpose:** Expose C interface for language interoperability

**Technology:**
- C++ implementation with extern "C" wrappers
- Opaque pointers for handles
- C-compatible types only

**Why C API:**
- Swift can call C directly (no C++ interop needed)
- Kotlin JNI expects C functions
- Rust FFI works best with C
- Stable ABI (no C++ name mangling)

**Interface:**
```c
// braindump.h
#ifndef BRAINDUMP_H
#define BRAINDUMP_H

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

#endif // BRAINDUMP_H
```

**Memory Management Rules:**
1. Caller creates handles via `*_create()`
2. Caller destroys handles via `*_destroy()`
3. Library allocates strings, caller frees via `bd_free_string()`
4. All functions return error codes (except create/destroy)

**Test Harness:**
```bash
./test_integration
# Creates recorder handle
# Starts recording
# Stops recording
# Creates transcriber handle
# Transcribes audio
# Verifies text output
# Destroys all handles
# Checks for memory leaks
```

**Acceptance Criteria:**
- [ ] Compiles as pure C (gcc -std=c99)
- [ ] No C++ exceptions cross boundary
- [ ] All heap allocations documented
- [ ] Thread-safe (or documented as not)
- [ ] Error codes for all failure modes
- [ ] Test integration passes
- [ ] No memory leaks
- [ ] API documented in header comments

**Files to Create:**
```
include/
├── braindump.h             # Public C API
└── braindump_types.h       # Type definitions

src/api/
├── c_api.cpp               # C API implementation
├── error_handling.cpp      # Error code mapping
└── memory_management.cpp   # String allocation helpers

tests/
└── test_integration.cpp    # Full pipeline test
```

---

## BUILD SYSTEM

### CMake Configuration

**Requirements:**
- CMake 3.15+
- C++17 compiler (clang++ on Mac, g++ on Linux)
- PortAudio development files
- Metal framework (macOS only)

**Build Options:**
```cmake
option(BUILD_TESTS "Build test suite" ON)
option(USE_GPU "Enable GPU acceleration" ON)
option(BUILD_SHARED "Build shared library" ON)
option(BUILD_STATIC "Build static library" OFF)
```

**Platform-Specific Flags:**

macOS:
```cmake
if(APPLE)
    target_compile_definitions(braindump PRIVATE 
        WHISPER_METAL=1
        ACCELERATE_NEW_LAPACK=1
    )
    target_link_libraries(braindump PRIVATE
        "-framework Metal"
        "-framework Foundation"
        "-framework Accelerate"
    )
endif()
```

Linux:
```cmake
if(UNIX AND NOT APPLE)
    # Try CUDA first
    find_package(CUDA)
    if(CUDA_FOUND AND USE_GPU)
        target_compile_definitions(braindump PRIVATE WHISPER_CUBLAS=1)
        target_link_libraries(braindump PRIVATE ${CUDA_LIBRARIES})
    endif()
endif()
```

**Build Commands:**
```bash
# macOS (with Metal)
cmake -B build -DCMAKE_BUILD_TYPE=Release -DUSE_GPU=ON
cmake --build build --parallel

# Linux (CPU only)
cmake -B build -DCMAKE_BUILD_TYPE=Release -DUSE_GPU=OFF
cmake --build build --parallel

# Linux (with CUDA)
cmake -B build -DCMAKE_BUILD_TYPE=Release -DUSE_GPU=ON
cmake --build build --parallel

# Run tests
cd build
ctest --output-on-failure
```

**Output Files:**
```
build/
├── libbraindump.so         # Linux shared library
├── libbraindump.dylib      # macOS shared library
├── test_recorder           # Recorder test
├── test_transcriber        # Transcriber test
└── test_integration        # Integration test
```

---

## CODING STANDARDS

### C++ Style Guide

**Header Guards:**
```cpp
#ifndef BRAINDUMP_MODULE_H
#define BRAINDUMP_MODULE_H
// ... content ...
#endif // BRAINDUMP_MODULE_H
```

**Naming Conventions:**
```cpp
// Classes: PascalCase
class VoiceRecorder { };

// Functions: snake_case
int start_recording();

// Private members: snake_case with trailing underscore
class Example {
private:
    int buffer_size_;
    std::vector<float> samples_;
};

// Constants: SCREAMING_SNAKE_CASE
const int MAX_BUFFER_SIZE = 4096;
```

**Include Order:**
```cpp
// 1. Module header (if implementation file)
#include "recorder.h"

// 2. C++ standard library
#include <memory>
#include <vector>
#include <string>

// 3. Third-party libraries
#include <portaudio.h>

// 4. Project headers
#include "wav_writer.h"
```

**Error Handling:**
```cpp
// Return error codes, don't throw across API boundary
int start_recording(const char* path) {
    if (!path) {
        return BD_ERROR_INVALID_HANDLE;
    }
    
    try {
        // C++ exceptions OK internally
        recorder_impl_->start(path);
        return BD_SUCCESS;
    } catch (const std::exception& e) {
        log_error("Recording failed: %s", e.what());
        return BD_ERROR_INIT;
    }
}
```

**Memory Management:**
```cpp
// Use RAII (Resource Acquisition Is Initialization)
class Recorder {
public:
    Recorder() {
        // Acquire resources in constructor
        stream_ = open_audio_stream();
    }
    
    ~Recorder() {
        // Release resources in destructor
        close_audio_stream(stream_);
    }
    
private:
    AudioStream* stream_;
};

// Use smart pointers
std::unique_ptr<Impl> pimpl_;
std::shared_ptr<Buffer> buffer_;
```

**Documentation:**
```cpp
/**
 * Start audio recording to specified file path.
 * 
 * Opens the default microphone and begins capturing audio.
 * Audio is saved in WAV format (16kHz, mono, 16-bit PCM).
 * 
 * @param output_path Absolute path to output WAV file
 * @return BD_SUCCESS on success, error code on failure
 * 
 * @note Caller must call stop() to finalize the file
 * @note Function returns immediately, recording happens in background
 */
int start(const char* output_path);
```

---

## DEPENDENCY MANAGEMENT

### External Dependencies

**PortAudio:**
```bash
# macOS
brew install portaudio

# Linux (Ubuntu/Debian)
sudo apt-get install portaudio19-dev

# Linux (Fedora)
sudo dnf install portaudio-devel
```

**Whisper.cpp:**
```bash
# Add as git submodule
git submodule add https://github.com/ggerganov/whisper.cpp external/whisper.cpp
git submodule update --init --recursive
```

**CMake Integration:**
```cmake
# PortAudio
find_package(PkgConfig REQUIRED)
pkg_check_modules(PORTAUDIO REQUIRED portaudio-2.0)

target_include_directories(braindump PRIVATE ${PORTAUDIO_INCLUDE_DIRS})
target_link_libraries(braindump PRIVATE ${PORTAUDIO_LIBRARIES})

# Whisper.cpp
add_subdirectory(external/whisper.cpp)
target_link_libraries(braindump PRIVATE whisper)
```

---

## TESTING REQUIREMENTS

### Test Coverage Goals
- **Unit tests:** Each module independently
- **Integration test:** Full pipeline (record → transcribe)
- **Memory tests:** Valgrind clean (no leaks, no errors)
- **Performance tests:** Transcription speed benchmarks

### Test 1: Recorder Module
```cpp
// tests/test_recorder.cpp
int main(int argc, char** argv) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <output.wav> <duration_seconds>\n", argv[0]);
        return 1;
    }
    
    const char* output_path = argv[1];
    int duration = atoi(argv[2]);
    
    // Create recorder
    BDRecorder* recorder = bd_recorder_create();
    assert(recorder != nullptr);
    
    // Start recording
    printf("Recording to %s for %d seconds...\n", output_path, duration);
    BDError err = bd_recorder_start(recorder, output_path);
    assert(err == BD_SUCCESS);
    
    // Wait
    sleep(duration);
    
    // Stop recording
    err = bd_recorder_stop(recorder);
    assert(err == BD_SUCCESS);
    
    // Cleanup
    bd_recorder_destroy(recorder);
    
    // Verify file exists
    FILE* f = fopen(output_path, "rb");
    assert(f != nullptr);
    fclose(f);
    
    printf("✓ Test passed\n");
    return 0;
}
```

### Test 2: Transcriber Module
```cpp
// tests/test_transcriber.cpp
int main(int argc, char** argv) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <model_path> <audio_path>\n", argv[0]);
        return 1;
    }
    
    const char* model_path = argv[1];
    const char* audio_path = argv[2];
    
    // Create transcriber
    printf("Loading model: %s\n", model_path);
    BDTranscriber* transcriber = bd_transcriber_create(model_path);
    assert(transcriber != nullptr);
    assert(bd_transcriber_is_ready(transcriber));
    
    // Transcribe audio
    printf("Transcribing: %s\n", audio_path);
    char* transcript = nullptr;
    BDError err = bd_transcribe_file(transcriber, audio_path, &transcript);
    assert(err == BD_SUCCESS);
    assert(transcript != nullptr);
    
    // Print result
    printf("Transcript: %s\n", transcript);
    
    // Cleanup
    bd_free_string(transcript);
    bd_transcriber_destroy(transcriber);
    
    printf("✓ Test passed\n");
    return 0;
}
```

### Test 3: Integration Test
```cpp
// tests/test_integration.cpp
int main() {
    const char* audio_file = "/tmp/test_recording.wav";
    const char* model_file = "models/ggml-base.bin";
    
    printf("=== BrainDump Core Integration Test ===\n\n");
    
    // Test 1: Record audio
    printf("Test 1: Recording audio...\n");
    BDRecorder* recorder = bd_recorder_create();
    assert(recorder != nullptr);
    
    BDError err = bd_recorder_start(recorder, audio_file);
    assert(err == BD_SUCCESS);
    
    sleep(5); // Record for 5 seconds
    
    err = bd_recorder_stop(recorder);
    assert(err == BD_SUCCESS);
    bd_recorder_destroy(recorder);
    printf("✓ Recording complete\n\n");
    
    // Test 2: Transcribe audio
    printf("Test 2: Transcribing audio...\n");
    BDTranscriber* transcriber = bd_transcriber_create(model_file);
    assert(transcriber != nullptr);
    
    char* transcript = nullptr;
    err = bd_transcribe_file(transcriber, audio_file, &transcript);
    assert(err == BD_SUCCESS);
    assert(transcript != nullptr);
    
    printf("✓ Transcript: %s\n\n", transcript);
    
    // Cleanup
    bd_free_string(transcript);
    bd_transcriber_destroy(transcriber);
    
    printf("=== All Tests Passed ===\n");
    return 0;
}
```

### Memory Test
```bash
# Run with valgrind
valgrind --leak-check=full \
         --show-leak-kinds=all \
         --track-origins=yes \
         ./test_integration

# Expected output:
# ==12345== HEAP SUMMARY:
# ==12345==     in use at exit: 0 bytes in 0 blocks
# ==12345==   total heap usage: 1,234 allocs, 1,234 frees, 45,678 bytes allocated
# ==12345== 
# ==12345== All heap blocks were freed -- no leaks are possible
```

---

## ORCHESTRATION WORKFLOW

### Phase 1: Parallel Development (Week 1)

**Sub-Agent 1: Audio Engineer**
- **Task:** Build Module 1 (Recorder)
- **Context:** Voice recording expert, PortAudio specialist
- **Deliverable:** Working recorder with test harness
- **Blockers:** None (can start immediately)

**Sub-Agent 2: Transcription Expert**
- **Task:** Build Module 2 (Transcriber)
- **Context:** ML engineer, Whisper specialist
- **Deliverable:** Working transcriber with test harness
- **Blockers:** None (can start immediately)

**Sub-Agent 3: DevOps Engineer**
- **Task:** CMake build system setup
- **Context:** Build systems expert, cross-platform specialist
- **Deliverable:** Working CMake configuration
- **Blockers:** None (can start immediately)

**Orchestrator Actions:**
1. Spawn all 3 sub-agents simultaneously
2. Provide each with their section of this PRD
3. Monitor progress, don't interfere unless blocked
4. Review code as it's committed
5. Ensure coding standards followed

### Phase 2: Integration (Week 2)

**Sub-Agent 4: Integration Specialist**
- **Task:** Build Module 3 (C API Bridge)
- **Context:** API design expert, C/C++ interop specialist
- **Deliverable:** C API with integration test
- **Blockers:** Needs Module 1 + 2 complete

**Orchestrator Actions:**
1. Verify Module 1 + 2 tests pass
2. Spawn integration specialist
3. Review API design before implementation
4. Run integration tests
5. Verify memory safety (valgrind)

### Phase 3: Documentation & Delivery

**All Sub-Agents:**
- Write API documentation
- Update README.md
- Create example code
- Record demo video (optional)

**Orchestrator Actions:**
1. Collect all documentation
2. Verify build on clean system
3. Run full test suite
4. Tag release (v3.0.0-alpha)
5. Prepare handoff to Stage B

---

## GIT WORKFLOW

### Branch Strategy
```
main (protected)
├── stage-a-audio-recorder (Sub-Agent 1)
├── stage-a-transcriber (Sub-Agent 2)
├── stage-a-build-system (Sub-Agent 3)
└── stage-a-c-api (Sub-Agent 4)
```

### Commit Message Format
```
[module] Brief description

Detailed explanation of what changed and why.

- Bullet points for key changes
- Reference issue numbers: #1, #2

Signed-off-by: Sub-Agent Name <role@braindump.dev>
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Module
- [ ] Audio Recorder
- [ ] Transcriber
- [ ] C API
- [ ] Build System

## Tests
- [ ] Unit tests pass
- [ ] Integration test passes
- [ ] No memory leaks
- [ ] Compiles with -Werror

## Documentation
- [ ] Header comments updated
- [ ] README updated if needed
- [ ] Example code provided

## Checklist
- [ ] Code follows style guide
- [ ] No compiler warnings
- [ ] Git history is clean
```

---

## SUCCESS METRICS

### Code Quality
- Zero compiler warnings (-Wall -Wextra -Werror)
- Zero memory leaks (valgrind clean)
- 100% function documentation in headers
- Clean git history (no "fix typo" commits)

### Performance
- Record audio with <1% CPU usage
- Transcribe 10 seconds of audio in <2 seconds (Mac M2 + Metal)
- Transcribe 10 seconds of audio in <5 seconds (Linux CPU only)
- Library size: <2MB stripped

### Functionality
- All 3 test harnesses pass
- Integration test completes end-to-end
- GPU acceleration verified on Mac
- CPU fallback works on Linux

---

## DELIVERABLE CHECKLIST

**Before marking Stage A complete:**

### Code
- [ ] `src/audio/` module complete
- [ ] `src/transcription/` module complete
- [ ] `src/api/` C bridge complete
- [ ] `include/braindump.h` finalized
- [ ] All files have copyright headers
- [ ] All functions documented in headers

### Tests
- [ ] `test_recorder` passes
- [ ] `test_transcriber` passes
- [ ] `test_integration` passes
- [ ] Valgrind reports no leaks
- [ ] All tests automated in CMake

### Build
- [ ] CMake builds on macOS
- [ ] CMake builds on Linux
- [ ] Metal GPU works on Mac
- [ ] CPU fallback works on Linux
- [ ] `make test` runs all tests

### Documentation
- [ ] README.md with build instructions
- [ ] API reference in header files
- [ ] Architecture diagram included
- [ ] Example usage code provided

### Artifacts
- [ ] `libbraindump.dylib` (macOS)
- [ ] `libbraindump.so` (Linux)
- [ ] Test executables (3 files)
- [ ] Whisper model downloaded (models/ggml-base.bin)

---

## RISKS & MITIGATION

### Risk 1: PortAudio Platform Issues
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Test on multiple Linux distros early
- Have fallback to ALSA (Linux only) if needed
- Document known issues clearly

### Risk 2: Whisper Model Loading Slow
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:**
- Load model once, keep in memory
- Offer smaller models (ggml-tiny.bin)
- Document expected load times

### Risk 3: GPU Acceleration Not Working
**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**
- CPU fallback always available
- Clear documentation on GPU setup
- Log which backend is being used

### Risk 4: Memory Leaks in C API
**Likelihood:** Low  
**Impact:** High  
**Mitigation:**
- Mandatory valgrind checks before merge
- Clear ownership rules documented
- Helper functions for cleanup

---

## STAGE A DEFINITION OF DONE

**Stage A is complete when:**

1. All code compiles without warnings
2. All tests pass on macOS and Linux
3. No memory leaks detected
4. API documentation complete
5. README has build instructions
6. Example code demonstrates full pipeline
7. Git tagged as v3.0.0-stage-a
8. Artifacts uploaded to releases

**Estimated Effort:** 2-3 weeks with parallel sub-agents

**Next Stage:** Stage B - Platform Frontends (Swift, Kotlin, Tauri)

---

## APPENDIX: EXAMPLE USAGE

### C API Example
```c
#include "braindump.h"
#include <stdio.h>
#include <unistd.h>

int main() {
    // Record audio
    BDRecorder* recorder = bd_recorder_create();
    bd_recorder_start(recorder, "recording.wav");
    sleep(5); // Record for 5 seconds
    bd_recorder_stop(recorder);
    bd_recorder_destroy(recorder);
    
    // Transcribe audio
    BDTranscriber* transcriber = bd_transcriber_create("models/ggml-base.bin");
    char* transcript = NULL;
    bd_transcribe_file(transcriber, "recording.wav", &transcript);
    
    printf("Transcript: %s\n", transcript);
    
    // Cleanup
    bd_free_string(transcript);
    bd_transcriber_destroy(transcriber);
    
    return 0;
}
```

### Swift Example (Stage B Preview)
```swift
import Foundation

let recorder = bd_recorder_create()
bd_recorder_start(recorder, "recording.wav")
sleep(5)
bd_recorder_stop(recorder)
bd_recorder_destroy(recorder)

let transcriber = bd_transcriber_create("models/ggml-base.bin")
var transcript: UnsafeMutablePointer<CChar>? = nil
bd_transcribe_file(transcriber, "recording.wav", &transcript)

if let text = transcript {
    print("Transcript: \(String(cString: text))")
    bd_free_string(text)
}
bd_transcriber_destroy(transcriber)
```

---

## CONTACT & ESCALATION

**Product Manager:** IamCodio  
**Lead Orchestrator:** Claude Code (you!)  
**Technical Advisor:** Claude (me, system prompt provider)

**Escalation Path:**
1. Technical blockers → Ask Technical Advisor for guidance
2. Requirements unclear → Ask Product Manager for clarification
3. Sub-agent blocked → Orchestrator reassigns or assists
4. External dependencies missing → Document and notify PM

---

**Document Version:** 3.0.0  
**Status:** Approved for Implementation  
**Date:** 2025-11-07  
**Approved By:** Product Manager (IamCodio)

**Ready for Claude Code to begin orchestration.**
