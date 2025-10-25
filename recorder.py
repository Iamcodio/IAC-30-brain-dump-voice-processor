#!/usr/bin/env python3
import os
import sys
import wave
import pyaudio
from datetime import datetime

class SimpleRecorder:
    def __init__(self):
        self.recording = False
        self.frames = []
        self.audio = pyaudio.PyAudio()
        self.stream = None
        # Output to project folder, not ~/09-personal
        self.output_dir = os.path.join(os.path.dirname(__file__), "outputs", "audio")
        os.makedirs(self.output_dir, exist_ok=True)
        
    def audio_callback(self, in_data, frame_count, time_info, status):
        if self.recording:
            self.frames.append(in_data)
        return (in_data, pyaudio.paContinue)
    
    def start(self):
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
    
    def stop(self):
        self.recording = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None
        if self.frames:
            filename = self.save_wav()
            print(f"RECORDING_STOPPED:{filename}", flush=True)
        else:
            print("RECORDING_STOPPED:no_audio", flush=True)
    
    def save_wav(self):
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"recording_{timestamp}.wav"
        filepath = os.path.join(self.output_dir, filename)
        wf = wave.open(filepath, 'wb')
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(44100)
        wf.writeframes(b''.join(self.frames))
        wf.close()
        return filepath
    
    def run(self):
        print("READY", flush=True)
        for line in sys.stdin:
            command = line.strip()
            if command == "start":
                self.start()
            elif command == "stop":
                self.stop()
            elif command == "quit":
                if self.stream:
                    self.stream.close()
                self.audio.terminate()
                break

if __name__ == "__main__":
    recorder = SimpleRecorder()
    recorder.run()
