#!/usr/bin/env python3
import sys
from src.python.transcription.whisper_transcriber import WhisperTranscriber

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: transcribe.py <audio_file>", file=sys.stderr)
        sys.exit(1)
    
    audio_file = sys.argv[1]
    transcriber = WhisperTranscriber()
    
    try:
        output = transcriber.transcribe(audio_file)
        print(f"TRANSCRIPT_SAVED:{output}", flush=True)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
