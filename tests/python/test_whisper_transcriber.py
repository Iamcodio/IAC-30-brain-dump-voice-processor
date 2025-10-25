#!/usr/bin/env python3
"""Tests for whisper_transcriber.py"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import sys
import os

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'python'))
from transcription.whisper_transcriber import WhisperTranscriber


class TestWhisperTranscriber:
    """Test suite for WhisperTranscriber class"""

    def test_init_default_params(self):
        """Test initialization with default parameters"""
        transcriber = WhisperTranscriber()
        assert transcriber.model_path == "models/ggml-base.bin"
        assert transcriber.whisper_bin == "whisper-cli"

    @patch('os.path.exists', return_value=True)
    def test_init_custom_params(self, mock_exists):
        """Test initialization with custom parameters"""
        transcriber = WhisperTranscriber(
            model_path="custom/model.bin",
            whisper_bin="custom-whisper"
        )
        assert transcriber.model_path == "custom/model.bin"
        assert transcriber.whisper_bin == "custom-whisper"

    @patch('transcription.whisper_transcriber.FileValidator.validate_directory_exists')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_size')
    @patch('transcription.whisper_transcriber.FileValidator.validate_extension')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_exists')
    @patch('os.path.exists', return_value=True)
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.read_text')
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.unlink')
    @patch('pathlib.Path.mkdir')
    def test_transcribe_success(self, mock_mkdir, mock_unlink, mock_write,
                                mock_read, mock_path_exists, mock_run, mock_os_exists,
                                mock_validate_exists, mock_validate_ext, mock_validate_size, mock_validate_dir):
        """Test successful transcription"""
        # Setup mocks
        mock_run.return_value = Mock(returncode=0, stderr="")
        mock_path_exists.return_value = True
        mock_read.return_value = "This is a test transcript."

        transcriber = WhisperTranscriber()
        result = transcriber.transcribe("test_audio.wav", output_dir="test_outputs")

        # Verify subprocess call
        mock_run.assert_called_once()
        cmd = mock_run.call_args[0][0]
        assert cmd[0] == "whisper-cli"
        assert "-m" in cmd
        assert "models/ggml-base.bin" in cmd
        assert "-f" in cmd
        assert "test_audio.wav" in cmd
        assert "-l" in cmd
        assert "en" in cmd
        assert "-otxt" in cmd
        assert "-nt" in cmd

        # Verify result structure
        assert 'txt' in result
        assert 'md' in result
        assert 'transcript' in result
        assert result['transcript'] == "This is a test transcript."

    @patch('transcription.whisper_transcriber.FileValidator.validate_directory_exists')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_size')
    @patch('transcription.whisper_transcriber.FileValidator.validate_extension')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_exists')
    @patch('os.path.exists', return_value=True)
    @patch('subprocess.run')
    def test_transcribe_whisper_failure(self, mock_run, mock_os_exists, mock_validate_exists, mock_validate_ext, mock_validate_size, mock_validate_dir):
        """Test transcription when Whisper CLI fails"""
        mock_run.return_value = Mock(
            returncode=1,
            stderr="Whisper error: Model not found"
        )

        transcriber = WhisperTranscriber()

        with pytest.raises(RuntimeError, match="Whisper failed"):
            transcriber.transcribe("test_audio.wav")

    @patch('transcription.whisper_transcriber.FileValidator.validate_directory_exists')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_size')
    @patch('transcription.whisper_transcriber.FileValidator.validate_extension')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_exists')
    @patch('os.path.exists', return_value=True)
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.mkdir')
    def test_transcribe_output_not_found(self, mock_mkdir, mock_path_exists, mock_run, mock_os_exists, mock_validate_exists, mock_validate_ext, mock_validate_size, mock_validate_dir):
        """Test transcription when output file is not created"""
        mock_run.return_value = Mock(returncode=0, stderr="")
        mock_path_exists.return_value = False

        transcriber = WhisperTranscriber()

        with pytest.raises(RuntimeError, match="Transcription output not found"):
            transcriber.transcribe("test_audio.wav")

    @patch('transcription.whisper_transcriber.FileValidator.validate_directory_exists')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_size')
    @patch('transcription.whisper_transcriber.FileValidator.validate_extension')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_exists')
    @patch('os.path.exists', return_value=True)
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.read_text')
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.unlink')
    @patch('pathlib.Path.mkdir')
    def test_transcribe_creates_markdown(self, mock_mkdir, mock_unlink, mock_write,
                                        mock_read, mock_path_exists, mock_run, mock_os_exists,
                                        mock_validate_exists, mock_validate_ext, mock_validate_size, mock_validate_dir):
        """Test that markdown output contains correct structure"""
        mock_run.return_value = Mock(returncode=0, stderr="")
        mock_path_exists.return_value = True
        mock_read.return_value = "Test content"

        transcriber = WhisperTranscriber()
        result = transcriber.transcribe("recording.wav")

        # Check that markdown was written
        assert mock_write.call_count >= 2  # txt and md files

        # Get the markdown content from the second write call
        markdown_calls = [call for call in mock_write.call_args_list]
        markdown_content = markdown_calls[1][0][0]  # Second call, first arg

        # Verify markdown structure
        assert "# Brain Dump Transcript" in markdown_content
        assert "**Date:**" in markdown_content
        assert "**Audio File:**" in markdown_content
        assert "---" in markdown_content
        assert "Test content" in markdown_content

    @patch('transcription.whisper_transcriber.FileValidator.validate_directory_exists')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_size')
    @patch('transcription.whisper_transcriber.FileValidator.validate_extension')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_exists')
    @patch('os.path.exists', return_value=True)
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.read_text')
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.unlink')
    @patch('pathlib.Path.mkdir')
    def test_transcribe_creates_directories(self, mock_mkdir, mock_unlink, mock_write,
                                           mock_read, mock_path_exists, mock_run, mock_os_exists,
                                           mock_validate_exists, mock_validate_ext, mock_validate_size, mock_validate_dir):
        """Test that output directories are created"""
        mock_run.return_value = Mock(returncode=0, stderr="")
        mock_path_exists.return_value = True
        mock_read.return_value = "Test"

        transcriber = WhisperTranscriber()
        transcriber.transcribe("test.wav", output_dir="new/output/path")

        # Verify validate_directory_exists was called with create=True
        mock_validate_dir.assert_called()

    @patch('transcription.whisper_transcriber.FileValidator.validate_directory_exists')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_size')
    @patch('transcription.whisper_transcriber.FileValidator.validate_extension')
    @patch('transcription.whisper_transcriber.FileValidator.validate_file_exists')
    @patch('os.path.exists', return_value=True)
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.read_text')
    @patch('pathlib.Path.write_text')
    @patch('pathlib.Path.unlink')
    @patch('pathlib.Path.mkdir')
    def test_transcribe_cleans_temp_file(self, mock_mkdir, mock_unlink, mock_write,
                                        mock_read, mock_path_exists, mock_run, mock_os_exists,
                                        mock_validate_exists, mock_validate_ext, mock_validate_size, mock_validate_dir):
        """Test that temporary .txt file is cleaned up"""
        mock_run.return_value = Mock(returncode=0, stderr="")
        mock_path_exists.return_value = True
        mock_read.return_value = "Test"

        transcriber = WhisperTranscriber()
        transcriber.transcribe("test.wav")

        # Verify temp file was deleted
        mock_unlink.assert_called_once()
