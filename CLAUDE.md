# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BrainDump Voice Processor** - A 100% local, privacy-first voice-to-markdown transcription system that replaces expensive cloud services like SuperWhisper.

**Core Flow:** User presses Ctrl+Y → Records audio → Whisper C++ transcribes (Metal GPU) → Outputs formatted markdown

## Essential Commands

### Setup
```bash
# Initial setup (macOS only)
brew install whisper-cpp portaudio uv

# Python environment (MUST use uv per project standards)
uv venv
source .venv/bin/activate
uv pip install pyaudio

# Node dependencies
npm install

# Download Whisper model (required before first use)
mkdir -p models
curl -L -o models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

### Development
```bash
# Run the application
npm start

# Test transcription independently
python test_transcriber.py

# Test recorder independently
python recorder.py  # Then type "start" and "stop" commands
```

### Testing
```bash
# Manual transcription test with JFK sample
whisper-cli -m models/ggml-base.bin \
  -f /opt/homebrew/Cellar/whisper-cpp/1.8.2/share/whisper-cpp/jfk.wav \
  -otxt -nt
```

## Architecture

### Inter-Process Communication Flow
1. **Electron (main.js)** - Desktop app shell
   - Registers global keyboard shortcut (Ctrl+Y)
   - Spawns persistent Python recorder process
   - Communicates via stdin/stdout protocol
   - Triggers transcription on recording completion

2. **Recorder (recorder.py)** - Audio capture daemon
   - Listens for stdin commands: `start`, `stop`, `quit`
   - Uses PyAudio callbacks for real-time capture
   - Outputs protocol messages: `READY`, `RECORDING_STARTED`, `RECORDING_STOPPED:<path>`
   - Saves WAV files to `outputs/audio/recording_TIMESTAMP.wav`

3. **Transcriber (transcribe.py + whisper_transcriber.py)** - Batch processor
   - Spawned per-transcription (not persistent)
   - Calls whisper-cli via subprocess
   - Formats raw text into markdown with metadata
   - Saves to `outputs/transcripts/transcript_TIMESTAMP.md`

### Key Design Patterns
- **Process Separation:** Electron ↔ Python via child_process stdin/stdout
- **Protocol-based IPC:** Line-based text commands, not JSON/binary
- **Callback Audio:** PyAudio stream callback for low-latency capture
- **CLI Wrapping:** Python subprocess wraps Whisper C++ binary
- **Markdown Output:** Structured format with date, filename, content

## Critical Implementation Details

### Python Environment
- **MUST use `uv`** for Python management (project standard)
- **DO NOT use Homebrew** for Python or Node.js
- Virtual environment path: `.venv/bin/python`
- PyAudio requires system PortAudio library

### Whisper Integration
- Uses **whisper-cli** binary (not Python whisper package)
- Model path: `models/ggml-base.bin` (141MB, base English model)
- Metal GPU acceleration enabled by default on M-series Macs
- Flags: `-otxt` (text output), `-nt` (no timestamps)
- Creates `.txt` file alongside audio, which Python wrapper consumes

### Audio Specifications
- Format: WAV, 16-bit PCM, mono, 44.1kHz
- Buffer: 1024 frames (~23ms latency)
- Callback-based recording (non-blocking)

### File Organization
```
outputs/
├── audio/              # WAV recordings (timestamped)
└── transcripts/        # Markdown transcripts (timestamped)
```

## Performance Expectations

- **Transcription:** ~436ms for 11 seconds (25× faster than real-time)
- **Recording latency:** <100ms start time
- **Model load:** ~117ms on M2 chip
- **Metal GPU usage:** ~30% during transcription

## Common Issues

### Recorder won't start
- Check microphone permissions in System Preferences
- Verify PyAudio installation: `python -c "import pyaudio"`
- Test PortAudio: `brew list portaudio`

### Transcription fails
- Verify binary: `which whisper-cli`
- Check model: `ls -lh models/ggml-base.bin` (should be ~141MB)
- Test directly: `whisper-cli -m models/ggml-base.bin -f <audio_file>`

### Keyboard shortcut not working
- Grant Electron accessibility permissions in System Preferences
- Check if another app uses Ctrl+Y
- Verify globalShortcut registration in Electron logs

## Development Philosophy

This project follows the "function over form" principle:
- 100% local processing (no cloud, no APIs)
- Zero cost operation
- Privacy-first design
- Simple, maintainable architecture

**NOT included in MVP:**
- LLM cleanup integration (user pastes to Claude/OpenRouter manually)
- Real-time waveform visualization
- Settings UI
- Multi-language support
- Windows/Linux support

These are intentional scope decisions to keep the MVP focused and reliable.

## Output Format

Generated markdown structure:
```markdown
# Brain Dump Transcript

**Date:** YYYY-MM-DD HH:MM:SS
**Audio File:** recording_YYYY-MM-DD_HH-MM-SS.wav

---

[Transcribed text]
```
