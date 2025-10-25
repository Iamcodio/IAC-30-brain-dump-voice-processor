/**
 * History view renderer script
 * Communicates with main process ONLY via window.electronAPI (preload.js)
 */

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
      const parts = timestamp.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  let hour = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${month} ${day}, ${String(hour).padStart(2, '0')}:${min} ${ampm}`;
}

/**
 * Extract first line of transcript for preview
 * @param {string} content - Full transcript content
 * @returns {string} First meaningful line
 */
function getPreviewText(content) {
  const lines = content.split('\n').filter(line => line.trim());

  // Skip markdown headers and metadata
  for (let line of lines) {
    line = line.trim();
    if (line && !line.startsWith('#') && !line.startsWith('**') && !line.startsWith('---')) {
      return line.length > 150 ? line.substring(0, 150) + '...' : line;
    }
  }

  return 'No transcript available';
}

/**
 * Load all recordings from filesystem
 */
async function loadRecordings() {
  try {
    loadingIndicator.style.display = 'block';
    recordingList.style.display = 'none';
    emptyState.style.display = 'none';

    const recordings = await window.electronAPI.getRecordings();
    allRecordings = recordings;
    filteredRecordings = recordings;

    if (recordings.length === 0) {
      loadingIndicator.style.display = 'none';
      emptyState.style.display = 'block';
    } else {
      renderRecordings(recordings);
      loadingIndicator.style.display = 'none';
      recordingList.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading recordings:', error);
    showToast('Error loading recordings', 'error');
    loadingIndicator.style.display = 'none';
    emptyState.style.display = 'block';
  }
}

/**
 * Render recordings list
 * @param {Array} recordings - Array of recording objects
 */
function renderRecordings(recordings) {
  recordingList.innerHTML = '';

  if (recordings.length === 0) {
    recordingList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  recordingList.style.display = 'block';
  emptyState.style.display = 'none';

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
  div.className = 'recording-item';

  const header = document.createElement('div');
  header.className = 'recording-header';

  const date = document.createElement('div');
  date.className = 'recording-date';
  date.textContent = formatDate(recording.timestamp);

  const duration = document.createElement('div');
  duration.className = 'recording-duration';
  duration.textContent = recording.duration || 'Unknown';

  header.appendChild(date);
  header.appendChild(duration);

  const preview = document.createElement('div');
  preview.className = 'recording-preview';
  preview.textContent = recording.preview;

  const actions = document.createElement('div');
  actions.className = 'recording-actions';

  const playBtn = document.createElement('button');
  playBtn.className = 'action-btn play';
  playBtn.innerHTML = '<span>▶</span><span>Play</span>';
  playBtn.onclick = () => playRecording(recording.audioPath);

  const viewBtn = document.createElement('button');
  viewBtn.className = 'action-btn';
  viewBtn.innerHTML = '<span>📄</span><span>View</span>';
  viewBtn.onclick = () => viewTranscript(recording.transcriptPath);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn copy';
  copyBtn.innerHTML = '<span>📋</span><span>Copy</span>';
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
    const lines = content.split('\n');
    let transcriptStarted = false;
    let transcriptText = [];

    for (let line of lines) {
      if (line.trim() === '---') {
        transcriptStarted = true;
        continue;
      }
      if (transcriptStarted && line.trim()) {
        transcriptText.push(line);
      }
    }

    const textToCopy = transcriptText.join('\n').trim();
    await navigator.clipboard.writeText(textToCopy);
    showToast('Copied to clipboard!');
  } catch (error) {
    console.error('Error copying transcript:', error);
    showToast('Failed to copy transcript', 'error');
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type ('success' or 'error')
 */
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#f44336' : '#4caf50';
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
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
