/**
 * AutoFillManager - Orchestration layer for auto-fill functionality
 *
 * Coordinates auto-fill behavior by integrating:
 * - AccessibilityService for text field monitoring and injection
 * - Database for transcript retrieval and usage tracking
 * - Configuration for user settings and blacklist management
 *
 * Features:
 * - Automatic text field detection and filling
 * - Manual fill trigger support (Ctrl+Shift+V)
 * - Application blacklist (e.g., password managers)
 * - Debouncing to prevent double-fills
 * - Usage statistics tracking
 * - Comprehensive error handling
 *
 * @module AutoFillManager
 */

import { AccessibilityService, TextFieldFocusEvent } from '../services/accessibility_service';
import { clipboard } from 'electron';
import config from 'config';
import logger = require('../utils/logger');
import { errorHandler, captureError } from '../js/error_handler';

/**
 * Auto-fill configuration settings
 */
interface AutoFillSettings {
  /** Whether auto-fill is enabled */
  enabled: boolean;
  /** List of blacklisted app bundle IDs */
  blacklistedApps: string[];
  /** Whether auto-fill requires manual trigger (false = automatic) */
  requireManualTrigger: boolean;
  /** Minimum milliseconds between auto-fills (debouncing) */
  debounceMs: number;
}

/**
 * Database interface (matches database.js structure)
 */
interface Database {
  getAll(): Recording[];
  updateById(id: string, updates: Partial<Recording>): Recording | null;
}

/**
 * Recording object structure (matches FormattedRecording from database.ts)
 */
interface Recording {
  id: string;
  timestamp: string;
  audioPath: string;
  transcriptPath: string;
  transcriptTxt?: string;
  transcriptMd?: string;
  duration: string;
  preview: string;
  fullText: string;
  autoFillCount?: number;
  lastAutoFillTimestamp?: string;
}

/**
 * AutoFillManager class
 *
 * Manages auto-fill orchestration, settings, and database integration.
 * Listens for text field focus events and automatically or manually fills
 * them with the last transcript content.
 *
 * @example
 * ```typescript
 * import { AutoFillManager } from './managers/autofill_manager';
 * import database from './database';
 *
 * const manager = new AutoFillManager(database);
 *
 * try {
 *   await manager.start();
 *   console.log('Auto-fill manager started');
 * } catch (error) {
 *   console.error('Failed to start:', error.message);
 * }
 *
 * // Update settings
 * manager.updateSettings({
 *   blacklistedApps: ['com.newapp.secure']
 * });
 *
 * // Manual fill
 * await manager.performManualFill();
 *
 * // Stop
 * await manager.stop();
 * ```
 */
export class AutoFillManager {
  private accessibilityService: AccessibilityService;
  private database: Database;
  private settings: AutoFillSettings;
  private lastFillTimestamp: number = 0;
  private isRunning: boolean = false;
  private focusEventListener: ((event: TextFieldFocusEvent) => void) | null = null;

  /**
   * Create a new AutoFillManager instance
   *
   * Loads configuration from config/default.json and creates
   * an AccessibilityService instance. Does not start monitoring
   * until start() is called.
   *
   * @param database - Database instance with getAll() and updateById() methods
   */
  constructor(database: Database) {
    this.database = database;

    // Load settings from config
    this.settings = {
      enabled: config.get<boolean>('autoFill.enabled'),
      requireManualTrigger: config.get<boolean>('autoFill.requireManualTrigger'),
      debounceMs: config.get<number>('autoFill.debounceMs'),
      blacklistedApps: config.get<string[]>('autoFill.blacklistedApps')
    };

    // Create accessibility service instance
    this.accessibilityService = new AccessibilityService();

    logger.info('AutoFillManager initialized', {
      enabled: this.settings.enabled,
      requireManualTrigger: this.settings.requireManualTrigger,
      debounceMs: this.settings.debounceMs,
      blacklistedAppsCount: this.settings.blacklistedApps.length
    });
  }

  /**
   * Start auto-fill monitoring
   *
   * Checks for accessibility permissions, starts monitoring for text field
   * focus events, and begins auto-fill behavior based on settings.
   *
   * @throws Error if accessibility permissions are not granted
   * @returns Promise that resolves when monitoring is started
   *
   * @example
   * ```typescript
   * try {
   *   await manager.start();
   * } catch (error) {
   *   console.error('Permissions required:', error.message);
   * }
   * ```
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('AutoFillManager already running - ignoring start request');
      return;
    }

    try {
      // Check accessibility permissions
      const hasPermissions = await this.accessibilityService.ensurePermissions();

      if (!hasPermissions) {
        const errorMsg = 'Accessibility permissions not granted. Please enable permissions in System Preferences > Privacy & Security > Accessibility';
        logger.error('Failed to start AutoFillManager - permissions required', {
          message: errorMsg
        });
        throw new Error(errorMsg);
      }

      // Setup event listeners
      this.setupEventListeners();

      // Start accessibility monitoring
      this.accessibilityService.startMonitoring();

      // Mark as running
      this.isRunning = true;

      logger.info('AutoFillManager started successfully', {
        enabled: this.settings.enabled,
        autoMode: !this.settings.requireManualTrigger
      });
    } catch (error) {
      errorHandler.handleException('AutoFillManager.start', error as Error);
      captureError(error as Error, {
        tags: { component: 'autofill', type: 'start_failed' },
        extra: { context: 'Failed to start auto-fill manager' }
      });
      throw error;
    }
  }

  /**
   * Stop auto-fill monitoring
   *
   * Stops accessibility monitoring, removes event listeners, and cleans up.
   * Safe to call even if not running.
   *
   * @returns Promise that resolves when monitoring is stopped
   *
   * @example
   * ```typescript
   * await manager.stop();
   * ```
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.debug('AutoFillManager not running - ignoring stop request');
      return;
    }

    try {
      // Stop accessibility monitoring
      this.accessibilityService.stopMonitoring();

      // Remove event listeners
      if (this.focusEventListener) {
        this.accessibilityService.removeListener('text-field-focused', this.focusEventListener);
        this.focusEventListener = null;
      }

      // Mark as stopped
      this.isRunning = false;

      logger.info('AutoFillManager stopped successfully');
    } catch (error) {
      errorHandler.handleException('AutoFillManager.stop', error as Error);
      logger.error('Error stopping AutoFillManager', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Perform automatic auto-fill
   *
   * Attempts to fill the currently focused text field with the last transcript.
   * Respects all settings and conditions (enabled, blacklist, debouncing, etc.).
   *
   * @returns Promise<boolean> - true if fill succeeded, false otherwise
   *
   * @example
   * ```typescript
   * const success = await manager.performAutoFill();
   * if (success) {
   *   console.log('Auto-fill completed');
   * }
   * ```
   */
  public async performAutoFill(): Promise<boolean> {
    try {
      // Get last transcript
      const transcript = await this.getLastTranscript();

      if (!transcript) {
        logger.info('Auto-fill skipped - no transcript available');
        return false;
      }

      // Get last focused field (cached from before window switch)
      const focusedField = this.accessibilityService.getLastFocusedField();

      if (!focusedField) {
        logger.warn('Auto-fill skipped - no text field was focused before recording');
        return false;
      }

      if (!focusedField.canInject) {
        logger.warn('Auto-fill skipped - field cannot be injected', {
          elementRole: focusedField.elementRole
        });
        return false;
      }

      // Copy to clipboard
      clipboard.writeText(transcript);

      // Simulate Cmd+V paste (works EVERYWHERE: terminals, browsers, native apps)
      const success = this.accessibilityService.simulatePaste();

      if (!success) {
        logger.warn('Failed to simulate paste - transcript is in clipboard for manual paste', {
          appName: focusedField.appName
        });
        return false;
      }

      // Update timestamp
      this.lastFillTimestamp = Date.now();

      // Track usage (non-blocking)
      this.trackAutoFill().catch(err => {
        logger.error('Failed to track auto-fill usage', {
          error: (err as Error).message
        });
      });

      logger.info('Transcript pasted successfully', {
        textLength: transcript.length,
        appName: focusedField.appName
      });

      return true;
    } catch (error) {
      errorHandler.handleException('AutoFillManager.performAutoFill', error as Error);
      captureError(error as Error, {
        tags: { component: 'autofill', type: 'fill_failed' },
        extra: { context: 'Auto-fill attempt failed' }
      });

      logger.error('Error performing auto-fill', {
        error: (error as Error).message
      });

      return false;
    }
  }

  /**
   * Perform manual auto-fill (triggered by Ctrl+Shift+V)
   *
   * Same as performAutoFill() but ignores the requireManualTrigger setting.
   * Always attempts to fill if other conditions are met.
   *
   * @returns Promise<boolean> - true if fill succeeded, false otherwise
   *
   * @example
   * ```typescript
   * // Triggered by global shortcut
   * const success = await manager.performManualFill();
   * ```
   */
  public async performManualFill(): Promise<boolean> {
    logger.info('Manual auto-fill triggered');

    // Manual fill uses same logic as auto-fill
    // The difference is it's explicitly triggered, so we don't check requireManualTrigger
    return this.performAutoFill();
  }

  /**
   * Update auto-fill settings
   *
   * Merges new settings with existing ones. If auto-fill is disabled,
   * stops monitoring automatically.
   *
   * @param newSettings - Partial settings object with fields to update
   *
   * @example
   * ```typescript
   * manager.updateSettings({
   *   enabled: false,
   *   blacklistedApps: [...existingList, 'com.newapp.secure']
   * });
   * ```
   */
  public updateSettings(newSettings: Partial<AutoFillSettings>): void {
    try {
      // Merge with existing settings
      this.settings = {
        ...this.settings,
        ...newSettings
      };

      logger.info('AutoFillManager settings updated', {
        enabled: this.settings.enabled,
        requireManualTrigger: this.settings.requireManualTrigger,
        debounceMs: this.settings.debounceMs,
        blacklistedAppsCount: this.settings.blacklistedApps.length
      });

      // If disabled and running, stop monitoring
      if (!this.settings.enabled && this.isRunning) {
        logger.info('Auto-fill disabled - stopping monitoring');
        this.stop().catch(err => {
          logger.error('Error stopping monitoring after disable', {
            error: (err as Error).message
          });
        });
      }
    } catch (error) {
      errorHandler.handleException('AutoFillManager.updateSettings', error as Error);
      logger.error('Error updating settings', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Check if auto-fill manager is currently running
   *
   * @returns boolean - true if running, false otherwise
   *
   * @example
   * ```typescript
   * if (manager.isActive()) {
   *   console.log('Manager is running');
   * }
   * ```
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Setup event listeners for accessibility service
   * @private
   */
  private setupEventListeners(): void {
    // Create and store the listener function
    this.focusEventListener = (event: TextFieldFocusEvent) => {
      this.handleTextFieldFocused(event);
    };

    // Register listener
    this.accessibilityService.on('text-field-focused', this.focusEventListener);

    logger.debug('Event listeners registered', {
      events: ['text-field-focused']
    });
  }

  /**
   * Handle text field focus event
   * @private
   */
  private handleTextFieldFocused(event: TextFieldFocusEvent): void {
    logger.debug('Text field focused', {
      app: event.appName,
      bundleId: event.bundleId,
      canInject: event.canInject
    });

    // Check if auto-fill should be performed
    if (this.shouldAutoFill(event)) {
      // Perform auto-fill asynchronously
      this.performAutoFill().catch(err => {
        logger.error('Auto-fill failed on focus event', {
          error: (err as Error).message,
          app: event.appName
        });
      });
    }
  }

  /**
   * Determine if auto-fill should be performed for a focus event
   * @private
   */
  private shouldAutoFill(event: TextFieldFocusEvent): boolean {
    // Check if enabled
    if (!this.settings.enabled) {
      logger.debug('Auto-fill skipped - disabled in settings');
      return false;
    }

    // Check if manual trigger required (auto mode check)
    if (this.settings.requireManualTrigger) {
      logger.debug('Auto-fill skipped - manual trigger required');
      return false;
    }

    // Check blacklist
    if (this.settings.blacklistedApps.includes(event.bundleId)) {
      logger.debug('Auto-fill skipped - app blacklisted', {
        bundleId: event.bundleId,
        appName: event.appName
      });
      return false;
    }

    // Check if field can be injected
    if (!event.canInject) {
      logger.debug('Auto-fill skipped - field cannot be injected', {
        elementRole: event.elementRole
      });
      return false;
    }

    // Check debouncing
    const timeSinceLastFill = Date.now() - this.lastFillTimestamp;
    if (timeSinceLastFill < this.settings.debounceMs) {
      logger.debug('Auto-fill skipped - debounce threshold not met', {
        timeSinceLastFillMs: timeSinceLastFill,
        debounceMs: this.settings.debounceMs
      });
      return false;
    }

    // All conditions met
    logger.debug('Auto-fill conditions met', {
      app: event.appName,
      bundleId: event.bundleId
    });

    return true;
  }

  /**
   * Get the last transcript from the database
   * @private
   * @returns Promise<string | null> - Transcript text or null if none found
   */
  private async getLastTranscript(): Promise<string | null> {
    try {
      const recordings = this.database.getAll();

      if (!recordings || recordings.length === 0) {
        logger.debug('No recordings found in database');
        return null;
      }

      // Get the first (most recent) recording
      const lastRecording = recordings[0];

      // Prefer full transcript, fall back to preview
      const transcript = lastRecording.fullText || lastRecording.preview;

      if (!transcript) {
        logger.warn('Last recording has no transcript content', {
          recordingId: lastRecording.id
        });
        return null;
      }

      logger.debug('Retrieved last transcript', {
        recordingId: lastRecording.id,
        textLength: transcript.length,
        preview: transcript.substring(0, 50) + (transcript.length > 50 ? '...' : '')
      });

      return transcript;
    } catch (error) {
      errorHandler.handleException('AutoFillManager.getLastTranscript', error as Error);
      logger.error('Error retrieving last transcript', {
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Track auto-fill usage in the database
   * @private
   * @returns Promise that resolves when tracking is complete
   */
  private async trackAutoFill(): Promise<void> {
    try {
      const recordings = this.database.getAll();

      if (!recordings || recordings.length === 0) {
        logger.debug('No recordings to track usage for');
        return;
      }

      const lastRecording = recordings[0];

      // Prepare updates
      const updates: Partial<Recording> = {
        autoFillCount: (lastRecording.autoFillCount || 0) + 1,
        lastAutoFillTimestamp: new Date().toISOString()
      };

      // Update in database
      const updatedRecording = this.database.updateById(lastRecording.id, updates);

      if (updatedRecording) {
        logger.debug('Auto-fill usage tracked', {
          recordingId: lastRecording.id,
          autoFillCount: updates.autoFillCount,
          timestamp: updates.lastAutoFillTimestamp
        });
      } else {
        logger.warn('Failed to track auto-fill usage - recording not found', {
          recordingId: lastRecording.id
        });
      }
    } catch (error) {
      // Don't throw - tracking failures shouldn't block auto-fill
      errorHandler.handleException('AutoFillManager.trackAutoFill', error as Error);
      logger.error('Error tracking auto-fill usage', {
        error: (error as Error).message
      });
    }
  }
}
