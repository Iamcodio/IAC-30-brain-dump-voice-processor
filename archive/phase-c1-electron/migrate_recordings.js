#!/usr/bin/env node
/**
 * Migration script to add existing recordings to the database
 * Scans outputs/audio/ and outputs/transcripts/ directories
 */

const fs = require('fs').promises;
const path = require('path');
const database = require('./src/database');
const { spawn } = require('child_process');

const AUDIO_DIR = path.join(__dirname, 'outputs', 'audio');
const TRANSCRIPT_DIR = path.join(__dirname, 'outputs', 'transcripts');

/**
 * Get audio duration using Python wave library
 */
async function getAudioDuration(audioPath) {
  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', `
import wave
import sys

try:
    with wave.open('${audioPath}', 'r') as wav_file:
        frames = wav_file.getnframes()
        rate = wav_file.getframerate()
        duration = frames / float(rate)
        print(int(round(duration)))
except Exception as e:
    print('0')
`]);

    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.on('close', () => {
      resolve(parseInt(output.trim()) || 0);
    });
  });
}

/**
 * Extract timestamp from filename
 * Formats: recording_2025-10-25_03-17-45.wav or test_recording_20251024_222049.wav
 */
function extractTimestampFromFilename(filename) {
  // Try format: recording_2025-10-25_03-17-45
  const match1 = filename.match(/recording_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
  if (match1) {
    const [, year, month, day, hour, minute, second] = match1;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
  }

  // Try format: test_recording_20251024_222049
  const match2 = filename.match(/recording_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (match2) {
    const [, year, month, day, hour, minute, second] = match2;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
  }

  // Fallback to file modification time
  return null;
}

/**
 * Find matching transcript files for an audio file
 */
function findMatchingTranscript(audioFilename, transcripts) {
  // Extract base timestamp
  const audioTimestamp = audioFilename
    .replace(/^(test_)?recording_/, '')
    .replace(/\.(wav|mp3|m4a)$/, '')
    .replace(/-/g, '')
    .replace(/_/g, '');

  // Find transcript with similar timestamp
  for (const transcript of transcripts) {
    const transcriptTimestamp = transcript
      .replace(/^transcript_/, '')
      .replace(/\.(txt|md)$/, '')
      .replace(/-/g, '')
      .replace(/_/g, '');

    // Check if timestamps are close (within same minute)
    if (transcriptTimestamp.substring(0, 12) === audioTimestamp.substring(0, 12)) {
      return transcript;
    }
  }

  return null;
}

/**
 * Read first line from transcript file
 */
async function getFirstLine(transcriptPath, maxLength = 100) {
  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');

    // If it's a markdown file, skip the headers
    let lines = content.split('\n');
    let textStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip empty lines and markdown headers
      if (line && !line.startsWith('#') && !line.startsWith('**') && line !== '---') {
        textStart = i;
        break;
      }
    }

    const firstLine = lines[textStart]?.trim() || '';

    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + '...';
    }

    return firstLine;
  } catch (error) {
    return '';
  }
}

async function main() {
  console.log('Starting migration of existing recordings...\n');

  try {
    // Get existing recordings in database
    const existingRecordings = await database.getAll();
    const existingAudioFiles = new Set(
      existingRecordings.map(r => path.basename(r.audioFile))
    );

    // Read audio files
    const audioFiles = await fs.readdir(AUDIO_DIR);
    const wavFiles = audioFiles.filter(f => f.endsWith('.wav'));

    // Read transcript files
    const transcriptFiles = await fs.readdir(TRANSCRIPT_DIR);
    const mdFiles = transcriptFiles.filter(f => f.endsWith('.md'));
    const txtFiles = transcriptFiles.filter(f => f.endsWith('.txt'));

    console.log(`Found ${wavFiles.length} audio files`);
    console.log(`Found ${mdFiles.length} markdown transcripts`);
    console.log(`Found ${txtFiles.length} text transcripts`);
    console.log(`Already in database: ${existingAudioFiles.size}\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const audioFile of wavFiles) {
      // Skip if already in database
      if (existingAudioFiles.has(audioFile)) {
        console.log(`Skipping ${audioFile} (already in database)`);
        skippedCount++;
        continue;
      }

      const audioPath = path.join(AUDIO_DIR, audioFile);

      // Get file stats for fallback timestamp
      const stats = await fs.stat(audioPath);

      // Extract timestamp from filename or use file mtime
      let timestamp = extractTimestampFromFilename(audioFile);
      if (!timestamp) {
        timestamp = stats.mtime.toISOString();
      }

      // Get audio duration
      const duration = await getAudioDuration(audioPath);

      // Find matching transcripts
      const mdFile = findMatchingTranscript(audioFile, mdFiles);
      const txtFile = findMatchingTranscript(audioFile, txtFiles);

      let transcriptMd = null;
      let transcriptTxt = null;
      let firstLine = '';

      if (mdFile) {
        transcriptMd = path.join(TRANSCRIPT_DIR, mdFile);
        firstLine = await getFirstLine(transcriptMd);
      }

      if (txtFile) {
        transcriptTxt = path.join(TRANSCRIPT_DIR, txtFile);
        if (!firstLine) {
          firstLine = await getFirstLine(transcriptTxt);
        }
      }

      // Create recording object
      const recording = {
        id: `rec_${Date.parse(timestamp)}`,
        timestamp: timestamp,
        duration: duration,
        audioFile: audioPath,
        transcriptTxt: transcriptTxt,
        transcriptMd: transcriptMd,
        firstLine: firstLine || `[No transcript] ${audioFile}`,
        metadata: {
          model: 'whisper-base',
          language: 'en',
          migrated: true
        }
      };

      // Add to database
      await database.add(recording);
      console.log(`Migrated: ${audioFile} (${duration}s) - "${firstLine.substring(0, 50)}..."`);
      migratedCount++;
    }

    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total in database: ${migratedCount + existingAudioFiles.size}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
