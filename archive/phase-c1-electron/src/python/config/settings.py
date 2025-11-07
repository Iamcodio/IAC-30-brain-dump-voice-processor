"""
Configuration settings for BrainDump Voice Processor.

All magic numbers and hardcoded values are centralized here using
immutable dataclasses for type safety and clarity.
"""

from dataclasses import dataclass
from typing import FrozenSet, Tuple


@dataclass(frozen=True)
class AudioSettings:
    """
    Audio recording configuration.

    Defines PyAudio stream parameters for WAV file generation:
    - 16-bit PCM mono audio at 44.1kHz
    - 1024 frame buffer for ~23ms latency
    """
    SAMPLE_RATE: int = 44100
    CHANNELS: int = 1
    FORMAT_PAUDIO: int = 8  # pyaudio.paInt16 (avoiding import dependency)
    SAMPLE_WIDTH: int = 2  # 16-bit = 2 bytes
    FRAMES_PER_BUFFER: int = 1024
    STREAM_CONTINUE: int = 0  # pyaudio.paContinue
    STREAM_ABORT: int = 2  # pyaudio.paAbort


@dataclass(frozen=True)
class TranscriptionSettings:
    """
    Whisper transcription configuration.

    Controls Whisper C++ binary execution:
    - Model path relative to project root
    - 5-minute timeout for long recordings
    - English-only mode to prevent misdetection (Irish → Welsh)
    """
    MODEL_PATH: str = "models/ggml-base.bin"
    WHISPER_BINARY: str = "whisper-cli"
    TIMEOUT_SECONDS: int = 300  # 5 minutes
    LANGUAGE: str = "en"
    MODEL_NAME: str = "whisper-base"  # For metadata
    TIMESTAMP_FORMAT: str = "%Y-%m-%d_%H%M%S"

    # Whisper CLI flags
    FLAG_OUTPUT_TXT: str = "-otxt"
    FLAG_NO_TIMESTAMPS: str = "-nt"
    FLAG_LANGUAGE: str = "-l"
    FLAG_MODEL: str = "-m"
    FLAG_FILE: str = "-f"


@dataclass(frozen=True)
class FileSettings:
    """
    File validation and limits.

    Enforces security constraints:
    - 500MB max file size (prevents DoS)
    - Extension whitelist (prevents execution attacks)
    - Path traversal protection patterns
    """
    MAX_FILE_SIZE_BYTES: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_EXTENSIONS: FrozenSet[str] = frozenset({'.wav', '.mp3', '.m4a', '.flac', '.ogg'})
    DANGEROUS_PATH_PATTERNS: Tuple[str, ...] = ('..', '~', '$')

    # First line extraction for display
    FIRST_LINE_MAX_LENGTH: int = 100
    FIRST_LINE_ELLIPSIS: str = "..."


@dataclass(frozen=True)
class PathSettings:
    """
    Directory structure for outputs.

    Relative paths from project root:
    - outputs/audio/ for WAV recordings
    - outputs/transcripts/ for markdown/txt files
    """
    OUTPUTS_DIR: str = "outputs"
    AUDIO_SUBDIR: str = "audio"
    TRANSCRIPTS_SUBDIR: str = "transcripts"

    # Filename patterns
    RECORDING_PREFIX: str = "recording_"
    TRANSCRIPT_PREFIX: str = "transcript_"
    RECORDING_TIMESTAMP_FORMAT: str = "%Y-%m-%d_%H-%M-%S"
    AUDIO_EXTENSION: str = ".wav"
    TRANSCRIPT_TXT_EXTENSION: str = ".txt"
    TRANSCRIPT_MD_EXTENSION: str = ".md"

    # Whisper output (temp file next to audio)
    WHISPER_TEMP_EXTENSION: str = ".txt"


@dataclass(frozen=True)
class ProtocolSettings:
    """
    Inter-process communication protocol messages.

    Defines stdin/stdout commands and responses between:
    - Electron (main.js) ↔ recorder.py
    - Electron (main.js) ← transcribe.py

    Format: COMMAND or EVENT:data
    """
    # Recorder input commands (from Electron via stdin)
    CMD_START: str = "start"
    CMD_STOP: str = "stop"
    CMD_QUIT: str = "quit"

    # Recorder output events (to Electron via stdout)
    EVENT_READY: str = "READY"
    EVENT_RECORDING_STARTED: str = "RECORDING_STARTED"
    EVENT_RECORDING_STOPPED: str = "RECORDING_STOPPED"  # Format: RECORDING_STOPPED:<path>
    EVENT_ERROR: str = "ERROR"  # Format: ERROR:<type>:<message>

    # Transcription output events (to Electron via stdout)
    EVENT_TRANSCRIPT_SAVED: str = "TRANSCRIPT_SAVED"  # Format: TRANSCRIPT_SAVED:<md_path>
    EVENT_TRANSCRIPT_TXT: str = "TRANSCRIPT_TXT"  # Format: TRANSCRIPT_TXT:<txt_path>

    # Error event patterns
    ERROR_RECORDING_START_FAILED: str = "ERROR:RecordingStartFailed"
    ERROR_RECORDING_STOP_FAILED: str = "ERROR:RecordingStopFailed"
    ERROR_VALIDATION: str = "ERROR:ValidationError"  # Format: ERROR:ValidationError:<msg>

    # Special values
    NO_AUDIO_MARKER: str = "no_audio"


@dataclass(frozen=True)
class DatabaseSettings:
    """
    Database integration configuration.

    Controls Node.js database script execution:
    - Script path for adding recordings
    - Timeout for database operations
    - Recording ID prefix
    """
    SCRIPT_PATH: str = "src/add_recording.js"
    TIMEOUT_SECONDS: int = 5
    RECORDING_ID_PREFIX: str = "rec_"
    TIMESTAMP_FORMAT: str = "%Y-%m-%d %H:%M:%S"  # ISO format for display
    TIMESTAMP_ISO_FORMAT: str = "iso"  # Uses datetime.isoformat()


@dataclass(frozen=True)
class MarkdownSettings:
    """
    Markdown output formatting.

    Template structure for transcript markdown files with metadata headers.
    """
    TITLE: str = "# Brain Dump Transcript"
    DATE_LABEL: str = "**Date:**"
    AUDIO_FILE_LABEL: str = "**Audio File:**"
    SEPARATOR: str = "---"
    NEWLINE: str = "\n"
    DOUBLE_NEWLINE: str = "\n\n"


# Global configuration instances (frozen for immutability)
AUDIO = AudioSettings()
TRANSCRIPTION = TranscriptionSettings()
FILES = FileSettings()
PATHS = PathSettings()
PROTOCOL = ProtocolSettings()
DATABASE = DatabaseSettings()
MARKDOWN = MarkdownSettings()
