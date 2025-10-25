#!/usr/bin/env python3
"""Test the whisper transcriber"""

from src.python.transcription.whisper_transcriber import WhisperTranscriber

transcriber = WhisperTranscriber()
output = transcriber.transcribe("/opt/homebrew/Cellar/whisper-cpp/1.8.2/share/whisper-cpp/jfk.wav")
print(f"Transcript saved to: {output}")

with open(output, 'r') as f:
    print(f.read())
