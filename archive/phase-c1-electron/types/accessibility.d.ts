/**
 * Type definitions for the native macOS Accessibility module
 *
 * This module provides Node.js bindings to macOS Accessibility APIs,
 * enabling detection of focused text fields and programmatic text injection.
 *
 * @module accessibility
 */

/**
 * Information about a focused UI element
 */
export interface FocusedElement {
    /** Whether any element is currently focused */
    focused: boolean;

    /** Name of the application (e.g., "Google Chrome") */
    appName?: string;

    /** Process ID of the application */
    appPID?: number;

    /** Accessibility role (e.g., "AXTextField", "AXTextArea") */
    role?: string;

    /** Current text content of the element */
    value?: string;

    /** Whether the element is a text input field */
    isTextInput?: boolean;

    /** Currently selected text (if any) */
    selectedText?: string;

    /** Range of selected text */
    selectedRange?: {
        /** Starting position of selection */
        location: number;
        /** Length of selection */
        length: number;
    };
}

/**
 * Information about an active application
 */
export interface AppInfo {
    /** Display name of the application */
    appName: string;

    /** Process ID of the application */
    appPID: number;

    /** Bundle identifier (e.g., "com.google.Chrome") */
    bundleIdentifier: string;
}

/**
 * Callback function for app monitoring
 */
export type AppMonitorCallback = (appInfo: AppInfo) => void;

/**
 * Native macOS Accessibility Module
 *
 * Provides access to macOS Accessibility APIs for detecting focused
 * text fields and injecting text programmatically.
 *
 * @example
 * ```typescript
 * import * as accessibility from './build/Release/accessibility.node';
 *
 * // Check permissions
 * if (!accessibility.hasAccessibilityPermissions()) {
 *     accessibility.requestAccessibilityPermissions();
 * }
 *
 * // Get focused element
 * const element = accessibility.getFocusedElement();
 * if (element.isTextInput) {
 *     accessibility.insertText('Hello, world!');
 * }
 * ```
 */
declare module 'accessibility' {
    /**
     * Check if the application has accessibility permissions
     *
     * This queries the system's Accessibility database to determine if
     * the current process has permission to control the computer.
     *
     * @returns true if permissions are granted, false otherwise
     *
     * @example
     * ```typescript
     * const hasPerms = hasAccessibilityPermissions();
     * if (!hasPerms) {
     *     console.log('Please grant accessibility permissions');
     * }
     * ```
     */
    export function hasAccessibilityPermissions(): boolean;

    /**
     * Request accessibility permissions from the user
     *
     * This will trigger the system dialog asking the user to grant
     * accessibility permissions. It opens System Preferences to the
     * Privacy & Security > Accessibility panel.
     *
     * Note: The dialog can only be shown once. Subsequent calls will
     * do nothing if the user has already seen it.
     *
     * @returns true if dialog was shown, false if already granted
     *
     * @example
     * ```typescript
     * if (!hasAccessibilityPermissions()) {
     *     const shown = requestAccessibilityPermissions();
     *     if (shown) {
     *         console.log('Please grant permissions in System Preferences');
     *     }
     * }
     * ```
     */
    export function requestAccessibilityPermissions(): boolean;

    /**
     * Get information about the currently focused UI element
     *
     * Returns detailed information about the element that currently
     * has keyboard focus, including its role, value, and whether it
     * accepts text input.
     *
     * @returns Information about the focused element
     * @throws Error if accessibility permissions are not granted
     *
     * @example
     * ```typescript
     * try {
     *     const element = getFocusedElement();
     *     if (element.focused) {
     *         console.log(`Focused in ${element.appName}`);
     *         console.log(`Role: ${element.role}`);
     *         console.log(`Value: ${element.value}`);
     *         console.log(`Is text input: ${element.isTextInput}`);
     *     }
     * } catch (err) {
     *     console.error('Accessibility permissions required');
     * }
     * ```
     */
    export function getFocusedElement(): FocusedElement;

    /**
     * Check if an element is a text input field
     *
     * Determines if the given element (or currently focused element)
     * can accept text input. This checks the accessibility role and
     * attributes to identify text fields, text areas, and other
     * text-accepting elements.
     *
     * @param element - Optional element from getFocusedElement().
     *                  If not provided, checks the currently focused element.
     * @returns true if the element can accept text input
     * @throws TypeError if element argument is invalid
     *
     * @example
     * ```typescript
     * // Check a specific element
     * const element = getFocusedElement();
     * const isTextInput = isTextInputElement(element);
     *
     * // Or check current focus directly
     * const isCurrentTextInput = isTextInputElement();
     *
     * if (isCurrentTextInput) {
     *     console.log('Can insert text here');
     * }
     * ```
     */
    export function isTextInputElement(element?: FocusedElement): boolean;

    /**
     * Insert text at the current cursor position
     *
     * Injects text into the currently focused text field, preserving
     * any existing text. The text is inserted at the cursor position,
     * or replaces selected text if there is a selection.
     *
     * The cursor is automatically positioned after the inserted text.
     *
     * @param text - String to insert
     * @param element - Optional element info (uses focused if not provided)
     * @returns true if insertion succeeded, false otherwise
     * @throws Error if accessibility permissions are not granted
     *
     * @example
     * ```typescript
     * const element = getFocusedElement();
     * if (isTextInputElement(element)) {
     *     const success = insertText('Hello from BrainDump!');
     *     if (success) {
     *         console.log('Text inserted successfully');
     *     } else {
     *         console.log('Failed to insert text');
     *     }
     * }
     * ```
     */
    export function insertText(text: string, element?: FocusedElement): boolean;

    /**
     * Start monitoring active application changes
     *
     * Registers a callback that fires whenever the user switches to a
     * different application. Useful for detecting context changes and
     * updating UI accordingly.
     *
     * Only one monitor can be active at a time. Calling this function
     * again will stop the previous monitor and start a new one.
     *
     * @param callback - Function called on app switch
     * @returns true if monitoring started successfully
     * @throws Error if accessibility permissions are not granted
     *
     * @example
     * ```typescript
     * startMonitoringActiveApp((appInfo) => {
     *     console.log(`Switched to: ${appInfo.appName}`);
     *     console.log(`PID: ${appInfo.appPID}`);
     *     console.log(`Bundle ID: ${appInfo.bundleIdentifier}`);
     *
     *     // Update UI based on active app
     *     if (appInfo.bundleIdentifier === 'com.google.Chrome') {
     *         console.log('Browser is active');
     *     }
     * });
     * ```
     */
    export function startMonitoringActiveApp(callback: AppMonitorCallback): boolean;

    /**
     * Stop monitoring active application changes
     *
     * Stops the active application monitoring started by
     * startMonitoringActiveApp(). Safe to call even if no
     * monitoring is active.
     *
     * @returns true on success
     *
     * @example
     * ```typescript
     * // Start monitoring
     * startMonitoringActiveApp((appInfo) => {
     *     console.log('App changed:', appInfo.appName);
     * });
     *
     * // Later, stop monitoring
     * stopMonitoringActiveApp();
     * ```
     */
    export function stopMonitoringActiveApp(): boolean;
}

// Export for CommonJS
export = {
    hasAccessibilityPermissions,
    requestAccessibilityPermissions,
    getFocusedElement,
    isTextInputElement,
    insertText,
    startMonitoringActiveApp,
    stopMonitoringActiveApp
};
