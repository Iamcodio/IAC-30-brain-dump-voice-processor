#!/usr/bin/env python3
"""Integration tests for end-to-end transcription pipeline"""

import pytest
import sys
import os
import wave
import struct
import math
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from transcribe import get_audio_duration, extract_first_line


class TestTranscriptionPipeline:
    """Integration tests for complete transcription workflow"""

    @pytest.fixture
    def test_audio_file(self, tmp_path):
        """Create a real WAV file for testing"""
        # Generate a 2-second 440Hz tone (A4)
        audio_path = tmp_path / "test_audio.wav"
        sample_rate = 44100
        duration = 2
        frequency = 440

        # Generate sine wave samples
        samples = []
        for i in range(int(sample_rate * duration)):
            sample = int(32767 * math.sin(2 * math.pi * frequency * i / sample_rate))
            samples.append(sample)

        # Write WAV file
        with wave.open(str(audio_path), 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(struct.pack('<' + 'h' * len(samples), *samples))

        return str(audio_path)

    def test_audio_file_creation(self, test_audio_file):
        """Test that generated audio file is valid"""
        assert Path(test_audio_file).exists()

        with wave.open(test_audio_file, 'r') as wav_file:
            assert wav_file.getnchannels() == 1
            assert wav_file.getsampwidth() == 2
            assert wav_file.getframerate() == 44100

    def test_audio_duration_extraction(self, test_audio_file):
        """Test duration extraction from real WAV file"""
        duration = get_audio_duration(test_audio_file)
        assert duration == 2  # Should be 2 seconds

    def test_first_line_extraction_integration(self):
        """Test first line extraction with various real-world inputs"""
        # Test with typical transcript
        transcript = "Hello, this is a test recording.\nThis is the second line."
        first_line = extract_first_line(transcript)
        assert first_line == "Hello, this is a test recording."

        # Test with long transcript
        long_transcript = "a" * 200
        first_line = extract_first_line(long_transcript, max_length=100)
        assert len(first_line) == 103  # 100 + "..."
        assert first_line.endswith("...")

    def test_wav_file_properties(self, test_audio_file):
        """Test that WAV file has correct audio properties"""
        with wave.open(test_audio_file, 'r') as wav_file:
            # Verify format matches recorder.py output
            assert wav_file.getnchannels() == 1  # Mono
            assert wav_file.getsampwidth() == 2  # 16-bit
            assert wav_file.getframerate() == 44100  # 44.1kHz

            # Verify frame count matches duration
            frames = wav_file.getnframes()
            expected_frames = 44100 * 2  # 2 seconds
            assert frames == expected_frames

    def test_empty_audio_file_handling(self, tmp_path):
        """Test handling of empty or minimal audio file"""
        empty_audio = tmp_path / "empty.wav"

        # Create minimal valid WAV file with no actual audio
        with wave.open(str(empty_audio), 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(44100)
            wav_file.writeframes(b'')  # No audio data

        duration = get_audio_duration(str(empty_audio))
        assert duration == 0

    def test_multiple_audio_files_sequence(self, tmp_path):
        """Test processing multiple audio files in sequence"""
        durations = []

        for i in range(3):
            # Create audio files of different lengths
            audio_path = tmp_path / f"test_{i}.wav"
            sample_rate = 44100
            duration_sec = i + 1  # 1, 2, 3 seconds

            # Create silence
            samples = [0] * (sample_rate * duration_sec)

            with wave.open(str(audio_path), 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(struct.pack('<' + 'h' * len(samples), *samples))

            # Extract duration
            duration = get_audio_duration(str(audio_path))
            durations.append(duration)

        # Verify all files were processed correctly
        assert durations == [1, 2, 3]

    def test_transcript_formatting_pipeline(self):
        """Test complete transcript formatting workflow"""
        raw_transcript = """This is a brain dump recording.
I need to remember several things.
First, update the documentation.
Second, review the pull request.
Third, schedule the meeting."""

        # Extract first line
        first_line = extract_first_line(raw_transcript)
        assert first_line == "This is a brain dump recording."

        # Verify multiline handling
        lines = raw_transcript.split('\n')
        assert len(lines) == 5

    def test_special_characters_in_transcript(self):
        """Test handling of special characters in transcripts"""
        special_transcript = "Meeting notes: @john mentioned #project-alpha costs $500!"
        first_line = extract_first_line(special_transcript)
        assert first_line == special_transcript

    def test_unicode_in_transcript(self):
        """Test handling of unicode characters"""
        unicode_transcript = "Cafe review: Great coffee and croissants!"
        first_line = extract_first_line(unicode_transcript)
        assert "coffee" in first_line
        assert "croissants" in first_line

    @pytest.mark.parametrize("duration_seconds,expected_frames", [
        (1, 44100),
        (5, 220500),
        (10, 441000),
    ])
    def test_various_audio_durations(self, tmp_path, duration_seconds, expected_frames):
        """Test audio duration calculation for various lengths"""
        audio_path = tmp_path / f"test_{duration_seconds}s.wav"
        sample_rate = 44100

        # Create silence
        samples = [0] * expected_frames

        with wave.open(str(audio_path), 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(struct.pack('<' + 'h' * len(samples), *samples))

        duration = get_audio_duration(str(audio_path))
        assert duration == duration_seconds
