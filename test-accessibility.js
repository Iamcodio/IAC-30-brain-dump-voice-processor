#!/usr/bin/env node

/**
 * Test script for the native accessibility module
 *
 * This tests all the core APIs to ensure they work correctly.
 *
 * Usage: node test-accessibility.js
 */

const addon = require('./build/Release/accessibility.node');

console.log('=== BrainDump Accessibility Module Test ===\n');

// Test 1: Check if module loaded
console.log('✅ Module loaded successfully');
console.log('Available functions:', Object.keys(addon));
console.log();

// Test 2: Check permissions
console.log('--- Test 1: Check Accessibility Permissions ---');
try {
    const hasPermissions = addon.hasAccessibilityPermissions();
    console.log(`Has permissions: ${hasPermissions}`);

    if (!hasPermissions) {
        console.log('\n⚠️  Accessibility permissions not granted.');
        console.log('Would you like to request permissions? (Will open System Preferences)');
        console.log('Run this again after granting permissions to test other features.\n');

        // Uncomment to automatically request permissions:
        // console.log('Requesting permissions...');
        // const requested = addon.requestAccessibilityPermissions();
        // console.log(`Request dialog shown: ${requested}`);
    }
} catch (err) {
    console.error('❌ Error checking permissions:', err.message);
}
console.log();

// Test 3: Get focused element (only if we have permissions)
console.log('--- Test 2: Get Focused Element ---');
try {
    const hasPermissions = addon.hasAccessibilityPermissions();

    if (hasPermissions) {
        console.log('Focus a text field in any app (e.g., browser, TextEdit) and press Enter...');
        console.log('(This test requires manual interaction)\n');

        const element = addon.getFocusedElement();
        console.log('Focused element info:', JSON.stringify(element, null, 2));

        if (element && element.focused) {
            console.log('\n✅ Successfully detected focused element');

            // Test if it's a text input
            const isTextInput = addon.isTextInputElement(element);
            console.log(`Is text input: ${isTextInput}`);
        } else {
            console.log('\n⚠️  No focused element detected');
        }
    } else {
        console.log('⚠️  Skipping - accessibility permissions not granted');
    }
} catch (err) {
    console.error('❌ Error getting focused element:', err.message);
}
console.log();

// Test 4: Text insertion test
console.log('--- Test 3: Text Insertion ---');
try {
    const hasPermissions = addon.hasAccessibilityPermissions();

    if (hasPermissions) {
        console.log('To test text insertion:');
        console.log('1. Focus a text field in any app');
        console.log('2. Uncomment the insertText line in test-accessibility.js');
        console.log('3. Run this script again\n');

        // Uncomment to test text insertion:
        // const element = addon.getFocusedElement();
        // if (element && addon.isTextInputElement(element)) {
        //     const success = addon.insertText('Hello from BrainDump! ');
        //     console.log(`Text insertion: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        // } else {
        //     console.log('⚠️  Please focus a text field first');
        // }

        console.log('⚠️  Text insertion test commented out (uncomment to test)');
    } else {
        console.log('⚠️  Skipping - accessibility permissions not granted');
    }
} catch (err) {
    console.error('❌ Error inserting text:', err.message);
}
console.log();

// Test 5: App monitoring
console.log('--- Test 4: Active App Monitoring ---');
try {
    const hasPermissions = addon.hasAccessibilityPermissions();

    if (hasPermissions) {
        console.log('To test app monitoring:');
        console.log('1. Uncomment the startMonitoring code in test-accessibility.js');
        console.log('2. Run this script again');
        console.log('3. Switch between different apps\n');

        // Uncomment to test app monitoring:
        // console.log('Starting app monitoring (switch apps to test)...');
        // const started = addon.startMonitoringActiveApp((appInfo) => {
        //     console.log('App switched:', appInfo);
        // });
        // console.log(`Monitoring started: ${started}`);
        //
        // // Keep the script running for 30 seconds
        // console.log('Monitoring for 30 seconds... (switch apps to see events)');
        // setTimeout(() => {
        //     addon.stopMonitoringActiveApp();
        //     console.log('Monitoring stopped');
        //     process.exit(0);
        // }, 30000);

        console.log('⚠️  App monitoring test commented out (uncomment to test)');
    } else {
        console.log('⚠️  Skipping - accessibility permissions not granted');
    }
} catch (err) {
    console.error('❌ Error monitoring apps:', err.message);
}
console.log();

console.log('=== Test Complete ===');
console.log('\nNext steps:');
console.log('1. Grant accessibility permissions if needed');
console.log('2. Uncomment individual tests to try them out');
console.log('3. Test in different apps (Chrome, Safari, TextEdit, etc.)');
console.log('\nFor integration into BrainDump, see the TypeScript wrapper in src/accessibility/');
