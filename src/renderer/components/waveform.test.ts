/**
 * Unit tests for WaveformVisualizer
 *
 * Note: These tests use JSDOM for DOM mocking.
 * Full integration tests require a real browser environment.
 */

import { WaveformVisualizer } from './waveform';

describe('WaveformVisualizer', () => {
  let canvas: HTMLCanvasElement;
  let visualizer: WaveformVisualizer;

  beforeEach(() => {
    // Create a mock canvas element
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    // Cleanup
    if (visualizer) {
      visualizer.cleanup();
    }
    document.body.removeChild(canvas);
  });

  describe('Constructor', () => {
    test('should create a visualizer instance', () => {
      visualizer = new WaveformVisualizer(canvas);
      expect(visualizer).toBeInstanceOf(WaveformVisualizer);
    });

    test('should set canvas dimensions', () => {
      visualizer = new WaveformVisualizer(canvas);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(120);
    });

    test('should throw error if canvas context is null', () => {
      // Mock getContext to return null
      const mockCanvas = document.createElement('canvas');
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(null);

      expect(() => {
        new WaveformVisualizer(mockCanvas);
      }).toThrow('Failed to get 2D canvas context');
    });

    test('should initialize with inactive state', () => {
      visualizer = new WaveformVisualizer(canvas);
      expect(visualizer.isActive()).toBe(false);
    });
  });

  describe('Lifecycle Methods', () => {
    beforeEach(() => {
      visualizer = new WaveformVisualizer(canvas);
    });

    test('should have getCanvas method', () => {
      expect(visualizer.getCanvas()).toBe(canvas);
    });

    test('should throw error when starting without initialization', () => {
      expect(() => {
        visualizer.start();
      }).toThrow('Cannot start: call initFromStream() first');
    });

    test('isActive should return false initially', () => {
      expect(visualizer.isActive()).toBe(false);
    });

    test('stop should be safe to call when not running', () => {
      expect(() => {
        visualizer.stop();
      }).not.toThrow();
    });

    test('cleanup should be safe to call multiple times', () => {
      expect(() => {
        visualizer.cleanup();
        visualizer.cleanup();
      }).not.toThrow();
    });
  });

  describe('Canvas Rendering', () => {
    beforeEach(() => {
      visualizer = new WaveformVisualizer(canvas);
    });

    test('should clear canvas on initialization', () => {
      const ctx = canvas.getContext('2d');
      const fillRectSpy = jest.spyOn(ctx!, 'fillRect');

      visualizer = new WaveformVisualizer(canvas);

      // Should have called fillRect to clear canvas
      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 800, 120);
    });

    test('should have correct canvas dimensions', () => {
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(120);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid MediaStream gracefully', async () => {
      visualizer = new WaveformVisualizer(canvas);

      // Test with null stream
      await expect(visualizer.initFromStream(null as any)).rejects.toThrow(
        'Invalid MediaStream'
      );

      // Test with empty stream
      const emptyStream = {
        getAudioTracks: () => []
      } as MediaStream;

      await expect(visualizer.initFromStream(emptyStream)).rejects.toThrow(
        'Invalid MediaStream'
      );
    });

    test('should cleanup on initialization failure', async () => {
      visualizer = new WaveformVisualizer(canvas);

      // Force initialization to fail
      const invalidStream = null as any;

      try {
        await visualizer.initFromStream(invalidStream);
      } catch (error) {
        // Error expected
      }

      // Verify cleanup was called (isActive should be false)
      expect(visualizer.isActive()).toBe(false);
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      visualizer = new WaveformVisualizer(canvas);
    });

    test('should track running state correctly', () => {
      expect(visualizer.isActive()).toBe(false);

      // Note: Can't actually start without Web Audio API in test environment
      // This test verifies the API exists
      expect(typeof visualizer.start).toBe('function');
      expect(typeof visualizer.stop).toBe('function');
    });

    test('should provide canvas access', () => {
      const retrievedCanvas = visualizer.getCanvas();
      expect(retrievedCanvas).toBe(canvas);
      expect(retrievedCanvas.width).toBe(800);
      expect(retrievedCanvas.height).toBe(120);
    });
  });
});

/**
 * Integration Test Notes
 * ======================
 *
 * The following tests require a real browser environment with Web Audio API support.
 * They cannot run in JSDOM/Node.js environment.
 *
 * Manual integration tests should verify:
 *
 * 1. Audio Pipeline Initialization
 *    - initFromStream() creates AudioContext
 *    - AnalyserNode is configured correctly
 *    - MediaStreamSource connects to analyser
 *
 * 2. Real-time Rendering
 *    - start() begins animation loop
 *    - requestAnimationFrame is called recursively
 *    - Frequency data is fetched each frame
 *    - Bars are drawn correctly
 *
 * 3. Performance
 *    - Maintains 30fps target
 *    - CPU usage <5%
 *    - Memory stable (no leaks)
 *    - Frame time <33.33ms
 *
 * 4. Color Gradient
 *    - Low amplitude shows green
 *    - Medium amplitude shows yellow
 *    - High amplitude shows red
 *    - Smooth color transitions
 *
 * 5. Cleanup
 *    - stop() cancels animation
 *    - cleanup() disconnects audio nodes
 *    - cleanup() closes AudioContext
 *    - No errors on cleanup
 *
 * 6. Error Cases
 *    - Handles permission denial
 *    - Handles invalid streams
 *    - Handles Web Audio API unavailable
 *    - Graceful degradation
 *
 * To run integration tests:
 * 1. Open src/renderer/waveform-test.html in browser
 * 2. Follow the testing checklist in README.md
 * 3. Verify all acceptance criteria pass
 */
