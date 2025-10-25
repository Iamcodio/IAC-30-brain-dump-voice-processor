#!/usr/bin/env python3
"""Tests for recorder.py"""

import pytest
from unittest.mock import Mock, patch, MagicMock, call
import sys
import os
from io import StringIO

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from recorder import SimpleRecorder


class TestSimpleRecorder:
    """Test suite for SimpleRecorder class"""

    @patch('pyaudio.PyAudio')
    def test_init(self, mock_pyaudio):
        """Test recorder initialization"""
        recorder = SimpleRecorder()

        assert recorder.recording is False
        assert recorder.frames == []
        assert recorder.stream is None
        mock_pyaudio.assert_called_once()

    @patch('pyaudio.PyAudio')
    @patch('recorder.FileValidator.validate_directory_exists')
    def test_output_directory_creation(self, mock_validate_dir, mock_pyaudio):
        """Test that output directory is created on init"""
        recorder = SimpleRecorder()

        # FileValidator should be called with create=True
        mock_validate_dir.assert_called_once()
        call_args = mock_validate_dir.call_args
        assert 'outputs/audio' in call_args[0][0]
        assert call_args[1]['create'] is True

    @patch('pyaudio.PyAudio')
    @patch('recorder.FileValidator.validate_directory_exists')
    def test_start_recording(self, mock_validate_dir, mock_pyaudio):
        """Test starting a recording"""
        mock_audio = MagicMock()
        mock_pyaudio.return_value = mock_audio

        recorder = SimpleRecorder()

        # Capture stdout
        with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
            recorder.start()

        # Verify state changes
        assert recorder.recording is True
        assert recorder.frames == []

        # Verify stream was opened with correct parameters
        mock_audio.open.assert_called_once()
        call_kwargs = mock_audio.open.call_args[1]
        assert call_kwargs['format'] == 16  # paInt16
        assert call_kwargs['channels'] == 1
        assert call_kwargs['rate'] == 44100
        assert call_kwargs['input'] is True
        assert call_kwargs['frames_per_buffer'] == 1024
        assert call_kwargs['stream_callback'] == recorder.audio_callback

        # Verify output message
        output = mock_stdout.getvalue()
        assert 'RECORDING_STARTED' in output

    @patch('pyaudio.PyAudio')
    def test_audio_callback_while_recording(self, mock_pyaudio):
        """Test audio callback adds frames when recording"""
        recorder = SimpleRecorder()
        recorder.recording = True

        test_data = b'audio_frame_data'
        result = recorder.audio_callback(test_data, 1024, None, None)

        # Verify frame was added
        assert test_data in recorder.frames

        # Verify callback returns correct format
        assert result[0] == test_data
        # Note: pyaudio.paContinue is a constant, we just check it's returned

    @patch('pyaudio.PyAudio')
    def test_audio_callback_while_not_recording(self, mock_pyaudio):
        """Test audio callback ignores frames when not recording"""
        recorder = SimpleRecorder()
        recorder.recording = False

        test_data = b'audio_frame_data'
        recorder.audio_callback(test_data, 1024, None, None)

        # Verify frame was NOT added
        assert test_data not in recorder.frames

    @patch('pyaudio.PyAudio')
    @patch('recorder.FileValidator.validate_output_path')
    @patch('recorder.FileValidator.validate_file_exists')
    @patch('recorder.FileValidator.validate_directory_exists')
    @patch('wave.open')
    def test_stop_recording_with_audio(self, mock_wave_open, mock_validate_dir, mock_validate_exists, mock_validate_output, mock_pyaudio):
        """Test stopping recording with captured audio"""
        # Setup mock stream
        mock_stream = MagicMock()
        mock_audio = MagicMock()
        mock_pyaudio.return_value = mock_audio

        recorder = SimpleRecorder()
        recorder.recording = True
        recorder.stream = mock_stream
        recorder.frames = [b'frame1', b'frame2']

        # Capture stdout
        with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
            recorder.stop()

        # Verify state changes
        assert recorder.recording is False

        # Verify stream was stopped and closed
        mock_stream.stop_stream.assert_called_once()
        mock_stream.close.assert_called_once()
        assert recorder.stream is None

        # Verify output message
        output = mock_stdout.getvalue()
        assert 'RECORDING_STOPPED:' in output
        assert 'recording_' in output
        assert '.wav' in output

    @patch('pyaudio.PyAudio')
    def test_stop_recording_without_audio(self, mock_pyaudio):
        """Test stopping recording with no captured audio"""
        mock_stream = MagicMock()
        recorder = SimpleRecorder()
        recorder.recording = True
        recorder.stream = mock_stream
        recorder.frames = []

        # Capture stdout
        with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
            recorder.stop()

        # Verify output message indicates no audio
        output = mock_stdout.getvalue()
        assert 'RECORDING_STOPPED:no_audio' in output

    @patch('pyaudio.PyAudio')
    @patch('recorder.FileValidator.validate_output_path')
    @patch('recorder.FileValidator.validate_file_exists')
    @patch('recorder.FileValidator.validate_directory_exists')
    @patch('wave.open')
    @patch('datetime.datetime')
    def test_save_wav_creates_file(self, mock_datetime, mock_wave_open, mock_validate_dir, mock_validate_exists, mock_validate_output, mock_pyaudio):
        """Test WAV file creation with correct format"""
        # Mock datetime for consistent filename
        mock_datetime.now.return_value.strftime.return_value = "2025-01-01_12-00-00"

        # Setup mock WAV file
        mock_wav = MagicMock()
        mock_wave_open.return_value = mock_wav

        recorder = SimpleRecorder()
        recorder.frames = [b'frame1', b'frame2', b'frame3']

        filepath = recorder.save_wav()

        # Verify filepath format
        assert 'recording_2025-01-01_12-00-00.wav' in filepath
        assert 'outputs/audio' in filepath

        # Verify WAV file configuration
        mock_wav.setnchannels.assert_called_once_with(1)
        mock_wav.setsampwidth.assert_called_once_with(2)
        mock_wav.setframerate.assert_called_once_with(44100)
        mock_wav.writeframes.assert_called_once_with(b'frame1frame2frame3')
        mock_wav.close.assert_called_once()

    @patch('pyaudio.PyAudio')
    @patch('sys.stdin', StringIO("start\nstop\nquit\n"))
    def test_run_command_flow(self, mock_pyaudio):
        """Test command processing flow"""
        recorder = SimpleRecorder()

        # Mock methods to avoid actual recording
        with patch.object(recorder, 'start') as mock_start, \
             patch.object(recorder, 'stop') as mock_stop, \
             patch('sys.stdout', new_callable=StringIO) as mock_stdout:

            recorder.run()

            # Verify commands were processed
            mock_start.assert_called_once()
            mock_stop.assert_called_once()

            # Verify READY message
            output = mock_stdout.getvalue()
            assert 'READY' in output

    @patch('pyaudio.PyAudio')
    @patch('recorder.FileValidator.validate_directory_exists')
    @patch('sys.stdin', StringIO("quit\n"))
    def test_run_quit_cleans_up(self, mock_validate_dir, mock_pyaudio):
        """Test that quit command cleans up resources"""
        mock_audio = MagicMock()
        mock_pyaudio.return_value = mock_audio
        mock_stream = MagicMock()

        recorder = SimpleRecorder()
        recorder.stream = mock_stream

        with patch('sys.stdout', new_callable=StringIO):
            recorder.run()

        # Verify cleanup
        mock_stream.close.assert_called_once()
        mock_audio.terminate.assert_called_once()

    @patch('pyaudio.PyAudio')
    @patch('sys.stdin', StringIO("invalid\nquit\n"))
    def test_run_ignores_invalid_commands(self, mock_pyaudio):
        """Test that invalid commands are ignored"""
        recorder = SimpleRecorder()

        with patch.object(recorder, 'start') as mock_start, \
             patch.object(recorder, 'stop') as mock_stop, \
             patch('sys.stdout', new_callable=StringIO):

            recorder.run()

            # Verify valid commands were not called
            mock_start.assert_not_called()
            mock_stop.assert_not_called()
