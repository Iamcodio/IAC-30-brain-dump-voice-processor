/**
 * History view renderer script
 * Communicates with main process ONLY via window.electronAPI (preload.js)
 */

// Import constants (browser environment - need to use a different approach)
// Note: In browser context, we can't use require(). Constants are duplicated here.
// TODO: Consider bundling if this becomes maintenance burden.

// Constants from src/config/constants.js
const DISPLAY = { BLOCK: 'block', NONE: 'none' };
const TEXT_LIMITS = { PREVIEW_MAX_LENGTH: 150, PREVIEW_ELLIPSIS: '...' };
const DATE_FORMAT = {
  MONTHS_SHORT: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  TIME_12H_THRESHOLD: 12,
  MINUTE_PAD_LENGTH: 2,
  HOUR_PAD_LENGTH: 2,
  PAD_CHAR: '0'
};
const TIMESTAMP_REGEX = /(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/;
const MARKDOWN = { SEPARATOR: '---', HEADER_PREFIX: '#', METADATA_PREFIX: '**', LINE_SEPARATOR: '\n' };
const DURATION = { UNKNOWN_LABEL: 'Unknown', NO_TRANSCRIPT_LABEL: 'No transcript available' };
const CSS_CLASSES = {
  SHOW: 'show',
  RECORDING_ITEM: 'recording-item',
  RECORDING_HEADER: 'recording-header',
  RECORDING_DATE: 'recording-date',
  RECORDING_DURATION: 'recording-duration',
  RECORDING_PREVIEW: 'recording-preview',
  RECORDING_ACTIONS: 'recording-actions',
  ACTION_BTN: 'action-btn',
  ACTION_BTN_PLAY: 'play',
  ACTION_BTN_COPY: 'copy'
};
const BUTTON_CONTENT = {
  PLAY: '<span>▶</span><span>Play</span>',
  VIEW: '<span>📄</span><span>View</span>',
  COPY: '<span>📋</span><span>Copy</span>'
};
const TOAST = {
  DURATION_MS: 3000,
  COLOR_SUCCESS: '#4caf50',
  COLOR_ERROR: '#f44336'
};
const MESSAGES = {
  COPY_SUCCESS: 'Copied to clipboard!',
  COPY_ERROR: 'Failed to copy transcript',
  LOAD_ERROR: 'Error loading recordings'
};

// State
let allRecordings = [];
let filteredRecordings = [];

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const recordingList = document.getElementById('recordingList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const newRecordingBtn = document.getElementById('newRecordingBtn');
const toast = document.getElementById('toast');

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp or filename timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      // Try parsing from filename format: 2025-10-25_03-17-45
      const parts = timestamp.match(TIMESTAMP_REGEX);
      if (parts) {
        const [, year, month, day, hour, min, sec] = parts;
        const parsed = new Date(year, month - 1, day, hour, min, sec);
        return formatDateTime(parsed);
      }
      return timestamp;
    }
    return formatDateTime(date);
  } catch (e) {
    return timestamp;
  }
}

/**
 * Format Date object to readable string
 * @param {Date} date - Date object
 * @returns {string} Formatted string like "Oct 25, 03:17 AM"
 */
function formatDateTime(date) {
  const month = DATE_FORMAT.MONTHS_SHORT[date.getMonth()];
  const day = date.getDate();
  let hour = date.getHours();
  const min = String(date.getMinutes()).padStart(DATE_FORMAT.MINUTE_PAD_LENGTH, DATE_FORMAT.PAD_CHAR);
  const ampm = hour >= DATE_FORMAT.TIME_12H_THRESHOLD ? 'PM' : 'AM';
  hour = hour % DATE_FORMAT.TIME_12H_THRESHOLD || DATE_FORMAT.TIME_12H_THRESHOLD;

  return `${month} ${day}, ${String(hour).padStart(DATE_FORMAT.HOUR_PAD_LENGTH, DATE_FORMAT.PAD_CHAR)}:${min} ${ampm}`;
}

/**
 * Extract first line of transcript for preview
 * @param {string} content - Full transcript content
 * @returns {string} First meaningful line
 */
function getPreviewText(content) {
  const lines = content.split(MARKDOWN.LINE_SEPARATOR).filter(line => line.trim());

  // Skip markdown headers and metadata
  for (let line of lines) {
    line = line.trim();
    if (line && !line.startsWith(MARKDOWN.HEADER_PREFIX) && !line.startsWith(MARKDOWN.METADATA_PREFIX) && !line.startsWith(MARKDOWN.SEPARATOR)) {
      return line.length > TEXT_LIMITS.PREVIEW_MAX_LENGTH ? line.substring(0, TEXT_LIMITS.PREVIEW_MAX_LENGTH) + TEXT_LIMITS.PREVIEW_ELLIPSIS : line;
    }
  }

  return DURATION.NO_TRANSCRIPT_LABEL;
}

/**
 * Load all recordings from filesystem
 */
async function loadRecordings() {
  try {
    loadingIndicator.style.display = DISPLAY.BLOCK;
    recordingList.style.display = DISPLAY.NONE;
    emptyState.style.display = DISPLAY.NONE;

    const recordings = await window.electronAPI.getRecordings();
    allRecordings = recordings;
    filteredRecordings = recordings;

    if (recordings.length === 0) {
      loadingIndicator.style.display = DISPLAY.NONE;
      emptyState.style.display = DISPLAY.BLOCK;
    } else {
      renderRecordings(recordings);
      loadingIndicator.style.display = DISPLAY.NONE;
      recordingList.style.display = DISPLAY.BLOCK;
    }
  } catch (error) {
    console.error('Error loading recordings:', error);
    showToast(MESSAGES.LOAD_ERROR, 'error');
    loadingIndicator.style.display = DISPLAY.NONE;
    emptyState.style.display = DISPLAY.BLOCK;
  }
}

/**
 * Render recordings list
 * @param {Array} recordings - Array of recording objects
 */
function renderRecordings(recordings) {
  recordingList.innerHTML = '';

  if (recordings.length === 0) {
    recordingList.style.display = DISPLAY.NONE;
    emptyState.style.display = DISPLAY.BLOCK;
    return;
  }

  recordingList.style.display = DISPLAY.BLOCK;
  emptyState.style.display = DISPLAY.NONE;

  recordings.forEach(recording => {
    const item = createRecordingItem(recording);
    recordingList.appendChild(item);
  });
}

/**
 * Create DOM element for a recording item
 * @param {Object} recording - Recording data
 * @returns {HTMLElement} Recording item element
 */
function createRecordingItem(recording) {
  const div = document.createElement('div');
  div.className = CSS_CLASSES.RECORDING_ITEM;

  const header = document.createElement('div');
  header.className = CSS_CLASSES.RECORDING_HEADER;

  const date = document.createElement('div');
  date.className = CSS_CLASSES.RECORDING_DATE;
  date.textContent = formatDate(recording.timestamp);

  const duration = document.createElement('div');
  duration.className = CSS_CLASSES.RECORDING_DURATION;
  duration.textContent = recording.duration || DURATION.UNKNOWN_LABEL;

  header.appendChild(date);
  header.appendChild(duration);

  const preview = document.createElement('div');
  preview.className = CSS_CLASSES.RECORDING_PREVIEW;
  preview.textContent = recording.preview;

  const actions = document.createElement('div');
  actions.className = CSS_CLASSES.RECORDING_ACTIONS;

  const playBtn = document.createElement('button');
  playBtn.className = `${CSS_CLASSES.ACTION_BTN} ${CSS_CLASSES.ACTION_BTN_PLAY}`;
  playBtn.innerHTML = BUTTON_CONTENT.PLAY;
  playBtn.onclick = () => playRecording(recording.audioPath);

  const viewBtn = document.createElement('button');
  viewBtn.className = CSS_CLASSES.ACTION_BTN;
  viewBtn.innerHTML = BUTTON_CONTENT.VIEW;
  viewBtn.onclick = () => viewTranscript(recording.transcriptPath);

  const copyBtn = document.createElement('button');
  copyBtn.className = `${CSS_CLASSES.ACTION_BTN} ${CSS_CLASSES.ACTION_BTN_COPY}`;
  copyBtn.innerHTML = BUTTON_CONTENT.COPY;
  copyBtn.onclick = () => copyTranscript(recording.transcriptPath);

  actions.appendChild(playBtn);
  actions.appendChild(viewBtn);
  actions.appendChild(copyBtn);

  div.appendChild(header);
  div.appendChild(preview);
  div.appendChild(actions);

  return div;
}

/**
 * Play audio recording
 * @param {string} audioPath - Path to audio file
 */
function playRecording(audioPath) {
  window.electronAPI.playAudio(audioPath);
}

/**
 * Open transcript in external viewer
 * @param {string} transcriptPath - Path to transcript file
 */
function viewTranscript(transcriptPath) {
  window.electronAPI.viewFile(transcriptPath);
}

/**
 * Copy transcript to clipboard
 * @param {string} transcriptPath - Path to transcript file
 */
async function copyTranscript(transcriptPath) {
  try {
    const content = await window.electronAPI.readFile(transcriptPath);

    // Extract just the transcript text (skip metadata)
    const lines = content.split(MARKDOWN.LINE_SEPARATOR);
    let transcriptStarted = false;
    let transcriptText = [];

    for (let line of lines) {
      if (line.trim() === MARKDOWN.SEPARATOR) {
        transcriptStarted = true;
        continue;
      }
      if (transcriptStarted && line.trim()) {
        transcriptText.push(line);
      }
    }

    const textToCopy = transcriptText.join(MARKDOWN.LINE_SEPARATOR).trim();
    await navigator.clipboard.writeText(textToCopy);
    showToast(MESSAGES.COPY_SUCCESS);
  } catch (error) {
    console.error('Error copying transcript:', error);
    showToast(MESSAGES.COPY_ERROR, 'error');
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type ('success' or 'error')
 */
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.style.background = type === 'error' ? TOAST.COLOR_ERROR : TOAST.COLOR_SUCCESS;
  toast.classList.add(CSS_CLASSES.SHOW);

  setTimeout(() => {
    toast.classList.remove(CSS_CLASSES.SHOW);
  }, TOAST.DURATION_MS);
}

/**
 * Filter recordings based on search query
 * @param {string} query - Search query
 */
function filterRecordings(query) {
  query = query.toLowerCase().trim();

  if (!query) {
    filteredRecordings = allRecordings;
  } else {
    filteredRecordings = allRecordings.filter(recording => {
      return (
        recording.preview.toLowerCase().includes(query) ||
        recording.timestamp.toLowerCase().includes(query)
      );
    });
  }

  renderRecordings(filteredRecordings);
}

/**
 * Switch to recording view
 */
function showRecorder() {
  window.electronAPI.showRecorder();
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
  filterRecordings(e.target.value);
});

newRecordingBtn.addEventListener('click', showRecorder);

// Initialize
loadRecordings();
