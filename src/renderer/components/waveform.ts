/**
 * WaveformVisualizer - Real-time audio waveform renderer
 *
 * Displays live audio amplitude data as animated colored bars on HTML canvas.
 * Uses Web Audio API for frequency analysis and requestAnimationFrame for smooth rendering.
 *
 * @example
 * ```typescript
 * const canvas = document.getElementById('waveform') as HTMLCanvasElement;
 * const visualizer = new WaveformVisualizer(canvas);
 *
 * const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 * await visualizer.initFromStream(stream);
 * visualizer.start();
 *
 * // Later...
 * visualizer.stop();
 * ```
 */
export class WaveformVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array;
  private animationId: number | null = null;
  private isRunning: boolean = false;

  // Canvas dimensions (mutable for responsive sizing)
  private WIDTH = 800;
  private HEIGHT = 120;
  private readonly BAR_WIDTH = 3;
  private readonly BAR_GAP = 1;

  // Audio analysis settings
  private readonly FFT_SIZE = 256; // Produces 128 frequency bins
  private readonly SMOOTHING = 0.8; // Temporal smoothing (0-1)
  private readonly TARGET_FPS = 30;
  private readonly FRAME_INTERVAL = 1000 / this.TARGET_FPS;

  // Rendering colors
  private readonly BG_COLOR = '#1a1a1a';
  private readonly LOW_COLOR = { r: 0, g: 136, b: 68 };      // Green
  private readonly MID_COLOR = { r: 255, g: 204, b: 0 };     // Yellow
  private readonly HIGH_COLOR = { r: 255, g: 68, b: 68 };    // Red

  // Performance tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = Date.now();
  private currentFps: number = 30;

  // Volume monitoring
  private currentVolume: number = 0;

  // Silence detection
  private silenceStartTime: number | null = null;
  private readonly SILENCE_THRESHOLD = 0.05; // 5% volume
  private readonly SILENCE_WARNING_MS = 2000; // 2 seconds
  private showingSilenceWarning: boolean = false;

  /**
   * Creates a new WaveformVisualizer instance
   * @param canvasElement - The HTML canvas element to render on
   * @throws Error if canvas context cannot be created
   */
  constructor(canvasElement: HTMLCanvasElement) {
    this.canvas = canvasElement;

    // Initialize canvas dimensions
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;

    // Get 2D rendering context
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas context. Canvas may not be supported.');
    }
    this.ctx = context;

    // Pre-allocate frequency data array (will be resized in initFromStream)
    this.dataArray = new Uint8Array(this.FFT_SIZE / 2);

    // Set initial canvas state
    this.clearCanvas();
  }

  /**
   * Initializes the audio pipeline from a MediaStream
   * Creates AudioContext, connects analyser node, and configures FFT
   *
   * @param stream - MediaStream from getUserMedia or other audio source
   * @throws Error if Web Audio API is not supported or stream is invalid
   */
  async initFromStream(stream: MediaStream): Promise<void> {
    try {
      // Validate stream
      if (!stream || !stream.getAudioTracks || stream.getAudioTracks().length === 0) {
        throw new Error('Invalid MediaStream: no audio tracks found');
      }

      // Create audio context (prefer standard API, fallback to webkit)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported in this browser');
      }

      this.audioContext = new AudioContextClass();

      // Create analyser node for frequency analysis
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = this.SMOOTHING;

      // Create source from media stream
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

      // Connect audio graph: source → analyser (no output to speakers)
      this.mediaStreamSource.connect(this.analyser);

      // Allocate frequency data buffer (frequencyBinCount = fftSize / 2)
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      console.log(`WaveformVisualizer initialized: ${bufferLength} frequency bins, ${this.TARGET_FPS}fps target`);
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to initialize audio pipeline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Starts the animation loop
   * Begins rendering waveform at target FPS using requestAnimationFrame
   */
  start(): void {
    if (this.isRunning) {
      console.warn('WaveformVisualizer already running');
      return;
    }

    if (!this.analyser) {
      throw new Error('Cannot start: call initFromStream() first');
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.render();
    console.log('WaveformVisualizer started');
  }

  /**
   * Stops the animation loop and clears the canvas
   * Does not disconnect audio nodes (call cleanup() for full teardown)
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.clearCanvas();
    console.log('WaveformVisualizer stopped');
  }

  /**
   * Cleans up all resources (audio nodes, contexts, animation frames)
   * Call this when permanently done with the visualizer
   */
  cleanup(): void {
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

  /**
   * Main render loop - draws one frame of the waveform
   * Called recursively via requestAnimationFrame at ~30fps
   */
  private render(): void {
    if (!this.isRunning || !this.analyser) {
      return;
    }

    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.render());

    // Frame rate limiting to 30fps
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed < this.FRAME_INTERVAL) {
      return; // Skip this frame to maintain target FPS
    }

    this.lastFrameTime = now;

    // Update FPS counter
    this.updateFpsCounter();

    // Get current frequency data (0-255 per bin)
    // @ts-ignore - TypeScript has issues with Uint8Array types in Web Audio API
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume from frequency data
    this.updateVolume();

    // Clear canvas for new frame
    this.clearCanvas();

    // Check for silence and show warning if needed
    this.checkSilence();

    // Calculate number of bars that fit in canvas width
    const barUnit = this.BAR_WIDTH + this.BAR_GAP;
    const barCount = Math.floor(this.WIDTH / barUnit);

    // Calculate how many frequency bins to average per bar
    const binsPerBar = Math.floor(this.dataArray.length / barCount);

    // Draw each bar
    for (let i = 0; i < barCount; i++) {
      // Average multiple frequency bins into one bar (downsampling)
      let sum = 0;
      const startBin = i * binsPerBar;
      const endBin = Math.min(startBin + binsPerBar, this.dataArray.length);

      for (let j = startBin; j < endBin; j++) {
        sum += this.dataArray[j];
      }

      const avgAmplitude = sum / (endBin - startBin);

      // Normalize to 0.0-1.0 range
      const intensity = avgAmplitude / 255;

      // Calculate bar height (scale to canvas height)
      const barHeight = intensity * this.HEIGHT;

      // Calculate bar position
      const x = i * barUnit;
      const y = this.HEIGHT - barHeight; // Draw from bottom up

      // Set color based on intensity
      this.ctx.fillStyle = this.getColorForIntensity(intensity);

      // Draw bar
      this.ctx.fillRect(x, y, this.BAR_WIDTH, barHeight);
    }

    // Draw volume indicator on top of waveform
    this.drawVolumeIndicator();
  }

  /**
   * Maps audio intensity to color gradient
   * 0.0-0.5: Green → Yellow
   * 0.5-1.0: Yellow → Red
   *
   * @param intensity - Normalized amplitude (0.0-1.0)
   * @returns CSS RGB color string
   */
  private getColorForIntensity(intensity: number): string {
    // Clamp intensity to valid range
    const clamped = Math.max(0, Math.min(1, intensity));

    if (clamped < 0.5) {
      // Green → Yellow transition (0.0-0.5)
      const t = clamped * 2; // Normalize to 0-1
      const r = Math.floor(this.LOW_COLOR.r + (this.MID_COLOR.r - this.LOW_COLOR.r) * t);
      const g = Math.floor(this.LOW_COLOR.g + (this.MID_COLOR.g - this.LOW_COLOR.g) * t);
      const b = Math.floor(this.LOW_COLOR.b + (this.MID_COLOR.b - this.LOW_COLOR.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow → Red transition (0.5-1.0)
      const t = (clamped - 0.5) * 2; // Normalize to 0-1
      const r = Math.floor(this.MID_COLOR.r + (this.HIGH_COLOR.r - this.MID_COLOR.r) * t);
      const g = Math.floor(this.MID_COLOR.g + (this.HIGH_COLOR.g - this.MID_COLOR.g) * t);
      const b = Math.floor(this.MID_COLOR.b + (this.HIGH_COLOR.b - this.MID_COLOR.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  /**
   * Clears the entire canvas to background color
   */
  private clearCanvas(): void {
    this.ctx.fillStyle = this.BG_COLOR;
    this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
  }

  /**
   * Updates current volume from frequency data
   */
  private updateVolume(): void {
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    this.currentVolume = (sum / this.dataArray.length) / 255;
  }

  /**
   * Draws volume percentage indicator
   */
  private drawVolumeIndicator(): void {
    const percentage = Math.round(this.currentVolume * 100);
    const x = this.WIDTH - 60;
    const y = this.HEIGHT - 15;

    // Draw background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - 5, y - 18, 55, 20);

    // Draw text
    this.ctx.fillStyle = this.getVolumeColor(percentage);
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${percentage}%`, x + 45, y);
  }

  /**
   * Maps volume percentage to color
   * @param percentage - Volume level 0-100
   * @returns CSS color string
   */
  private getVolumeColor(percentage: number): string {
    if (percentage < 20) return '#666';     // Too quiet
    if (percentage < 50) return '#00ff88';  // Good
    if (percentage < 80) return '#ffcc00';  // Loud
    return '#ff4444';                       // Too loud
  }

  /**
   * Checks for silence and shows warning if needed
   */
  private checkSilence(): void {
    const isSilent = this.currentVolume < this.SILENCE_THRESHOLD;

    if (isSilent) {
      if (this.silenceStartTime === null) {
        this.silenceStartTime = Date.now();
      }

      const silenceDuration = Date.now() - this.silenceStartTime;
      if (silenceDuration > this.SILENCE_WARNING_MS) {
        this.showSilenceWarning();
      }
    } else {
      this.silenceStartTime = null;
      this.showingSilenceWarning = false;
    }
  }

  /**
   * Displays silence warning overlay
   */
  private showSilenceWarning(): void {
    if (!this.showingSilenceWarning) {
      this.showingSilenceWarning = true;
    }

    // Draw warning overlay
    this.ctx.fillStyle = 'rgba(255, 68, 68, 0.1)';
    this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    // Draw warning text
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚠️ No audio detected', this.WIDTH / 2, this.HEIGHT / 2);
  }

  /**
   * Updates FPS counter and logs warnings if performance degrades
   */
  private updateFpsCounter(): void {
    this.frameCount++;

    const now = Date.now();
    const elapsed = now - this.lastFpsUpdate;

    if (elapsed >= 1000) { // Update every second
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      // Log if FPS drops
      if (this.currentFps < 20) {
        console.warn('Low FPS detected:', this.currentFps);
      }
    }
  }

  /**
   * Resizes the canvas to new dimensions
   * @param width - New canvas width in pixels
   * @param height - New canvas height in pixels
   */
  public resize(width: number, height: number): void {
    this.WIDTH = width;
    this.HEIGHT = height;
    this.canvas.width = width;
    this.canvas.height = height;
    console.log('Waveform resized', { width, height });
  }

  /**
   * Returns current running state
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Returns the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Returns current volume level (0.0-1.0)
   */
  public getCurrentVolume(): number {
    return this.currentVolume;
  }

  /**
   * Returns current FPS
   */
  public getCurrentFps(): number {
    return this.currentFps;
  }

  /**
   * Returns whether silence warning is currently showing
   */
  public isSilenceWarningActive(): boolean {
    return this.showingSilenceWarning;
  }
}
