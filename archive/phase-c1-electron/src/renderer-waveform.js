/**
 * Waveform integration for BrainDump Voice Processor
 * Manages real-time audio visualization during recording
 */

import { WaveformVisualizer } from './renderer/components/waveform.js';

/**
 * RecorderWaveformManager
 * Coordinates waveform visualization with recording lifecycle
 */
class RecorderWaveformManager {
  constructor() {
    this.waveform = null;
    this.audioStream = null;
    this.isRecording = false;

    // DOM element
    this.canvas = document.getElementById('waveform-canvas');

    // Initialize
    this.init();
  }

  /**
   * Initialize the waveform visualizer
   */
  init() {
    try {
      if (!this.canvas) {
        console.warn('Waveform canvas not found - visualization disabled');
        return;
      }

      // Create visualizer instance
      this.waveform = new WaveformVisualizer(this.canvas);
      console.log('WaveformVisualizer initialized');

      // Listen to recording lifecycle events
      this.setupEventListeners();

      // Canvas is fixed size (400x50), no responsive sizing needed
    } catch (error) {
      console.error('Failed to initialize waveform:', error);
    }
  }

  /**
   * Setup event listeners for recording lifecycle
   */
  setupEventListeners() {
    // Recording started - initialize and start waveform
    window.electronAPI.onRecordingStarted(() => {
      console.log('Recording started - starting waveform');
      this.startWaveform();
    });

    // Recording stopped - stop and cleanup waveform
    window.electronAPI.onRecordingStopped(() => {
      console.log('Recording stopped - stopping waveform');
      this.stopWaveform();
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Start waveform visualization
   * Requests microphone access and initializes audio pipeline
   */
  async startWaveform() {
    if (this.isRecording) {
      console.warn('Waveform already recording');
      return;
    }

    try {
      // Request microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,  // Disable processing for accurate visualization
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Initialize waveform from stream
      if (this.waveform) {
        await this.waveform.initFromStream(this.audioStream);
        this.waveform.start();

        this.isRecording = true;
        console.log('Waveform started successfully');
      }
    } catch (error) {
      console.error('Failed to start waveform:', error);
      this.handleMicrophoneError(error);
    }
  }

  /**
   * Stop waveform visualization
   * Cleans up audio stream and resets UI
   */
  stopWaveform() {
    if (!this.isRecording) {
      return;
    }

    try {
      // Stop waveform animation
      if (this.waveform) {
        this.waveform.stop();
      }

      // Stop and cleanup audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => {
          track.stop();
          console.log('Audio track stopped:', track.label);
        });
        this.audioStream = null;
      }

      this.isRecording = false;
      console.log('Waveform stopped successfully');
    } catch (error) {
      console.error('Failed to stop waveform:', error);
    }
  }

  /**
   * Handle microphone access errors
   */
  handleMicrophoneError(error) {
    console.error('Microphone error:', error);

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      console.warn('Microphone permission denied. Please grant microphone access in System Preferences > Security & Privacy > Microphone');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      console.warn('No microphone found. Please connect a microphone and try again.');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      console.warn('Microphone is already in use. Close other applications using the microphone.');
    }

    // Stop recording if error occurs
    this.isRecording = false;
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    console.log('Cleaning up waveform manager');

    // Stop if recording
    if (this.isRecording) {
      this.stopWaveform();
    }

    // Cleanup waveform visualizer
    if (this.waveform) {
      this.waveform.cleanup();
      this.waveform = null;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isRecording: this.isRecording,
      hasStream: !!this.audioStream,
      waveformActive: this.waveform ? this.waveform.isActive() : false,
      currentVolume: this.waveform ? this.waveform.getCurrentVolume() : 0,
      currentFps: this.waveform ? this.waveform.getCurrentFps() : 0,
      silenceWarning: this.waveform ? this.waveform.isSilenceWarningActive() : false
    };
  }
}

// Initialize waveform manager
let waveformManager = null;

try {
  waveformManager = new RecorderWaveformManager();
  console.log('RecorderWaveformManager initialized');
} catch (error) {
  console.error('Failed to initialize RecorderWaveformManager:', error);
}

// Expose for debugging (development only)
// Note: In browser context, we don't have process.env
// Expose globally for debugging purposes
window.__waveformManager = waveformManager;

export { RecorderWaveformManager };
