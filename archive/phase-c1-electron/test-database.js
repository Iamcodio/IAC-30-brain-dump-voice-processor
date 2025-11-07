// Quick test of the database module
const Database = require('./database.js');
const path = require('path');

const db = new Database(__dirname);

console.log('Testing Database Module\n');
console.log('='.repeat(50));

const recordings = db.getAll();

console.log(`\nFound ${recordings.length} recordings:\n`);

recordings.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.timestamp}`);
  console.log(`   Duration: ${rec.duration}`);
  console.log(`   Preview: ${rec.preview.substring(0, 60)}...`);
  console.log(`   Audio: ${rec.audioPath ? path.basename(rec.audioPath) : 'N/A'}`);
  console.log(`   Transcript: ${rec.transcriptPath ? path.basename(rec.transcriptPath) : 'N/A'}`);
  console.log('');
});

// Test search
console.log('='.repeat(50));
console.log('\nTesting search for "Claude":\n');
const searchResults = db.search('Claude');
console.log(`Found ${searchResults.length} results`);
searchResults.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.timestamp} - ${rec.preview.substring(0, 50)}...`);
});
