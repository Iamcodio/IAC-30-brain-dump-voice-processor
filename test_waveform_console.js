/**
 * Waveform Polish Feature Test Suite
 *
 * Run this in the Electron DevTools console to test all new features:
 * 1. Copy this entire file
 * 2. Open app: npm start
 * 3. Press Cmd+Option+I to open DevTools
 * 4. Paste into console and press Enter
 */

(function WaveformPolishTests() {
  console.log('='.repeat(60));
  console.log('WAVEFORM POLISH FEATURE TEST SUITE');
  console.log('='.repeat(60));

  // Check if waveform manager exists
  if (!window.__waveformManager) {
    console.error('❌ WaveformManager not found. Is the app running?');
    return;
  }

  const manager = window.__waveformManager;
  const waveform = manager.waveform;

  console.log('\n📊 WAVEFORM MANAGER STATUS');
  console.log('-'.repeat(60));
  const state = manager.getState();
  console.log('State:', JSON.stringify(state, null, 2));

  // Test 1: Volume Meter
  console.log('\n🎚️  TEST 1: VOLUME LEVEL INDICATOR');
  console.log('-'.repeat(60));

  if (typeof waveform?.getCurrentVolume === 'function') {
    console.log('✅ getCurrentVolume() method exists');
    const volume = waveform.getCurrentVolume();
    console.log(`   Current volume: ${volume.toFixed(3)} (${Math.round(volume * 100)}%)`);

    if (volume >= 0 && volume <= 1) {
      console.log('✅ Volume in valid range (0.0-1.0)');
    } else {
      console.error('❌ Volume out of range:', volume);
    }
  } else {
    console.error('❌ getCurrentVolume() method not found');
  }

  // Test 2: Silence Detection
  console.log('\n🔇 TEST 2: SILENCE DETECTION');
  console.log('-'.repeat(60));

  if (typeof waveform?.isSilenceWarningActive === 'function') {
    console.log('✅ isSilenceWarningActive() method exists');
    const silenceActive = waveform.isSilenceWarningActive();
    console.log(`   Silence warning active: ${silenceActive}`);

    if (state.isRecording && !silenceActive) {
      console.log('💡 To test: Stay silent for 2+ seconds while recording');
    } else if (!state.isRecording) {
      console.log('💡 Start recording (Ctrl+Y) to test silence detection');
    }
  } else {
    console.error('❌ isSilenceWarningActive() method not found');
  }

  // Test 3: Performance Monitoring
  console.log('\n⚡ TEST 3: PERFORMANCE MONITORING');
  console.log('-'.repeat(60));

  if (typeof waveform?.getCurrentFps === 'function') {
    console.log('✅ getCurrentFps() method exists');
    const fps = waveform.getCurrentFps();
    console.log(`   Current FPS: ${fps}`);

    if (fps >= 30) {
      console.log('✅ FPS excellent (>= 30)');
    } else if (fps >= 25) {
      console.log('⚠️  FPS acceptable (25-29)');
    } else if (fps >= 20) {
      console.log('⚠️  FPS low (20-24)');
    } else {
      console.log('❌ FPS critical (< 20) - Performance issue!');
    }
  } else {
    console.error('❌ getCurrentFps() method not found');
  }

  // Test 4: Responsive Sizing
  console.log('\n📐 TEST 4: RESPONSIVE SIZING');
  console.log('-'.repeat(60));

  if (typeof waveform?.resize === 'function') {
    console.log('✅ resize() method exists');

    const canvas = waveform.getCanvas();
    console.log(`   Current canvas size: ${canvas.width}x${canvas.height}`);

    // Test resize
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;

    console.log('   Testing resize to 600x100...');
    waveform.resize(600, 100);

    if (canvas.width === 600 && canvas.height === 100) {
      console.log('✅ Resize successful');
    } else {
      console.error('❌ Resize failed:', canvas.width, canvas.height);
    }

    // Restore original size
    console.log(`   Restoring to ${originalWidth}x${originalHeight}...`);
    waveform.resize(originalWidth, originalHeight);
    console.log('✅ Size restored');
  } else {
    console.error('❌ resize() method not found');
  }

  // Test 5: API Completeness
  console.log('\n🔌 TEST 5: API COMPLETENESS');
  console.log('-'.repeat(60));

  const expectedMethods = [
    'getCurrentVolume',
    'getCurrentFps',
    'isSilenceWarningActive',
    'resize',
    'isActive',
    'getCanvas',
    'start',
    'stop',
    'cleanup'
  ];

  let missingMethods = [];
  expectedMethods.forEach(method => {
    if (typeof waveform?.[method] === 'function') {
      console.log(`✅ ${method}()`);
    } else {
      console.error(`❌ ${method}() missing`);
      missingMethods.push(method);
    }
  });

  if (missingMethods.length === 0) {
    console.log('✅ All expected methods present');
  } else {
    console.error(`❌ Missing methods: ${missingMethods.join(', ')}`);
  }

  // Test Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const isComplete =
    typeof waveform?.getCurrentVolume === 'function' &&
    typeof waveform?.getCurrentFps === 'function' &&
    typeof waveform?.isSilenceWarningActive === 'function' &&
    typeof waveform?.resize === 'function';

  if (isComplete) {
    console.log('✅ ALL POLISH FEATURES IMPLEMENTED');
  } else {
    console.error('❌ SOME FEATURES MISSING');
  }

  // Live Monitoring
  console.log('\n' + '='.repeat(60));
  console.log('LIVE MONITORING TOOLS');
  console.log('='.repeat(60));
  console.log('Run these commands to monitor in real-time:\n');

  console.log('// Monitor FPS and Volume every second');
  console.log('window.__fpsMonitor = setInterval(() => {');
  console.log('  const fps = window.__waveformManager.waveform?.getCurrentFps();');
  console.log('  const vol = window.__waveformManager.waveform?.getCurrentVolume();');
  console.log('  const silence = window.__waveformManager.waveform?.isSilenceWarningActive();');
  console.log('  console.log(`FPS: ${fps} | Volume: ${Math.round(vol * 100)}% | Silence: ${silence}`);');
  console.log('}, 1000);\n');

  console.log('// Stop monitoring');
  console.log('clearInterval(window.__fpsMonitor);\n');

  console.log('// Test responsive resize');
  console.log('window.__waveformManager.waveform.resize(600, 100);  // Small');
  console.log('window.__waveformManager.waveform.resize(800, 120);  // Normal\n');

  console.log('// Check full state');
  console.log('console.table(window.__waveformManager.getState());\n');

  console.log('='.repeat(60));
  console.log('Ready for manual testing!');
  console.log('Press Ctrl+Y to start recording and test features.');
  console.log('='.repeat(60));
})();
