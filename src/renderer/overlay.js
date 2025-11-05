/**
 * Overlay Waveform Visualizer
 *
 * Renders real-time audio waveform using Web Audio API.
 * Uses WaveformVisualizer class from components/waveform.js
 */

// Import WaveformVisualizer from components
// Note: This file should be loaded as a module or WaveformVisualizer should be available globally
// For now, we'll inline a simplified version that uses Web Audio API

class WaveformVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Use parent container width (overlay is 600px wide, minus padding)
    this.width = 560;
    this.height = 120;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Web Audio API components
    this.audioContext = null;
    this.analyser = null;
    this.mediaStreamSource = null;
    this.animationId = null;
    this.isRunning = false;

    // Audio analysis settings
    this.FFT_SIZE = 256;
    this.SMOOTHING = 0.8;
    this.dataArray = null;

    // Rendering colors
    this.BG_COLOR = '#1a1a1a';
    this.LOW_COLOR = { r: 34, g: 197, b: 94 };   // Green
    this.MID_COLOR = { r: 234, g: 179, b: 8 };   // Yellow
    this.HIGH_COLOR = { r: 239, g: 68, b: 68 };  // Red

    this.clearCanvas();
  }

  async initFromStream(stream) {
    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }

      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = this.SMOOTHING;

      // Connect stream to analyser
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.mediaStreamSource.connect(this.analyser);

      // Allocate frequency data buffer
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      console.log('WaveformVisualizer initialized:', bufferLength, 'frequency bins');
    } catch (error) {
      console.error('Failed to initialize audio pipeline:', error);
      this.cleanup();
      throw error;
    }
  }

  start() {
    if (this.isRunning) {
      console.warn('WaveformVisualizer already running');
      return;
    }

    if (!this.analyser) {
      throw new Error('Cannot start: call initFromStream() first');
    }

    this.isRunning = true;
    this.render();
    console.log('WaveformVisualizer started');
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearCanvas();
    console.log('WaveformVisualizer stopped');
  }

  cleanup() {
    this.stop();

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(err => {
        console.warn('Error closing AudioContext:', err);
      });
      this.audioContext = null;
    }

    console.log('WaveformVisualizer cleaned up');
  }

  render() {
    if (!this.isRunning || !this.analyser) return;

    this.animationId = requestAnimationFrame(() => this.render());

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Clear canvas
    this.clearCanvas();

    // Draw waveform bars
    const barWidth = 8;
    const barGap = 2;
    const barUnit = barWidth + barGap;
    const barCount = Math.floor(this.width / barUnit);
    const binsPerBar = Math.floor(this.dataArray.length / barCount);
    const centerY = this.height / 2;

    for (let i = 0; i < barCount; i++) {
      // Average frequency bins
      let sum = 0;
      const startBin = i * binsPerBar;
      const endBin = Math.min(startBin + binsPerBar, this.dataArray.length);

      for (let j = startBin; j < endBin; j++) {
        sum += this.dataArray[j];
      }

      const avgAmplitude = sum / (endBin - startBin);
      const intensity = avgAmplitude / 255;
      const barHeight = intensity * (this.height * 0.8); // 80% of canvas height

      const x = i * barUnit;
      const y = centerY - barHeight / 2;

      this.ctx.fillStyle = this.getColorForIntensity(intensity);
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  getColorForIntensity(intensity) {
    const clamped = Math.max(0, Math.min(1, intensity));

    if (clamped < 0.5) {
      // Green → Yellow transition
      const t = clamped * 2;
      const r = Math.floor(this.LOW_COLOR.r + (this.MID_COLOR.r - this.LOW_COLOR.r) * t);
      const g = Math.floor(this.LOW_COLOR.g + (this.MID_COLOR.g - this.LOW_COLOR.g) * t);
      const b = Math.floor(this.LOW_COLOR.b + (this.MID_COLOR.b - this.LOW_COLOR.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow → Red transition
      const t = (clamped - 0.5) * 2;
      const r = Math.floor(this.MID_COLOR.r + (this.HIGH_COLOR.r - this.MID_COLOR.r) * t);
      const g = Math.floor(this.MID_COLOR.g + (this.HIGH_COLOR.g - this.MID_COLOR.g) * t);
      const b = Math.floor(this.MID_COLOR.b + (this.HIGH_COLOR.b - this.MID_COLOR.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  clearCanvas() {
    this.ctx.fillStyle = this.BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

// Global state
let waveform = null;
let audioStream = null;

// Initialize when overlay loads
async function initializeOverlay() {
  console.log('Overlay initializing...');

  // Create waveform visualizer when canvas is available
  const canvas = document.getElementById('waveform');
  if (canvas) {
    waveform = new WaveformVisualizer(canvas);
    console.log('Waveform visualizer created');
  }
}

// Start recording visualization
async function startRecordingVisualization() {
  try {
    console.log('Starting recording visualization...');

    // Request microphone access
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone access granted');

    // Initialize waveform with audio stream
    if (waveform) {
      await waveform.initFromStream(audioStream);
      waveform.start();
      console.log('Waveform visualization started');
    }
  } catch (error) {
    console.error('Failed to start visualization:', error);
    // Show error in UI
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = 'Microphone access denied';
    }
  }
}

// Stop recording visualization
function stopRecordingVisualization() {
  console.log('Stopping recording visualization...');

  if (waveform) {
    waveform.cleanup();
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  console.log('Visualization stopped');
}

// Wait for DOM to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOverlay);
} else {
  initializeOverlay();
}

console.log('Overlay visualizer script loaded');
