/**
 * Tests for database.js
 */

const fs = require('fs').promises;
const path = require('path');

// Mock config module FIRST (before any imports that use it)
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const config = {
      'paths.databaseFile': 'src/data/recordings.json',
      'database.jsonIndent': 2,
      'file.encoding': 'utf-8',
      'file.recursiveMkdir': true
    };
    return config[key];
  }),
  has: jest.fn(() => true)
}));

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Import database module after mocking
const database = require('../../src/database');

describe('Database Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('readDB', () => {
    it('should read and parse database file', async () => {
      const mockData = { recordings: [{ id: 'rec_1', timestamp: '2025-01-01T12:00:00' }] };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      // Use getAll to trigger readDB
      const result = await database.getAll();

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('recordings.json'),
        'utf-8'
      );
      expect(result).toEqual(mockData.recordings);
    });

    it('should return empty structure on file not found', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT: File not found'));

      const result = await database.getAll();

      expect(result).toEqual([]);
    });

    it('should return empty structure on corrupted JSON', async () => {
      fs.readFile.mockResolvedValue('invalid json{');

      const result = await database.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('writeDB', () => {
    it('should create directory and write JSON', async () => {
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const testData = { recordings: [{ id: 'test' }] };

      // Use add to trigger writeDB
      fs.readFile.mockResolvedValue(JSON.stringify({ recordings: [] }));
      await database.add(testData.recordings[0]);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('recordings.json'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should throw error on write failure', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ recordings: [] }));
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(database.add({ id: 'test' })).rejects.toThrow('Failed to write database');
    });
  });

  describe('getAll', () => {
    it('should return all recordings sorted by timestamp', async () => {
      const mockData = {
        recordings: [
          { id: 'rec_1', timestamp: '2025-01-01T10:00:00' },
          { id: 'rec_2', timestamp: '2025-01-01T12:00:00' },
          { id: 'rec_3', timestamp: '2025-01-01T11:00:00' }
        ]
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await database.getAll();

      // Should be sorted newest first
      expect(result[0].id).toBe('rec_2');
      expect(result[1].id).toBe('rec_3');
      expect(result[2].id).toBe('rec_1');
    });

    it('should return empty array when no recordings', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ recordings: [] }));

      const result = await database.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('add', () => {
    beforeEach(() => {
      fs.readFile.mockResolvedValue(JSON.stringify({ recordings: [] }));
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });

    it('should add recording with generated ID', async () => {
      const recording = {
        timestamp: '2025-01-01T12:00:00',
        audioFile: 'test.wav'
      };

      const result = await database.add(recording);

      expect(result.id).toMatch(/^rec_\d+$/);
      expect(result.timestamp).toBe(recording.timestamp);
      expect(result.audioFile).toBe(recording.audioFile);
    });

    it('should use provided ID if given', async () => {
      const recording = {
        id: 'rec_custom',
        timestamp: '2025-01-01T12:00:00'
      };

      const result = await database.add(recording);

      expect(result.id).toBe('rec_custom');
    });

    it('should generate timestamp if not provided', async () => {
      const recording = { audioFile: 'test.wav' };

      const result = await database.add(recording);

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should save recording to database', async () => {
      const recording = { id: 'rec_1', timestamp: '2025-01-01T12:00:00' };

      await database.add(recording);

      // Verify writeFile was called with updated data
      expect(fs.writeFile).toHaveBeenCalled();
      const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenData.recordings).toContainEqual(recording);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      const mockData = {
        recordings: [
          { id: 'rec_1', timestamp: '2025-01-01T10:00:00', firstLine: 'Meeting notes' },
          { id: 'rec_2', timestamp: '2025-01-01T12:00:00', firstLine: 'Project update' },
          { id: 'rec_3', timestamp: '2025-01-01T11:00:00', firstLine: 'Team meeting' }
        ]
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
    });

    it('should return matching recordings', async () => {
      const result = await database.search('meeting');

      expect(result).toHaveLength(2);
      expect(result[0].firstLine).toContain('meeting');
      expect(result[1].firstLine).toContain('Meeting');
    });

    it('should be case-insensitive', async () => {
      const result = await database.search('MEETING');

      expect(result).toHaveLength(2);
    });

    it('should return all recordings on empty query', async () => {
      const result = await database.search('');

      expect(result).toHaveLength(3);
    });

    it('should return empty array when no matches', async () => {
      const result = await database.search('nonexistent');

      expect(result).toEqual([]);
    });

    it('should sort results by timestamp (newest first)', async () => {
      const result = await database.search('meeting');

      // rec_2 is newest with timestamp 12:00:00
      expect(result[0].id).toBe('rec_3');
      expect(result[1].id).toBe('rec_1');
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      const mockData = {
        recordings: [
          { id: 'rec_1', timestamp: '2025-01-01T10:00:00' },
          { id: 'rec_2', timestamp: '2025-01-01T12:00:00' }
        ]
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
    });

    it('should return recording by ID', async () => {
      const result = await database.getById('rec_1');

      expect(result).toEqual({ id: 'rec_1', timestamp: '2025-01-01T10:00:00' });
    });

    it('should return null when ID not found', async () => {
      const result = await database.getById('rec_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    beforeEach(() => {
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });

    it('should delete recording and return true', async () => {
      const mockData = {
        recordings: [
          { id: 'rec_1', timestamp: '2025-01-01T10:00:00' },
          { id: 'rec_2', timestamp: '2025-01-01T12:00:00' }
        ]
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await database.deleteById('rec_1');

      expect(result).toBe(true);

      // Verify writeFile was called with updated data
      const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenData.recordings).toHaveLength(1);
      expect(writtenData.recordings[0].id).toBe('rec_2');
    });

    it('should return false when ID not found', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ recordings: [] }));

      const result = await database.deleteById('rec_nonexistent');

      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('updateById', () => {
    beforeEach(() => {
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });

    it('should update recording and return updated object', async () => {
      const mockData = {
        recordings: [
          { id: 'rec_1', timestamp: '2025-01-01T10:00:00', firstLine: 'Old' }
        ]
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const updates = { firstLine: 'Updated' };
      const result = await database.updateById('rec_1', updates);

      expect(result).toEqual({
        id: 'rec_1',
        timestamp: '2025-01-01T10:00:00',
        firstLine: 'Updated'
      });

      // Verify writeFile was called
      const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenData.recordings[0].firstLine).toBe('Updated');
    });

    it('should return null when ID not found', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ recordings: [] }));

      const result = await database.updateById('rec_nonexistent', { firstLine: 'New' });

      expect(result).toBeNull();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should preserve unmodified fields', async () => {
      const mockData = {
        recordings: [
          { id: 'rec_1', timestamp: '2025-01-01T10:00:00', duration: 10, firstLine: 'Old' }
        ]
      };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await database.updateById('rec_1', { firstLine: 'New' });

      expect(result.duration).toBe(10);
      expect(result.timestamp).toBe('2025-01-01T10:00:00');
    });
  });
});
