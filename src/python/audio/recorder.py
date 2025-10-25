#!/usr/bin/env python3
"""
Brain Dump Voice Recorder
Production audio recorder for Electron frontend
"""

import pyaudio
import wave
import sys
import signal
import argparse
from datetime import datetime
from pathlib import Path

class VoiceRecorder:
    """Audio recorder with start/stop control"""
    
    def __init__(self, device_index=None, output_dir="outputs/audio"):
        self.device_index = device_index
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Audio configuration
        self.CHUNK = 1024
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.RATE = 44100
        
        self.recording = False
        self.frames = []
        self.stream = None
        self.audio = None
        
    def start(self):
        """Start recording"""
        try:
            self.audio = pyaudio.PyAudio()
            
            # Open stream
            self.stream = self.audio.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                input_device_index=self.device_index,
                frames_per_buffer=self.CHUNK
            )
            
            self.recording = True
            self.frames = []
            
            print("RECORDING_STARTED", flush=True)
            
            # Record until stopped
            while self.recording:
                try:
                    data = self.stream.read(self.CHUNK, exception_on_overflow=False)
                    self.frames.append(data)
                except IOError as e:
                    print(f"WARNING: {e}", file=sys.stderr, flush=True)
                    continue
                    
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr, flush=True)
            return False
            
        return True
    
    def stop(self):
        """Stop recording and save file"""
        self.recording = False
        
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        
        if self.audio:
            self.audio.terminate()
        
        # Save to file
        if self.frames:
            filename = self.save_recording()
            print(f"RECORDING_SAVED:{filename}", flush=True)
            return filename
        
        return None
    
    def save_recording(self):
        """Save recorded frames to WAV file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"brain_dump_{timestamp}.wav"
        filepath = self.output_dir / filename
        
        wf = wave.open(str(filepath), 'wb')
        wf.setnchannels(self.CHANNELS)
        wf.setsampwidth(self.audio.get_sample_size(self.FORMAT))
        wf.setframerate(self.RATE)
        wf.writeframes(b''.join(self.frames))
        wf.close()
        
        return str(filepath)
    
    def handle_signal(self, signum, frame):
        """Handle interrupt signal (Ctrl+C or process kill)"""
        print("RECORDING_STOPPED", flush=True)
        self.stop()
        sys.exit(0)

def list_devices():
    """List available audio input devices"""
    p = pyaudio.PyAudio()
    
    info = p.get_host_api_info_by_index(0)
    num_devices = info.get('deviceCount')
    
    devices = []
    for i in range(num_devices):
        device_info = p.get_device_info_by_host_api_device_index(0, i)
        if device_info.get('maxInputChannels') > 0:
            devices.append({
                'index': i,
                'name': device_info.get('name'),
                'channels': device_info.get('maxInputChannels'),
                'rate': device_info.get('defaultSampleRate')
            })
    
    p.terminate()
    
    # Output as JSON for Electron to parse
    import json
    print(json.dumps(devices))
    
    return devices

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Brain Dump Voice Recorder')
    parser.add_argument('--device', type=int, default=None, help='Audio input device index')
    parser.add_argument('--output', type=str, default='outputs/audio', help='Output directory')
    parser.add_argument('--list-devices', action='store_true', help='List available devices')
    
    args = parser.parse_args()
    
    # List devices and exit
    if args.list_devices:
        list_devices()
        return 0
    
    # Start recorder
    recorder = VoiceRecorder(device_index=args.device, output_dir=args.output)
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, recorder.handle_signal)
    signal.signal(signal.SIGTERM, recorder.handle_signal)
    
    # Start recording (blocks until stopped)
    recorder.start()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
