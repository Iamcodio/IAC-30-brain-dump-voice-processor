/**
 * TranscriptionService - Manages audio transcription using Python subprocess
 *
 * This service handles spawning Python transcription processes, managing their
 * lifecycle, and notifying the UI of transcription progress and completion.
 *
 * @module TranscriptionService
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import config from 'config';
import { BrowserWindow } from 'electron';
import { FileValidator } from '../utils/file_validator';
import { errorHandler, ErrorLevel, captureError } from '../error_handler';
import {
  EXIT_CODES,
  ERROR_TYPES,
  CONTEXTS
} from '../../config/constants';
import logger = require('../../utils/logger');
import * as metrics from '../../utils/metrics';

/**
 * TranscriptionService class for managing audio transcription
 *
 * Spawns Python subprocess to transcribe audio files using Whisper.
 * Returns a Promise that resolves with the transcript path on success.
 *
 * @class
 * @example
 * const service = new TranscriptionService(mainWindow, __dirname);
 * service.transcribe('/path/to/audio.wav')
 *   .then(transcriptPath => console.log('Saved:', transcriptPath))
 *   .catch(error => console.error('Failed:', error));
 */
class TranscriptionService {
  private mainWindow: BrowserWindow;
  private baseDir: string;
  private pythonPath: string;
  private scriptPath: string;

  /**
   * Create a TranscriptionService instance
   *
   * @param mainWindow - Electron BrowserWindow for UI notifications
   * @param baseDir - Base directory path for resolving Python paths
   */
  constructor(mainWindow: BrowserWindow, baseDir: string) {
    this.mainWindow = mainWindow;
    this.baseDir = baseDir;
    this.pythonPath = path.join(baseDir, config.get<string>('paths.pythonVenv'));
    this.scriptPath = path.join(baseDir, config.get<string>('paths.transcriberScript'));
  }

  /**
   * Transcribe an audio file using Python/Whisper
   *
   * Validates the audio file exists, spawns a Python subprocess, and monitors
   * the transcription process. Returns a Promise that resolves with the
   * transcript file path on success or rejects on error.
   *
   * Protocol messages expected from Python:
   * - TRANSCRIPT_SAVED:<path> - Transcript successfully saved
   * - ERROR:<message> - Transcription error occurred
   *
   * @param audioPath - Absolute path to audio file to transcribe
   * @returns Resolves with transcript path, rejects on error
   * @throws Error If audio file doesn't exist or transcription fails
   * @example
   * await service.transcribe('/outputs/audio/recording_2025-10-25_12-00-00.wav');
   * // Returns: '/outputs/transcripts/transcript_2025-10-25_12-00-00.md'
   */
  public async transcribe(audioPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Start timing for metrics
      const startTime = Date.now();

      try {
        // Validate audio file exists
        try {
          FileValidator.validateExists(audioPath, CONTEXTS.TRANSCRIBE_AUDIO);
        } catch (error) {
          this.notifyUI('transcription-error', 'Audio file not found');
          metrics.errorCounter.inc({ component: 'transcription', error_type: 'file_not_found' });
          metrics.totalTranscriptions.inc({ status: 'error' });
          captureError(error as Error, {
            tags: { component: 'transcription', type: 'file_not_found' },
            extra: { audioPath }
          });
          reject(error);
          return;
        }

        logger.info('Starting transcription', { audioPath });
        this.notifyUI('transcription-started');

        const transcriber: ChildProcess = spawn(this.pythonPath, [this.scriptPath, audioPath]);

        let transcriptMdPath: string | null = null;
        let transcriptTxtPath: string | null = null;

        transcriber.stdout?.on('data', (data: Buffer) => {
          const output = data.toString().trim();
          console.log('[TRACE] transcriber stdout got:', output);

          try {
            logger.debug('Transcription stdout', { output });
          } catch (e) {
            // Ignore EPIPE errors during shutdown
          }

          const lines = output.split('\n');

          for (const line of lines) {
            if (line.startsWith(config.get<string>('protocol.transcriptSaved'))) {
              transcriptMdPath = line.split(':', 2)[1];
              console.log('[TRACE] captured MD path:', transcriptMdPath);
              errorHandler.notify(ErrorLevel.INFO, CONTEXTS.TRANSCRIBE_AUDIO, ERROR_TYPES.TRANSCRIPT_SAVED,
                `Transcript saved: ${transcriptMdPath}`);
            } else if (line.startsWith('TRANSCRIPT_TXT:')) {
              transcriptTxtPath = line.split(':', 2)[1];
              console.log('[TRACE] captured TXT path:', transcriptTxtPath);
            } else if (line.startsWith(config.get<string>('protocol.errorPrefix'))) {
              errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.TRANSCRIBE_STDOUT, ERROR_TYPES.TRANSCRIPTION_ERROR, line);
              this.notifyUI('transcription-error', line);
            }
          }
        });

        transcriber.stderr?.on('data', (data: Buffer) => {
          try {
            logger.error('Transcription stderr', { stderr: data.toString().trim() });
          } catch (e) {
            // Ignore EPIPE errors during shutdown
          }
        });

        transcriber.on('error', (error: Error) => {
          errorHandler.handleException(CONTEXTS.TRANSCRIBE_SPAWN, error);
          metrics.errorCounter.inc({ component: 'transcription', error_type: 'spawn_error' });
          metrics.totalTranscriptions.inc({ status: 'error' });
          captureError(error, {
            tags: { component: 'transcription', type: 'spawn_error' },
            extra: {
              audioPath,
              pythonPath: this.pythonPath,
              scriptPath: this.scriptPath
            }
          });
          this.notifyUI('transcription-error', error.message);
          reject(error);
        });

        transcriber.on('close', (code: number | null) => {
          console.log('[TRACE] transcriber closed with code:', code);
          // Calculate transcription latency
          const latency = (Date.now() - startTime) / 1000;

          if (code === EXIT_CODES.SUCCESS) {
            metrics.transcriptionLatency.observe({ model: 'ggml-base', status: 'success' }, latency);
            metrics.totalTranscriptions.inc({ status: 'success' });
            errorHandler.notify(ErrorLevel.INFO, CONTEXTS.TRANSCRIBE_AUDIO, ERROR_TYPES.TRANSCRIPTION_COMPLETE,
              'Transcription completed successfully');

            // Read transcript text and send to UI
            let transcriptText = '';
            console.log('[TRACE] checking txtPath:', transcriptTxtPath, 'exists:', transcriptTxtPath && fs.existsSync(transcriptTxtPath));
            if (transcriptTxtPath && fs.existsSync(transcriptTxtPath)) {
              try {
                transcriptText = fs.readFileSync(transcriptTxtPath, 'utf8');
                console.log('[TRACE] read transcript text length:', transcriptText.length, 'preview:', transcriptText.substring(0, 50));
              } catch (e) {
                console.log('[TRACE] failed to read transcript file:', e);
                logger.error('Failed to read transcript file', { error: e });
              }
            } else {
              console.log('[TRACE] txtPath missing or file not found');
            }

            console.log('[TRACE] sending transcription-complete with text length:', transcriptText.length);
            this.notifyUI('transcription-complete', { path: transcriptMdPath, text: transcriptText });

            // Send transcript for auto-fill (clipboard write)
            console.log('[TRACE] sending auto-fill-transcript with text length:', transcriptText.length);
            this.mainWindow.webContents.send('auto-fill-transcript', transcriptText);

            resolve(transcriptMdPath!);
          } else {
            metrics.transcriptionLatency.observe({ model: 'ggml-base', status: 'error' }, latency);
            metrics.totalTranscriptions.inc({ status: 'error' });
            metrics.errorCounter.inc({ component: 'transcription', error_type: 'exit_code_error' });
            const error = new Error(`Transcription failed with exit code ${code}`);
            errorHandler.notify(ErrorLevel.ERROR, CONTEXTS.TRANSCRIBE_AUDIO, ERROR_TYPES.TRANSCRIPTION_FAILED, error.message);

            // Get file size for debugging
            let fileSize: number | string = 'unknown';
            try {
              if (fs.existsSync(audioPath)) {
                fileSize = fs.statSync(audioPath).size;
              }
            } catch (e) {
              // Ignore errors getting file size
            }

            captureError(error, {
              tags: { component: 'transcription', type: 'exit_code_error' },
              extra: {
                audioPath,
                fileSize,
                exitCode: code,
                model: config.get<string>('transcription.model')
              }
            });
            this.notifyUI('transcription-error', `Exit code ${code}`);
            reject(error);
          }
        });

      } catch (error) {
        errorHandler.handleException(CONTEXTS.TRANSCRIBE_AUDIO, error as Error);
        metrics.errorCounter.inc({ component: 'transcription', error_type: 'exception' });
        metrics.totalTranscriptions.inc({ status: 'error' });
        captureError(error as Error, {
          tags: { component: 'transcription', type: 'exception' },
          extra: { audioPath }
        });
        this.notifyUI('transcription-error', (error as Error).message);
        reject(error);
      }
    });
  }

  /**
   * Send notification to UI via IPC
   *
   * Safely sends messages to the renderer process if the window is valid.
   * Checks that window exists and is not destroyed before sending.
   *
   * @param channel - IPC channel name (e.g., 'transcription-started')
   * @param data - Optional data payload to send
   * @private
   * @example
   * this.notifyUI('transcription-complete');
   * this.notifyUI('transcription-error', 'Failed to load model');
   */
  private notifyUI(channel: string, data: unknown = null): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (data) {
        this.mainWindow.webContents.send(channel, data);
      } else {
        this.mainWindow.webContents.send(channel);
      }
    }
  }
}

export { TranscriptionService };
