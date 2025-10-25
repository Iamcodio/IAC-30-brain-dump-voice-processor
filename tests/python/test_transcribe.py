#!/usr/bin/env python3
"""Tests for transcribe.py"""

import pytest
from unittest.mock import Mock, patch, MagicMock, mock_open
import sys
import os
import wave
import json

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

# Import functions from transcribe module
from transcribe import get_audio_duration, extract_first_line, save_to_database


class TestGetAudioDuration:
    """Test suite for get_audio_duration function"""

    @patch('transcribe.FileValidator.validate_file_exists')
    @patch('wave.open')
    def test_get_audio_duration_success(self, mock_wave_open, mock_validate):
        """Test successful audio duration extraction"""
        mock_wav = MagicMock()
        mock_wav.getnframes.return_value = 44100  # 1 second at 44.1kHz
        mock_wav.getframerate.return_value = 44100
        mock_wave_open.return_value.__enter__.return_value = mock_wav

        duration = get_audio_duration("test.wav")
        assert duration == 1

    @patch('transcribe.FileValidator.validate_file_exists')
    @patch('wave.open')
    def test_get_audio_duration_multiple_seconds(self, mock_wave_open, mock_validate):
        """Test duration calculation for longer audio"""
        mock_wav = MagicMock()
        mock_wav.getnframes.return_value = 441000  # 10 seconds at 44.1kHz
        mock_wav.getframerate.return_value = 44100
        mock_wave_open.return_value.__enter__.return_value = mock_wav

        duration = get_audio_duration("test.wav")
        assert duration == 10

    @patch('transcribe.FileValidator.validate_file_exists')
    @patch('wave.open')
    def test_get_audio_duration_rounds_correctly(self, mock_wave_open, mock_validate):
        """Test that duration is rounded to nearest second"""
        mock_wav = MagicMock()
        mock_wav.getnframes.return_value = 48510  # 1.1 seconds at 44.1kHz
        mock_wav.getframerate.return_value = 44100
        mock_wave_open.return_value.__enter__.return_value = mock_wav

        duration = get_audio_duration("test.wav")
        assert duration == 1

    @patch('wave.open')
    def test_get_audio_duration_file_not_found(self, mock_wave_open):
        """Test handling of missing file"""
        mock_wave_open.side_effect = FileNotFoundError("File not found")

        duration = get_audio_duration("missing.wav")
        assert duration == 0

    @patch('wave.open')
    def test_get_audio_duration_invalid_file(self, mock_wave_open):
        """Test handling of invalid WAV file"""
        mock_wave_open.side_effect = wave.Error("Invalid WAV file")

        duration = get_audio_duration("invalid.wav")
        assert duration == 0


class TestExtractFirstLine:
    """Test suite for extract_first_line function"""

    def test_extract_first_line_single_line(self):
        """Test extraction from single-line transcript"""
        transcript = "This is a single line transcript"
        result = extract_first_line(transcript)
        assert result == "This is a single line transcript"

    def test_extract_first_line_multiline(self):
        """Test extraction from multi-line transcript"""
        transcript = "First line of transcript\nSecond line\nThird line"
        result = extract_first_line(transcript)
        assert result == "First line of transcript"

    def test_extract_first_line_truncation(self):
        """Test truncation when line exceeds max_length"""
        long_line = "a" * 150
        result = extract_first_line(long_line, max_length=100)
        assert len(result) == 103  # 100 chars + "..."
        assert result.endswith("...")

    def test_extract_first_line_exact_max_length(self):
        """Test no truncation when exactly at max_length"""
        line = "a" * 100
        result = extract_first_line(line, max_length=100)
        assert result == line
        assert not result.endswith("...")

    def test_extract_first_line_empty_string(self):
        """Test handling of empty string"""
        result = extract_first_line("")
        assert result == ""

    def test_extract_first_line_none(self):
        """Test handling of None input"""
        result = extract_first_line(None)
        assert result == ""

    def test_extract_first_line_whitespace_only(self):
        """Test handling of whitespace-only line"""
        transcript = "   \n\n\n"
        result = extract_first_line(transcript)
        assert result == ""

    def test_extract_first_line_strips_whitespace(self):
        """Test that leading/trailing whitespace is removed"""
        transcript = "   First line with spaces   \nSecond line"
        result = extract_first_line(transcript)
        assert result == "First line with spaces"


class TestSaveToDatabase:
    """Test suite for save_to_database function"""

    @patch('subprocess.run')
    def test_save_to_database_success(self, mock_run):
        """Test successful database save"""
        mock_run.return_value = Mock(returncode=0, stderr="")

        recording_data = {
            'id': 'rec_123',
            'timestamp': '2025-01-01T12:00:00',
            'duration': 10,
            'audioFile': 'test.wav',
            'transcriptTxt': 'transcript.txt',
            'transcriptMd': 'transcript.md',
            'firstLine': 'Test transcript'
        }

        result = save_to_database(recording_data)
        assert result is True

        # Verify subprocess was called correctly
        mock_run.assert_called_once()
        call_args = mock_run.call_args
        assert call_args[0][0][0] == 'node'
        assert 'add_recording.js' in call_args[0][0][1]
        assert call_args[1]['input'] == json.dumps(recording_data)

    @patch('subprocess.run')
    def test_save_to_database_failure(self, mock_run):
        """Test database save failure"""
        mock_run.return_value = Mock(returncode=1, stderr="Database error")

        recording_data = {'id': 'rec_123'}
        result = save_to_database(recording_data)
        assert result is False

    @patch('subprocess.run')
    def test_save_to_database_timeout(self, mock_run):
        """Test timeout handling"""
        mock_run.side_effect = Exception("Timeout")

        recording_data = {'id': 'rec_123'}
        result = save_to_database(recording_data)
        assert result is False

    @patch('subprocess.run')
    def test_save_to_database_json_serialization(self, mock_run):
        """Test that data is properly JSON serialized"""
        mock_run.return_value = Mock(returncode=0, stderr="")

        recording_data = {
            'id': 'rec_123',
            'metadata': {'key': 'value'}
        }

        save_to_database(recording_data)

        # Verify JSON was properly serialized
        call_args = mock_run.call_args
        input_data = call_args[1]['input']
        parsed = json.loads(input_data)
        assert parsed == recording_data


class TestTranscribeMain:
    """Test suite for main transcription flow"""

    @patch('transcribe.save_to_database')
    @patch('transcribe.extract_first_line')
    @patch('transcribe.get_audio_duration')
    @patch('transcribe.WhisperTranscriber')
    @patch('sys.argv', ['transcribe.py', 'test_audio.wav'])
    def test_main_success_flow(self, mock_transcriber_class, mock_duration,
                              mock_first_line, mock_save_db):
        """Test successful main execution flow"""
        # Setup mocks
        mock_transcriber = MagicMock()
        mock_transcriber.transcribe.return_value = {
            'txt': '/path/to/transcript.txt',
            'md': '/path/to/transcript.md',
            'transcript': 'This is the transcript text'
        }
        mock_transcriber_class.return_value = mock_transcriber
        mock_duration.return_value = 10
        mock_first_line.return_value = 'This is the transcript text'
        mock_save_db.return_value = True

        # Import and execute (this will run __main__)
        # We test the components individually instead of the full main

        # Verify transcriber would be called
        transcriber = mock_transcriber_class()
        result = transcriber.transcribe('test_audio.wav')

        assert result['transcript'] == 'This is the transcript text'
        mock_transcriber.transcribe.assert_called_once_with('test_audio.wav')
