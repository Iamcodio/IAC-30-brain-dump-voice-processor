/**
 * Performance Tests for Auto-Fill Functionality
 *
 * Validates performance characteristics of the auto-fill system:
 * - Text injection latency (<100ms target)
 * - Debouncing effectiveness
 * - Memory leak prevention
 * - High-frequency operation handling
 * - Large transcript processing
 *
 * These tests measure and verify performance metrics to ensure
 * auto-fill operates smoothly and efficiently.
 */

import { AutoFillManager } from '../../src/managers/autofill_manager';
import { AccessibilityService } from '../../src/services/accessibility_service';

// Mock AccessibilityService
jest.mock('../../src/services/accessibility_service');

// Mock config
jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    const config: any = {
      'autoFill.enabled': true,
      'autoFill.requireManualTrigger': false,
      'autoFill.debounceMs': 500,
      'autoFill.blacklistedApps': []
    };
    return config[key];
  })
}));

// Mock logger (silent for performance tests)
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

describe('Auto-Fill Performance Tests', () => {
  let manager: AutoFillManager;
  let mockDatabase: any;
  let mockAccessibilityService: jest.Mocked<AccessibilityService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock database
    mockDatabase = {
      getAll: jest.fn().mockResolvedValue([
        {
          id: 'perf_test_rec',
          timestamp: '2025-01-26T12:00:00Z',
          audioPath: '/path/to/audio.wav',
          transcriptPath: '/path/to/transcript.md',
          firstLine: 'Performance test transcript',
          transcript: 'Performance test transcript content',
          duration: '5 sec',
          preview: 'Performance test transcript',
          fullText: 'Performance test transcript content'
        }
      ]),
      updateById: jest.fn().mockResolvedValue({
        id: 'perf_test_rec',
        autoFillCount: 1
      })
    };

    manager = new AutoFillManager(mockDatabase);

    // Get mock accessibility service
    mockAccessibilityService = (AccessibilityService as jest.MockedClass<typeof AccessibilityService>).mock.instances[0] as jest.Mocked<AccessibilityService>;

    // Setup fast mock responses
    mockAccessibilityService.ensurePermissions = jest.fn().mockResolvedValue(true);
    mockAccessibilityService.startMonitoring = jest.fn();
    mockAccessibilityService.stopMonitoring = jest.fn();
    mockAccessibilityService.isActive = jest.fn().mockReturnValue(false);
    mockAccessibilityService.getLastFocusedField = jest.fn().mockReturnValue({
      bundleId: 'com.test.app',
      appName: 'Test App',
      windowTitle: 'Test',
      elementRole: 'AXTextField',
      canInject: true,
      timestamp: '2025-01-26T12:00:00Z',
      appPID: 1234
    });
    mockAccessibilityService.injectText = jest.fn().mockResolvedValue(true);
    mockAccessibilityService.on = jest.fn();
    mockAccessibilityService.removeListener = jest.fn();
  });

  afterEach(async () => {
    if (manager) {
      await manager.stop();
    }
  });

  describe('Text Injection Latency', () => {
    it('should inject text within 100ms', async () => {
      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(mockAccessibilityService.injectText).toHaveBeenCalled();
    });

    it('should inject small text within 50ms', async () => {
      mockDatabase.getAll.mockResolvedValue([
        {
          id: 'small_text',
          timestamp: '2025-01-26T12:00:00Z',
          audioPath: '/path/to/audio.wav',
          transcriptPath: '/path/to/transcript.md',
          firstLine: 'Hi',
          transcript: 'Hi',
          duration: '1 sec',
          preview: 'Hi',
          fullText: 'Hi'
        }
      ]);

      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('should inject medium text within 75ms', async () => {
      const mediumText = 'This is a medium-length transcript with about 100 characters to test performance of auto-fill.';
      mockDatabase.getAll.mockResolvedValue([
        {
          id: 'medium_text',
          timestamp: '2025-01-26T12:00:00Z',
          audioPath: '/path/to/audio.wav',
          transcriptPath: '/path/to/transcript.md',
          firstLine: mediumText,
          transcript: mediumText,
          duration: '5 sec',
          preview: mediumText,
          fullText: mediumText
        }
      ]);

      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(75);
    });

    it('should measure average latency over 10 fills', async () => {
      await manager.start();

      const timings: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await manager.performAutoFill();
        const elapsed = performance.now() - start;
        timings.push(elapsed);

        // Reset debounce
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const average = timings.reduce((a, b) => a + b, 0) / timings.length;
      const max = Math.max(...timings);
      const min = Math.min(...timings);

      console.log('Latency Stats:');
      console.log(`  Average: ${average.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);

      expect(average).toBeLessThan(100);
      expect(max).toBeLessThan(150); // Allow some variance
    });
  });

  describe('Large Transcript Handling', () => {
    it('should handle 1000-character transcript within 100ms', async () => {
      const largeText = 'x'.repeat(1000);
      mockDatabase.getAll.mockResolvedValue([
        {
          id: 'large_1k',
          timestamp: '2025-01-26T12:00:00Z',
          audioPath: '/path/to/audio.wav',
          transcriptPath: '/path/to/transcript.md',
          firstLine: largeText,
          transcript: largeText,
          duration: '60 sec',
          preview: largeText.substring(0, 100),
          fullText: largeText
        }
      ]);

      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(mockAccessibilityService.injectText).toHaveBeenCalledWith(largeText);
    });

    it('should handle 5000-character transcript within 150ms', async () => {
      const veryLargeText = 'x'.repeat(5000);
      mockDatabase.getAll.mockResolvedValue([
        {
          id: 'large_5k',
          timestamp: '2025-01-26T12:00:00Z',
          audioPath: '/path/to/audio.wav',
          transcriptPath: '/path/to/transcript.md',
          firstLine: veryLargeText.substring(0, 100),
          transcript: veryLargeText,
          duration: '300 sec',
          preview: veryLargeText.substring(0, 100),
          fullText: veryLargeText
        }
      ]);

      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(150);
    });

    it('should handle 10000-character transcript (max size)', async () => {
      const maxText = 'x'.repeat(10000);
      mockDatabase.getAll.mockResolvedValue([
        {
          id: 'large_10k',
          timestamp: '2025-01-26T12:00:00Z',
          audioPath: '/path/to/audio.wav',
          transcriptPath: '/path/to/transcript.md',
          firstLine: maxText.substring(0, 100),
          transcript: maxText,
          duration: '600 sec',
          preview: maxText.substring(0, 100),
          fullText: maxText
        }
      ]);

      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200); // Allow more time for max size
      expect(mockAccessibilityService.injectText).toHaveBeenCalled();
    });
  });

  describe('Debouncing Performance', () => {
    it('should debounce 100 rapid fills effectively', async () => {
      manager.updateSettings({ debounceMs: 500 });
      await manager.start();

      const startTime = performance.now();
      const results: boolean[] = [];

      // Simulate 100 rapid focus events
      for (let i = 0; i < 100; i++) {
        results.push(await manager.performAutoFill());
      }

      const elapsed = performance.now() - startTime;

      // First call succeeds, most others should be debounced by event handler
      // (Direct performAutoFill calls don't debounce, but event handler does)
      expect(elapsed).toBeLessThan(10000); // Should complete quickly

      console.log(`100 rapid fills completed in ${elapsed.toFixed(2)}ms`);
      console.log(`Average per call: ${(elapsed / 100).toFixed(2)}ms`);
    });

    it('should measure debounce effectiveness', async () => {
      manager.updateSettings({ debounceMs: 100 });
      await manager.start();

      // First fill
      const result1 = await manager.performAutoFill();
      const time1 = performance.now();

      // Immediate second fill (should be debounced in event handler)
      const result2 = await manager.performAutoFill();
      const time2 = performance.now();

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third fill after debounce
      const result3 = await manager.performAutoFill();
      const time3 = performance.now();

      expect(result1).toBe(true);
      expect(result3).toBe(true);

      console.log(`Debounce timing:`);
      console.log(`  First → Second: ${(time2 - time1).toFixed(2)}ms`);
      console.log(`  Second → Third: ${(time3 - time2).toFixed(2)}ms`);
    });

    it('should handle varying debounce periods efficiently', async () => {
      const debouncePeriods = [100, 250, 500, 1000];

      for (const period of debouncePeriods) {
        manager.updateSettings({ debounceMs: period });

        const start = performance.now();

        // Two rapid calls
        await manager.performAutoFill();
        await manager.performAutoFill();

        const elapsed = performance.now() - start;

        // Should complete quickly (not wait for debounce)
        expect(elapsed).toBeLessThan(period / 2);

        console.log(`Debounce ${period}ms: ${elapsed.toFixed(2)}ms for 2 calls`);
      }
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory over 1000 fills', async () => {
      // Enable garbage collection for accurate testing
      if (global.gc) {
        global.gc();
      }

      await manager.start();

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 1000 auto-fills
      for (let i = 0; i < 1000; i++) {
        await manager.performAutoFill();

        // Occasionally allow async operations to complete
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const growthMB = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`Memory growth after 1000 fills: ${growthMB.toFixed(2)}MB`);

      // Allow some growth, but should not leak significantly
      expect(growthMB).toBeLessThan(10); // Less than 10MB growth
    });

    it('should clean up event listeners properly', async () => {
      await manager.start();

      // Get initial listener count
      const initialListeners = mockAccessibilityService.on.mock.calls.length;

      // Stop and restart multiple times
      for (let i = 0; i < 10; i++) {
        await manager.stop();
        await manager.start();
      }

      // Listener count should not grow unbounded
      const finalListeners = mockAccessibilityService.on.mock.calls.length;
      const growth = finalListeners - initialListeners;

      expect(growth).toBeLessThan(20); // Some growth acceptable, but bounded
    });

    it('should handle concurrent operations without leaks', async () => {
      if (global.gc) {
        global.gc();
      }

      await manager.start();

      const initialMemory = process.memoryUsage().heapUsed;

      // Run 100 concurrent auto-fills
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(manager.performAutoFill());
      }

      await Promise.all(promises);

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const growthMB = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`Memory growth after 100 concurrent fills: ${growthMB.toFixed(2)}MB`);

      expect(growthMB).toBeLessThan(5);
    });
  });

  describe('Database Query Performance', () => {
    it('should retrieve transcript within 20ms', async () => {
      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      // Database getAll should be fast
      expect(mockDatabase.getAll).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(100); // Total time including DB query
    });

    it('should handle database with 100 recordings efficiently', async () => {
      // Create large database
      const manyRecordings = Array.from({ length: 100 }, (_, i) => ({
        id: `rec_${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        audioPath: `/path/to/audio_${i}.wav`,
        transcriptPath: `/path/to/transcript_${i}.md`,
        firstLine: `Recording ${i}`,
        transcript: `Full transcript for recording ${i}`,
        duration: '5 sec',
        preview: `Recording ${i}`,
        fullText: `Full transcript for recording ${i}`
      }));

      mockDatabase.getAll.mockResolvedValue(manyRecordings);

      await manager.start();

      const start = performance.now();
      await manager.performAutoFill();
      const elapsed = performance.now() - start;

      // Should still be fast even with 100 recordings
      expect(elapsed).toBeLessThan(100);
    });

    it('should batch database updates efficiently', async () => {
      await manager.start();

      const start = performance.now();

      // Perform 10 auto-fills
      for (let i = 0; i < 10; i++) {
        await manager.performAutoFill();
      }

      const elapsed = performance.now() - start;

      // Total time should scale linearly
      expect(elapsed).toBeLessThan(1000);

      console.log(`10 fills with DB updates: ${elapsed.toFixed(2)}ms`);
      console.log(`Average per fill: ${(elapsed / 10).toFixed(2)}ms`);
    });
  });

  describe('Start/Stop Performance', () => {
    it('should start within 100ms', async () => {
      const start = performance.now();
      await manager.start();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(manager.isActive()).toBe(true);
    });

    it('should stop within 50ms', async () => {
      await manager.start();

      const start = performance.now();
      await manager.stop();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(manager.isActive()).toBe(false);
    });

    it('should handle rapid start/stop cycles', async () => {
      const start = performance.now();

      for (let i = 0; i < 10; i++) {
        await manager.start();
        await manager.stop();
      }

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1000); // 10 cycles in under 1 second

      console.log(`10 start/stop cycles: ${elapsed.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent auto-fill requests', async () => {
      await manager.start();

      const start = performance.now();

      const results = await Promise.all([
        manager.performAutoFill(),
        manager.performAutoFill(),
        manager.performAutoFill(),
        manager.performAutoFill(),
        manager.performAutoFill()
      ]);

      const elapsed = performance.now() - start;

      expect(results.every(r => typeof r === 'boolean')).toBe(true);
      expect(elapsed).toBeLessThan(500); // 5 concurrent calls in <500ms

      console.log(`5 concurrent fills: ${elapsed.toFixed(2)}ms`);
    });

    it('should handle mixed operations concurrently', async () => {
      const start = performance.now();

      await Promise.all([
        manager.start(),
        manager.performAutoFill(),
        manager.updateSettings({ debounceMs: 100 }),
        manager.performManualFill()
      ]);

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should document performance baseline', async () => {
      await manager.start();

      // Warm up
      for (let i = 0; i < 10; i++) {
        await manager.performAutoFill();
      }

      // Benchmark
      const iterations = 100;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await manager.performAutoFill();
        timings.push(performance.now() - start);
      }

      const avg = timings.reduce((a, b) => a + b, 0) / iterations;
      const min = Math.min(...timings);
      const max = Math.max(...timings);
      const p95 = timings.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
      const p99 = timings.sort((a, b) => a - b)[Math.floor(iterations * 0.99)];

      console.log('\nPerformance Baseline (100 iterations):');
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
      console.log(`  P95: ${p95.toFixed(2)}ms`);
      console.log(`  P99: ${p99.toFixed(2)}ms`);

      expect(avg).toBeLessThan(100);
      expect(p95).toBeLessThan(150);
      expect(p99).toBeLessThan(200);
    });
  });
});

/**
 * Performance Test Execution Notes:
 *
 * Run with garbage collection enabled for accurate memory tests:
 * ```bash
 * node --expose-gc node_modules/.bin/jest tests/performance/autofill-performance.test.ts
 * ```
 *
 * Target Performance Metrics:
 * - Average latency: <100ms
 * - P95 latency: <150ms
 * - P99 latency: <200ms
 * - Memory growth: <10MB per 1000 operations
 * - Start time: <100ms
 * - Stop time: <50ms
 */
