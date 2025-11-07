# UV - Official Documentation
**Source:** https://docs.astral.sh/uv/
**Downloaded:** 2025-10-24
**Version:** 0.9.5 (Latest as of download)

---

## What is UV?

An extremely fast Python package and project manager, written in Rust.

**Key Features:**
- 🚀 Single tool to replace pip, pip-tools, pipx, poetry, pyenv, twine, virtualenv
- ⚡️ 10-100x faster than pip
- 🗂️ Comprehensive project management with universal lockfile
- 🐍 Installs and manages Python versions
- 🛠️ Runs and installs tools published as Python packages
- 💾 Disk-space efficient with global cache
- 🖥️ Supports macOS, Linux, Windows

---

## Installation

Install with standalone installer:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Or with Homebrew (which you're using):
```bash
brew install uv
```

**You already have:** uv 0.9.5 ✅

---

## Core Commands

### Create Virtual Environment
```bash
uv venv
```
Creates `.venv` directory in current folder. This is your isolated Python environment.

**Activate it:**
```bash
source .venv/bin/activate
```

### Install Packages
```bash
uv pip install package-name
```

### Install from requirements.txt
```bash
uv pip install -r requirements.txt
```

### Add package to project
```bash
uv add package-name
```
Adds to pyproject.toml and installs.

---

## Project Management

### Initialize new project
```bash
uv init project-name
```

### Add dependencies
```bash
uv add requests numpy pandas
```

### Lock dependencies (create lockfile)
```bash
uv lock
```

### Sync environment with lockfile
```bash
uv sync
```

### Run command in project environment
```bash
uv run python script.py
```

---

## Python Version Management

### Install Python versions
```bash
uv python install 3.11 3.12
```

### List available Python versions
```bash
uv python list
```

### Pin project to specific Python version
```bash
uv python pin 3.11
```
Creates `.python-version` file.

---

## Tools (like pipx)

### Run tool without installing
```bash
uvx tool-name
```

### Install tool globally
```bash
uv tool install tool-name
```

---

## Performance Benefits

**Why UV is fast:**
1. **Parallel downloads** - Multiple packages at once
2. **Global cache** - Reuses downloaded packages
3. **Optimized metadata** - Only downloads what's needed
4. **Rust implementation** - Compiled, not interpreted

**Benchmarks:**
- pip: ~45 seconds
- poetry: ~40 seconds  
- UV: ~3 seconds

**For the same dependency installation.**

---

## Virtual Environments (What we're using)

`uv venv` creates isolated Python environment:

```
.venv/
├── bin/          # Executables (python, pip, etc.)
├── lib/          # Installed packages
└── pyvenv.cfg    # Configuration
```

**Why use virtual environments?**
- Each project gets its own packages
- No conflicts between projects
- Easy to recreate on different machines
- Clean uninstall (just delete .venv folder)

---

## Lockfiles (uv.lock)

When you run `uv lock`, UV creates `uv.lock` file containing:
- Exact versions of all packages
- Exact versions of dependencies of dependencies
- Checksums for verification

**Why?**
- Reproducible builds
- Same versions on dev, test, prod
- Prevents "works on my machine" issues

---

## Key Differences from pip

| Feature | pip | UV |
|---------|-----|-----|
| Speed | Baseline | 10-100x faster |
| Lockfiles | Manual (pip freeze) | Automatic (uv.lock) |
| Python management | Need pyenv | Built-in |
| Parallel installs | No | Yes |
| Global cache | No | Yes |
| Written in | Python | Rust |

---

## Best Practices for This Project

### 1. Create virtual environment first
```bash
uv venv
source .venv/bin/activate
```

### 2. Install packages one by one (we'll do this together)
```bash
uv pip install package-name
```

### 3. Save to requirements.txt after testing
```bash
uv pip freeze > requirements.txt
```

### 4. For reproducibility, use lockfile
```bash
uv lock
```

---

## Common Issues

### "uv: command not found"
Solution: Restart terminal or run:
```bash
source ~/.zshrc  # or ~/.bashrc
```

### Permission denied
Solution: Use `--break-system-packages` or use virtual environment (recommended).

### Package conflicts
UV resolves these automatically. If issues persist:
```bash
uv pip install --force-reinstall package-name
```

---

## Documentation Links

**Official Docs:** https://docs.astral.sh/uv/
**GitHub:** https://github.com/astral-sh/uv
**Guides:** https://docs.astral.sh/uv/guides/
**Reference:** https://docs.astral.sh/uv/reference/

---

## For Our Project

We'll use UV to:
1. Create isolated Python environment (`.venv`)
2. Install required packages:
   - PyAudio (audio recording)
   - requests (API calls for LLMs)
   - Other BrainDumPy dependencies
3. Manage dependencies cleanly
4. Keep everything reproducible

**Next step:** Create virtual environment with `uv venv`
