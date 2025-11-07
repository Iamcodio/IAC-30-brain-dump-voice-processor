# Claude Code - Official Documentation
**Source:** https://docs.claude.com/en/docs/claude-code/overview  
**Downloaded:** 2025-10-25  
**Status:** Current as of October 2025

---

## Get started in 30 seconds

### Prerequisites

- **Node.js 18 or newer** - [Download here](https://nodejs.org/en/download/)
- A **Claude.ai account** (recommended) or [Claude Console](https://console.anthropic.com/) account

### Installation

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Navigate to your project
cd your-awesome-project

# Start coding with Claude
claude

# You'll be prompted to log in on first use
```

That's it! You're ready to start coding with Claude.

**New VS Code Extension (Beta):**  
Prefer a graphical interface? Our new [VS Code extension](/en/docs/claude-code/vs-code) provides an easy-to-use native IDE experience without requiring terminal familiarity. Simply install from the marketplace and start coding with Claude directly in your sidebar.

---

## What Claude Code does for you

### Build features from descriptions

Tell Claude what you want to build in **plain English**. It will make a plan, write the code, and ensure it works.

### Debug and fix issues

Describe a bug or paste an error message. Claude Code will analyze your codebase, identify the problem, and implement a fix.

### Navigate any codebase

Ask anything about your team's codebase, and get a thoughtful answer back. Claude Code maintains awareness of your entire project structure, can find up-to-date information from the web, and with [MCP](/en/docs/claude-code/mcp) can pull from external datasources like Google Drive, Figma, and Slack.

### Automate tedious tasks

Fix fiddly lint issues, resolve merge conflicts, and write release notes. Do all this in a single command from your developer machines, or automatically in CI.

---

## Why developers love Claude Code

### Works in your terminal

Not another chat window. Not another IDE. Claude Code meets you where you already work, with the tools you already love.

### Takes action

Claude Code can directly edit files, run commands, and create commits. Need more? [MCP](/en/docs/claude-code/mcp) lets Claude read your design docs in Google Drive, update your tickets in Jira, or use your custom developer tooling.

### Unix philosophy

Claude Code is **composable and scriptable**.

```bash
tail -f app.log | claude -p "Slack me if you see any anomalies appear in this log stream"
```

works. Your CI can run:

```bash
claude -p "If there are new text strings, translate them into French and raise a PR for @lang-fr-team to review"
```

### Enterprise-ready

Use the Claude API, or host on AWS or GCP. Enterprise-grade [security](/en/docs/claude-code/security), [privacy](/en/docs/claude-code/data-usage), and [compliance](https://trust.anthropic.com/) is built-in.

---

## Next steps

### [Quickstart](/en/docs/claude-code/quickstart)
See Claude Code in action with practical examples

### [Common workflows](/en/docs/claude-code/common-workflows)
Step-by-step guides for common workflows

### [Troubleshooting](/en/docs/claude-code/troubleshooting)
Solutions for common issues with Claude Code

### [IDE setup](/en/docs/claude-code/ide-integrations)
Add Claude Code to your IDE

---

## Additional resources

### [Host on AWS or GCP](/en/docs/claude-code/third-party-integrations)
Configure Claude Code with Amazon Bedrock or Google Vertex AI

### [Settings](/en/docs/claude-code/settings)
Customize Claude Code for your workflow

### [Commands](/en/docs/claude-code/cli-reference)
Learn about CLI commands and controls

### [Reference implementation](https://github.com/anthropics/claude-code/tree/main/.devcontainer)
Clone our development container reference implementation

### [Security](/en/docs/claude-code/security)
Discover Claude Code's safeguards and best practices for safe usage

### [Data usage](/en/docs/claude-code/data-usage)
Understand how Claude Code handles your data

---

## CLAUDE.md - Repository Instructions File

**Location:** Root of your repo (most common)  
**Naming:**
- `CLAUDE.md` - Check into git (recommended for team sharing)
- `CLAUDE.local.md` - Add to .gitignore (personal preferences)

### What to include in CLAUDE.md

Claude Code automatically pulls this file into context when starting a conversation. This makes it an ideal place for documenting:

- Repository etiquette (e.g., branch naming, merge vs. rebase, etc.)
- Developer environment setup (e.g., pyenv use, which compilers work)
- Any unexpected behaviors or warnings particular to the project

### Example CLAUDE.md

```markdown
# Bash commands
- npm run build: Build the project
- npm run typecheck: Run the typechecker

# Code style
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')

# Workflow
- Be sure to typecheck when you're done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance
```

### Adding to CLAUDE.md

You can add content to your CLAUDE.md manually or press the **# key** to give Claude an instruction that it will automatically incorporate into the relevant CLAUDE.md.

Many engineers use # frequently to document commands, files, and style guidelines while coding, then include CLAUDE.md changes in commits so team members benefit as well.

At Anthropic, we occasionally run CLAUDE.md files through the prompt improver and often tune instructions (e.g. adding emphasis with "IMPORTANT" or "YOU MUST") to improve adherence.

---

## Permissions and Allowlist

By default, Claude Code requests permission for any action that might modify your system:

- File writes
- Most bash commands
- MCP tools

We designed Claude Code with this deliberately **conservative approach to prioritize safety**.

### Customizing Permissions

You can customize the allowlist to:

- Permit additional tools that you know are safe
- Allow potentially unsafe tools that are easy to undo (e.g., file editing, git commit)

**Safe Commands (Auto-allowed):**
- `echo`
- `cat`
- Other read-only commands

---

## Recommended Workflows

### 1. Research → Plan → Implement → Commit

**Best for:** Changes that require deep thinking upfront

1. **Ask Claude to research the issue**
   - Gather relevant context
   - Identify root causes
   - Explore potential solutions

2. **Have Claude create a plan**
   - If results seem reasonable, create a document or GitHub issue
   - This gives you a reset point if implementation doesn't work out

3. **Ask Claude to implement its solution**
   - Verify reasonableness as it implements
   - Explicitly ask for verification at key steps

4. **Commit and create PR**
   - Have Claude update READMEs or changelogs
   - Explain what it just did

**Why this works:**  
Steps #1-#2 are crucial—without them, Claude tends to jump straight to coding. While sometimes that's what you want, asking Claude to research and plan first significantly improves performance for problems requiring deeper thinking upfront.

### 2. Test-Driven Development Workflow

**Best for:** Changes easily verifiable with tests

An Anthropic-favorite workflow for test-driven development:

1. Write or identify failing tests
2. Have Claude make them pass
3. Verify the fix works
4. Commit the changes

**Why this works:**  
Tests provide clear success criteria and catch regressions.

---

## Sandboxing and Security

### New Sandbox Runtime (Beta)

Claude Code introduces a new sandbox runtime that lets you define exactly which directories and network hosts your agent can access, without the overhead of spinning up and managing a container.

### How Sandboxing Works

Claude Code uses OS-level primitives to enforce restrictions:

- **Linux:** bubblewrap
- **macOS:** seatbelt

These cover not just Claude Code's direct interactions, but also any scripts, programs, or subprocesses spawned by commands.

### Sandbox Boundaries

#### 1. Filesystem Isolation

- **Allows:** Read and write access to the current working directory
- **Blocks:** Modification of any files outside of it

#### 2. Network Isolation

- **Allows:** Internet access through a unix domain socket
- **Connected to:** Proxy server running outside the sandbox
- **Controls:** Which domains can be accessed

### Benefits of Sandboxing

- **Reduced permission prompts** - In internal usage, sandboxing safely reduces permission prompts by **84%**
- **Increased safety** - Pre-defined boundaries prevent prompt injection attacks
- **More autonomy** - Claude can work more freely within safe boundaries

**Important:**  
Effective sandboxing requires **both** filesystem and network isolation:
- Without network isolation: A compromised agent could exfiltrate sensitive files like SSH keys
- Without filesystem isolation: A compromised agent could escape the sandbox and gain network access

---

## Model Context Protocol (MCP)

MCP lets Claude Code connect to external data sources and tools:

- **Google Drive** - Read design docs, specifications
- **Figma** - Access design files
- **Slack** - Search messages, post updates
- **Jira** - Update tickets, create issues
- **Custom tools** - Build your own MCP servers

Learn more at [MCP documentation](/en/docs/claude-code/mcp).

---

## Web Interface (New - October 2025)

Claude Code is now available in a **web interface** at [claude.com/code](https://claude.com/code).

### Features

- Connect GitHub repositories
- Delegate multiple coding tasks
- Run tasks in parallel
- Real-time progress tracking
- Interactive feedback
- Automatic PR creation

### Availability

- **Pro plan:** $20/month
- **Max plan:** $100-$200/month

### How it works

1. Navigate to [claude.com/code](https://claude.com/code)
2. Connect your GitHub repositories
3. Describe what you need
4. Claude handles the implementation
5. Review and merge PRs

**Also available on iOS app** - Early preview for mobile coding

---

## CLI Reference

### Basic Commands

```bash
# Start Claude Code session
claude

# Run with specific prompt
claude -p "your instruction here"

# Pipe input to Claude
tail -f app.log | claude -p "analyze this log stream"
```

### Special Keys

- **#** - Add instruction to CLAUDE.md
- **/bug** - Report bug directly within Claude Code
- **/help** - Show available commands

---

## Key Takeaways

**What makes Claude Code special:**
- **Terminal-native** - Works where you already work
- **Takes action** - Edits files, runs commands, creates commits
- **Composable** - Unix philosophy, pipeable, scriptable
- **Secure** - Sandboxed execution, permission-based
- **Context-aware** - Understands your entire codebase
- **MCP-enabled** - Connects to external tools and data

**Best practices:**
- Use CLAUDE.md for team conventions
- Research → Plan → Implement workflow for complex changes
- Test-driven development for verifiable changes
- Customize allowlist for your workflow
- Enable sandboxing for safety and fewer prompts

**Security:**
- Filesystem isolation (current directory only)
- Network isolation (proxy-controlled)
- Permission-based by default
- Sandboxing reduces prompts by 84%

**Get started:**
```bash
npm install -g @anthropic-ai/claude-code
cd your-project
claude
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-25  
**Source:** Anthropic Official Documentation  
**GitHub:** https://github.com/anthropics/claude-code
