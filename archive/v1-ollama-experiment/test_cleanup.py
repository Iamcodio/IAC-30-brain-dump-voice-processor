#!/usr/bin/env python3
"""
Test script for Ollama cleanup module.
"""

from src.ai_processing.ollama_cleanup import OllamaCleanup
from datetime import datetime

def main():
    print("Testing Ollama Cleanup Module")
    print("=" * 50)
    
    # Initialize cleanup client with Dolphin3
    print("\n1. Initializing Ollama client (Dolphin3)...")
    cleanup = OllamaCleanup(model="dolphin3:latest")
    
    # Test with sample transcript
    print("\n2. Testing with sample transcript...")
    sample_path = "/Users/kjd/09-personal/BrainDumpSessions/sessions/transcripts/test_raw_transcript.txt"
    
    start_time = datetime.now()
    print(f"Start time: {start_time.strftime('%H:%M:%S.%f')[:-3]}")
    
    output_path = cleanup.cleanup_file(
        input_path=sample_path,
        output_path="outputs/test_cleaned_dolphin.md"
    )
    
    end_time = datetime.now()
    elapsed = (end_time - start_time).total_seconds()
    
    print(f"End time: {end_time.strftime('%H:%M:%S.%f')[:-3]}")
    print(f"⏱️  Processing time: {elapsed:.2f} seconds")
    print(f"\n✓ Test complete!")
    print(f"✓ Output saved to: {output_path}")

if __name__ == "__main__":
    main()
