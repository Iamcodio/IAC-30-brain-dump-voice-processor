#!/usr/bin/env python3
"""
Audio recorder daemon with stdin command interface.

This module provides a simple audio recorder that listens for commands
on stdin and outputs protocol messages to stdout. It uses PyAudio for
real-time audio capture with callback-based streaming.

The recorder is designed to run as a persistent background process,
spawned by the Electron main process, and communicates via line-based
text protocol.

Protocol Commands (stdin):
    start - Begin audio recording
    stop  - Stop recording and save to WAV file
    quit  - Clean up and exit

Protocol Responses (stdout):
    READY - Recorder initialized and ready
    RECORDING_STARTED - Recording has begun
    RECORDING_STOPPED:<path> - Recording saved to <path>
    ERROR:<type> - Error occurred during operation

Example:
    $ python recorder.py
    READY
    (send "start" via stdin)
    RECORDING_STARTED
    (send "stop" via stdin)
    RECORDING_STOPPED:/path/to/recording_2025-10-25_14-30-00.wav
"""
import os
import sys
import wave
import pyaudio
from datetime import datetime
from typing import Optional, List, Tuple, Mapping

# Add src to path for core module imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'python'))

from core.error_handler import error_handler, ErrorLevel  # noqa: E402
from core.validators import FileValidator  # noqa: E402


class SimpleRecorder:
    """
    Audio recorder using PyAudio with stdin command interface.

    Listens for commands on stdin (start/stop/quit) and outputs
    protocol messages (READY, RECORDING_STARTED, etc.) to stdout.
    Uses callback-based streaming for low-latency audio capture.

    Audio is recorded as 16-bit PCM WAV files at 44.1kHz mono with
    1024-frame buffers (~23ms latency).

    Attributes:
        recording (bool): Current recording state.
        frames (list): Buffer of audio data frames.
        audio (pyaudio.PyAudio): PyAudio instance for audio I/O.
        stream (pyaudio.Stream): Active audio input stream.
        output_dir (str): Directory path for saving WAV files.
    """
    def __init__(self) -> None:
        """
        Initialize the audio recorder.

        Creates the output directory structure and initializes PyAudio
        for audio capture. Validates that the output directory can be
        created and that PyAudio initializes successfully.

        Raises:
            RuntimeError: If PyAudio initialization fails.
            OSError: If output directory cannot be created.
            SystemExit: On fatal initialization errors.
        """
        self.recording: bool = False
        self.frames: List[bytes] = []
        self.audio: Optional[pyaudio.PyAudio] = None
        self.stream: Optional[pyaudio.Stream] = None
        # Output to project folder, not ~/09-personal
        self.output_dir: str = os.path.join(os.path.dirname(__file__), "outputs", "audio")

        try:
            # Validate and create output directory
            FileValidator.validate_directory_exists(self.output_dir, create=True)

            # Initialize PyAudio
            self.audio = pyaudio.PyAudio()

        except Exception as e:
            error_handler.handle_exception("SimpleRecorder.__init__", e, fatal=True)

    def audio_callback(
        self,
        in_data: Optional[bytes],
        frame_count: int,
        time_info: Mapping[str, float],
        status: int
    ) -> Tuple[Optional[bytes], int]:
        """
        PyAudio stream callback for real-time audio capture.

        Called automatically by PyAudio when audio frames are available.
        Appends frames to buffer when recording is active. Logs warnings
        if stream status indicates issues.

        Args:
            in_data (bytes): Raw audio data from input device.
            frame_count (int): Number of frames in in_data.
            time_info (Mapping[str, float]): Timing information from PyAudio.
            status (int): Stream status flags (0 = no errors).

        Returns:
            tuple: (in_data, pyaudio.paContinue) to continue stream,
                   or (None, pyaudio.paAbort) on error.
        """
        try:
            if status:
                error_handler.notify(
                    ErrorLevel.WARNING,
                    "SimpleRecorder.audio_callback",
                    "AudioStreamWarning",
                    f"Stream status: {status}"
                )

            if self.recording and in_data:
                self.frames.append(in_data)

            return (in_data, pyaudio.paContinue)

        except Exception as e:
            error_handler.handle_exception("SimpleRecorder.audio_callback", e)
            return (None, pyaudio.paAbort)

    def start(self) -> None:
        """
        Start audio recording.

        Opens a PyAudio input stream with callback-based capture.
        Clears the frame buffer and sets recording state to True.
        Outputs "RECORDING_STARTED" protocol message on success.

        Audio format: 16-bit PCM, mono, 44.1kHz, 1024-frame buffer.

        Raises:
            RuntimeError: If PyAudio not initialized.

        Outputs:
            RECORDING_STARTED - Recording began successfully.
            ERROR:RecordingStartFailed - Recording failed to start.
        """
        try:
            if self.recording:
                error_handler.notify(
                    ErrorLevel.WARNING,
                    "SimpleRecorder.start",
                    "AlreadyRecording",
                    "Recording already in progress"
                )
                return

            if not self.audio:
                raise RuntimeError("PyAudio not initialized")

            self.recording = True
            self.frames = []
            self.stream = self.audio.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=44100,
                input=True,
                frames_per_buffer=1024,
                stream_callback=self.audio_callback
            )
            print("RECORDING_STARTED", flush=True)

        except Exception as e:
            self.recording = False
            error_handler.handle_exception("SimpleRecorder.start", e)
            print("ERROR:RecordingStartFailed", flush=True)

    def stop(self) -> None:
        """Stop audio recording and save file."""
        try:
            self.recording = False

            if self.stream:
                try:
                    self.stream.stop_stream()
                    self.stream.close()
                except Exception as e:
                    error_handler.notify(
                        ErrorLevel.WARNING,
                        "SimpleRecorder.stop",
                        "StreamCloseError",
                        f"Error closing stream: {e}"
                    )
                finally:
                    self.stream = None

            if self.frames:
                filename = self.save_wav()
                print(f"RECORDING_STOPPED:{filename}", flush=True)
            else:
                error_handler.notify(
                    ErrorLevel.WARNING,
                    "SimpleRecorder.stop",
                    "NoAudioData",
                    "No audio data captured"
                )
                print("RECORDING_STOPPED:no_audio", flush=True)

        except Exception as e:
            error_handler.handle_exception("SimpleRecorder.stop", e)
            print("ERROR:RecordingStopFailed", flush=True)

    def save_wav(self) -> str:
        """Save recorded frames to WAV file."""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"recording_{timestamp}.wav"
            filepath = os.path.join(self.output_dir, filename)

            # Validate output path
            FileValidator.validate_output_path(filepath, base_dir=self.output_dir)

            # Write WAV file
            wf = wave.open(filepath, 'wb')
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(44100)
            wf.writeframes(b''.join(self.frames))
            wf.close()

            # Validate saved file
            FileValidator.validate_file_exists(filepath)

            return filepath

        except Exception as e:
            error_handler.handle_exception("SimpleRecorder.save_wav", e)
            raise

    def run(self) -> None:
        """Main event loop listening for stdin commands."""
        try:
            print("READY", flush=True)

            for line in sys.stdin:
                try:
                    command = line.strip()

                    if command == "start":
                        self.start()
                    elif command == "stop":
                        self.stop()
                    elif command == "quit":
                        self.cleanup()
                        break
                    else:
                        error_handler.notify(
                            ErrorLevel.WARNING,
                            "SimpleRecorder.run",
                            "UnknownCommand",
                            f"Unknown command: {command}"
                        )

                except Exception as e:
                    error_handler.handle_exception("SimpleRecorder.run.command", e)
                    # Continue running despite command errors

        except KeyboardInterrupt:
            error_handler.notify(
                ErrorLevel.INFO,
                "SimpleRecorder.run",
                "KeyboardInterrupt",
                "Recorder interrupted by user"
            )
        except Exception as e:
            error_handler.handle_exception("SimpleRecorder.run", e, fatal=True)
        finally:
            self.cleanup()

    def cleanup(self) -> None:
        """Clean up resources before exit."""
        try:
            if self.stream:
                try:
                    self.stream.stop_stream()
                    self.stream.close()
                except Exception as e:
                    error_handler.notify(
                        ErrorLevel.WARNING,
                        "SimpleRecorder.cleanup",
                        "StreamCleanupError",
                        f"Error closing stream: {e}"
                    )

            if self.audio:
                try:
                    self.audio.terminate()
                except Exception as e:
                    error_handler.notify(
                        ErrorLevel.WARNING,
                        "SimpleRecorder.cleanup",
                        "AudioCleanupError",
                        f"Error terminating PyAudio: {e}"
                    )

        except Exception as e:
            error_handler.notify(
                ErrorLevel.ERROR,
                "SimpleRecorder.cleanup",
                "CleanupFailed",
                f"Cleanup failed: {e}"
            )


if __name__ == "__main__":
    try:
        recorder = SimpleRecorder()
        recorder.run()
    except Exception as e:
        error_handler.handle_exception("main", e, fatal=True)
