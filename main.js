const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Database = require('./database.js');

let mainWindow;
let recorderProcess;
let isRecording = false;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
  startRecorderProcess();
}

function startRecorderProcess() {
  const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
  const scriptPath = path.join(__dirname, 'recorder.py');
  
  recorderProcess = spawn(pythonPath, [scriptPath]);
  
  recorderProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log('Python:', output);
    
    if (output === 'READY') {
      console.log('Recorder ready');
    } else if (output === 'RECORDING_STARTED') {
      mainWindow.webContents.send('recording-started');
    } else if (output.startsWith('RECORDING_STOPPED:')) {
      const filename = output.split(':')[1];
      console.log('Saved:', filename);
      mainWindow.webContents.send('recording-stopped');
      
      // Transcribe the audio
      transcribeAudio(filename);
    }
  });
  
  recorderProcess.stderr.on('data', (data) => {
    console.error('Python error:', data.toString());
  });
}

function transcribeAudio(audioPath) {
  console.log('Starting transcription:', audioPath);
  mainWindow.webContents.send('transcription-started');
  
  const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
  const scriptPath = path.join(__dirname, 'transcribe.py');
  
  const transcriber = spawn(pythonPath, [scriptPath, audioPath]);
  
  transcriber.stdout.on('data', (data) => {
    console.log('Transcription:', data.toString());
  });
  
  transcriber.on('close', (code) => {
    if (code === 0) {
      console.log('Transcription complete');
      mainWindow.webContents.send('transcription-complete');
    } else {
      console.error('Transcription failed with code:', code);
    }
  });
}

app.whenReady().then(() => {
  // Initialize database
  db = new Database(__dirname);

  createWindow();

  const ret = globalShortcut.register('Control+Y', () => {
    console.log('Hotkey pressed: Control+Y');
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  if (!ret) {
    console.log('Shortcut registration failed');
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (recorderProcess) {
    recorderProcess.stdin.write('quit\n');
    recorderProcess.kill();
  }
});

function startRecording() {
  isRecording = true;
  console.log('Sending start command to Python');
  recorderProcess.stdin.write('start\n');
}

function stopRecording() {
  isRecording = false;
  console.log('Sending stop command to Python');
  recorderProcess.stdin.write('stop\n');
}

// IPC Handlers for History View

/**
 * Get all recordings from database
 */
ipcMain.handle('get-recordings', async () => {
  try {
    return db.getAll();
  } catch (error) {
    console.error('Error getting recordings:', error);
    return [];
  }
});

/**
 * Search recordings
 */
ipcMain.handle('search-recordings', async (event, query) => {
  try {
    return db.search(query);
  } catch (error) {
    console.error('Error searching recordings:', error);
    return [];
  }
});

/**
 * Read file contents (for copying transcripts)
 */
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

/**
 * Play audio file in default player
 */
ipcMain.on('play-audio', (event, audioPath) => {
  try {
    if (process.platform === 'darwin') {
      spawn('open', ['-a', 'QuickTime Player', audioPath]);
    } else {
      shell.openPath(audioPath);
    }
  } catch (error) {
    console.error('Error playing audio:', error);
  }
});

/**
 * View file in default application
 */
ipcMain.on('view-file', (event, filePath) => {
  try {
    shell.openPath(filePath);
  } catch (error) {
    console.error('Error viewing file:', error);
  }
});

/**
 * Switch to history view
 */
ipcMain.on('show-history', () => {
  mainWindow.loadFile('history.html');
});

/**
 * Switch to recorder view
 */
ipcMain.on('show-recorder', () => {
  mainWindow.loadFile('index.html');
});
