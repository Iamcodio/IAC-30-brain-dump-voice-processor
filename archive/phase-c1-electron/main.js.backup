const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Database = require('./database.js');
const { ProcessManager } = require('./src/js/process_manager');
const { errorHandler, ErrorLevel } = require('./src/js/error_handler');
const { FileValidator } = require('./src/js/utils/file_validator.js');
const {
  WINDOW_CONFIG,
  PATHS,
  PROCESS_CONFIG,
  PROTOCOL,
  SHORTCUTS,
  PLATFORM,
  EXIT_CODES,
  ERROR_TYPES,
  CONTEXTS,
  SPAWN_COMMANDS,
  FILE_OPS
} = require('./src/config/constants.js');

let mainWindow;
let recorderManager;
let isRecording = false;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.WIDTH,
    height: WINDOW_CONFIG.HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, PATHS.PRELOAD_SCRIPT),
      nodeIntegration: WINDOW_CONFIG.NODE_INTEGRATION,
      contextIsolation: WINDOW_CONFIG.CONTEXT_ISOLATION
    }
  });
  mainWindow.loadFile(PATHS.INDEX_HTML);
  startRecorderProcess();
}

function startRecorderProcess() {
  try {
    const pythonPath = path.join(__dirname, PATHS.PYTHON_VENV);
    const scriptPath = path.join(__dirname, PATHS.RECORDER_SCRIPT);

    // Validate paths exist
    FileValidator.validateExistsWithLevel(pythonPath, CONTEXTS.START_RECORDER, ErrorLevel.CRITICAL);
    FileValidator.validateExistsWithLevel(scriptPath, CONTEXTS.START_RECORDER, ErrorLevel.CRITICAL);

    // Create process manager for recorder
    recorderManager = new ProcessManager({
      name: 'recorder',
      command: pythonPath,
      args: [scriptPath],
      cwd: __dirname,
      maxRestarts: PROCESS_CONFIG.MAX_RESTARTS,
      baseDelay: PROCESS_CONFIG.BASE_DELAY_MS
    });

    // Handle stdout messages
    recorderManager.on('stdout', (data) => {
      const output = data.toString().trim();
      console.log('Python:', output);

      try {
        if (output === PROTOCOL.READY) {
          errorHandler.notify(
            ErrorLevel.INFO,
            CONTEXTS.RECORDER_STDOUT,
            ERROR_TYPES.RECORDER_READY,
            'Recorder process ready'
          );
          // Reset restart count on successful READY
          recorderManager.resetRestartCount();
        } else if (output === PROTOCOL.RECORDING_STARTED) {
          mainWindow.webContents.send('recording-started');
        } else if (output.startsWith(PROTOCOL.RECORDING_STOPPED)) {
          const filename = output.split(':')[1];
          if (filename && filename !== PROTOCOL.NO_AUDIO_CAPTURED) {
            console.log('Saved:', filename);
            mainWindow.webContents.send('recording-stopped');
            transcribeAudio(filename);
          } else {
            errorHandler.notify(
              ErrorLevel.WARNING,
              CONTEXTS.RECORDER_STDOUT,
              ERROR_TYPES.NO_AUDIO_RECORDED,
              'Recording stopped but no audio captured'
            );
            mainWindow.webContents.send('recording-stopped');
          }
        } else if (output.startsWith(PROTOCOL.ERROR_PREFIX)) {
          errorHandler.notify(
            ErrorLevel.ERROR,
            CONTEXTS.RECORDER_STDOUT,
            ERROR_TYPES.RECORDER_ERROR,
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
        CONTEXTS.RECORDER_PROCESS,
        ERROR_TYPES.PROCESS_ERROR,
        `Recorder process error: ${error.message}`
      );
      mainWindow.webContents.send('recorder-error', error.message);
    });

    // Handle process restart
    recorderManager.on('restarting', (count, delay) => {
      errorHandler.notify(
        ErrorLevel.WARNING,
        CONTEXTS.RECORDER_PROCESS,
        ERROR_TYPES.PROCESS_RESTARTING,
        `Recorder restarting (attempt ${count}/${PROCESS_CONFIG.MAX_RESTARTS}) in ${delay}ms`
      );
      mainWindow.webContents.send('recorder-restarting', { count, delay });
    });

    // Handle max restarts exceeded
    recorderManager.on('failed', () => {
      errorHandler.notify(
        ErrorLevel.CRITICAL,
        CONTEXTS.RECORDER_PROCESS,
        ERROR_TYPES.PROCESS_FAILED,
        'Recorder failed after maximum restart attempts'
      );
      mainWindow.webContents.send('recorder-failed');
    });

    // Start the recorder
    recorderManager.start();

  } catch (error) {
    errorHandler.handleException(CONTEXTS.START_RECORDER, error, true);
  }
}

function transcribeAudio(audioPath) {
  try {
    // Validate audio file exists
    try {
      FileValidator.validateExists(audioPath, CONTEXTS.TRANSCRIBE_AUDIO);
    } catch (error) {
      mainWindow.webContents.send('transcription-error', 'Audio file not found');
      return;
    }

    console.log('Starting transcription:', audioPath);
    mainWindow.webContents.send('transcription-started');

    const pythonPath = path.join(__dirname, PATHS.PYTHON_VENV);
    const scriptPath = path.join(__dirname, PATHS.TRANSCRIBER_SCRIPT);

    const transcriber = spawn(pythonPath, [scriptPath, audioPath]);

    transcriber.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log('Transcription:', output);

      // Handle protocol messages
      if (output.startsWith(PROTOCOL.TRANSCRIPT_SAVED)) {
        const mdPath = output.split(':')[1];
        errorHandler.notify(
          ErrorLevel.INFO,
          CONTEXTS.TRANSCRIBE_AUDIO,
          ERROR_TYPES.TRANSCRIPT_SAVED,
          `Transcript saved: ${mdPath}`
        );
      } else if (output.startsWith(PROTOCOL.ERROR_PREFIX)) {
        errorHandler.notify(
          ErrorLevel.ERROR,
          CONTEXTS.TRANSCRIBE_STDOUT,
          ERROR_TYPES.TRANSCRIPTION_ERROR,
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
      errorHandler.handleException(CONTEXTS.TRANSCRIBE_SPAWN, error);
      mainWindow.webContents.send('transcription-error', error.message);
    });

    transcriber.on('close', (code) => {
      if (code === EXIT_CODES.SUCCESS) {
        errorHandler.notify(
          ErrorLevel.INFO,
          CONTEXTS.TRANSCRIBE_AUDIO,
          ERROR_TYPES.TRANSCRIPTION_COMPLETE,
          'Transcription completed successfully'
        );
        mainWindow.webContents.send('transcription-complete');
      } else {
        errorHandler.notify(
          ErrorLevel.ERROR,
          CONTEXTS.TRANSCRIBE_AUDIO,
          ERROR_TYPES.TRANSCRIPTION_FAILED,
          `Transcription failed with exit code ${code}`
        );
        mainWindow.webContents.send('transcription-error', `Exit code ${code}`);
      }
    });

  } catch (error) {
    errorHandler.handleException(CONTEXTS.TRANSCRIBE_AUDIO, error);
    mainWindow.webContents.send('transcription-error', error.message);
  }
}

app.whenReady().then(() => {
  // Initialize database
  db = new Database(__dirname);

  createWindow();

  const ret = globalShortcut.register(SHORTCUTS.TOGGLE_RECORDING, () => {
    console.log(`Hotkey pressed: ${SHORTCUTS.TOGGLE_RECORDING}`);
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
    errorHandler.handleException(CONTEXTS.APP_WILL_QUIT, error);
  }
});

function startRecording() {
  try {
    if (!recorderManager || !recorderManager.isRunning) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        CONTEXTS.START_RECORDING,
        ERROR_TYPES.RECORDER_NOT_READY,
        'Recorder process not running'
      );
      mainWindow.webContents.send('recording-error', 'Recorder not ready');
      return;
    }

    isRecording = true;
    console.log('Sending start command to Python');

    if (!recorderManager.send(PROTOCOL.CMD_START)) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        CONTEXTS.START_RECORDING,
        ERROR_TYPES.SEND_FAILED,
        'Failed to send start command to recorder'
      );
      isRecording = false;
    }
  } catch (error) {
    errorHandler.handleException(CONTEXTS.START_RECORDING, error);
    isRecording = false;
  }
}

function stopRecording() {
  try {
    if (!recorderManager || !recorderManager.isRunning) {
      errorHandler.notify(
        ErrorLevel.WARNING,
        CONTEXTS.STOP_RECORDING,
        ERROR_TYPES.RECORDER_NOT_READY,
        'Recorder process not running'
      );
      isRecording = false;
      return;
    }

    isRecording = false;
    console.log('Sending stop command to Python');

    if (!recorderManager.send(PROTOCOL.CMD_STOP)) {
      errorHandler.notify(
        ErrorLevel.ERROR,
        CONTEXTS.STOP_RECORDING,
        ERROR_TYPES.SEND_FAILED,
        'Failed to send stop command to recorder'
      );
    }
  } catch (error) {
    errorHandler.handleException(CONTEXTS.STOP_RECORDING, error);
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
    errorHandler.handleException(CONTEXTS.IPC_GET_RECORDINGS, error);
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
    errorHandler.handleException(CONTEXTS.IPC_SEARCH_RECORDINGS, error);
    return [];
  }
});

/**
 * Read file contents (for copying transcripts)
 */
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    // Validate file exists and has no path traversal
    FileValidator.validateSafe(filePath, CONTEXTS.IPC_READ_FILE);

    return fs.readFileSync(filePath, FILE_OPS.ENCODING);
  } catch (error) {
    errorHandler.handleException(CONTEXTS.IPC_READ_FILE, error);
    throw error;
  }
});

/**
 * Play audio file in default player
 */
ipcMain.on('play-audio', (event, audioPath) => {
  try {
    // Validate file exists
    try {
      FileValidator.validateExists(audioPath, CONTEXTS.IPC_PLAY_AUDIO);
    } catch (error) {
      return;
    }

    if (process.platform === PLATFORM.DARWIN) {
      spawn(SPAWN_COMMANDS.MACOS_OPEN, [SPAWN_COMMANDS.MACOS_OPEN_APP_FLAG, PLATFORM.AUDIO_PLAYER_MACOS, audioPath]);
    } else {
      shell.openPath(audioPath);
    }
  } catch (error) {
    errorHandler.handleException(CONTEXTS.IPC_PLAY_AUDIO, error);
  }
});

/**
 * View file in default application
 */
ipcMain.on('view-file', (event, filePath) => {
  try {
    // Validate file exists
    try {
      FileValidator.validateExists(filePath, CONTEXTS.IPC_VIEW_FILE);
    } catch (error) {
      return;
    }

    shell.openPath(filePath);
  } catch (error) {
    errorHandler.handleException(CONTEXTS.IPC_VIEW_FILE, error);
  }
});

/**
 * Switch to history view
 */
ipcMain.on('show-history', () => {
  try {
    mainWindow.loadFile(PATHS.HISTORY_HTML);
  } catch (error) {
    errorHandler.handleException(CONTEXTS.IPC_SHOW_HISTORY, error);
  }
});

/**
 * Switch to recorder view
 */
ipcMain.on('show-recorder', () => {
  try {
    mainWindow.loadFile(PATHS.INDEX_HTML);
  } catch (error) {
    errorHandler.handleException(CONTEXTS.IPC_SHOW_RECORDER, error);
  }
});
