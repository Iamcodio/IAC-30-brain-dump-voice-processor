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

## Configuration

The application uses environment-based configuration via the `config` package. Configuration is loaded from JSON files in the `config/` directory.

### Configuration Files

- **`config/default.json`** - Base configuration (all environments)
- **`config/development.json`** - Development environment overrides
- **`config/production.json`** - Production environment overrides
- **`config/test.json`** - Test environment overrides
- **`config/custom-environment-variables.json`** - Environment variable mappings

### Environment Variables

You can override configuration values using environment variables:

- **`NODE_ENV`** - Environment (development, production, test) - Default: development
- **`LOG_LEVEL`** - Log level (debug, info, warn, error, silent) - Overrides logging.level
- **`SENTRY_DSN`** - Sentry error tracking DSN (optional) - See Error Tracking section below
- **`SENTRY_ENABLED`** - Enable Sentry (true/false) - Default: false

### Running in Different Environments

```bash
# Development (default) - debug logging, metrics disabled
npm start

# Production - warn logging, production paths, Sentry enabled
NODE_ENV=production npm start

# Test - silent logging, test paths
NODE_ENV=test npm start

# Custom log level
LOG_LEVEL=debug npm start
```

### Key Configuration Values

```javascript
// Paths
paths.audioDir              // outputs/audio (dev) | /var/app/braindump/audio (prod)
paths.transcriptDir         // outputs/transcripts (dev) | /var/app/braindump/transcripts (prod)
paths.databaseFile          // src/data/recordings.json (dev) | /var/app/braindump/db/recordings.json (prod)

// Recording
recording.sampleRate        // 44100
recording.channels          // 1
recording.format            // WAV
recording.bitDepth          // 16

// Shortcuts
shortcuts.toggleRecording   // Control+Y

// Window
window.width                // 800
window.height               // 600

// Logging
logging.level               // info (default) | debug (dev) | warn (prod) | silent (test)
```

## Error Tracking (Optional)

BrainDump supports optional error tracking via Sentry for production deployments.

### Why Sentry?

- **Zero errors lost in production** - Track all uncaught exceptions and promise rejections
- **Full context** - Error breadcrumbs show user actions leading to errors
- **Privacy-first** - Sensitive data automatically sanitized before sending
- **Optional** - Disabled by default for local development

### Setup Sentry (Optional)

1. **Create a Sentry project** at https://sentry.io (free tier available)
2. **Copy your DSN** from Project Settings → Client Keys (DSN)
3. **Set environment variables:**

```bash
export SENTRY_ENABLED=true
export SENTRY_DSN=https://your-key@sentry.io/project-id
npm start
```

### Privacy Safeguards

Sentry integration includes automatic data sanitization:

- **File paths sanitized** - User names removed (`/Users/john/` → `/Users/REDACTED/`)
- **No sensitive headers** - Cookies and authorization headers stripped
- **No request data** - Only error messages and stack traces sent
- **Breadcrumbs filtered** - User actions tracked without sensitive data

### Example: Capturing Errors

```javascript
const { captureError } = require('./src/js/error_handler');

try {
  // Your code
} catch (error) {
  captureError(error, {
    tags: { component: 'transcription' },
    extra: { audioPath: '/path/to/file.wav', fileSize: 12345 },
    level: 'error'
  });
}
```

### Disable Sentry

Sentry is **disabled by default** for local development. To explicitly disable:

```bash
export SENTRY_ENABLED=false
# or simply don't set it (defaults to false)
npm start
```

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
