#!/usr/bin/env python3
"""
Transcription script that:
1. Transcribes audio using WhisperTranscriber
2. Extracts audio duration from WAV file
3. Saves recording metadata to database via Node.js
"""

import os
import sys
import wave
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add src to path for core module imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'python'))

from core.error_handler import error_handler, ErrorLevel  # noqa: E402
from core.validators import FileValidator, ValidationError  # noqa: E402
from transcription.whisper_transcriber import WhisperTranscriber  # noqa: E402
from config.settings import DATABASE, FILES, PATHS, PROTOCOL, TRANSCRIPTION  # noqa: E402


def get_audio_duration(audio_path: str) -> int:
    """
    Get duration of WAV audio file in seconds.

    Args:
        audio_path (str): Path to WAV file

    Returns:
        int: Duration in seconds (rounded)
    """
    try:
        # Validate file exists
        FileValidator.validate_file_exists(audio_path)

        with wave.open(audio_path, 'r') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            duration = frames / float(rate)
            return round(duration)
    except Exception as e:
        error_handler.notify(
            ErrorLevel.WARNING,
            "get_audio_duration",
            type(e).__name__,
            f"Could not read audio duration: {e}"
        )
        return 0


def extract_first_line(transcript: str, max_length: Optional[int] = None) -> str:
    """
    Extract first line or first max_length characters from transcript.

    Args:
        transcript (str): Full transcript text
        max_length (int): Maximum length of first line (defaults to FILES.FIRST_LINE_MAX_LENGTH)

    Returns:
        str: First line trimmed to max_length
    """
    if not transcript:
        return ""

    if max_length is None:
        max_length = FILES.FIRST_LINE_MAX_LENGTH

    # Get first line or entire text if no newline
    first_line = transcript.split('\n')[0].strip()

    # Trim to max_length
    if len(first_line) > max_length:
        ellipsis: str = FILES.FIRST_LINE_ELLIPSIS
        return first_line[:max_length] + ellipsis

    return first_line


def save_to_database(recording_data: Dict[str, Any]) -> bool:
    """
    Save recording metadata to database using Node.js database module.

    Args:
        recording_data (dict): Recording metadata

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create a Node.js script to add the recording
        script_path = Path(__file__).parent / DATABASE.SCRIPT_PATH

        # Validate script exists
        if not script_path.exists():
            raise FileNotFoundError(f"Database script not found: {script_path}")

        # Call Node.js script with JSON data
        result = subprocess.run(
            ['node', str(script_path)],
            input=json.dumps(recording_data),
            capture_output=True,
            text=True,
            timeout=DATABASE.TIMEOUT_SECONDS
        )

        if result.returncode == 0:
            error_handler.notify(
                ErrorLevel.INFO,
                "save_to_database",
                "DatabaseUpdated",
                f"Database updated: {recording_data['id']}"
            )
            return True
        else:
            error_handler.notify(
                ErrorLevel.ERROR,
                "save_to_database",
                "DatabaseError",
                f"Database script failed: {result.stderr}"
            )
            return False

    except subprocess.TimeoutExpired:
        error_handler.notify(
            ErrorLevel.ERROR,
            "save_to_database",
            "DatabaseTimeout",
            f"Database operation timed out after {DATABASE.TIMEOUT_SECONDS} seconds"
        )
        return False
    except Exception as e:
        error_handler.handle_exception("save_to_database", e)
        return False


if __name__ == "__main__":
    try:
        # Validate command line arguments
        if len(sys.argv) < 2:
            error_handler.notify(
                ErrorLevel.ERROR,
                "main",
                "InvalidArguments",
                "Usage: transcribe.py <audio_file>"
            )
            sys.exit(1)

        audio_file = sys.argv[1]

        # Validate audio file before processing
        try:
            project_dir = os.path.dirname(__file__)
            outputs_dir = os.path.join(project_dir, PATHS.OUTPUTS_DIR, PATHS.AUDIO_SUBDIR)
            FileValidator.validate_audio_file(audio_file, base_dir=outputs_dir)
        except ValidationError as e:
            error_handler.notify(
                ErrorLevel.ERROR,
                "main.validation",
                "ValidationError",
                str(e)
            )
            print(f"{PROTOCOL.ERROR_VALIDATION}:{e}", flush=True)
            sys.exit(1)

        # Initialize transcriber
        transcriber = WhisperTranscriber()

        # Transcribe audio (returns dict with txt, md, and transcript)
        result = transcriber.transcribe(audio_file)

        # Get audio duration
        duration = get_audio_duration(audio_file)

        # Extract first line from transcript
        first_line = extract_first_line(result['transcript'])

        # Create timestamp
        timestamp = datetime.now().isoformat()

        # Prepare recording metadata
        recording_data: Dict[str, Any] = {
            'id': f"{DATABASE.RECORDING_ID_PREFIX}{int(datetime.now().timestamp() * 1000)}",
            'timestamp': timestamp,
            'duration': duration,
            'audioFile': audio_file,
            'transcriptTxt': result['txt'],
            'transcriptMd': result['md'],
            'firstLine': first_line,
            'metadata': {
                'model': TRANSCRIPTION.MODEL_NAME,
                'language': TRANSCRIPTION.LANGUAGE
            }
        }

        # Save to database
        save_to_database(recording_data)

        # Output for main.js to parse
        print(f"{PROTOCOL.EVENT_TRANSCRIPT_SAVED}:{result['md']}", flush=True)
        print(f"{PROTOCOL.EVENT_TRANSCRIPT_TXT}:{result['txt']}", flush=True)

    except KeyboardInterrupt:
        error_handler.notify(
            ErrorLevel.INFO,
            "main",
            "KeyboardInterrupt",
            "Transcription interrupted by user"
        )
        sys.exit(130)
    except Exception as e:
        error_handler.handle_exception("main", e, fatal=True)
