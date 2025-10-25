#!/usr/bin/env python3
import os
import sys
import wave
import pyaudio
from datetime import datetime

# Add src to path for core module imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'python'))

from core.error_handler import error_handler, ErrorLevel
from core.validators import FileValidator, ValidationError

class SimpleRecorder:
    def __init__(self):
        self.recording = False
        self.frames = []
        self.audio = None
        self.stream = None
        # Output to project folder, not ~/09-personal
        self.output_dir = os.path.join(os.path.dirname(__file__), "outputs", "audio")

        try:
            # Validate and create output directory
            FileValidator.validate_directory_exists(self.output_dir, create=True)

            # Initialize PyAudio
            self.audio = pyaudio.PyAudio()

        except Exception as e:
            error_handler.handle_exception("SimpleRecorder.__init__", e, fatal=True)
        
    def audio_callback(self, in_data, frame_count, time_info, status):
        """PyAudio callback for audio capture."""
        try:
            if status:
                error_handler.notify(
                    ErrorLevel.WARNING,
                    "SimpleRecorder.audio_callback",
                    "AudioStreamWarning",
                    f"Stream status: {status}"
                )

            if self.recording:
                self.frames.append(in_data)

            return (in_data, pyaudio.paContinue)

        except Exception as e:
            error_handler.handle_exception("SimpleRecorder.audio_callback", e)
            return (None, pyaudio.paAbort)

    def start(self):
        """Start audio recording."""
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
    
    def stop(self):
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

    def save_wav(self):
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
    
    def run(self):
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

    def cleanup(self):
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
