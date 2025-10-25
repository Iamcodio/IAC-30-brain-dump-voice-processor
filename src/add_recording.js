#!/usr/bin/env node
/**
 * Helper script to add a recording to the database from Python
 * Reads JSON from stdin and adds it to the database
 */

const database = require('./database');

async function main() {
  try {
    // Read JSON from stdin
    let inputData = '';

    process.stdin.on('data', chunk => {
      inputData += chunk.toString();
    });

    process.stdin.on('end', async () => {
      try {
        const recordingData = JSON.parse(inputData);

        // Add to database
        const result = await database.add(recordingData);

        // Output success
        console.log(JSON.stringify({ success: true, recording: result }));
        process.exit(0);
      } catch (error) {
        console.error(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
      }
    });

  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
}

main();
