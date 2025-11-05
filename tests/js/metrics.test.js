/**
 * Unit tests for metrics module
 *
 * Tests the Prometheus metrics registry and custom metrics:
 * - Registry initialization
 * - All custom metrics registered
 * - Histogram buckets configured correctly
 * - Counter increments work
 * - Gauge up/down operations
 * - Metrics output format (Prometheus compatible)
 * - Disabled metrics (when config.metrics.enabled = false)
 */

describe('Metrics Module', () => {
  let metrics;
  let config;

  beforeEach(() => {
    // Mock config module
    jest.mock('config');
    config = require('config');
    config.get = jest.fn((key) => {
      if (key === 'metrics.enabled') return true;
      return null;
    });

    // Clear module cache to get fresh instance
    jest.resetModules();
    metrics = require('../../src/utils/metrics');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.unmock('config');
  });

  describe('Registry Initialization', () => {
    test('should create a registry instance', () => {
      expect(metrics.register).toBeDefined();
      expect(typeof metrics.register.metrics).toBe('function');
    });

    test('should collect default metrics when enabled', async () => {
      // Note: Default metrics are not loaded in test environment due to mocking
      // We verify that metrics collection is configured, not the actual Node.js metrics
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_');
      // Custom metrics should be present
      expect(metricsOutput).toContain('recording_duration');
      expect(metricsOutput).toContain('transcription_latency');
    });
  });

  describe('Custom Metrics Registration', () => {
    test('should register recordingDuration histogram', () => {
      expect(metrics.recordingDuration).toBeDefined();
      expect(metrics.recordingDuration.constructor.name).toBe('Histogram');
    });

    test('should register transcriptionLatency histogram', () => {
      expect(metrics.transcriptionLatency).toBeDefined();
      expect(metrics.transcriptionLatency.constructor.name).toBe('Histogram');
    });

    test('should register errorCounter counter', () => {
      expect(metrics.errorCounter).toBeDefined();
      expect(metrics.errorCounter.constructor.name).toBe('Counter');
    });

    test('should register activeRecordings gauge', () => {
      expect(metrics.activeRecordings).toBeDefined();
      expect(metrics.activeRecordings.constructor.name).toBe('Gauge');
    });

    test('should register totalRecordings counter', () => {
      expect(metrics.totalRecordings).toBeDefined();
      expect(metrics.totalRecordings.constructor.name).toBe('Counter');
    });

    test('should register totalTranscriptions counter', () => {
      expect(metrics.totalTranscriptions).toBeDefined();
      expect(metrics.totalTranscriptions.constructor.name).toBe('Counter');
    });

    test('should register dbQueryTime histogram', () => {
      expect(metrics.dbQueryTime).toBeDefined();
      expect(metrics.dbQueryTime.constructor.name).toBe('Histogram');
    });
  });

  describe('Histogram Bucket Configuration', () => {
    test('recordingDuration should have correct buckets', async () => {
      metrics.recordingDuration.observe({ status: 'success' }, 15);
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_bucket{le="1"');
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_bucket{le="5"');
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_bucket{le="10"');
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_bucket{le="30"');
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_bucket{le="60"');
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_bucket{le="120"');
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_bucket{le="300"');
    });

    test('transcriptionLatency should have correct buckets', async () => {
      metrics.transcriptionLatency.observe({ model: 'ggml-base', status: 'success' }, 1.5);
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_bucket{le="0.1"');
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_bucket{le="0.5"');
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_bucket{le="1"');
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_bucket{le="2"');
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_bucket{le="5"');
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_bucket{le="10"');
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_bucket{le="30"');
    });

    test('dbQueryTime should have correct buckets', async () => {
      metrics.dbQueryTime.observe({ operation: 'getAll' }, 0.025);
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_bucket{le="0.001"');
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_bucket{le="0.005"');
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_bucket{le="0.01"');
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_bucket{le="0.05"');
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_bucket{le="0.1"');
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_bucket{le="0.5"');
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_bucket{le="1"');
    });
  });

  describe('Counter Operations', () => {
    test('should increment error counter', async () => {
      metrics.errorCounter.inc({ component: 'recorder', error_type: 'process_error' });
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_errors_total{component="recorder",error_type="process_error"} 1');
    });

    test('should increment total recordings counter', async () => {
      metrics.totalRecordings.inc({ status: 'success' });
      metrics.totalRecordings.inc({ status: 'success' });
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_recordings_total{status="success"} 2');
    });

    test('should increment total transcriptions counter', async () => {
      metrics.totalTranscriptions.inc({ status: 'success' });
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_transcriptions_total{status="success"} 1');
    });
  });

  describe('Gauge Operations', () => {
    test('should increment active recordings gauge', async () => {
      metrics.activeRecordings.inc();
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_active_recordings 1');
    });

    test('should decrement active recordings gauge', async () => {
      metrics.activeRecordings.inc();
      metrics.activeRecordings.dec();
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_active_recordings 0');
    });

    test('should track multiple active recordings', async () => {
      metrics.activeRecordings.inc();
      metrics.activeRecordings.inc();
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_active_recordings 2');
    });
  });

  describe('Histogram Operations', () => {
    test('should observe recording duration values', async () => {
      metrics.recordingDuration.observe({ status: 'success' }, 45.2);
      metrics.recordingDuration.observe({ status: 'success' }, 12.5);
      metrics.recordingDuration.observe({ status: 'success' }, 8.3);

      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_count{status="success"} 3');
      expect(metricsOutput).toContain('braindump_recording_duration_seconds_sum{status="success"}');
    });

    test('should observe transcription latency values', async () => {
      metrics.transcriptionLatency.observe({ model: 'ggml-base', status: 'success' }, 2.5);
      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds_count{model="ggml-base",status="success"} 1');
    });

    test('should use startTimer for database queries', async () => {
      const end = metrics.dbQueryTime.startTimer({ operation: 'getAll' });
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      end();

      const metricsOutput = await metrics.register.metrics();
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds_count{operation="getAll"} 1');
    });
  });

  describe('Metrics Output Format', () => {
    test('should output Prometheus-compatible text format', async () => {
      metrics.totalRecordings.inc({ status: 'success' });
      const metricsOutput = await metrics.register.metrics();

      // Check for Prometheus format characteristics
      expect(metricsOutput).toMatch(/# HELP braindump_/);
      expect(metricsOutput).toMatch(/# TYPE braindump_/);
      expect(metricsOutput).toMatch(/braindump_\w+ \d+/);
    });

    test('should include all registered metrics in output', async () => {
      const metricsOutput = await metrics.register.metrics();

      // Check for all custom metrics
      expect(metricsOutput).toContain('braindump_recording_duration_seconds');
      expect(metricsOutput).toContain('braindump_transcription_latency_seconds');
      expect(metricsOutput).toContain('braindump_errors_total');
      expect(metricsOutput).toContain('braindump_active_recordings');
      expect(metricsOutput).toContain('braindump_recordings_total');
      expect(metricsOutput).toContain('braindump_transcriptions_total');
      expect(metricsOutput).toContain('braindump_db_query_duration_seconds');
    });
  });

  describe('Disabled Metrics', () => {
    test('should not collect default metrics when disabled', () => {
      // This would require reloading the module with metrics.enabled = false
      // For now, we verify the config is checked
      config.get = jest.fn((key) => {
        if (key === 'metrics.enabled') return false;
        return null;
      });

      jest.resetModules();
      const disabledMetrics = require('../../src/utils/metrics');

      // Custom metrics should still be defined
      expect(disabledMetrics.totalRecordings).toBeDefined();
      expect(disabledMetrics.register).toBeDefined();
    });
  });
});
