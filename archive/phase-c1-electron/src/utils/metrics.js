/**
 * Metrics Module - Prometheus-compatible metrics collection
 *
 * This module provides a centralized metrics registry for monitoring application
 * performance and health. It uses prom-client to expose Prometheus-compatible
 * metrics via an HTTP endpoint.
 *
 * Metrics collected:
 * - Default metrics: CPU, memory, event loop lag
 * - Recording duration: Histogram of recording lengths
 * - Transcription latency: Histogram of transcription processing time
 * - Error counters: Total errors by component and type
 * - Active recordings: Current number of active recordings
 * - Total recordings: Counter of all recordings (success/error)
 * - Total transcriptions: Counter of all transcriptions (success/error)
 * - Database query time: Histogram of database operation duration
 *
 * @module utils/metrics
 */

const client = require('prom-client');
const config = require('config');

// Create registry
const register = new client.Registry();

// Default metrics (CPU, memory, event loop lag, etc.)
if (config.get('metrics.enabled')) {
  client.collectDefaultMetrics({
    register,
    prefix: 'braindump_'
  });
}

/**
 * Recording duration histogram
 * Tracks how long voice recordings are in seconds
 * Buckets: 1s, 5s, 10s, 30s, 1min, 2min, 5min
 */
const recordingDuration = new client.Histogram({
  name: 'braindump_recording_duration_seconds',
  help: 'Duration of voice recordings in seconds',
  labelNames: ['status'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register]
});

/**
 * Transcription latency histogram
 * Tracks how long it takes to transcribe audio in seconds
 * Buckets: 100ms, 500ms, 1s, 2s, 5s, 10s, 30s
 */
const transcriptionLatency = new client.Histogram({
  name: 'braindump_transcription_latency_seconds',
  help: 'Time to transcribe audio in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

/**
 * Error counter
 * Tracks total errors by component and error type
 */
const errorCounter = new client.Counter({
  name: 'braindump_errors_total',
  help: 'Total errors by component',
  labelNames: ['component', 'error_type'],
  registers: [register]
});

/**
 * Active recordings gauge
 * Current number of active recordings (should be 0 or 1)
 */
const activeRecordings = new client.Gauge({
  name: 'braindump_active_recordings',
  help: 'Number of currently active recordings',
  registers: [register]
});

/**
 * Total recordings counter
 * Cumulative count of all recordings by status
 */
const totalRecordings = new client.Counter({
  name: 'braindump_recordings_total',
  help: 'Total number of recordings',
  labelNames: ['status'],
  registers: [register]
});

/**
 * Total transcriptions counter
 * Cumulative count of all transcriptions by status
 */
const totalTranscriptions = new client.Counter({
  name: 'braindump_transcriptions_total',
  help: 'Total number of transcriptions',
  labelNames: ['status'],
  registers: [register]
});

/**
 * Database query time histogram
 * Tracks duration of database operations
 * Buckets: 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s
 */
const dbQueryTime = new client.Histogram({
  name: 'braindump_db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

module.exports = {
  register,
  recordingDuration,
  transcriptionLatency,
  errorCounter,
  activeRecordings,
  totalRecordings,
  totalTranscriptions,
  dbQueryTime
};
