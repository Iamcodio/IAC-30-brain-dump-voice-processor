/**
 * Main renderer script for index.html
 * Communicates with main process ONLY via window.electronAPI (preload.js)
 */

// Import constants (browser environment - need to use a different approach)
// Note: In browser context, we can't use require(). Constants are duplicated here.
// TODO: Consider bundling if this becomes maintenance burden.

// Constants from src/config/constants.js
const STATUS_MESSAGES = {
  READY: 'Ready - Press Ctrl+Y to start',
  RECORDING: 'Recording...',
  TRANSCRIBING: 'Transcribing...'
};
const CSS_CLASSES = {
  READY: 'ready',
  RECORDING: 'recording'
};

// DOM Elements
const statusElement = document.getElementById('status');
const historyBtn = document.getElementById('historyBtn');

// Event listeners from main process
window.electronAPI.onRecordingStarted(() => {
  statusElement.textContent = STATUS_MESSAGES.RECORDING;
  statusElement.className = CSS_CLASSES.RECORDING;
});

window.electronAPI.onRecordingStopped(() => {
  statusElement.textContent = STATUS_MESSAGES.READY;
  statusElement.className = CSS_CLASSES.READY;
});

window.electronAPI.onTranscriptionStarted(() => {
  statusElement.textContent = STATUS_MESSAGES.TRANSCRIBING;
  statusElement.className = CSS_CLASSES.RECORDING;
});

window.electronAPI.onTranscriptionComplete(() => {
  statusElement.textContent = STATUS_MESSAGES.READY;
  statusElement.className = CSS_CLASSES.READY;
});

// Navigation
historyBtn.addEventListener('click', () => {
  window.electronAPI.showHistory();
});
