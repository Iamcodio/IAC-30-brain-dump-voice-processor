#!/usr/bin/env python3
"""
Whisper C++ Transcriber
Calls whisper-cli binary and outputs markdown
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

# Add src to path for core module imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'python'))

from core.error_handler import error_handler, ErrorLevel
from core.validators import FileValidator, ValidationError

class WhisperTranscriber:
    def __init__(self, model_path="models/ggml-base.bin", whisper_bin="whisper-cli"):
        self.model_path = model_path
        self.whisper_bin = whisper_bin

        # Validate model exists
        try:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Whisper model not found: {model_path}")
        except Exception as e:
            error_handler.handle_exception("WhisperTranscriber.__init__", e, fatal=True)
        
    def transcribe(self, audio_path, output_dir="outputs/transcripts"):
        """
        Transcribe audio file to both plain text and markdown.

        Returns:
            dict: {
                'txt': path to plain text file,
                'md': path to markdown file,
                'transcript': raw transcript text
            }
        """
        try:
            # Validate input audio file
            FileValidator.validate_file_exists(audio_path)
            FileValidator.validate_extension(audio_path)
            FileValidator.validate_file_size(audio_path)

            # Validate and create output directory
            output_dir = Path(output_dir)
            FileValidator.validate_directory_exists(str(output_dir), create=True)

            timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
            txt_output_path = output_dir / f"transcript_{timestamp}.txt"
            md_output_path = output_dir / f"transcript_{timestamp}.md"

            # Build whisper command
            cmd = [
                self.whisper_bin,
                "-m", self.model_path,
                "-f", str(audio_path),
                "-l", "en",  # Force English-only mode (prevents Irish → Welsh misdetection)
                "-otxt",
                "-nt"  # No timestamps in output
            ]

            # Run whisper with timeout
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )
            except subprocess.TimeoutExpired as e:
                error_handler.notify(
                    ErrorLevel.ERROR,
                    "WhisperTranscriber.transcribe",
                    "TranscriptionTimeout",
                    f"Whisper transcription timed out after 5 minutes"
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
            temp_txt_file = Path(str(audio_path) + ".txt")
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
            markdown = f"# Brain Dump Transcript\n\n"
            markdown += f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            markdown += f"**Audio File:** {Path(audio_path).name}\n\n"
            markdown += "---\n\n"
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
