# System-Level Infrastructure Requirements

**Date:** 2025-10-25 15:30 IST  
**Status:** PARKED - To incorporate into Phase B.3/B.4  
**Priority:** HIGH - Must do before features (Phase C)  

---

## Overview

Core functional infrastructure for auto-detection and system resource management. Not features - foundational requirements.

---

## Categories

### 1. Audio Device Detection
- Auto-detect available microphones (PyAudio enumeration)
- Default microphone selection (like Zoom)
- User override via settings UI

### 2. System Resource Checks
- Disk space validation (before recording)
- Memory availability (for Whisper processing)
- CPU capabilities

### 3. Dependency Validation
- Python version check
- PyAudio availability
- Whisper CLI installation
- Model files present (ggml-base.bin)

### 4. Export Functions
- Markdown (✅ exists)
- PDF generation (need to add)
- Bulk concatenate/merge

### 5. Settings Architecture
- config.json for user preferences
- Auto-detect with sensible defaults
- Non-technical UI (dropdowns, not config files)

### 6. Environment Variables
- System info (OS, version, display)
- File paths
- Resource limits

---

## Integration Point

**Phase B.3 or B.4** - Before any Phase C features

---

**Next Action:** Expand into full spec when Phase B.2 complete
