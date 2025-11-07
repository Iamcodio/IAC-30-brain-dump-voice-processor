/**
 * Settings UI Renderer - Auto-fill settings page
 *
 * Manages the settings UI for auto-fill configuration including:
 * - Accessibility permission status checking
 * - Enable/disable toggle
 * - Trigger mode selection (auto vs manual)
 * - App blacklist management
 * - Manual fill testing
 */

// Settings state
let settings = {
  enabled: true,
  requireManualTrigger: false,
  blacklistedApps: []
};

// DOM elements
const enableToggle = document.getElementById('enable-toggle');
const radioOptions = document.querySelectorAll('.radio-option');
const blacklistContainer = document.getElementById('blacklist-container');
const newBlacklistInput = document.getElementById('new-blacklist-app');
const addBlacklistBtn = document.getElementById('add-blacklist-btn');
const testBtn = document.getElementById('test-autofill-btn');
const requestPermissionBtn = document.getElementById('request-permission-btn');
const backBtn = document.getElementById('back-btn');
const permissionStatus = document.getElementById('permission-status');

// Load settings on startup
window.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkPermissions();
});

/**
 * Load current settings from main process
 */
async function loadSettings() {
  try {
    settings = await window.electronAPI.autoFillGetSettings();
    updateUI();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Check if accessibility permissions are granted
 */
async function checkPermissions() {
  try {
    const hasPermissions = await window.electronAPI.accessibilityCheckPermissions();
    updatePermissionStatus(hasPermissions);
  } catch (error) {
    console.error('Failed to check permissions:', error);
    updatePermissionStatus(false);
  }
}

/**
 * Update UI to reflect current settings state
 */
function updateUI() {
  // Update enable toggle
  if (settings.enabled) {
    enableToggle.classList.add('active');
  } else {
    enableToggle.classList.remove('active');
  }

  // Update trigger mode
  radioOptions.forEach(option => {
    const mode = option.dataset.mode;
    if ((mode === 'auto' && !settings.requireManualTrigger) ||
        (mode === 'manual' && settings.requireManualTrigger)) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });

  // Update blacklist
  renderBlacklist();
}

/**
 * Render blacklist items
 */
function renderBlacklist() {
  blacklistContainer.innerHTML = '';
  settings.blacklistedApps.forEach(app => {
    const item = document.createElement('div');
    item.className = 'blacklist-item';
    item.innerHTML = `
      <span>${app}</span>
      <button class="remove-btn" data-app="${app}">Remove</button>
    `;
    blacklistContainer.appendChild(item);
  });

  // Add remove listeners
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeFromBlacklist(btn.dataset.app));
  });
}

/**
 * Update permission status UI
 */
function updatePermissionStatus(hasPermissions) {
  if (hasPermissions) {
    permissionStatus.className = 'permission-status granted';
    permissionStatus.innerHTML = `
      <span class="status-icon">✅</span>
      <div class="status-text">
        <h3>Permission Granted</h3>
        <p>Auto-fill is ready to use</p>
      </div>
    `;
    requestPermissionBtn.style.display = 'none';
  } else {
    permissionStatus.className = 'permission-status denied';
    permissionStatus.innerHTML = `
      <span class="status-icon">⚠️</span>
      <div class="status-text">
        <h3>Permission Required</h3>
        <p>Grant accessibility permission to enable auto-fill</p>
      </div>
    `;
    requestPermissionBtn.style.display = 'block';
  }
}

/**
 * Save settings to main process
 */
async function saveSettings() {
  try {
    await window.electronAPI.autoFillUpdateSettings(settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Remove app from blacklist
 */
async function removeFromBlacklist(app) {
  settings.blacklistedApps = settings.blacklistedApps.filter(a => a !== app);
  await saveSettings();
  updateUI();
}

// Event listeners

/**
 * Enable/disable toggle
 */
enableToggle.addEventListener('click', async () => {
  settings.enabled = !settings.enabled;
  await saveSettings();
  updateUI();
});

/**
 * Trigger mode selection
 */
radioOptions.forEach(option => {
  option.addEventListener('click', async () => {
    const mode = option.dataset.mode;
    settings.requireManualTrigger = (mode === 'manual');
    await saveSettings();
    updateUI();
  });
});

/**
 * Add app to blacklist
 */
addBlacklistBtn.addEventListener('click', async () => {
  const app = newBlacklistInput.value.trim();
  if (app && !settings.blacklistedApps.includes(app)) {
    settings.blacklistedApps.push(app);
    await saveSettings();
    newBlacklistInput.value = '';
    updateUI();
  }
});

/**
 * Enter key to add blacklist app
 */
newBlacklistInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    addBlacklistBtn.click();
  }
});

/**
 * Test auto-fill
 */
testBtn.addEventListener('click', async () => {
  try {
    const success = await window.electronAPI.autoFillManualFill();
    if (success) {
      alert('Test auto-fill triggered! Click in a text field to see it work.');
    } else {
      alert('Auto-fill test failed. Make sure you have transcripts and a text field is focused.');
    }
  } catch (error) {
    console.error('Test auto-fill failed:', error);
    alert('Auto-fill test failed: ' + error.message);
  }
});

/**
 * Request accessibility permissions
 */
requestPermissionBtn.addEventListener('click', async () => {
  try {
    await window.electronAPI.accessibilityRequestPermissions();
    // Wait a bit then re-check permissions
    setTimeout(async () => {
      await checkPermissions();
    }, 1000);
  } catch (error) {
    console.error('Failed to request permissions:', error);
  }
});

/**
 * Back button - navigate to history
 */
backBtn.addEventListener('click', () => {
  window.electronAPI.showHistory();
});
