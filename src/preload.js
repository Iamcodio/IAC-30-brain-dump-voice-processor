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
  }
});
