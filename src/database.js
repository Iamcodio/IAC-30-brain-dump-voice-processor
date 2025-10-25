/**
 * Database Module for BrainDump Voice Processor
 * Manages recordings metadata in a JSON file
 */

const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'recordings.json');

/**
 * Read the database file
 * @returns {Promise<Object>} Database object with recordings array
 */
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is corrupted, return empty structure
    console.warn('Database read error, initializing empty database:', error.message);
    return { recordings: [] };
  }
}

/**
 * Write to the database file
 * @param {Object} db - Database object with recordings array
 */
async function writeDB(db) {
  try {
    // Ensure the data directory exists
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write database: ${error.message}`);
  }
}

/**
 * Get all recordings, sorted by timestamp (newest first)
 * @returns {Promise<Array>} Array of recording objects
 */
async function getAll() {
  const db = await readDB();
  return db.recordings.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

/**
 * Add a new recording to the database
 * @param {Object} recording - Recording object to add
 * @returns {Promise<Object>} The added recording with generated ID
 */
async function add(recording) {
  const db = await readDB();

  // Generate ID if not provided
  if (!recording.id) {
    const timestamp = Date.now();
    recording.id = `rec_${timestamp}`;
  }

  // Ensure timestamp is in ISO format
  if (!recording.timestamp) {
    recording.timestamp = new Date().toISOString();
  } else if (!(recording.timestamp instanceof String) || !recording.timestamp.includes('T')) {
    recording.timestamp = new Date(recording.timestamp).toISOString();
  }

  // Add to recordings array
  db.recordings.push(recording);

  // Save to file
  await writeDB(db);

  return recording;
}

/**
 * Search recordings by query in firstLine field
 * @param {string} query - Search query string
 * @returns {Promise<Array>} Array of matching recordings
 */
async function search(query) {
  const db = await readDB();

  if (!query || query.trim() === '') {
    return db.recordings;
  }

  const lowerQuery = query.toLowerCase();

  return db.recordings
    .filter(recording => {
      return recording.firstLine &&
             recording.firstLine.toLowerCase().includes(lowerQuery);
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Get a recording by ID
 * @param {string} id - Recording ID
 * @returns {Promise<Object|null>} Recording object or null if not found
 */
async function getById(id) {
  const db = await readDB();
  return db.recordings.find(recording => recording.id === id) || null;
}

/**
 * Delete a recording by ID
 * @param {string} id - Recording ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteById(id) {
  const db = await readDB();
  const initialLength = db.recordings.length;

  db.recordings = db.recordings.filter(recording => recording.id !== id);

  if (db.recordings.length < initialLength) {
    await writeDB(db);
    return true;
  }

  return false;
}

/**
 * Update a recording by ID
 * @param {string} id - Recording ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated recording or null if not found
 */
async function updateById(id, updates) {
  const db = await readDB();
  const index = db.recordings.findIndex(recording => recording.id === id);

  if (index === -1) {
    return null;
  }

  db.recordings[index] = { ...db.recordings[index], ...updates };
  await writeDB(db);

  return db.recordings[index];
}

module.exports = {
  getAll,
  add,
  search,
  getById,
  deleteById,
  updateById
};
