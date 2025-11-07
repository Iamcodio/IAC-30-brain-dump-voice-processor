"""
Configuration module for BrainDump Voice Processor.

Exports global configuration instances:
- AUDIO: Audio recording settings (sample rate, channels, buffer size)
- TRANSCRIPTION: Whisper transcription settings (model path, timeout, language)
- FILES: File validation limits (max size, allowed extensions)
- PATHS: Directory structure and filename patterns
- PROTOCOL: IPC protocol messages (stdin/stdout commands)
- DATABASE: Database integration settings
- MARKDOWN: Markdown output formatting

Usage:
    from config import AUDIO, TRANSCRIPTION, FILES, PATHS, PROTOCOL

    stream = audio.open(
        rate=AUDIO.SAMPLE_RATE,
        channels=AUDIO.CHANNELS,
        frames_per_buffer=AUDIO.FRAMES_PER_BUFFER
    )
"""

from .settings import (
    AUDIO,
    TRANSCRIPTION,
    FILES,
    PATHS,
    PROTOCOL,
    DATABASE,
    MARKDOWN,
)

__all__ = [
    'AUDIO',
    'TRANSCRIPTION',
    'FILES',
    'PATHS',
    'PROTOCOL',
    'DATABASE',
    'MARKDOWN',
]
