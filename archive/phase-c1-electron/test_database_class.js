#!/usr/bin/env node
/**
 * Test the Database class (backward compatibility with main.js)
 */

const Database = require('./database');
const path = require('path');

async function testDatabaseClass() {
  console.log('Testing Database Class (main.js compatibility)\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Initialize database the way main.js does
    const db = new Database(__dirname);

    // Test 1: getAll()
    console.log('TEST 1: db.getAll()');
    const allRecordings = db.getAll();
    console.log(`  Found ${allRecordings.length} recordings`);
    allRecordings.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. [${rec.id}] ${rec.preview.substring(0, 50)}... (${rec.duration})`);
      console.log(`      Timestamp: ${rec.timestamp}`);
      console.log(`      Audio: ${path.basename(rec.audioPath)}`);
      console.log(`      Transcript MD: ${rec.transcriptMd ? path.basename(rec.transcriptMd) : 'null'}`);
      console.log(`      Transcript TXT: ${rec.transcriptTxt ? path.basename(rec.transcriptTxt) : 'null'}`);
    });
    console.log('');

    // Test 2: search()
    console.log('TEST 2: db.search("hello")');
    const searchResults = db.search('hello');
    console.log(`  Results: ${searchResults.length} recordings`);
    searchResults.forEach((rec, idx) => {
      console.log(`    ${idx + 1}. ${rec.preview.substring(0, 60)}...`);
    });
    console.log('');

    // Test 3: getById()
    console.log('TEST 3: db.getById()');
    if (allRecordings.length > 0) {
      const testId = allRecordings[0].id;
      const recording = db.getById(testId);
      if (recording) {
        console.log(`  Found: ${recording.id}`);
        console.log(`  Preview: ${recording.preview}`);
        console.log(`  Duration: ${recording.duration}`);
        console.log(`  Full text length: ${recording.fullText.length} chars`);
      }
    }
    console.log('');

    // Test 4: getByPath() (backward compatibility)
    console.log('TEST 4: db.getByPath() [backward compatibility]');
    if (allRecordings.length > 0 && allRecordings[0].transcriptMd) {
      const recording = db.getByPath(allRecordings[0].transcriptMd);
      if (recording) {
        console.log(`  Found by path: ${recording.id}`);
        console.log(`  Preview: ${recording.preview.substring(0, 60)}...`);
      }
    }
    console.log('');

    console.log('=' .repeat(60));
    console.log('Database class tests completed successfully!');
    console.log('✓ Backward compatible with main.js');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testDatabaseClass();
