# BrainDump Voice Processor

**SuperWhisper Killer** - A 100% local, privacy-first voice-to-markdown transcription system.

## What Is This?

Replace expensive cloud transcription services (€132/year) with free, local, Metal-accelerated speech-to-text processing.

**Voice input → WAV recording → Whisper C++ transcription → Markdown output**

## Why This Matters

- **Privacy First:** 100% local processing, your voice data never leaves your Mac
- **Zero Cost:** No subscriptions, no API fees, free forever
- **Fast:** 436ms to transcribe 11 seconds (25× faster than real-time)
- **Reliable:** Metal GPU acceleration on M-series chips
- **User Owned:** You control your data, your workflow, your tools

## Features

✅ Keyboard shortcut activation (Ctrl+Y)  
✅ Real-time voice recording (PyAudio)  
✅ Whisper C++ transcription (Metal GPU)  
✅ Markdown formatted output  
✅ Automatic file organization  
✅ Zero external dependencies  

## Requirements

- macOS (tested on M2 MacBook Air)
- Homebrew installed
- Python 3.12+
- Node.js 18+

## Quick Start

### 1. Install System Dependencies

```bash
# Whisper C++ (transcription engine)
brew install whisper-cpp

# PortAudio (audio library)
brew install portaudio

# UV (Python package manager)
brew install uv
```

### 2. Clone & Setup

```bash
git clone https://github.com/IAMCODIO/IAC-30-brain-dump-voice-processor.git
cd IAC-30-brain-dump-voice-processor

# Python dependencies
uv venv
source .venv/bin/activate
uv pip install pyaudio

# Node dependencies
npm install
```

### 3. Download Whisper Model

```bash
# Create models directory
mkdir -p models

# Download base model (English)
curl -L -o models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

### 4. Run

```bash
npm start
```

Press **Ctrl+Y** to start/stop recording. Transcripts saved to `outputs/transcripts/`.

## Architecture

```
User Input (Ctrl+Y)
    ↓
Electron App (main.js)
    ↓
Python Recorder (recorder.py) → WAV file
    ↓
Whisper C++ (transcribe.py) → Raw text
    ↓
Markdown Formatter → Clean output
    ↓
outputs/transcripts/transcript_TIMESTAMP.md
```

## Project Structure

```
├── main.js              # Electron main process
├── recorder.py          # PyAudio voice recorder
├── transcribe.py        # Whisper CLI wrapper
├── index.html           # UI
├── models/              # Whisper models (.bin files)
├── outputs/
│   ├── audio/          # Recorded WAV files
│   └── transcripts/    # Generated markdown
├── docs/
│   └── ARCHITECTURE_V2.md  # Detailed system design
└── src/
    └── python/         # Python modules
```

## Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Transcription Speed | 436ms / 11s | 25× faster than real-time |
| Recording Latency | <100ms | Near-instant start |
| CPU Usage | <2% | During recording |
| GPU Usage | ~30% | Metal acceleration |
| Cost | €0 | Forever |

## Comparison

| Product | Cost/Year | Speed | Privacy | Offline |
|---------|-----------|-------|---------|---------|
| **BrainDump** | **€0** | **436ms** | **100% Local** | **✅ Yes** |
| SuperWhisper | €132 | Unknown | Cloud-based | ❌ No |
| Otter.ai | €120+ | Variable | Cloud-based | ❌ No |

## Documentation

- [ARCHITECTURE_V2.md](docs/ARCHITECTURE_V2.md) - Complete system design
- [BRAINDUMP-PRD-v2.md](BRAINDUMP-PRD-v2.md) - Product requirements
- [whisper-cli-help.txt](docs/whisper-cli-help.txt) - Whisper C++ reference

## Roadmap

**Phase 1 (MVP) - ✅ Complete**
- Voice recording with keyboard shortcut
- Whisper C++ transcription
- Markdown output generation

**Phase 2 (Optional)**
- LLM cleanup integration (Ollama/OpenRouter)
- Settings panel for customization
- .app bundle packaging

**Phase 3 (Future)**
- Advanced RAG processing
- Multi-language support
- Windows/Linux ports

## Known Limitations

- macOS only (M-series chips recommended)
- English language optimized
- Requires local setup (not instant)
- No real-time waveform visualization yet

## Philosophy

This is not just a transcription tool. This is about:
- **Privacy:** Your thoughts, your data, your control
- **Ownership:** No vendor lock-in, no subscriptions
- **Freedom:** Build tools that work for you, not against you

One-to-many scales. Services don't.

## Credits

**Built by:** Codio (IAMCODIO)  
**AI Pair Programmer:** Claude Sonnet 4.5 (Anthropic)  
**Development Time:** ~6 hours  
**Built in:** Dublin, Ireland  
**Date:** October 2025  

## License

MIT License - Use freely, modify freely, share freely.

## Support

Questions? Open an issue. Want to contribute? PRs welcome.

Built with care. Shipped with pride. Documented for the future.

---

**"The best products solve your own problems. The best documentation teaches while you build."**

🚀 First baby delivered. Many more to come.
