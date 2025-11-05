#!/usr/bin/env python3
"""
PyAudio Test Script - Verify audio recording works
Tests microphone input and saves a 5-second WAV file
"""

import pyaudio
import wave
import sys
from datetime import datetime

# Audio configuration
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
RECORD_SECONDS = 5


def list_audio_devices():
    """List all available audio input devices"""
    p = pyaudio.PyAudio()
    print("\n=== Available Audio Input Devices ===")

    info = p.get_host_api_info_by_index(0)
    num_devices = info.get("deviceCount")

    for i in range(num_devices):
        device_info = p.get_device_info_by_host_api_device_index(0, i)
        if device_info.get("maxInputChannels") > 0:
            print(f"Device {i}: {device_info.get('name')}")
            print(f"  Max Input Channels: {device_info.get('maxInputChannels')}")
            print(f"  Default Sample Rate: {device_info.get('defaultSampleRate')}")

    p.terminate()
    print()


def test_recording():
    """Test audio recording for 5 seconds"""
    p = pyaudio.PyAudio()

    print("\n=== Recording Test ===")
    print(f"Format: {FORMAT} (16-bit)")
    print(f"Channels: {CHANNELS} (Mono)")
    print(f"Sample Rate: {RATE} Hz")
    print(f"Duration: {RECORD_SECONDS} seconds")

    try:
        # Open stream
        stream = p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
        )

        print("\n🎤 Recording... (speak into your microphone)")

        frames = []

        # Record audio
        for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            frames.append(data)

            # Progress indicator
            if i % 10 == 0:
                print(".", end="", flush=True)

        print("\n✅ Recording complete!")

        # Stop and close stream
        stream.stop_stream()
        stream.close()

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_recording_{timestamp}.wav"
        output_path = f"outputs/audio/{filename}"

        # Save to WAV file
        wf = wave.open(output_path, "wb")
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b"".join(frames))
        wf.close()

        print(f"💾 Saved to: {output_path}")

    except IOError as e:
        print(f"\n❌ Error: {e}")
        print("Check that your microphone is connected and permissions are granted.")
        return False

    finally:
        p.terminate()

    return True


def main():
    """Main test function"""
    print("\n" + "=" * 50)
    print("PyAudio Recording Test")
    print("=" * 50)

    # List available devices
    list_audio_devices()

    # Test recording
    success = test_recording()

    if success:
        print("\n✅ All tests passed!")
        print("PyAudio is working correctly.\n")
        return 0
    else:
        print("\n❌ Tests failed!")
        print("Check PyAudio installation and microphone permissions.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
