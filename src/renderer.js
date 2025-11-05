/**
 * Minimal overlay renderer
 * Handles state transitions and auto-hide logic
 */

// DOM Elements
const overlayContainer = document.getElementById('overlay-container');

// Auto-hide timer
let autoHideTimer = null;

/**
 * Clear auto-hide timer if exists
 */
function clearAutoHideTimer() {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
}

/**
 * Schedule auto-hide after delay
 */
function scheduleAutoHide(delayMs = 2000) {
  clearAutoHideTimer();
  autoHideTimer = setTimeout(() => {
    window.electronAPI.hideOverlay();
  }, delayMs);
}

// Recording started: show overlay, add recording state
window.electronAPI.onRecordingStarted(() => {
  clearAutoHideTimer();
  overlayContainer.classList.remove('processing');
  overlayContainer.classList.add('recording');
});

// Recording stopped: remove recording state, add processing state
window.electronAPI.onRecordingStopped(() => {
  overlayContainer.classList.remove('recording');
  overlayContainer.classList.add('processing');
});

// Transcription started: continue processing state
window.electronAPI.onTranscriptionStarted(() => {
  overlayContainer.classList.add('processing');
});

// Transcription complete: remove processing state, schedule auto-hide
window.electronAPI.onTranscriptionComplete(() => {
  overlayContainer.classList.remove('processing');
  scheduleAutoHide(2000); // Hide after 2 seconds
});
