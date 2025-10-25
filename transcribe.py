#!/usr/bin/env python3
"""
Transcription script that:
1. Transcribes audio using WhisperTranscriber
2. Extracts audio duration from WAV file
3. Saves recording metadata to database via Node.js
"""

import sys
import wave
import json
import subprocess
from pathlib import Path
from datetime import datetime
from src.python.transcription.whisper_transcriber import WhisperTranscriber


def get_audio_duration(audio_path):
    """
    Get duration of WAV audio file in seconds.

    Args:
        audio_path (str): Path to WAV file

    Returns:
        int: Duration in seconds (rounded)
    """
    try:
        with wave.open(audio_path, 'r') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            duration = frames / float(rate)
            return round(duration)
    except Exception as e:
        print(f"Warning: Could not read audio duration: {e}", file=sys.stderr)
        return 0


def extract_first_line(transcript, max_length=100):
    """
    Extract first line or first max_length characters from transcript.

    Args:
        transcript (str): Full transcript text
        max_length (int): Maximum length of first line

    Returns:
        str: First line trimmed to max_length
    """
    if not transcript:
        return ""

    # Get first line or entire text if no newline
    first_line = transcript.split('\n')[0].strip()

    # Trim to max_length
    if len(first_line) > max_length:
        return first_line[:max_length] + "..."

    return first_line


def save_to_database(recording_data):
    """
    Save recording metadata to database using Node.js database module.

    Args:
        recording_data (dict): Recording metadata

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create a Node.js script to add the recording
        script_path = Path(__file__).parent / 'src' / 'add_recording.js'

        # Call Node.js script with JSON data
        result = subprocess.run(
            ['node', str(script_path)],
            input=json.dumps(recording_data),
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            print(f"Database updated: {recording_data['id']}", file=sys.stderr)
            return True
        else:
            print(f"Database error: {result.stderr}", file=sys.stderr)
            return False

    except Exception as e:
        print(f"Failed to update database: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: transcribe.py <audio_file>", file=sys.stderr)
        sys.exit(1)

    audio_file = sys.argv[1]
    transcriber = WhisperTranscriber()

    try:
        # Transcribe audio (returns dict with txt, md, and transcript)
        result = transcriber.transcribe(audio_file)

        # Get audio duration
        duration = get_audio_duration(audio_file)

        # Extract first line from transcript
        first_line = extract_first_line(result['transcript'])

        # Create timestamp
        timestamp = datetime.now().isoformat()

        # Prepare recording metadata
        recording_data = {
            'id': f"rec_{int(datetime.now().timestamp() * 1000)}",
            'timestamp': timestamp,
            'duration': duration,
            'audioFile': audio_file,
            'transcriptTxt': result['txt'],
            'transcriptMd': result['md'],
            'firstLine': first_line,
            'metadata': {
                'model': 'whisper-base',
                'language': 'en'
            }
        }

        # Save to database
        save_to_database(recording_data)

        # Output for main.js to parse
        print(f"TRANSCRIPT_SAVED:{result['md']}", flush=True)
        print(f"TRANSCRIPT_TXT:{result['txt']}", flush=True)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
