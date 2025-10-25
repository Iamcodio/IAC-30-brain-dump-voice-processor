/**
 * Main renderer script for index.html
 * Communicates with main process ONLY via window.electronAPI (preload.js)
 */

// DOM Elements
const statusElement = document.getElementById('status');
const historyBtn = document.getElementById('historyBtn');

// Event listeners from main process
window.electronAPI.onRecordingStarted(() => {
  statusElement.textContent = 'Recording...';
  statusElement.className = 'recording';
});

window.electronAPI.onRecordingStopped(() => {
  statusElement.textContent = 'Ready - Press Ctrl+Y to start';
  statusElement.className = 'ready';
});

window.electronAPI.onTranscriptionStarted(() => {
  statusElement.textContent = 'Transcribing...';
  statusElement.className = 'recording';
});

window.electronAPI.onTranscriptionComplete(() => {
  statusElement.textContent = 'Ready - Press Ctrl+Y to start';
  statusElement.className = 'ready';
});

// Navigation
historyBtn.addEventListener('click', () => {
  window.electronAPI.showHistory();
});
