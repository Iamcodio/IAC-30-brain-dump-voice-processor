const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Security boundary between main and renderer processes
 * Exposes ONLY safe, controlled APIs to renderer via contextBridge
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Recording status listeners
  onRecordingStarted: (callback) => {
    ipcRenderer.on('recording-started', callback);
  },
  onRecordingStopped: (callback) => {
    ipcRenderer.on('recording-stopped', callback);
  },
  onTranscriptionStarted: (callback) => {
    ipcRenderer.on('transcription-started', callback);
  },
  onTranscriptionComplete: (callback) => {
    ipcRenderer.on('transcription-complete', callback);
  },

  // Navigation
  showHistory: () => {
    ipcRenderer.send('show-history');
  },
  showRecorder: () => {
    ipcRenderer.send('show-recorder');
  },

  // History operations (async handlers)
  getRecordings: () => {
    return ipcRenderer.invoke('get-recordings');
  },
  searchRecordings: (query) => {
    return ipcRenderer.invoke('search-recordings', query);
  },
  readFile: (filePath) => {
    return ipcRenderer.invoke('read-file', filePath);
  },

  // File operations (one-way)
  playAudio: (audioPath) => {
    ipcRenderer.send('play-audio', audioPath);
  },
  viewFile: (filePath) => {
    ipcRenderer.send('view-file', filePath);
  },

  // Auto-fill settings operations
  autoFillGetSettings: () => {
    return ipcRenderer.invoke('autofill-get-settings');
  },
  autoFillUpdateSettings: (settings) => {
    return ipcRenderer.invoke('autofill-update-settings', settings);
  },
  autoFillManualFill: () => {
    return ipcRenderer.invoke('autofill-manual-fill');
  },

  // Accessibility permissions
  accessibilityCheckPermissions: () => {
    return ipcRenderer.invoke('accessibility-check-permissions');
  },
  accessibilityRequestPermissions: () => {
    return ipcRenderer.invoke('accessibility-request-permissions');
  },

  // Settings navigation
  showSettings: () => {
    ipcRenderer.send('show-settings');
  },

  // Trigger auto-paste after history refresh
  triggerAutoPaste: () => {
    ipcRenderer.send('trigger-auto-paste');
  },

  // Overlay window controls
  hideOverlay: () => {
    ipcRenderer.send('hide-overlay');
  },
  expandOverlay: () => {
    ipcRenderer.send('expand-overlay');
  },

  // Recording state (for minimized overlay)
  onRecordingStateChange: (callback) => {
    ipcRenderer.on('recording-state-change', (event, state) => callback(state));
  },

  // Audio data (for waveform visualization)
  onAudioData: (callback) => {
    ipcRenderer.on('audio-data', (event, data) => callback(data));
  },

  // Overlay state management
  onOverlayStateChange: (callback) => {
    ipcRenderer.on('overlay-state-change', (event, state, data) => callback(state, data));
  },
  resizeOverlay: (width, height) => {
    ipcRenderer.send('resize-overlay', width, height);
  },
  toggleRecording: () => {
    ipcRenderer.send('toggle-recording');
  },
  stopRecording: () => {
    ipcRenderer.send('stop-recording-overlay');
  }
});
