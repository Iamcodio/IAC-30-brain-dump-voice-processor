# Tray Icon Assets

This directory contains macOS menu bar icons for the BrainDump Voice Processor application.

## Files

### PNG Icons (Ready to Use)
All icons follow the macOS template image format (black on transparent background).

**Idle State** (App ready, not recording)
- `tray-idle.png` - 22x22px standard resolution
- `tray-idle@2x.png` - 44x44px Retina resolution

**Recording State** (Currently recording audio)
- `tray-recording.png` - 22x22px standard resolution
- `tray-recording@2x.png` - 44x44px Retina resolution

**Processing State** (Transcribing audio)
- `tray-processing.png` - 22x22px standard resolution
- `tray-processing@2x.png` - 44x44px Retina resolution

**Error State** (Something went wrong)
- `tray-error.png` - 22x22px standard resolution
- `tray-error@2x.png` - 44x44px Retina resolution

### SVG Source Files
Editable vector source files for each icon state:
- `tray-idle.svg`
- `tray-recording.svg`
- `tray-processing.svg`
- `tray-error.svg`

## Icon Design

Each icon features a microphone as the base design with state-specific indicators:

1. **Idle**: Clean microphone with subtle sound waves
2. **Recording**: Microphone + filled circle (recording dot) + bold sound waves
3. **Processing**: Microphone + spinner dots (3 dots with varying opacity)
4. **Error**: Microphone + exclamation mark in circle

All icons use the **template image format**:
- Black (#000000) elements on transparent background
- macOS automatically adapts to light/dark menu bar themes
- High contrast for visibility at small sizes

## Usage in Electron

### Loading Icons

```javascript
const { nativeImage } = require('electron');
const path = require('path');

// Load icon (Electron automatically uses @2x on Retina displays)
const idleIcon = nativeImage.createFromPath(
  path.join(__dirname, 'assets/tray/tray-idle.png')
);

// Set as template image (important for macOS theme adaptation)
idleIcon.setTemplateImage(true);
```

### Creating Tray

```javascript
const { Tray } = require('electron');

let tray = null;

app.whenReady().then(() => {
  const iconPath = path.join(__dirname, 'assets/tray/tray-idle.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('BrainDump Voice Processor');
});
```

### Updating Tray Icon

```javascript
function setTrayIcon(state) {
  const iconPath = path.join(__dirname, `assets/tray/tray-${state}.png`);
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray.setImage(icon);
}

// Usage
setTrayIcon('idle');       // Not recording
setTrayIcon('recording');  // Recording in progress
setTrayIcon('processing'); // Transcribing
setTrayIcon('error');      // Error occurred
```

## Regenerating Icons

If you modify the SVG source files, regenerate the PNG icons:

```bash
npm install --save-dev sharp  # Only needed once
node scripts/generate-tray-icons.js
```

This will create all 8 PNG files (4 states × 2 resolutions) from the SVG templates.

## Testing

### Visual Testing
1. Open `assets/tray/` in Finder
2. Use Quick Look (spacebar) to preview each icon
3. Verify icons are visible and recognizable at small size

### Theme Testing
After integrating into the app:
1. Switch macOS to light mode (System Preferences > General > Appearance)
2. Verify icon is visible and contrasts with menu bar
3. Switch to dark mode
4. Verify icon remains visible with proper contrast

### Retina Testing
Icons should appear crisp on Retina displays. macOS automatically selects @2x versions when appropriate.

## Design Specifications

- **Format**: PNG with alpha transparency
- **Color space**: sRGB
- **Bit depth**: 8-bit per channel
- **Template image**: Yes (black on transparent)
- **Standard size**: 22×22px
- **Retina size**: 44×44px (@2x)
- **File size**: 250-650 bytes per icon (highly optimized)

## Accessibility

All icons follow macOS accessibility guidelines:
- High contrast against both light and dark backgrounds
- Recognizable at small sizes (22×22px)
- Distinct visual states
- Template image format ensures proper color adaptation

## Credits

Icons designed specifically for BrainDump Voice Processor using simple geometric shapes for optimal menu bar visibility.
