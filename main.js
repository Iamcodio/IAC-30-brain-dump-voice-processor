const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Database = require('./database.js');
const { ProcessManager } = require('./src/js/process_manager');
const { errorHandler, ErrorLevel } = require('./src/js/error_handler');

let mainWindow;
let recorderManager;
let isRecording = false;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.loadFile('index.html');
  startRecorderProcess();
}

function startRecorderProcess() {
  try {
    const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
    const scriptPath = path.join(__dirname, 'recorder.py');

    // Validate paths exist
    if (!fs.existsSync(pythonPath)) {
      errorHandler.notify(
        ErrorLevel.CRITICAL,
        'startRecorderProcess',
        'PythonNotFound',
        `Python not found at ${pythonPath}`
      );
      throw new Error(`Python not found: ${pythonPath}`);
    }

    if (!fs.existsSync(scriptPath)) {
      errorHandler.notify(
        ErrorLevel.CRITICAL,
        'startRecorderProcess',
        'ScriptNotFound',
        `Recorder script not found at ${scriptPath}`
      );
      throw new Error(`Recorder script not found: ${scriptPath}`);
    }

    // Create process manager for recorder
    recorderManager = new ProcessManager({
      name: 'recorder',
      command: pythonPath,
      args: [scriptPath],
      cwd: __dirname,
      maxRestarts: 5,
      baseDelay: 1000
    });

    // Handle stdout messages
    recorderManager.on('stdout', (data) => {
      const output = data.toString().trim();
      console.log('Python:', output);

      try {
        if (output === 'READY') {
          errorHandler.notify(
            ErrorLevel.INFO,
            'recorder.stdout',
            'RecorderReady',
            'Recorder process ready'
          );
          // Reset restart count on successful READY
          recorderManager.resetRestartCount();
        } else if (output === 'RECORDING_STARTED') {
          mainWindow.webContents.send('recording-started');
        } else if (output.startsWith('RECORDING_STOPPED:')) {
          const filename = output.split(':')[1];
          if (filename && filename !== 'no_audio') {
            console.log('Saved:', filename);
            mainWindow.webContents.send('recording-stopped');
            transcribeAudio(filename);
          } else {
            errorHandler.notify(
              ErrorLevel.WARNING,
              'recorder.stdout',
              'NoAudioRecorded',
              'Recording stopped but no audio captured'
            );
            mainWindow.webContents.send('recording-stopped');
          }
        } else if (output.startsWith('ERROR:')) {
          errorHandler.notify(
            ErrorLevel.ERROR,
            'recorder.stdout',
            'RecorderError',
            output
          );
          mainWindow.webContents.send('recording-error', output);
        }
      } catch (error) {
        errorHandler.handleException('recorder.stdout.handler', error);
      }
    });

    // Handle stderr messages
    recorderManager.on('stderr', (data) => {
      const message = data.toString().trim();
      // Python error_handler outputs to stderr, so this is expected
      console.error('Recorder stderr:', message);
    });

    // Handle process errors
    recorderManager.on('error', (error) => {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'recorder.process',
        'ProcessError',
        `Recorder process error: ${error.message}`
      );
      mainWindow.webContents.send('recorder-error', error.message);
    });

    // Handle process restart
    recorderManager.on('restarting', (count, delay) => {
      errorHandler.notify(
        ErrorLevel.WARNING,
        'recorder.process',
        'ProcessRestarting',
        `Recorder restarting (attempt ${count}/5) in ${delay}ms`
      );
      mainWindow.webContents.send('recorder-restarting', { count, delay });
    });

    // Handle max restarts exceeded
    recorderManager.on('failed', () => {
      errorHandler.notify(
        ErrorLevel.CRITICAL,
        'recorder.process',
        'ProcessFailed',
        'Recorder failed after maximum restart attempts'
      );
      mainWindow.webContents.send('recorder-failed');
    });

    // Start the recorder
    recorderManager.start();

  } catch (error) {
    errorHandler.handleException('startRecorderProcess', error, true);
  }
}

function transcribeAudio(audioPath) {
  try {
    // Validate audio file exists
    if (!fs.existsSync(audioPath)) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'transcribeAudio',
        'FileNotFound',
        `Audio file not found: ${audioPath}`
      );
      mainWindow.webContents.send('transcription-error', 'Audio file not found');
      return;
    }

    console.log('Starting transcription:', audioPath);
    mainWindow.webContents.send('transcription-started');

    const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
    const scriptPath = path.join(__dirname, 'transcribe.py');

    const transcriber = spawn(pythonPath, [scriptPath, audioPath]);

    transcriber.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log('Transcription:', output);

      // Handle protocol messages
      if (output.startsWith('TRANSCRIPT_SAVED:')) {
        const mdPath = output.split(':')[1];
        errorHandler.notify(
          ErrorLevel.INFO,
          'transcribeAudio',
          'TranscriptSaved',
          `Transcript saved: ${mdPath}`
        );
      } else if (output.startsWith('ERROR:')) {
        errorHandler.notify(
          ErrorLevel.ERROR,
          'transcribeAudio.stdout',
          'TranscriptionError',
          output
        );
        mainWindow.webContents.send('transcription-error', output);
      }
    });

    transcriber.stderr.on('data', (data) => {
      const message = data.toString().trim();
      // Python error_handler outputs to stderr
      console.error('Transcription stderr:', message);
    });

    transcriber.on('error', (error) => {
      errorHandler.handleException('transcribeAudio.spawn', error);
      mainWindow.webContents.send('transcription-error', error.message);
    });

    transcriber.on('close', (code) => {
      if (code === 0) {
        errorHandler.notify(
          ErrorLevel.INFO,
          'transcribeAudio',
          'TranscriptionComplete',
          'Transcription completed successfully'
        );
        mainWindow.webContents.send('transcription-complete');
      } else {
        errorHandler.notify(
          ErrorLevel.ERROR,
          'transcribeAudio',
          'TranscriptionFailed',
          `Transcription failed with exit code ${code}`
        );
        mainWindow.webContents.send('transcription-error', `Exit code ${code}`);
      }
    });

  } catch (error) {
    errorHandler.handleException('transcribeAudio', error);
    mainWindow.webContents.send('transcription-error', error.message);
  }
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
  try {
    globalShortcut.unregisterAll();

    if (recorderManager) {
      recorderManager.stop(true);
    }

  } catch (error) {
    errorHandler.handleException('app.will-quit', error);
  }
});

function startRecording() {
  try {
    if (!recorderManager || !recorderManager.isRunning) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'startRecording',
        'RecorderNotReady',
        'Recorder process not running'
      );
      mainWindow.webContents.send('recording-error', 'Recorder not ready');
      return;
    }

    isRecording = true;
    console.log('Sending start command to Python');

    if (!recorderManager.send('start\n')) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'startRecording',
        'SendFailed',
        'Failed to send start command to recorder'
      );
      isRecording = false;
    }
  } catch (error) {
    errorHandler.handleException('startRecording', error);
    isRecording = false;
  }
}

function stopRecording() {
  try {
    if (!recorderManager || !recorderManager.isRunning) {
      errorHandler.notify(
        ErrorLevel.WARNING,
        'stopRecording',
        'RecorderNotReady',
        'Recorder process not running'
      );
      isRecording = false;
      return;
    }

    isRecording = false;
    console.log('Sending stop command to Python');

    if (!recorderManager.send('stop\n')) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'stopRecording',
        'SendFailed',
        'Failed to send stop command to recorder'
      );
    }
  } catch (error) {
    errorHandler.handleException('stopRecording', error);
    isRecording = false;
  }
}

// IPC Handlers for History View

/**
 * Get all recordings from database
 */
ipcMain.handle('get-recordings', async () => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    return db.getAll();
  } catch (error) {
    errorHandler.handleException('ipc.get-recordings', error);
    return [];
  }
});

/**
 * Search recordings
 */
ipcMain.handle('search-recordings', async (event, query) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    return db.search(query);
  } catch (error) {
    errorHandler.handleException('ipc.search-recordings', error);
    return [];
  }
});

/**
 * Read file contents (for copying transcripts)
 */
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Validate file is within project directory (basic path traversal check)
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid file path');
    }

    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    errorHandler.handleException('ipc.read-file', error);
    throw error;
  }
});

/**
 * Play audio file in default player
 */
ipcMain.on('play-audio', (event, audioPath) => {
  try {
    // Validate file exists
    if (!fs.existsSync(audioPath)) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'ipc.play-audio',
        'FileNotFound',
        `Audio file not found: ${audioPath}`
      );
      return;
    }

    if (process.platform === 'darwin') {
      spawn('open', ['-a', 'QuickTime Player', audioPath]);
    } else {
      shell.openPath(audioPath);
    }
  } catch (error) {
    errorHandler.handleException('ipc.play-audio', error);
  }
});

/**
 * View file in default application
 */
ipcMain.on('view-file', (event, filePath) => {
  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        'ipc.view-file',
        'FileNotFound',
        `File not found: ${filePath}`
      );
      return;
    }

    shell.openPath(filePath);
  } catch (error) {
    errorHandler.handleException('ipc.view-file', error);
  }
});

/**
 * Switch to history view
 */
ipcMain.on('show-history', () => {
  try {
    mainWindow.loadFile('history.html');
  } catch (error) {
    errorHandler.handleException('ipc.show-history', error);
  }
});

/**
 * Switch to recorder view
 */
ipcMain.on('show-recorder', () => {
  try {
    mainWindow.loadFile('index.html');
  } catch (error) {
    errorHandler.handleException('ipc.show-recorder', error);
  }
});
