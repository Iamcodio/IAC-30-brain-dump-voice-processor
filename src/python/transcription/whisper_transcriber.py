#!/usr/bin/env python3
"""
Whisper C++ transcriber integration.

This module wraps the whisper-cli binary (Whisper C++ implementation)
to provide audio transcription services. It processes audio files and
outputs both plain text and formatted markdown transcripts.

The transcriber uses Metal GPU acceleration on M-series Macs for fast
inference (~25× faster than real-time with base model). All transcription
is performed locally with no external API calls.

Example:
    transcriber = WhisperTranscriber()
    result = transcriber.transcribe("recording.wav")
    print(result['transcript'])  # Raw transcript text
    print(result['txt'])         # Path to .txt file
    print(result['md'])          # Path to .md file

Technical Details:
    - Model: ggml-base.bin (141MB, English-only)
    - GPU: Metal acceleration (M-series Macs)
    - Output: Plain text + formatted markdown
    - Performance: ~436ms for 11-second audio on M2
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional

# Add src to path for core module imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'python'))

from core.error_handler import error_handler, ErrorLevel  # noqa: E402
from core.validators import FileValidator, ValidationError  # noqa: E402
from config.settings import DATABASE, MARKDOWN, PATHS, TRANSCRIPTION  # noqa: E402


class WhisperTranscriber:
    """
    Whisper C++ transcriber wrapper.

    Interfaces with the whisper-cli binary to transcribe audio files.
    Outputs both plain text and markdown-formatted transcripts with
    metadata headers.

    Attributes:
        model_path (str): Path to Whisper GGML model file.
        whisper_bin (str): Name or path to whisper-cli binary.
    """

    def __init__(self, model_path: Optional[str] = None, whisper_bin: Optional[str] = None) -> None:
        """
        Initialize the Whisper transcriber.

        Validates that the Whisper model file exists before initializing.
        The model must be downloaded separately (see project documentation).

        Args:
            model_path (str): Path to GGML model file. Defaults to
                TRANSCRIPTION.MODEL_PATH from settings.
            whisper_bin (str): Name or path to whisper-cli binary.
                Defaults to TRANSCRIPTION.WHISPER_BINARY from settings.

        Raises:
            FileNotFoundError: If model file not found.
            SystemExit: On fatal initialization errors.
        """
        self.model_path = model_path if model_path is not None else TRANSCRIPTION.MODEL_PATH
        self.whisper_bin = whisper_bin if whisper_bin is not None else TRANSCRIPTION.WHISPER_BINARY

        # Validate model exists
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Whisper model not found: {self.model_path}")
        except Exception as e:
            error_handler.handle_exception("WhisperTranscriber.__init__", e, fatal=True)

    def transcribe(self, audio_path: str, output_dir: Optional[str] = None) -> Dict[str, str]:
        """
        Transcribe audio file to both plain text and markdown.

        Calls whisper-cli binary as subprocess with English-only mode
        and no timestamps. Saves output as both plain text and formatted
        markdown with metadata headers.

        The whisper-cli creates a temporary .txt file next to the audio
        file, which is read and then deleted after processing.

        Args:
            audio_path (str): Path to WAV audio file to transcribe.
            output_dir (str): Directory for output files. Defaults to
                PATHS.OUTPUTS_DIR/PATHS.TRANSCRIPTS_SUBDIR. Created if doesn't exist.

        Returns:
            dict: Dictionary containing:
                - txt (str): Absolute path to plain text file
                - md (str): Absolute path to markdown file
                - transcript (str): Raw transcript text content

        Raises:
            ValidationError: If audio file validation fails.
            RuntimeError: If Whisper transcription fails or times out.
            OSError: If output files cannot be written.
        """
        try:
            # Validate input audio file
            FileValidator.validate_file_exists(audio_path)
            FileValidator.validate_extension(audio_path)
            FileValidator.validate_file_size(audio_path)

            # Validate and create output directory
            if output_dir is None:
                output_dir = os.path.join(PATHS.OUTPUTS_DIR, PATHS.TRANSCRIPTS_SUBDIR)
            output_dir_path = Path(output_dir)
            FileValidator.validate_directory_exists(str(output_dir_path), create=True)

            timestamp = datetime.now().strftime(TRANSCRIPTION.TIMESTAMP_FORMAT)
            txt_output_path = output_dir_path / f"{PATHS.TRANSCRIPT_PREFIX}{timestamp}{PATHS.TRANSCRIPT_TXT_EXTENSION}"
            md_output_path = output_dir_path / f"{PATHS.TRANSCRIPT_PREFIX}{timestamp}{PATHS.TRANSCRIPT_MD_EXTENSION}"

            # Build whisper command
            cmd = [
                self.whisper_bin,
                TRANSCRIPTION.FLAG_MODEL, self.model_path,
                TRANSCRIPTION.FLAG_FILE, str(audio_path),
                TRANSCRIPTION.FLAG_LANGUAGE, TRANSCRIPTION.LANGUAGE,  # Force English-only mode (prevents Irish → Welsh misdetection)
                TRANSCRIPTION.FLAG_OUTPUT_TXT,
                TRANSCRIPTION.FLAG_NO_TIMESTAMPS  # No timestamps in output
            ]

            # Run whisper with timeout
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=TRANSCRIPTION.TIMEOUT_SECONDS
                )
            except subprocess.TimeoutExpired as e:
                error_handler.notify(
                    ErrorLevel.ERROR,
                    "WhisperTranscriber.transcribe",
                    "TranscriptionTimeout",
                    f"Whisper transcription timed out after {TRANSCRIPTION.TIMEOUT_SECONDS} seconds"
                )
                raise RuntimeError("Whisper transcription timed out") from e

            if result.returncode != 0:
                error_handler.notify(
                    ErrorLevel.ERROR,
                    "WhisperTranscriber.transcribe",
                    "WhisperError",
                    f"Whisper failed with code {result.returncode}: {result.stderr}"
                )
                raise RuntimeError(f"Whisper failed: {result.stderr}")

            # Whisper creates a .txt file next to the audio file
            temp_txt_file = Path(str(audio_path) + PATHS.WHISPER_TEMP_EXTENSION)
            if not temp_txt_file.exists():
                error_handler.notify(
                    ErrorLevel.ERROR,
                    "WhisperTranscriber.transcribe",
                    "OutputNotFound",
                    f"Whisper output file not found: {temp_txt_file}"
                )
                raise RuntimeError("Transcription output not found")

            # Read and validate output
            raw_content = temp_txt_file.read_text().strip()

            if not raw_content:
                error_handler.notify(
                    ErrorLevel.WARNING,
                    "WhisperTranscriber.transcribe",
                    "EmptyTranscript",
                    "Whisper returned empty transcript"
                )

            # Save plain text file (just the raw transcript)
            txt_output_path.write_text(raw_content)

            # Create markdown with headers
            markdown = MARKDOWN.TITLE + MARKDOWN.DOUBLE_NEWLINE
            markdown += f"{MARKDOWN.DATE_LABEL} {datetime.now().strftime(DATABASE.TIMESTAMP_FORMAT)}" + MARKDOWN.DOUBLE_NEWLINE
            markdown += f"{MARKDOWN.AUDIO_FILE_LABEL} {Path(audio_path).name}" + MARKDOWN.DOUBLE_NEWLINE
            markdown += MARKDOWN.SEPARATOR + MARKDOWN.DOUBLE_NEWLINE
            markdown += raw_content

            # Save markdown file
            md_output_path.write_text(markdown)

            # Clean up temporary file
            try:
                temp_txt_file.unlink()
            except Exception as e:
                error_handler.notify(
                    ErrorLevel.WARNING,
                    "WhisperTranscriber.transcribe",
                    "TempFileCleanup",
                    f"Failed to delete temp file: {e}"
                )

            return {
                'txt': str(txt_output_path),
                'md': str(md_output_path),
                'transcript': raw_content
            }

        except ValidationError as e:
            error_handler.notify(
                ErrorLevel.ERROR,
                "WhisperTranscriber.transcribe",
                "ValidationError",
                str(e)
            )
            raise
        except Exception as e:
            error_handler.handle_exception("WhisperTranscriber.transcribe", e)
            raise
