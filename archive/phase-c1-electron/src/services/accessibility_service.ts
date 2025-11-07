/**
 * AccessibilityService - TypeScript wrapper for native macOS Accessibility module
 *
 * Provides a clean, type-safe interface to the native accessibility.node module
 * with comprehensive error handling, event emission, and integration with
 * BrainDump's logging and error tracking systems.
 *
 * Features:
 * - Type-safe API with full TypeScript support
 * - Event-driven architecture (EventEmitter)
 * - Automatic permission management
 * - Real-time text field focus monitoring
 * - Smart text injection with validation
 * - Comprehensive error handling (never crashes)
 * - Production-ready logging integration
 *
 * @module AccessibilityService
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import logger = require('../utils/logger');
import { errorHandler, ErrorLevel, captureError } from '../js/error_handler';

/**
 * Text field focus event data
 * Emitted when a text input field gains focus
 */
export interface TextFieldFocusEvent {
  /** Application bundle ID (e.g., com.google.Chrome) */
  bundleId: string;
  /** Human-readable app name (e.g., Google Chrome) */
  appName: string;
  /** Current window title */
  windowTitle: string;
  /** Accessibility element role (AXTextField, AXTextArea, etc.) */
  elementRole: string;
  /** Whether text injection is possible for this field */
  canInject: boolean;
  /** ISO 8601 timestamp of focus event */
  timestamp: string;
  /** Process ID of the application */
  appPID: number;
  /** Current text value in the field */
  value?: string;
  /** Currently selected text, if any */
  selectedText?: string;
}

/**
 * Native module interface (loaded from build/Release/accessibility.node)
 */
interface NativeAccessibilityModule {
  hasAccessibilityPermissions(): boolean;
  requestAccessibilityPermissions(): boolean;
  getFocusedElement(): any;
  isTextInputElement(element?: any): boolean;
  insertText(text: string, element?: any): boolean;
  simulatePaste(): boolean;
  startMonitoringActiveApp(callback: (appInfo: any) => void): boolean;
  stopMonitoringActiveApp(): boolean;
}

/**
 * AccessibilityService class
 *
 * Manages macOS Accessibility API integration for BrainDump's auto-fill feature.
 * Monitors text field focus events and provides text injection capabilities.
 *
 * @extends EventEmitter
 * @fires text-field-focused - When a text input field gains focus
 *
 * @example
 * ```typescript
 * const service = new AccessibilityService();
 *
 * // Check permissions
 * if (!await service.ensurePermissions()) {
 *   console.log('Permissions required');
 *   return;
 * }
 *
 * // Listen for text field focus
 * service.on('text-field-focused', (event) => {
 *   console.log('Field focused:', event.appName);
 *   if (event.canInject) {
 *     service.injectText('Hello World!');
 *   }
 * });
 *
 * // Start monitoring
 * service.startMonitoring();
 * ```
 */
export class AccessibilityService extends EventEmitter {
  private nativeModule: NativeAccessibilityModule | null = null;
  private isMonitoring: boolean = false;
  private lastFocusedField: TextFieldFocusEvent | null = null;
  private monitoringStartTime: Date | null = null;
  private moduleLoadError: Error | null = null;

  /**
   * Creates a new AccessibilityService instance
   * Automatically loads the native module on construction
   */
  constructor() {
    super();
    this.loadNativeModule();
  }

  /**
   * Load the native accessibility.node module
   * @private
   */
  private loadNativeModule(): void {
    try {
      // Find project root (works from both src and dist)
      // When compiled: __dirname = /path/to/dist/src/services
      // When source: __dirname = /path/to/src/services
      let projectRoot = __dirname;

      // If we're in dist, go up 3 levels; if in src, go up 2 levels
      if (projectRoot.includes('/dist/')) {
        projectRoot = path.join(__dirname, '..', '..', '..');
      } else {
        projectRoot = path.join(__dirname, '..', '..');
      }

      // Construct path to compiled native module
      const modulePath = path.join(projectRoot, 'build', 'Release', 'accessibility.node');

      // Load native module
      this.nativeModule = require(modulePath) as NativeAccessibilityModule;

      logger.info('Native accessibility module loaded successfully', {
        modulePath,
        functions: Object.keys(this.nativeModule)
      });
    } catch (error) {
      this.moduleLoadError = error as Error;
      errorHandler.handleException('AccessibilityService.loadNativeModule', error as Error);
      captureError(error as Error, {
        tags: { component: 'accessibility', type: 'module_load_failed' },
        extra: { context: 'Failed to load native accessibility module' },
        level: 'error'
      });

      logger.error('Failed to load native accessibility module', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  }

  /**
   * Check if accessibility permissions are granted (without prompting)
   *
   * @returns Promise<boolean> - true if permissions granted, false otherwise
   *
   * @example
   * ```typescript
   * if (await service.hasPermissions()) {
   *   console.log('Permissions already granted');
   * }
   * ```
   */
  public async hasPermissions(): Promise<boolean> {
    if (!this.nativeModule) {
      logger.warn('Cannot check permissions - native module not loaded', {
        loadError: this.moduleLoadError?.message
      });
      return false;
    }

    try {
      return this.nativeModule.hasAccessibilityPermissions();
    } catch (error) {
      errorHandler.handleException('AccessibilityService.hasPermissions', error as Error);
      logger.error('Error checking accessibility permissions', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Request accessibility permissions from the user
   *
   * Opens System Preferences dialog to prompt for permissions.
   * Does not wait for permissions to be granted.
   *
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await service.requestPermissions();
   * console.log('Dialog shown to user');
   * ```
   */
  public async requestPermissions(): Promise<void> {
    if (!this.nativeModule) {
      logger.warn('Cannot request permissions - native module not loaded', {
        loadError: this.moduleLoadError?.message
      });
      return;
    }

    try {
      logger.info('Requesting accessibility permissions from user');
      this.nativeModule.requestAccessibilityPermissions();
    } catch (error) {
      errorHandler.handleException('AccessibilityService.requestPermissions', error as Error);
      logger.error('Error requesting accessibility permissions', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Ensure accessibility permissions are granted
   *
   * Checks if permissions are already granted. If not, prompts the user
   * to grant permissions via System Preferences dialog.
   *
   * @returns Promise<boolean> - true if permissions granted, false otherwise
   *
   * @example
   * ```typescript
   * if (!await service.ensurePermissions()) {
   *   console.log('User needs to grant permissions in System Preferences');
   * }
   * ```
   */
  public async ensurePermissions(): Promise<boolean> {
    if (!this.nativeModule) {
      logger.warn('Cannot check permissions - native module not loaded', {
        loadError: this.moduleLoadError?.message
      });
      return false;
    }

    try {
      // Check if permissions already granted
      const hasPermissions = this.nativeModule.hasAccessibilityPermissions();

      if (hasPermissions) {
        logger.info('Accessibility permissions already granted');
        return true;
      }

      // Request permissions (opens System Preferences)
      logger.info('Requesting accessibility permissions from user');
      const dialogShown = this.nativeModule.requestAccessibilityPermissions();

      if (dialogShown) {
        logger.warn('Accessibility permissions not granted - dialog shown to user', {
          message: 'User must grant permissions in System Preferences > Privacy & Security > Accessibility'
        });
      }

      // Re-check after request
      const permissionsGranted = this.nativeModule.hasAccessibilityPermissions();

      if (permissionsGranted) {
        logger.info('Accessibility permissions granted');
      }

      return permissionsGranted;
    } catch (error) {
      errorHandler.handleException('AccessibilityService.ensurePermissions', error as Error);
      captureError(error as Error, {
        tags: { component: 'accessibility', type: 'permission_check_failed' },
        extra: { context: 'Failed to check or request accessibility permissions' }
      });

      logger.error('Error checking accessibility permissions', {
        error: (error as Error).message
      });

      return false;
    }
  }

  /**
   * Start monitoring for active app and text field focus changes
   *
   * Begins listening for application switches and text field focus events.
   * Emits 'text-field-focused' events when a text input field gains focus.
   *
   * Only one monitoring session can be active at a time.
   *
   * @fires text-field-focused
   *
   * @example
   * ```typescript
   * service.on('text-field-focused', (event) => {
   *   console.log(`Focus: ${event.appName} - ${event.elementRole}`);
   * });
   * service.startMonitoring();
   * ```
   */
  public startMonitoring(): void {
    if (!this.nativeModule) {
      logger.error('Cannot start monitoring - native module not loaded', {
        loadError: this.moduleLoadError?.message
      });
      return;
    }

    if (this.isMonitoring) {
      logger.warn('Monitoring already active - ignoring duplicate start request');
      return;
    }

    try {
      // Define callback for native module
      const callback = (appInfo: any) => {
        this.handleFocusEvent(appInfo);
      };

      // Start native monitoring
      const success = this.nativeModule.startMonitoringActiveApp(callback);

      if (!success) {
        logger.error('Failed to start active app monitoring');
        errorHandler.notify(
          ErrorLevel.ERROR,
          'AccessibilityService.startMonitoring',
          'MonitoringFailed',
          'Native module failed to start monitoring'
        );
        return;
      }

      this.isMonitoring = true;
      this.monitoringStartTime = new Date();

      logger.info('Started monitoring for text field focus events', {
        startTime: this.monitoringStartTime.toISOString()
      });
    } catch (error) {
      errorHandler.handleException('AccessibilityService.startMonitoring', error as Error);
      captureError(error as Error, {
        tags: { component: 'accessibility', type: 'monitoring_start_failed' },
        extra: { context: 'Failed to start active app monitoring' }
      });

      logger.error('Error starting monitoring', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Handle focus event from native module
   * @private
   */
  private handleFocusEvent(appInfo: any): void {
    try {
      logger.debug('Received focus event from native module', { appInfo });

      // Get detailed element information
      const element = this.nativeModule?.getFocusedElement();

      if (!element || !element.focused) {
        // No element focused, ignore
        return;
      }

      // Check if it's a text input field
      const isTextInput = this.nativeModule?.isTextInputElement(element) || false;

      if (!isTextInput) {
        // Not a text field, ignore
        logger.debug('Focused element is not a text input', {
          role: element.role,
          appName: element.appName
        });
        return;
      }

      // Build event object
      const focusEvent: TextFieldFocusEvent = {
        bundleId: appInfo.bundleId || 'unknown',
        appName: element.appName || 'Unknown App',
        windowTitle: appInfo.windowTitle || '',
        elementRole: element.role || 'AXTextField',
        canInject: isTextInput,
        timestamp: new Date().toISOString(),
        appPID: element.appPID || 0,
        value: element.value || '',
        selectedText: element.selectedText || ''
      };

      // Store last focused field
      this.lastFocusedField = focusEvent;

      // Emit event
      this.emit('text-field-focused', focusEvent);

      logger.info('Text field focused', {
        app: focusEvent.appName,
        role: focusEvent.elementRole,
        canInject: focusEvent.canInject
      });
    } catch (error) {
      errorHandler.handleException('AccessibilityService.handleFocusEvent', error as Error);
      logger.error('Error handling focus event', {
        error: (error as Error).message,
        appInfo
      });
    }
  }

  /**
   * Stop monitoring for focus changes
   *
   * Stops listening for application switches and text field focus events.
   * Safe to call even if monitoring is not active.
   *
   * @example
   * ```typescript
   * service.stopMonitoring();
   * ```
   */
  public stopMonitoring(): void {
    if (!this.nativeModule) {
      return;
    }

    if (!this.isMonitoring) {
      logger.debug('Monitoring not active - ignoring stop request');
      return;
    }

    try {
      this.nativeModule.stopMonitoringActiveApp();
      this.isMonitoring = false;

      const duration = this.monitoringStartTime
        ? (Date.now() - this.monitoringStartTime.getTime()) / 1000
        : 0;

      logger.info('Stopped monitoring for text field focus events', {
        durationSeconds: duration
      });

      this.monitoringStartTime = null;
    } catch (error) {
      errorHandler.handleException('AccessibilityService.stopMonitoring', error as Error);
      logger.error('Error stopping monitoring', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Inject text into the currently focused text field
   *
   * Validates that:
   * - Text is not empty
   * - Text is not too long (safety limit: 10,000 chars)
   * - A text field is currently focused
   * - The field supports text injection
   *
   * @param text - The text to inject
   * @returns Promise<boolean> - true if injection succeeded, false otherwise
   *
   * @example
   * ```typescript
   * const success = await service.injectText('Hello World!');
   * if (success) {
   *   console.log('Text injected successfully');
   * }
   * ```
   */
  public async injectText(text: string): Promise<boolean> {
    if (!this.nativeModule) {
      logger.error('Cannot inject text - native module not loaded');
      return false;
    }

    // Validate text parameter
    if (!text || typeof text !== 'string') {
      logger.warn('Cannot inject text - invalid text parameter', { text: typeof text });
      errorHandler.notify(
        ErrorLevel.WARNING,
        'AccessibilityService.injectText',
        'InvalidParameter',
        'Text parameter is empty or not a string'
      );
      return false;
    }

    if (text.length === 0) {
      logger.warn('Cannot inject text - empty string provided');
      return false;
    }

    if (text.length > 10000) {
      logger.warn('Cannot inject text - text too long', {
        length: text.length,
        maxLength: 10000
      });
      errorHandler.notify(
        ErrorLevel.WARNING,
        'AccessibilityService.injectText',
        'TextTooLong',
        `Text length ${text.length} exceeds maximum of 10,000 characters`
      );
      return false;
    }

    // Check if we have a focused field
    if (!this.lastFocusedField) {
      logger.warn('Cannot inject text - no text field currently focused');
      return false;
    }

    if (!this.lastFocusedField.canInject) {
      logger.warn('Cannot inject text - focused field does not support injection', {
        app: this.lastFocusedField.appName,
        role: this.lastFocusedField.elementRole
      });
      return false;
    }

    try {
      // Attempt injection
      const success = this.nativeModule.insertText(text);

      if (success) {
        logger.info('Text injected successfully', {
          app: this.lastFocusedField.appName,
          textLength: text.length,
          preview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
        });
      } else {
        logger.warn('Text injection failed', {
          app: this.lastFocusedField.appName,
          role: this.lastFocusedField.elementRole
        });
        errorHandler.notify(
          ErrorLevel.WARNING,
          'AccessibilityService.injectText',
          'InjectionFailed',
          `Failed to inject text into ${this.lastFocusedField.appName}`
        );
      }

      return success;
    } catch (error) {
      errorHandler.handleException('AccessibilityService.injectText', error as Error);
      captureError(error as Error, {
        tags: { component: 'accessibility', type: 'injection_failed' },
        extra: {
          app: this.lastFocusedField.appName,
          textLength: text.length
        }
      });

      logger.error('Error injecting text', {
        error: (error as Error).message,
        app: this.lastFocusedField.appName
      });

      return false;
    }
  }

  /**
   * Check if monitoring is currently active
   *
   * @returns boolean - true if monitoring, false otherwise
   *
   * @example
   * ```typescript
   * if (service.isActive()) {
   *   console.log('Monitoring active');
   * }
   * ```
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get the last focused text field event
   *
   * Returns null if no text field has been focused since monitoring started.
   *
   * @returns TextFieldFocusEvent | null
   *
   * @example
   * ```typescript
   * const field = service.getLastFocusedField();
   * if (field) {
   *   console.log(`Last focused: ${field.appName}`);
   * }
   * ```
   */
  public getLastFocusedField(): TextFieldFocusEvent | null {
    return this.lastFocusedField;
  }

  /**
   * Get the currently focused UI element (LIVE check, not cached)
   *
   * Directly queries macOS accessibility API for the current focused element.
   * Returns fresh data at the moment it's called, not cached event data.
   *
   * @returns Element info object with properties:
   *   - focused: Boolean
   *   - role: String (e.g., "AXTextField")
   *   - value: String (current text content)
   *   - isTextInput: Boolean
   *   - appName: String
   *   - appPID: Number
   *
   * @example
   * ```typescript
   * const element = service.getFocusedElement();
   * if (element && element.focused && element.isTextInput) {
   *   console.log(`Text field focused in ${element.appName}`);
   * }
   * ```
   */
  public getFocusedElement(): any {
    if (!this.nativeModule) {
      logger.warn('Cannot get focused element - native module not loaded');
      return null;
    }

    try {
      return this.nativeModule.getFocusedElement();
    } catch (error) {
      errorHandler.handleException('AccessibilityService.getFocusedElement', error as Error);
      logger.error('Error getting focused element', {
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Check if an element (or current focused element) is a text input
   *
   * @param element - Optional element object from getFocusedElement()
   *                  If not provided, checks the currently focused element
   * @returns Boolean - true if element is a text input field
   *
   * @example
   * ```typescript
   * // Check currently focused element
   * const isText = service.isTextInputElement();
   *
   * // Check specific element
   * const element = service.getFocusedElement();
   * const isText = service.isTextInputElement(element);
   * ```
   */
  public isTextInputElement(element?: any): boolean {
    if (!this.nativeModule) {
      logger.warn('Cannot check text input - native module not loaded');
      return false;
    }

    try {
      return this.nativeModule.isTextInputElement(element);
    } catch (error) {
      errorHandler.handleException('AccessibilityService.isTextInputElement', error as Error);
      logger.error('Error checking text input element', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Insert text into the currently focused text field
   *
   * Uses macOS Accessibility API to directly inject text at the cursor position.
   * This is more reliable than clipboard + paste simulation.
   *
   * @param text - Text to insert
   * @returns Boolean - true if insertion succeeded, false otherwise
   *
   * @example
   * ```typescript
   * const success = service.insertText('Hello world!');
   * if (success) {
   *   console.log('Text inserted successfully');
   * }
   * ```
   */
  public insertText(text: string): boolean {
    if (!this.nativeModule) {
      logger.warn('Cannot insert text - native module not loaded');
      return false;
    }

    try {
      return this.nativeModule.insertText(text);
    } catch (error) {
      errorHandler.handleException('AccessibilityService.insertText', error as Error);
      logger.error('Error inserting text', {
        error: (error as Error).message,
        textLength: text.length
      });
      return false;
    }
  }

  /**
   * Simulate Cmd+V paste operation globally
   *
   * Uses CGEvent to simulate keyboard input at the system level.
   * Works with ALL applications: terminals, browsers, native apps, everything.
   *
   * @returns Boolean - true if paste simulation succeeded
   *
   * @example
   * ```typescript
   * // Copy text to clipboard first
   * clipboard.writeText('Hello world');
   *
   * // Then simulate paste
   * const success = service.simulatePaste();
   * ```
   */
  public simulatePaste(): boolean {
    if (!this.nativeModule) {
      logger.warn('Cannot simulate paste - native module not loaded');
      return false;
    }

    try {
      return this.nativeModule.simulatePaste();
    } catch (error) {
      errorHandler.handleException('AccessibilityService.simulatePaste', error as Error);
      logger.error('Error simulating paste', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Clean up and destroy the service
   *
   * Stops monitoring, removes all event listeners, and clears references.
   * Should be called before app shutdown.
   *
   * @example
   * ```typescript
   * // On app shutdown
   * service.destroy();
   * ```
   */
  public destroy(): void {
    try {
      // Stop monitoring if active
      if (this.isMonitoring) {
        this.stopMonitoring();
      }

      // Remove all event listeners
      this.removeAllListeners();

      // Clear references
      this.lastFocusedField = null;
      this.monitoringStartTime = null;

      logger.info('AccessibilityService destroyed and cleaned up');
    } catch (error) {
      errorHandler.handleException('AccessibilityService.destroy', error as Error);
      logger.error('Error during service cleanup', {
        error: (error as Error).message
      });
    }
  }
}
