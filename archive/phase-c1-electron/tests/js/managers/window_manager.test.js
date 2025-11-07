/**
 * WindowManager Tests
 *
 * Tests for the WindowManager class, which handles window lifecycle.
 */

const { WindowManager } = require('../../../src/js/managers/window_manager');
const { BrowserWindow } = require('electron');

// Mock Electron BrowserWindow
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
    destroy: jest.fn()
  }))
}));

describe('WindowManager', () => {
  let windowManager;
  let mockWindow;
  const baseDir = '/test/base';

  beforeEach(() => {
    jest.clearAllMocks();
    windowManager = new WindowManager(baseDir);
  });

  describe('constructor', () => {
    it('should initialize with null window', () => {
      expect(windowManager.window).toBeNull();
    });
  });

  describe('create', () => {
    it('should create BrowserWindow with correct settings', () => {
      windowManager.create();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 800,
          height: 600,
          webPreferences: expect.objectContaining({
            nodeIntegration: false,
            contextIsolation: true
          })
        })
      );
    });

    it('should load recorder view after creation', () => {
      const window = windowManager.create();
      expect(window.loadFile).toHaveBeenCalledWith('/test/base/index.html');
    });

    it('should return window instance', () => {
      const window = windowManager.create();
      expect(window).toBeDefined();
      expect(windowManager.window).toBe(window);
    });
  });

  describe('loadRecorderView', () => {
    it('should load index.html', () => {
      windowManager.create();
      windowManager.loadRecorderView();

      // Called twice: once in create(), once explicitly
      expect(windowManager.window.loadFile).toHaveBeenCalledWith('/test/base/index.html');
    });

    it('should throw if window not created', () => {
      expect(() => windowManager.loadRecorderView()).toThrow('Window not created');
    });

    it('should throw if window destroyed', () => {
      windowManager.create();
      windowManager.window.isDestroyed.mockReturnValue(true);

      expect(() => windowManager.loadRecorderView()).toThrow('Window not created');
    });
  });

  describe('loadHistoryView', () => {
    it('should load history.html', () => {
      windowManager.create();
      windowManager.loadHistoryView();

      expect(windowManager.window.loadFile).toHaveBeenCalledWith('/test/base/history.html');
    });

    it('should throw if window not created', () => {
      expect(() => windowManager.loadHistoryView()).toThrow('Window not created');
    });

    it('should throw if window destroyed', () => {
      windowManager.create();
      windowManager.window.isDestroyed.mockReturnValue(true);

      expect(() => windowManager.loadHistoryView()).toThrow('Window not created');
    });
  });

  describe('getWindow', () => {
    it('should return null when window not created', () => {
      expect(windowManager.getWindow()).toBeNull();
    });

    it('should return window instance when created', () => {
      const window = windowManager.create();
      expect(windowManager.getWindow()).toBe(window);
    });
  });

  describe('isValid', () => {
    it('should return false when window not created', () => {
      expect(windowManager.isValid()).toBe(false);
    });

    it('should return true when window created', () => {
      windowManager.create();
      expect(windowManager.isValid()).toBe(true);
    });

    it('should return false when window destroyed', () => {
      windowManager.create();
      windowManager.window.isDestroyed.mockReturnValue(true);

      expect(windowManager.isValid()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should destroy window and set to null', () => {
      windowManager.create();
      const window = windowManager.window;

      windowManager.destroy();

      expect(window.destroy).toHaveBeenCalled();
      expect(windowManager.window).toBeNull();
    });

    it('should handle destroy when window not created', () => {
      expect(() => windowManager.destroy()).not.toThrow();
      expect(windowManager.window).toBeNull();
    });

    it('should handle destroy when window already destroyed', () => {
      windowManager.create();
      windowManager.window.isDestroyed.mockReturnValue(true);

      expect(() => windowManager.destroy()).not.toThrow();
    });
  });
});
