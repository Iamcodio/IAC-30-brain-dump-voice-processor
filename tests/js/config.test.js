/**
 * Configuration Tests
 *
 * Tests for the config package integration:
 * - Default configuration loading
 * - Environment-specific overrides
 * - Environment variable overrides
 * - Required configuration validation
 * - Type validation
 */

describe('Configuration', () => {
  let config;
  let originalEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should load default.json successfully', () => {
      // Clear require cache to reload config
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config).toBeDefined();
    });

    it('should have correct app metadata', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('app.name')).toBe('BrainDump Voice Processor');
      expect(config.get('app.version')).toBe('2.1.0');
    });

    it('should have all required paths', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(typeof config.get('paths.audioDir')).toBe('string');
      expect(typeof config.get('paths.transcriptDir')).toBe('string');
      expect(typeof config.get('paths.databaseFile')).toBe('string');
      expect(typeof config.get('paths.pythonVenv')).toBe('string');
      expect(typeof config.get('paths.recorderScript')).toBe('string');
      expect(typeof config.get('paths.transcriberScript')).toBe('string');
    });

    it('should have recording configuration', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('recording.sampleRate')).toBe(44100);
      expect(config.get('recording.channels')).toBe(1);
      expect(config.get('recording.format')).toBe('WAV');
      expect(config.get('recording.bitDepth')).toBe(16);
    });

    it('should have transcription configuration', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('transcription.model')).toBe('ggml-base.bin');
      expect(config.get('transcription.language')).toBe('en');
      expect(config.get('transcription.threads')).toBe(4);
    });

    it('should have shortcuts configuration', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('shortcuts.toggleRecording')).toBe('Control+Y');
    });

    it('should have window configuration', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('window.width')).toBe(800);
      expect(config.get('window.height')).toBe(600);
      expect(config.get('window.nodeIntegration')).toBe(false);
      expect(config.get('window.contextIsolation')).toBe(true);
    });

    it('should have process configuration', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('process.maxRestarts')).toBe(5);
      expect(config.get('process.baseDelayMs')).toBe(1000);
      expect(config.get('process.gracefulShutdownTimeoutMs')).toBe(5000);
    });

    it('should have protocol messages', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('protocol.ready')).toBe('READY');
      expect(config.get('protocol.recordingStarted')).toBe('RECORDING_STARTED');
      expect(config.get('protocol.recordingStopped')).toBe('RECORDING_STOPPED:');
      expect(config.get('protocol.errorPrefix')).toBe('ERROR:');
      expect(config.get('protocol.transcriptSaved')).toBe('TRANSCRIPT_SAVED:');
      expect(config.get('protocol.cmdStart')).toBe('start\n');
      expect(config.get('protocol.cmdStop')).toBe('stop\n');
      expect(config.get('protocol.cmdQuit')).toBe('quit\n');
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should load test overrides when NODE_ENV=test', () => {
      // This runs in test environment by default (NODE_ENV=test)
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('logging.level')).toBe('silent');
      expect(config.get('metrics.enabled')).toBe(false);
      expect(config.get('paths.audioDir')).toBe('test/outputs/audio');
    });

    it('should use test-specific database path', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(config.get('paths.databaseFile')).toBe('test/db/recordings.json');
      expect(config.get('paths.transcriptDir')).toBe('test/outputs/transcripts');
    });
  });

  describe('Configuration Files Exist', () => {
    it('should have default.json file', () => {
      const fs = require('fs');
      const path = require('path');
      const defaultConfig = path.join(process.cwd(), 'config', 'default.json');
      expect(fs.existsSync(defaultConfig)).toBe(true);
    });

    it('should have development.json file', () => {
      const fs = require('fs');
      const path = require('path');
      const devConfig = path.join(process.cwd(), 'config', 'development.json');
      expect(fs.existsSync(devConfig)).toBe(true);
    });

    it('should have production.json file', () => {
      const fs = require('fs');
      const path = require('path');
      const prodConfig = path.join(process.cwd(), 'config', 'production.json');
      expect(fs.existsSync(prodConfig)).toBe(true);
    });

    it('should have test.json file', () => {
      const fs = require('fs');
      const path = require('path');
      const testConfig = path.join(process.cwd(), 'config', 'test.json');
      expect(fs.existsSync(testConfig)).toBe(true);
    });

    it('should have custom-environment-variables.json file', () => {
      const fs = require('fs');
      const path = require('path');
      const customEnvConfig = path.join(process.cwd(), 'config', 'custom-environment-variables.json');
      expect(fs.existsSync(customEnvConfig)).toBe(true);
    });
  });

  describe('Missing Configuration Validation', () => {
    it('should throw error when accessing non-existent config key', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(() => config.get('nonexistent.key')).toThrow();
    });
  });

  describe('Type Validation', () => {
    it('should have correct types for numeric values', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(typeof config.get('window.width')).toBe('number');
      expect(typeof config.get('window.height')).toBe('number');
      expect(typeof config.get('recording.sampleRate')).toBe('number');
      expect(typeof config.get('process.maxRestarts')).toBe('number');
    });

    it('should have correct types for boolean values', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(typeof config.get('window.nodeIntegration')).toBe('boolean');
      expect(typeof config.get('window.contextIsolation')).toBe('boolean');
      expect(typeof config.get('metrics.enabled')).toBe('boolean');
    });

    it('should have correct types for string values', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(typeof config.get('app.name')).toBe('string');
      expect(typeof config.get('paths.audioDir')).toBe('string');
      expect(typeof config.get('shortcuts.toggleRecording')).toBe('string');
      expect(typeof config.get('logging.level')).toBe('string');
    });

    it('should have correct types for array values', () => {
      delete require.cache[require.resolve('config')];
      config = require('config');

      expect(Array.isArray(config.get('process.stdioMode'))).toBe(true);
      expect(config.get('process.stdioMode').length).toBe(3);
    });
  });
});
