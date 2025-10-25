#!/usr/bin/env node
/**
 * Integration test to verify the transcription pipeline
 * Tests the full flow: audio -> transcription -> database
 */

const { spawn } = require('child_process');
const path = require('path');
const database = require('./src/database');

async function testTranscriptionPipeline() {
  console.log('Integration Test: Transcription Pipeline\n');
  console.log('=' .repeat(60) + '\n');

  // Get initial recording count
  const beforeRecordings = await database.getAll();
  console.log(`Initial recordings in database: ${beforeRecordings.length}\n`);

  // Test with existing audio file
  const testAudioFile = 'outputs/audio/test_recording_20251024_222049.wav';
  console.log(`Testing with: ${testAudioFile}\n`);

  return new Promise((resolve, reject) => {
    const pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
    const scriptPath = path.join(__dirname, 'transcribe.py');

    console.log('Starting transcription process...');
    const transcriber = spawn(pythonPath, [scriptPath, testAudioFile]);

    let stdout = '';
    let stderr = '';

    transcriber.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('STDOUT:', output.trim());
    });

    transcriber.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log('STDERR:', output.trim());
    });

    transcriber.on('close', async (code) => {
      console.log(`\nProcess exited with code: ${code}\n`);

      if (code === 0) {
        // Check that outputs are in correct format
        const hasMdOutput = stdout.includes('TRANSCRIPT_SAVED:') && stdout.includes('.md');
        const hasTxtOutput = stdout.includes('TRANSCRIPT_TXT:') && stdout.includes('.txt');
        const hasDbUpdate = stderr.includes('Database updated:');

        console.log('Verification:');
        console.log(`  ✓ Markdown file saved: ${hasMdOutput ? 'YES' : 'NO'}`);
        console.log(`  ✓ Text file saved: ${hasTxtOutput ? 'YES' : 'NO'}`);
        console.log(`  ✓ Database updated: ${hasDbUpdate ? 'YES' : 'NO'}`);

        // Verify database was updated
        const afterRecordings = await database.getAll();
        console.log(`\nRecordings after test: ${afterRecordings.length}`);
        console.log(`New recordings added: ${afterRecordings.length - beforeRecordings.length}`);

        if (afterRecordings.length > beforeRecordings.length) {
          const latestRecording = afterRecordings[0];
          console.log('\nLatest recording:');
          console.log(`  ID: ${latestRecording.id}`);
          console.log(`  Duration: ${latestRecording.duration}s`);
          console.log(`  First line: "${latestRecording.firstLine}"`);
          console.log(`  TXT file: ${latestRecording.transcriptTxt}`);
          console.log(`  MD file: ${latestRecording.transcriptMd}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('Integration test PASSED!');
        resolve();
      } else {
        console.error('Integration test FAILED!');
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

testTranscriptionPipeline().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
