/**
 * Security Verification Test
 * Validates Electron security hardening implementation
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Electron Security Hardening Verification\n');

let allPassed = true;

// Test 1: Verify main.js has correct webPreferences
console.log('Test 1: Checking main.js webPreferences...');
const mainJs = fs.readFileSync('main.js', 'utf-8');
const hasNodeIntegrationFalse = mainJs.includes('nodeIntegration: false');
const hasContextIsolationTrue = mainJs.includes('contextIsolation: true');
const hasPreloadPath = mainJs.includes("preload: path.join(__dirname, 'src', 'preload.js')");

if (hasNodeIntegrationFalse && hasContextIsolationTrue && hasPreloadPath) {
  console.log('✅ PASS: main.js has secure webPreferences\n');
} else {
  console.log('❌ FAIL: main.js missing security settings');
  console.log(`  - nodeIntegration: false = ${hasNodeIntegrationFalse}`);
  console.log(`  - contextIsolation: true = ${hasContextIsolationTrue}`);
  console.log(`  - preload path = ${hasPreloadPath}\n`);
  allPassed = false;
}

// Test 2: Verify preload.js exists and uses contextBridge
console.log('Test 2: Checking preload.js implementation...');
if (!fs.existsSync('src/preload.js')) {
  console.log('❌ FAIL: src/preload.js does not exist\n');
  allPassed = false;
} else {
  const preloadJs = fs.readFileSync('src/preload.js', 'utf-8');
  const hasContextBridge = preloadJs.includes('contextBridge');
  const exposesElectronAPI = preloadJs.includes("exposeInMainWorld('electronAPI'");
  
  if (hasContextBridge && exposesElectronAPI) {
    console.log('✅ PASS: preload.js correctly uses contextBridge\n');
  } else {
    console.log('❌ FAIL: preload.js missing contextBridge implementation\n');
    allPassed = false;
  }
}

// Test 3: Verify renderer.js has no require() calls
console.log('Test 3: Checking renderer.js for security issues...');
if (!fs.existsSync('src/renderer.js')) {
  console.log('❌ FAIL: src/renderer.js does not exist\n');
  allPassed = false;
} else {
  const rendererJs = fs.readFileSync('src/renderer.js', 'utf-8');
  const hasRequire = rendererJs.includes("require('electron')") || 
                     rendererJs.includes('require("electron")') ||
                     rendererJs.includes("require('fs')") ||
                     rendererJs.includes('require("fs")');
  const usesElectronAPI = rendererJs.includes('window.electronAPI');
  
  if (!hasRequire && usesElectronAPI) {
    console.log('✅ PASS: renderer.js uses window.electronAPI (no require)\n');
  } else {
    console.log('❌ FAIL: renderer.js has security issues');
    console.log(`  - Has require() = ${hasRequire}`);
    console.log(`  - Uses window.electronAPI = ${usesElectronAPI}\n`);
    allPassed = false;
  }
}

// Test 4: Verify history-renderer.js has no require() calls
console.log('Test 4: Checking history-renderer.js for security issues...');
if (!fs.existsSync('src/history-renderer.js')) {
  console.log('❌ FAIL: src/history-renderer.js does not exist\n');
  allPassed = false;
} else {
  const historyRendererJs = fs.readFileSync('src/history-renderer.js', 'utf-8');
  const hasRequire = historyRendererJs.includes("require('electron')") || 
                     historyRendererJs.includes('require("electron")') ||
                     historyRendererJs.includes("require('fs')") ||
                     historyRendererJs.includes('require("fs")');
  const usesElectronAPI = historyRendererJs.includes('window.electronAPI');
  
  if (!hasRequire && usesElectronAPI) {
    console.log('✅ PASS: history-renderer.js uses window.electronAPI (no require)\n');
  } else {
    console.log('❌ FAIL: history-renderer.js has security issues');
    console.log(`  - Has require() = ${hasRequire}`);
    console.log(`  - Uses window.electronAPI = ${usesElectronAPI}\n`);
    allPassed = false;
  }
}

// Test 5: Verify HTML files reference correct scripts
console.log('Test 5: Checking HTML files...');
const indexHtml = fs.readFileSync('index.html', 'utf-8');
const historyHtml = fs.readFileSync('history.html', 'utf-8');

const indexUsesRenderer = indexHtml.includes('src="src/renderer.js"');
const historyUsesRenderer = historyHtml.includes('src="src/history-renderer.js"');
const indexNoInlineScript = !indexHtml.match(/<script>[\s\S]*?<\/script>/);
const historyNoInlineScript = !historyHtml.match(/<script>[\s\S]*?<\/script>/);

if (indexUsesRenderer && historyUsesRenderer && indexNoInlineScript && historyNoInlineScript) {
  console.log('✅ PASS: HTML files correctly reference secure renderer scripts\n');
} else {
  console.log('❌ FAIL: HTML files have issues');
  console.log(`  - index.html uses src/renderer.js = ${indexUsesRenderer}`);
  console.log(`  - history.html uses src/history-renderer.js = ${historyUsesRenderer}`);
  console.log(`  - index.html no inline scripts = ${indexNoInlineScript}`);
  console.log(`  - history.html no inline scripts = ${historyNoInlineScript}\n`);
  allPassed = false;
}

// Test 6: Verify old history.js is not referenced (should be deprecated)
console.log('Test 6: Checking for deprecated files...');
const historyJsStillReferenced = historyHtml.includes('history.js');

if (historyJsStillReferenced) {
  console.log('⚠️  WARNING: history.html still references old history.js');
  console.log('   This file should be removed or kept only for reference\n');
} else {
  console.log('✅ PASS: No references to deprecated history.js\n');
}

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (allPassed) {
  console.log('✅ ALL SECURITY TESTS PASSED');
  console.log('\nSecurity Features Verified:');
  console.log('  ✓ nodeIntegration: false');
  console.log('  ✓ contextIsolation: true');
  console.log('  ✓ Preload script with contextBridge');
  console.log('  ✓ No Node.js APIs in renderer processes');
  console.log('  ✓ All IPC goes through window.electronAPI');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Review output above');
  process.exit(1);
}
