#!/usr/bin/env node
/**
 * Generate Tray Icons
 *
 * Converts SVG templates to PNG files at the correct sizes for macOS menu bar.
 *
 * Requirements:
 *   npm install sharp --save-dev
 *
 * Usage:
 *   node scripts/generate-tray-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS = ['idle', 'recording', 'processing', 'error'];
const SIZES = [
  { size: 22, suffix: '' },
  { size: 44, suffix: '@2x' }
];

const assetsDir = path.join(__dirname, '..', 'assets', 'tray');

async function generateIcon(iconName, size, suffix) {
  const svgPath = path.join(assetsDir, `tray-${iconName}.svg`);
  const pngPath = path.join(assetsDir, `tray-${iconName}${suffix}.png`);

  console.log(`Generating: tray-${iconName}${suffix}.png (${size}x${size})`);

  try {
    await sharp(svgPath)
      .resize(size, size)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toFile(pngPath);

    console.log(`  ✓ Created: ${pngPath}`);
  } catch (error) {
    console.error(`  ✗ Failed to create ${pngPath}:`, error.message);
    throw error;
  }
}

async function generateAllIcons() {
  console.log('🎨 Generating macOS menu bar icons...\n');

  // Verify SVG files exist
  for (const iconName of ICONS) {
    const svgPath = path.join(assetsDir, `tray-${iconName}.svg`);
    if (!fs.existsSync(svgPath)) {
      throw new Error(`SVG file not found: ${svgPath}`);
    }
  }

  // Generate all combinations
  const tasks = [];
  for (const iconName of ICONS) {
    for (const { size, suffix } of SIZES) {
      tasks.push(generateIcon(iconName, size, suffix));
    }
  }

  await Promise.all(tasks);

  console.log('\n✅ All icons generated successfully!\n');
  console.log('Generated files:');
  for (const iconName of ICONS) {
    for (const { suffix } of SIZES) {
      console.log(`  - tray-${iconName}${suffix}.png`);
    }
  }

  console.log('\n📋 Next steps:');
  console.log('1. Review icons visually by opening assets/tray/ in Finder');
  console.log('2. Test on both light and dark menu bars');
  console.log('3. Integrate into Electron app using nativeImage.createFromPath()');
}

// Run the generator
generateAllIcons().catch(error => {
  console.error('\n❌ Icon generation failed:', error);
  process.exit(1);
});
