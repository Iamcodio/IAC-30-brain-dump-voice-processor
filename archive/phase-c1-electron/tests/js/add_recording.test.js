/**
 * Tests for add_recording.js
 */

const { EventEmitter } = require('events');
const { Readable } = require('stream');

// Mock database module
const mockDatabase = {
  add: jest.fn(() => Promise.resolve({ id: 'rec_123', timestamp: '2025-01-01T12:00:00' }))
};

jest.mock('../../src/database', () => mockDatabase);

describe('Add Recording Script', () => {
  let mockStdin;
  let mockStdout;
  let mockStderr;
  let processExit;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.stdin
    mockStdin = new Readable({
      read() {}
    });

    // Mock process.stdout and stderr
    mockStdout = {
      write: jest.fn()
    };
    mockStderr = {
      write: jest.fn()
    };

    // Mock process.exit
    processExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Replace process streams
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true
    });

    // Mock console.log to capture output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should parse JSON from stdin and add to database', (done) => {
    const recordingData = {
      id: 'rec_123',
      timestamp: '2025-01-01T12:00:00',
      duration: 10,
      audioFile: 'test.wav',
      transcriptTxt: 'transcript.txt',
      transcriptMd: 'transcript.md',
      firstLine: 'Test recording'
    };

    mockDatabase.add.mockResolvedValue(recordingData);

    // Set up end handler
    mockStdin.on('end', async () => {
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      expect(mockDatabase.add).toHaveBeenCalledWith(recordingData);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('success')
      );
      expect(processExit).toHaveBeenCalledWith(0);
      done();
    });

    // Start the script
    require('../../src/add_recording.js');

    // Simulate stdin input
    mockStdin.push(JSON.stringify(recordingData));
    mockStdin.push(null); // End of stream
  });

  it('should handle invalid JSON input', (done) => {
    // Set up end handler
    mockStdin.on('end', async () => {
      await new Promise(resolve => setImmediate(resolve));

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
      expect(processExit).toHaveBeenCalledWith(1);
      done();
    });

    // Reload the script for fresh execution
    jest.resetModules();
    require('../../src/add_recording.js');

    // Simulate invalid JSON
    mockStdin.push('invalid json{');
    mockStdin.push(null);
  });

  it('should handle database errors', (done) => {
    mockDatabase.add.mockRejectedValue(new Error('Database write failed'));

    const recordingData = { id: 'rec_123' };

    // Set up end handler
    mockStdin.on('end', async () => {
      await new Promise(resolve => setImmediate(resolve));

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
      expect(processExit).toHaveBeenCalledWith(1);
      done();
    });

    // Reload the script
    jest.resetModules();
    require('../../src/add_recording.js');

    mockStdin.push(JSON.stringify(recordingData));
    mockStdin.push(null);
  });

  it('should output success message with recording data', (done) => {
    const recordingData = {
      id: 'rec_123',
      timestamp: '2025-01-01T12:00:00',
      audioFile: 'test.wav'
    };

    mockDatabase.add.mockResolvedValue(recordingData);

    mockStdin.on('end', async () => {
      await new Promise(resolve => setImmediate(resolve));

      // Check that success message includes the recording
      const logCalls = console.log.mock.calls;
      const outputStr = logCalls[0]?.[0] || '';

      expect(outputStr).toContain('success');
      expect(outputStr).toContain('true');

      done();
    });

    jest.resetModules();
    require('../../src/add_recording.js');

    mockStdin.push(JSON.stringify(recordingData));
    mockStdin.push(null);
  });

  it('should handle empty stdin input', (done) => {
    mockStdin.on('end', async () => {
      await new Promise(resolve => setImmediate(resolve));

      expect(console.error).toHaveBeenCalled();
      expect(processExit).toHaveBeenCalledWith(1);
      done();
    });

    jest.resetModules();
    require('../../src/add_recording.js');

    mockStdin.push('');
    mockStdin.push(null);
  });

  it('should handle partial JSON input', (done) => {
    mockStdin.on('end', async () => {
      await new Promise(resolve => setImmediate(resolve));

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
      expect(processExit).toHaveBeenCalledWith(1);
      done();
    });

    jest.resetModules();
    require('../../src/add_recording.js');

    mockStdin.push('{"id": "rec_123"');
    mockStdin.push(null);
  });

  it('should handle multi-chunk stdin input', (done) => {
    const recordingData = {
      id: 'rec_123',
      timestamp: '2025-01-01T12:00:00',
      duration: 10
    };

    mockDatabase.add.mockResolvedValue(recordingData);

    mockStdin.on('end', async () => {
      await new Promise(resolve => setImmediate(resolve));

      expect(mockDatabase.add).toHaveBeenCalledWith(recordingData);
      expect(processExit).toHaveBeenCalledWith(0);
      done();
    });

    jest.resetModules();
    require('../../src/add_recording.js');

    // Send JSON in multiple chunks
    const jsonStr = JSON.stringify(recordingData);
    const mid = Math.floor(jsonStr.length / 2);

    mockStdin.push(jsonStr.slice(0, mid));
    mockStdin.push(jsonStr.slice(mid));
    mockStdin.push(null);
  });
});
