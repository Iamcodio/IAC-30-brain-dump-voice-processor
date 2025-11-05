# Phase D: Private/Public LLM Pipeline Architecture

**Version:** v1.1  
**Date:** 2025-10-26 03:00 GMT  
**Status:** ARCHITECTURE DESIGN  

---

## Core Concept: Separation of Concerns

**User classifies recordings as:**
- **PRIVATE** → Stays local, never leaves machine
- **PUBLIC** → Can use cloud providers

**This is data sovereignty. Privacy-first by default.**

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      BRAINDUMP APP                          │
│                  (Voice → Transcript)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │  User Decision  │
                  │  Gate: Private  │
                  │   or Public?    │
                  └────┬────────┬───┘
                       │        │
              PRIVATE  │        │  PUBLIC
                       │        │
           ┌───────────▼─┐    ┌▼────────────┐
           │             │    │             │
           │   LOCAL     │    │   CLOUD     │
           │  PIPELINE   │    │  PIPELINE   │
           │             │    │             │
           │ (Ollama)    │    │ (OpenRouter │
           │             │    │  Claude     │
           │             │    │  OpenAI)    │
           └─────────────┘    └─────────────┘
                  │                   │
                  │                   │
           ┌──────▼──────┐     ┌─────▼──────┐
           │   SQLite    │     │  Export    │
           │   (local)   │     │  (MD/JSON) │
           └─────────────┘     └────────────┘
                                      │
                              ┌───────▼────────┐
                              │  Cloud Storage │
                              │  (optional)    │
                              └────────────────┘
```

---

## Decision Gate Logic

### At Recording Time
**User interface:**
```
┌────────────────────────────────────┐
│  New Recording                     │
├────────────────────────────────────┤
│  Transcript: "Today I met with..." │
│                                    │
│  Classification:                   │
│  ○ Private (local only)            │
│  ○ Public (can use cloud)          │
│                                    │
│  [Save]                            │
└────────────────────────────────────┘
```

**Database schema:**
```sql
ALTER TABLE recordings 
ADD COLUMN classification TEXT DEFAULT 'private';
-- Values: 'private' | 'public'
```

---

### At Processing Time
**When user clicks "Summarize" or uses AI features:**

```typescript
async function processWithAI(recording: Recording, prompt: string) {
  if (recording.classification === 'private') {
    // Route to LOCAL pipeline only
    return await localPipeline.process(recording, prompt);
  } else {
    // Route to CLOUD pipeline (user choice)
    return await cloudPipeline.process(recording, prompt);
  }
}
```

---

## Pipeline Details

### LOCAL Pipeline (PRIVATE data)

**Stack:**
- Ollama (already in `/Users/kjd/brain-dump-pipeline/`)
- No network calls
- All data stays on disk

**Process:**
1. Recording marked as PRIVATE
2. User clicks "Summarize"
3. Transcript sent to Ollama on localhost:11434
4. Response stored in local SQLite
5. Never exported, never uploaded

**Models available:**
- llama3
- mistral
- codellama
- Any model user pulls locally

**Pros:**
- 100% private
- Free (local compute)
- Fast (no network latency)

**Cons:**
- Limited to local GPU/CPU
- Smaller models (compared to GPT-4, Claude Opus)

---

### CLOUD Pipeline (PUBLIC data)

**Stack:**
- OpenRouter API (400+ models)
- Claude API (direct)
- OpenAI API (direct)

**Process:**
1. Recording marked as PUBLIC
2. User clicks "Summarize"
3. Transcript sent to cloud provider
4. Response stored locally
5. **Optional:** Export to Markdown/JSON
6. **Optional:** Upload to cloud storage

**Models available:**
- GPT-4o, GPT-4-turbo (OpenAI)
- Claude Sonnet 4.5, Opus 4 (Anthropic)
- Gemini 2.0 (Google via OpenRouter)
- 400+ models via OpenRouter

**Pros:**
- State-of-art models
- Large context windows
- Multimodal (images, etc.)

**Cons:**
- Costs money
- Data leaves machine
- Network latency

---

## User Journey Examples

### Journey 1: Private Therapy Session
```
1. Record: "Today I talked about my anxiety..."
2. Mark: PRIVATE
3. Click: "Summarize"
4. System: Routes to Ollama (local)
5. Result: Summary stays in local DB
6. Export: Disabled (cannot export private data)
```

### Journey 2: Public Work Meeting
```
1. Record: "Team standup - discussed project timeline..."
2. Mark: PUBLIC
3. Click: "Extract Action Items"
4. System: Routes to OpenRouter (Claude Sonnet)
5. Result: Action items extracted
6. Export: User exports to Markdown
7. Share: Uploads to Slack/Notion
```

### Journey 3: Mixed Content
```
1. Record personal journal (PRIVATE)
2. Record work notes (PUBLIC)
3. End of day summary:
   - Private recordings: Summarized locally
   - Public recordings: Summarized in cloud
4. Results: Two separate summaries
```

---

## Technical Implementation

### Decision Gate (UI)

**In recording view:**
```typescript
<div class="classification">
  <label>
    <input type="radio" name="class" value="private" checked>
    Private (local only)
  </label>
  <label>
    <input type="radio" name="class" value="public">
    Public (can use cloud)
  </label>
</div>
```

**Visual indicator:**
- PRIVATE: 🔒 Lock icon (gray)
- PUBLIC: 🌐 Globe icon (blue)

---

### Pipeline Router

```typescript
class LLMRouter {
  async process(recording: Recording, prompt: string): Promise<string> {
    // Decision gate
    if (recording.classification === 'private') {
      return this.localPipeline.send(prompt, recording.transcript);
    } else {
      // User chooses provider in settings
      const provider = config.get('ai.defaultProvider');
      return this.cloudPipeline.send(prompt, recording.transcript, provider);
    }
  }
}
```

---

### Local Pipeline (Ollama Integration)

**File: `llm-router/providers/local.py`**

```python
import httpx

class LocalPipeline:
    def __init__(self):
        self.base_url = "http://localhost:11434"
    
    async def send(self, prompt: str, context: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": "llama3",
                    "prompt": f"{context}\n\n{prompt}",
                    "stream": False
                }
            )
            return response.json()["response"]
```

---

### Cloud Pipeline (OpenRouter/Claude/OpenAI)

**File: `llm-router/providers/cloud.py`**

```python
from litellm import completion

class CloudPipeline:
    async def send(self, prompt: str, context: str, provider: str) -> str:
        # LiteLLM handles all providers
        response = await completion(
            model=provider,  # e.g., "anthropic/claude-sonnet-4"
            messages=[
                {"role": "user", "content": f"{context}\n\n{prompt}"}
            ]
        )
        return response.choices[0].message.content
```

---

## Privacy Guarantees

### PRIVATE recordings:
- ✅ Never sent over network
- ✅ Processed locally only
- ✅ Cannot be exported to cloud formats
- ✅ Cannot be shared
- ✅ Deleted when user deletes recording

### PUBLIC recordings:
- ⚠️  User explicitly marked as shareable
- ⚠️  Can use cloud providers
- ⚠️  Can be exported (Markdown, JSON)
- ⚠️  User controls which provider
- ✅ Still deletable anytime

---

## Settings Panel

**New section: "AI Assistant"**

```
┌─────────────────────────────────────┐
│ AI Assistant Settings               │
├─────────────────────────────────────┤
│                                     │
│ Local Model (Ollama)                │
│   Status: ✅ Running                │
│   Model: llama3                     │
│   [Test Connection]                 │
│                                     │
│ Cloud Providers (PUBLIC only)       │
│   Default: OpenRouter               │
│   ☐ OpenRouter [Configure]          │
│   ☐ Claude Direct [Configure]       │
│   ☐ OpenAI Direct [Configure]       │
│                                     │
│ Privacy                             │
│   Default classification: Private   │
│   ☑ Warn before sending to cloud    │
│   ☑ Show lock icon for private      │
│                                     │
└─────────────────────────────────────┘
```

---

## Export Rules

### PRIVATE Recordings
- ❌ Cannot export to Markdown
- ❌ Cannot export to JSON API
- ❌ Cannot share link
- ✅ Can copy text locally

### PUBLIC Recordings
- ✅ Export to Markdown
- ✅ Export to JSON
- ✅ Generate shareable link (if server exists)
- ✅ Upload to cloud storage

---

## Database Schema

```sql
CREATE TABLE recordings (
  id TEXT PRIMARY KEY,
  transcript TEXT,
  classification TEXT DEFAULT 'private',  -- 'private' | 'public'
  ai_summary TEXT,                        -- Generated summary
  ai_provider TEXT,                       -- 'ollama' | 'openrouter' | 'claude' | 'openai'
  exported BOOLEAN DEFAULT 0,             -- Has it been exported?
  exported_at TEXT,                       -- When exported?
  created_at TEXT,
  updated_at TEXT
);

-- Index for filtering
CREATE INDEX idx_classification ON recordings(classification);
```

---

## Cost Implications

### PRIVATE (Local)
- Cost: $0 (free)
- Compute: Local CPU/GPU
- Speed: Fast (no network)

### PUBLIC (Cloud)
**Per 1000 tokens:**
- OpenRouter: $0.001 - $0.01 (model-dependent)
- Claude Direct: $0.003
- OpenAI Direct: $0.01

**Estimate:**
- Average transcript: 500 words = ~650 tokens
- Cost per summary: $0.001 - $0.01
- 100 summaries/month: $0.10 - $1.00

**Affordable for power users.**

---

## Migration from Existing Ollama Pipeline

**Current location:** `/Users/kjd/brain-dump-pipeline/`

**Plan:**
1. Keep existing Ollama setup
2. llm-router calls existing Ollama endpoint
3. No changes to Ollama config
4. Just add cloud providers alongside

**No breaking changes.**

---

## Security Checklist

- ✅ PRIVATE recordings never leave localhost
- ✅ API keys stored in macOS Keychain
- ✅ User explicitly marks PUBLIC recordings
- ✅ Warning dialog before first cloud upload
- ✅ Audit log of all cloud requests
- ✅ User can delete cloud data anytime

---

## UI Mockup: Decision Gate

**Recording list view:**

```
┌────────────────────────────────────────────────────┐
│ Recording History                                  │
├────────────────────────────────────────────────────┤
│                                                    │
│ 🔒 PRIVATE - Today at 2:30pm                      │
│    "Personal thoughts about therapy session..."    │
│    [Play] [Summarize (Local)]                     │
│                                                    │
│ 🌐 PUBLIC - Today at 1:15pm                       │
│    "Team standup - discussed project delays..."    │
│    [Play] [Summarize] [Export] [Share]            │
│                                                    │
│ 🔒 PRIVATE - Yesterday at 6:00pm                  │
│    "Evening journal entry..."                      │
│    [Play] [Summarize (Local)]                     │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Update Phase D.1:** Add decision gate logic
2. **Update database schema:** Add `classification` column
3. **Build UI:** Radio buttons for Private/Public
4. **Implement router:** Route based on classification
5. **Test locally:** Verify Ollama integration
6. **Add cloud providers:** OpenRouter, Claude, OpenAI

---

**Status:** ARCHITECTURE APPROVED  
**Next:** Build Phase D.1 with decision gates  
**Owner:** Product Development Manager
