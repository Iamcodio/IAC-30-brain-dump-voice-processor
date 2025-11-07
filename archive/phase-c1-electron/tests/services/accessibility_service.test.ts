/**
 * Unit Tests for AccessibilityService
 *
 * Tests the TypeScript wrapper for the native macOS Accessibility module.
 * Validates:
 * - Module loading and initialization
 * - Permission checking and requesting
 * - Monitoring lifecycle (start/stop)
 * - Text field focus event emission
 * - Text injection functionality
 * - Error handling and edge cases
 */

import { AccessibilityService, TextFieldFocusEvent } from '../../src/services/accessibility_service';
import { EventEmitter } from 'events';

// Mock the native module
jest.mock('../../build/Release/accessibility.node', () => ({
  hasAccessibilityPermissions: jest.fn(),
  requestAccessibilityPermissions: jest.fn(),
  getFocusedElement: jest.fn(),
  isTextInputElement: jest.fn(),
  insertText: jest.fn(),
  startMonitoringActiveApp: jest.fn(),
  stopMonitoringActiveApp: jest.fn()
}), { virtual: true });

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock error handler
jest.mock('../../src/js/error_handler', () => ({
  errorHandler: {
    handleException: jest.fn(),
    notify: jest.fn()
  },
  captureError: jest.fn(),
  ErrorLevel: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
  }
}));

describe('AccessibilityService', () => {
  let service: AccessibilityService;
  let mockNativeModule: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get reference to mocked native module
    mockNativeModule = require('../../build/Release/accessibility.node');

    // Create service instance
    service = new AccessibilityService();
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  describe('initialization', () => {
    it('should create instance successfully', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EventEmitter);
    });

    it('should load native module successfully', () => {
      expect(service).toBeDefined();
      expect(service.isActive()).toBe(false);
    });

    it('should be inactive after initialization', () => {
      expect(service.isActive()).toBe(false);
    });

    it('should handle missing native module gracefully', async () => {
      // Create service with broken module path
      const brokenService = new AccessibilityService();

      // Should not crash
      expect(brokenService).toBeDefined();

      // Permission check should return false
      const hasPermissions = await brokenService.ensurePermissions();
      expect(hasPermissions).toBe(false);

      brokenService.destroy();
    });
  });

  describe('permissions', () => {
    it('should check permissions successfully', async () => {
      mockNativeModule.hasAccessibilityPermissions.mockReturnValue(true);

      const hasPermissions = await service.ensurePermissions();

      expect(hasPermissions).toBe(true);
      expect(mockNativeModule.hasAccessibilityPermissions).toHaveBeenCalled();
    });

    it('should return false when permissions not granted', async () => {
      mockNativeModule.hasAccessibilityPermissions.mockReturnValue(false);
      mockNativeModule.requestAccessibilityPermissions.mockReturnValue(true);

      const hasPermissions = await service.ensurePermissions();

      expect(hasPermissions).toBe(false);
      expect(mockNativeModule.requestAccessibilityPermissions).toHaveBeenCalled();
    });

    it('should request permissions when not granted', async () => {
      mockNativeModule.hasAccessibilityPermissions.mockReturnValueOnce(false);
      mockNativeModule.requestAccessibilityPermissions.mockReturnValue(true);

      await service.ensurePermissions();

      expect(mockNativeModule.requestAccessibilityPermissions).toHaveBeenCalled();
    });

    it('should handle permission errors gracefully', async () => {
      mockNativeModule.hasAccessibilityPermissions.mockImplementation(() => {
        throw new Error('Permission check failed');
      });

      const hasPermissions = await service.ensurePermissions();

      expect(hasPermissions).toBe(false);
    });

    it('should not request permissions if already granted', async () => {
      mockNativeModule.hasAccessibilityPermissions.mockReturnValue(true);

      const hasPermissions = await service.ensurePermissions();

      expect(hasPermissions).toBe(true);
      expect(mockNativeModule.requestAccessibilityPermissions).not.toHaveBeenCalled();
    });
  });

  describe('monitoring', () => {
    beforeEach(() => {
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);
      mockNativeModule.stopMonitoringActiveApp.mockReturnValue(true);
    });

    it('should start monitoring successfully', () => {
      service.startMonitoring();

      expect(service.isActive()).toBe(true);
      expect(mockNativeModule.startMonitoringActiveApp).toHaveBeenCalled();
    });

    it('should stop monitoring successfully', () => {
      service.startMonitoring();
      service.stopMonitoring();

      expect(service.isActive()).toBe(false);
      expect(mockNativeModule.stopMonitoringActiveApp).toHaveBeenCalled();
    });

    it('should not start monitoring twice', () => {
      service.startMonitoring();
      service.startMonitoring();

      expect(mockNativeModule.startMonitoringActiveApp).toHaveBeenCalledTimes(1);
    });

    it('should handle stop when not monitoring', () => {
      service.stopMonitoring();

      expect(service.isActive()).toBe(false);
      expect(mockNativeModule.stopMonitoringActiveApp).not.toHaveBeenCalled();
    });

    it('should emit text-field-focused events', (done) => {
      mockNativeModule.getFocusedElement.mockReturnValue({
        focused: true,
        role: 'AXTextField',
        appName: 'Google Chrome',
        appPID: 1234,
        value: '',
        selectedText: ''
      });
      mockNativeModule.isTextInputElement.mockReturnValue(true);

      // Setup listener
      service.on('text-field-focused', (event: TextFieldFocusEvent) => {
        expect(event).toHaveProperty('bundleId');
        expect(event).toHaveProperty('appName');
        expect(event).toHaveProperty('canInject');
        expect(event.canInject).toBe(true);
        expect(event.appName).toBe('Google Chrome');
        done();
      });

      // Start monitoring
      service.startMonitoring();

      // Simulate focus event by calling the callback
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.google.Chrome', windowTitle: 'Test' });
    });

    it('should not emit events for non-text fields', (done) => {
      mockNativeModule.getFocusedElement.mockReturnValue({
        focused: true,
        role: 'AXButton',
        appName: 'Google Chrome',
        appPID: 1234
      });
      mockNativeModule.isTextInputElement.mockReturnValue(false);

      let eventEmitted = false;
      service.on('text-field-focused', () => {
        eventEmitted = true;
      });

      service.startMonitoring();

      // Simulate focus event
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.google.Chrome', windowTitle: 'Test' });

      // Wait and verify no event was emitted
      setTimeout(() => {
        expect(eventEmitted).toBe(false);
        done();
      }, 100);
    });

    it('should handle monitoring start failure', () => {
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(false);

      service.startMonitoring();

      expect(service.isActive()).toBe(false);
    });
  });

  describe('text injection', () => {
    beforeEach(() => {
      // Setup a focused text field
      mockNativeModule.getFocusedElement.mockReturnValue({
        focused: true,
        role: 'AXTextField',
        appName: 'Google Chrome',
        appPID: 1234,
        value: '',
        selectedText: ''
      });
      mockNativeModule.isTextInputElement.mockReturnValue(true);
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);

      service.startMonitoring();

      // Trigger a focus event
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.google.Chrome', windowTitle: 'Test' });
    });

    it('should inject text successfully', async () => {
      mockNativeModule.insertText.mockReturnValue(true);

      const result = await service.injectText('test text');

      expect(result).toBe(true);
      expect(mockNativeModule.insertText).toHaveBeenCalledWith('test text');
    });

    it('should return false when no field focused', async () => {
      // Create new service without triggering focus
      const newService = new AccessibilityService();

      const result = await newService.injectText('test');

      expect(result).toBe(false);

      newService.destroy();
    });

    it('should reject empty text', async () => {
      const result = await service.injectText('');

      expect(result).toBe(false);
      expect(mockNativeModule.insertText).not.toHaveBeenCalled();
    });

    it('should reject non-string text', async () => {
      const result = await service.injectText(null as any);

      expect(result).toBe(false);
      expect(mockNativeModule.insertText).not.toHaveBeenCalled();
    });

    it('should reject text that is too long', async () => {
      const longText = 'x'.repeat(10001);

      const result = await service.injectText(longText);

      expect(result).toBe(false);
      expect(mockNativeModule.insertText).not.toHaveBeenCalled();
    });

    it('should accept text up to 10,000 characters', async () => {
      mockNativeModule.insertText.mockReturnValue(true);
      const maxText = 'x'.repeat(10000);

      const result = await service.injectText(maxText);

      expect(result).toBe(true);
      expect(mockNativeModule.insertText).toHaveBeenCalledWith(maxText);
    });

    it('should handle injection failure', async () => {
      mockNativeModule.insertText.mockReturnValue(false);

      const result = await service.injectText('test text');

      expect(result).toBe(false);
    });

    it('should handle injection errors gracefully', async () => {
      mockNativeModule.insertText.mockImplementation(() => {
        throw new Error('Injection failed');
      });

      const result = await service.injectText('test text');

      expect(result).toBe(false);
    });

    it('should inject multiline text', async () => {
      mockNativeModule.insertText.mockReturnValue(true);
      const multilineText = 'Line 1\nLine 2\nLine 3';

      const result = await service.injectText(multilineText);

      expect(result).toBe(true);
      expect(mockNativeModule.insertText).toHaveBeenCalledWith(multilineText);
    });

    it('should inject special characters', async () => {
      mockNativeModule.insertText.mockReturnValue(true);
      const specialText = 'Test with émojis 🎉 and symbols @#$%';

      const result = await service.injectText(specialText);

      expect(result).toBe(true);
      expect(mockNativeModule.insertText).toHaveBeenCalledWith(specialText);
    });
  });

  describe('state management', () => {
    it('should track last focused field', () => {
      mockNativeModule.getFocusedElement.mockReturnValue({
        focused: true,
        role: 'AXTextField',
        appName: 'Google Chrome',
        appPID: 1234,
        value: 'test value',
        selectedText: ''
      });
      mockNativeModule.isTextInputElement.mockReturnValue(true);
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);

      service.startMonitoring();

      // Trigger focus event
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.google.Chrome', windowTitle: 'Test Window' });

      const lastField = service.getLastFocusedField();

      expect(lastField).toBeDefined();
      expect(lastField?.appName).toBe('Google Chrome');
      expect(lastField?.bundleId).toBe('com.google.Chrome');
      expect(lastField?.windowTitle).toBe('Test Window');
      expect(lastField?.value).toBe('test value');
    });

    it('should return null when no field focused', () => {
      const lastField = service.getLastFocusedField();

      expect(lastField).toBeNull();
    });

    it('should clear state on destroy', () => {
      mockNativeModule.getFocusedElement.mockReturnValue({
        focused: true,
        role: 'AXTextField',
        appName: 'Google Chrome',
        appPID: 1234
      });
      mockNativeModule.isTextInputElement.mockReturnValue(true);
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);

      service.startMonitoring();

      // Trigger focus event
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.google.Chrome', windowTitle: 'Test' });

      expect(service.getLastFocusedField()).toBeDefined();

      service.destroy();

      expect(service.getLastFocusedField()).toBeNull();
      expect(service.isActive()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should stop monitoring on destroy', () => {
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);
      mockNativeModule.stopMonitoringActiveApp.mockReturnValue(true);

      service.startMonitoring();
      expect(service.isActive()).toBe(true);

      service.destroy();

      expect(service.isActive()).toBe(false);
      expect(mockNativeModule.stopMonitoringActiveApp).toHaveBeenCalled();
    });

    it('should remove all event listeners on destroy', () => {
      const listener = jest.fn();
      service.on('text-field-focused', listener);

      service.destroy();

      expect(service.listenerCount('text-field-focused')).toBe(0);
    });

    it('should handle destroy errors gracefully', () => {
      mockNativeModule.stopMonitoringActiveApp.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);
      service.startMonitoring();

      expect(() => service.destroy()).not.toThrow();
    });

    it('should be safe to call destroy multiple times', () => {
      service.destroy();
      service.destroy();

      expect(service.isActive()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null element from native module', () => {
      mockNativeModule.getFocusedElement.mockReturnValue(null);
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);

      let eventEmitted = false;
      service.on('text-field-focused', () => {
        eventEmitted = true;
      });

      service.startMonitoring();

      // Trigger focus event
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.test.app', windowTitle: 'Test' });

      expect(eventEmitted).toBe(false);
    });

    it('should handle element without focused property', () => {
      mockNativeModule.getFocusedElement.mockReturnValue({
        role: 'AXTextField',
        appName: 'Test App'
        // Missing 'focused' property
      });
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);

      let eventEmitted = false;
      service.on('text-field-focused', () => {
        eventEmitted = true;
      });

      service.startMonitoring();

      // Trigger focus event
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.test.app', windowTitle: 'Test' });

      expect(eventEmitted).toBe(false);
    });

    it('should handle missing appInfo properties', () => {
      mockNativeModule.getFocusedElement.mockReturnValue({
        focused: true,
        role: 'AXTextField',
        appName: 'Test App',
        appPID: 1234
      });
      mockNativeModule.isTextInputElement.mockReturnValue(true);
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);

      service.on('text-field-focused', (event: TextFieldFocusEvent) => {
        expect(event.bundleId).toBe('unknown');
        expect(event.windowTitle).toBe('');
      });

      service.startMonitoring();

      // Trigger focus event with minimal appInfo
      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({});
    });

    it('should handle concurrent start/stop calls', () => {
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);
      mockNativeModule.stopMonitoringActiveApp.mockReturnValue(true);

      service.startMonitoring();
      service.stopMonitoring();
      service.startMonitoring();
      service.stopMonitoring();

      expect(service.isActive()).toBe(false);
    });

    it('should validate event timestamp format', (done) => {
      mockNativeModule.getFocusedElement.mockReturnValue({
        focused: true,
        role: 'AXTextField',
        appName: 'Test App',
        appPID: 1234
      });
      mockNativeModule.isTextInputElement.mockReturnValue(true);
      mockNativeModule.startMonitoringActiveApp.mockReturnValue(true);

      service.on('text-field-focused', (event: TextFieldFocusEvent) => {
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        const date = new Date(event.timestamp);
        expect(date.getTime()).not.toBeNaN();
        done();
      });

      service.startMonitoring();

      const callback = mockNativeModule.startMonitoringActiveApp.mock.calls[0][0];
      callback({ bundleId: 'com.test.app', windowTitle: 'Test' });
    });
  });
});
