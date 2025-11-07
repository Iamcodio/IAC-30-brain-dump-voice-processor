// src/renderer/waveform.js

class WaveformVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.canvasCtx = this.canvas.getContext('2d');
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.animationId = null;
    this.isRecording = false;

    // Waveform style settings
    this.lineWidth = 2;
    this.strokeStyle = 'rgba(0, 255, 100, 0.9)';
    this.glowColor = 'rgba(0, 255, 100, 0.3)';
  }

  /**
   * Initialize audio context and start recording
   */
  async startRecording() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Setup AudioContext for visualization
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);

      // Create analyser node for waveform data
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect audio graph
      source.connect(this.analyser);

      // Setup MediaRecorder for actual recording
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.processAudioBlob(audioBlob);
        this.audioChunks = [];

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      // Start visualization
      this.draw();

      return true;
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Please allow microphone access to record audio');
      return false;
    }
  }

  /**
   * Stop recording and return audio data
   */
  stopRecording() {
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear canvas
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw waveform animation loop
   */
  draw() {
    if (!this.isRecording) return;

    this.animationId = requestAnimationFrame(() => this.draw());

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Get time domain data (waveform)
    this.analyser.getByteTimeDomainData(dataArray);

    // Clear canvas with fade effect
    this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw waveform with glow effect
    this.drawWaveform(dataArray, bufferLength);
  }

  /**
   * Draw waveform on canvas
   */
  drawWaveform(dataArray, bufferLength) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerY = height / 2;

    // Draw glow layer
    this.canvasCtx.lineWidth = this.lineWidth + 4;
    this.canvasCtx.strokeStyle = this.glowColor;
    this.canvasCtx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // Normalize to 0-2
      const y = v * centerY;

      if (i === 0) {
        this.canvasCtx.moveTo(x, y);
      } else {
        this.canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.canvasCtx.stroke();

    // Draw main waveform line
    this.canvasCtx.lineWidth = this.lineWidth;
    this.canvasCtx.strokeStyle = this.strokeStyle;
    this.canvasCtx.beginPath();

    x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * centerY;

      if (i === 0) {
        this.canvasCtx.moveTo(x, y);
      } else {
        this.canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.canvasCtx.stroke();
  }

  /**
   * Process recorded audio blob (send to transcription)
   */
  async processAudioBlob(audioBlob) {
    // Convert blob to ArrayBuffer for processing
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Here you would send to Whisper API or other transcription service
    // For now, simulate with a placeholder
    console.log('Audio recorded, size:', arrayBuffer.byteLength);

    // Simulate transcription result
    setTimeout(() => {
      const mockTranscription = "This is a test transcription";
      this.onTranscriptionComplete(mockTranscription);
    }, 500);
  }

  /**
   * Handle transcription completion
   */
  onTranscriptionComplete(text) {
    // This will be overridden by overlay.js
    console.log('Transcription:', text);
  }
}

// Export for use in overlay.js
window.WaveformVisualizer = WaveformVisualizer;
