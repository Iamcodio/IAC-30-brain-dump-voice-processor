/**
 * Overlay Controller - State Manager for Overlay Window
 * Handles transitions between recording, minimized, and result states
 */

class OverlayController {
  constructor() {
    this.currentState = 'minimized';
    this.stateConfig = {
      minimized: {
        html: this.getMinimizedHTML(),
        width: 80,
        height: 80
      },
      recording: {
        html: this.getRecordingHTML(),
        width: 300,
        height: 120
      },
      result: {
        html: this.getResultHTML(),
        width: 400,
        height: 200
      }
    };

    this.initializeIPC();
    this.loadInitialState();
  }

  initializeIPC() {
    // Listen for state change commands from main process
    window.electronAPI.onOverlayStateChange((newState, data) => {
      this.setState(newState, data);
    });

    // Listen for recording events
    window.electronAPI.onRecordingStarted(() => {
      this.setState('recording');
    });

    window.electronAPI.onRecordingStopped(() => {
      this.setState('result', { status: 'transcribing' });
    });

    window.electronAPI.onTranscriptionComplete((result) => {
      this.setState('result', {
        status: 'complete',
        text: result.text,
        file: result.file
      });
    });
  }

  loadInitialState() {
    // Start in minimized state
    this.setState('minimized');
  }

  setState(newState, data = {}) {
    if (!this.stateConfig[newState]) {
      console.error(`Invalid state: ${newState}`);
      return;
    }

    this.currentState = newState;
    const config = this.stateConfig[newState];

    // Update content
    document.body.innerHTML = config.html;

    // Notify main process to resize window
    window.electronAPI.resizeOverlay(config.width, config.height);

    // Bind event listeners for new content
    this.bindEventListeners(newState, data);

    // Update state-specific content if data provided
    if (Object.keys(data).length > 0) {
      this.updateContent(newState, data);
    }
  }

  bindEventListeners(state, data) {
    switch (state) {
      case 'minimized':
        const minimizedBtn = document.getElementById('minimized-btn');
        if (minimizedBtn) {
          minimizedBtn.addEventListener('click', () => {
            window.electronAPI.toggleRecording();
          });
        }
        break;

      case 'recording':
        const stopBtn = document.getElementById('stop-recording-btn');
        if (stopBtn) {
          stopBtn.addEventListener('click', () => {
            window.electronAPI.stopRecording();
          });
        }
        this.startRecordingTimer();

        // Start waveform visualization (defined in overlay.js)
        if (typeof startRecordingVisualization === 'function') {
          startRecordingVisualization().catch(err => {
            console.error('Failed to start waveform visualization:', err);
          });
        }
        break;

      case 'result':
        const copyBtn = document.getElementById('copy-result-btn');
        const closeBtn = document.getElementById('close-result-btn');

        // Stop waveform visualization when recording ends
        if (typeof stopRecordingVisualization === 'function') {
          stopRecordingVisualization();
        }

        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            const textElement = document.getElementById('result-text');
            if (textElement) {
              navigator.clipboard.writeText(textElement.textContent);
              copyBtn.textContent = 'Copied!';
              setTimeout(() => {
                copyBtn.textContent = 'Copy';
              }, 2000);
            }
          });
        }

        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            this.setState('minimized');
          });
        }
        break;
    }
  }

  updateContent(state, data) {
    switch (state) {
      case 'result':
        if (data.status === 'transcribing') {
          const statusElement = document.getElementById('result-status');
          if (statusElement) {
            statusElement.textContent = 'Transcribing...';
            statusElement.className = 'status transcribing';
          }
        } else if (data.status === 'complete') {
          const statusElement = document.getElementById('result-status');
          const textElement = document.getElementById('result-text');

          if (statusElement) {
            statusElement.textContent = 'Complete';
            statusElement.className = 'status complete';
          }

          if (textElement && data.text) {
            textElement.textContent = data.text;
          }
        }
        break;
    }
  }

  startRecordingTimer() {
    let seconds = 0;
    const timerElement = document.getElementById('recording-timer');

    if (!timerElement) return;

    this.recordingInterval = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopRecordingTimer() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  getMinimizedHTML() {
    return `
      <div class="overlay-container minimized">
        <button id="minimized-btn" class="minimized-button" title="Start Recording (Ctrl+Y)">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
      </div>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }
        .overlay-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .minimized-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 122, 255, 0.9);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .minimized-button:hover {
          background: rgba(0, 122, 255, 1);
          transform: scale(1.1);
        }
        .minimized-button:active {
          transform: scale(0.95);
        }
      </style>
    `;
  }

  getRecordingHTML() {
    return `
      <div class="overlay-container recording">
        <div class="recording-content">
          <div class="recording-indicator">
            <div class="pulse-dot"></div>
            <span class="recording-label">Recording</span>
          </div>
          <div class="recording-time" id="recording-timer">0:00</div>
          <canvas id="waveform" class="waveform-canvas"></canvas>
          <button id="stop-recording-btn" class="stop-button">Stop</button>
        </div>
      </div>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }
        .overlay-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 12px;
        }
        .recording-content {
          text-align: center;
          color: white;
          padding: 20px;
          width: 100%;
        }
        .recording-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        .pulse-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ff3b30;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .recording-label {
          font-size: 16px;
          font-weight: 600;
        }
        .recording-time {
          font-size: 24px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          margin-bottom: 15px;
        }
        .waveform-canvas {
          width: 260px;
          height: 80px;
          margin: 15px auto;
          display: block;
          border-radius: 8px;
          overflow: hidden;
        }
        .stop-button {
          padding: 8px 24px;
          border-radius: 6px;
          border: none;
          background: #ff3b30;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .stop-button:hover {
          background: #ff2d23;
          transform: scale(1.05);
        }
        .stop-button:active {
          transform: scale(0.95);
        }
      </style>
    `;
  }

  getResultHTML() {
    return `
      <div class="overlay-container result">
        <div class="result-content">
          <div id="result-status" class="status transcribing">Transcribing...</div>
          <div id="result-text" class="result-text"></div>
          <div class="result-actions">
            <button id="copy-result-btn" class="action-button primary">Copy</button>
            <button id="close-result-btn" class="action-button secondary">Close</button>
          </div>
        </div>
      </div>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }
        .overlay-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 12px;
        }
        .result-content {
          width: 100%;
          height: 100%;
          padding: 20px;
          display: flex;
          flex-direction: column;
          color: white;
        }
        .status {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }
        .status.transcribing {
          color: #ffd60a;
        }
        .status.complete {
          color: #30d158;
        }
        .result-text {
          flex: 1;
          font-size: 14px;
          line-height: 1.5;
          overflow-y: auto;
          margin-bottom: 15px;
          padding-right: 5px;
          color: rgba(255, 255, 255, 0.9);
        }
        .result-text::-webkit-scrollbar {
          width: 4px;
        }
        .result-text::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .result-text::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }
        .result-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .action-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .action-button.primary {
          background: #007aff;
          color: white;
        }
        .action-button.primary:hover {
          background: #0051d5;
        }
        .action-button.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        .action-button.secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .action-button:active {
          transform: scale(0.95);
        }
      </style>
    `;
  }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.overlayController = new OverlayController();
});
