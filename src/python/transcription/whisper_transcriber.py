#!/usr/bin/env python3
"""
Whisper C++ Transcriber
Calls whisper-cli binary and outputs markdown
"""

import subprocess
from pathlib import Path
from datetime import datetime

class WhisperTranscriber:
    def __init__(self, model_path="models/ggml-base.bin", whisper_bin="whisper-cli"):
        self.model_path = model_path
        self.whisper_bin = whisper_bin
        
    def transcribe(self, audio_path, output_dir="outputs/transcripts"):
        """Transcribe audio file to markdown"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        output_path = output_dir / f"transcript_{timestamp}.md"
        
        cmd = [
            self.whisper_bin,
            "-m", self.model_path,
            "-f", str(audio_path),
            "-otxt",
            "-nt"  # No timestamps in output
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"Whisper failed: {result.stderr}")
        
        txt_file = Path(str(audio_path) + ".txt")
        if txt_file.exists():
            content = txt_file.read_text().strip()
            
            markdown = f"# Brain Dump Transcript\n\n"
            markdown += f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            markdown += f"**Audio File:** {Path(audio_path).name}\n\n"
            markdown += "---\n\n"
            markdown += content
            
            output_path.write_text(markdown)
            txt_file.unlink()
            
            return str(output_path)
        
        raise RuntimeError("Transcription output not found")
