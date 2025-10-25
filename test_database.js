#!/usr/bin/env node
/**
 * Test script for database operations
 */

const database = require('./src/database');

async function testDatabase() {
  console.log('Testing Database Operations\n');
  console.log('=' .repeat(50) + '\n');

  try {
    // Test 1: getAll()
    console.log('TEST 1: getAll() - Get all recordings (newest first)');
    const allRecordings = await database.getAll();
    console.log(`Found ${allRecordings.length} recordings`);
    allRecordings.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. [${rec.id}] ${rec.firstLine.substring(0, 50)}... (${rec.duration}s)`);
    });
    console.log('');

    // Test 2: getById()
    console.log('TEST 2: getById() - Get specific recording');
    if (allRecordings.length > 0) {
      const testId = allRecordings[0].id;
      const recording = await database.getById(testId);
      if (recording) {
        console.log(`  Found: ${recording.id}`);
        console.log(`  First line: ${recording.firstLine}`);
        console.log(`  Duration: ${recording.duration}s`);
        console.log(`  Timestamp: ${recording.timestamp}`);
      } else {
        console.log(`  Not found: ${testId}`);
      }
    } else {
      console.log('  No recordings to test with');
    }
    console.log('');

    // Test 3: search()
    console.log('TEST 3: search() - Search recordings');
    const searchQuery = 'hello';
    const searchResults = await database.search(searchQuery);
    console.log(`  Query: "${searchQuery}"`);
    console.log(`  Results: ${searchResults.length} recordings`);
    searchResults.forEach((rec, idx) => {
      console.log(`    ${idx + 1}. ${rec.firstLine.substring(0, 50)}...`);
    });
    console.log('');

    // Test 4: search() with different query
    console.log('TEST 4: search() - Search for "Claude"');
    const claudeResults = await database.search('Claude');
    console.log(`  Results: ${claudeResults.length} recordings`);
    claudeResults.forEach((rec, idx) => {
      console.log(`    ${idx + 1}. ${rec.firstLine.substring(0, 60)}...`);
    });
    console.log('');

    // Test 5: Empty search (should return all)
    console.log('TEST 5: search() - Empty query (returns all)');
    const emptyResults = await database.search('');
    console.log(`  Results: ${emptyResults.length} recordings`);
    console.log('');

    console.log('=' .repeat(50));
    console.log('All tests completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testDatabase();
