# Phase D: Universal LLM Module - Research & Architecture

**Version:** v1.0  
**Date:** 2025-10-26 02:30 IST  
**Status:** RESEARCH COMPLETE  

---

## Executive Summary

**Goal:** Build a standalone, reusable LLM router module that supports:
- Local models (Ollama)
- OpenRouter (400+ models)
- Claude API (direct)
- OpenAI API (direct)
- Hugging Face Spaces

**Design Philosophy:** Separate module, not coupled to BrainDump. Reusable across projects.

---

## Key Finding: LiteLLM Already Exists

**LiteLLM** (github.com/BerriAI/litellm)
- Python SDK supporting 100+ LLM providers
- OpenAI-compatible format
- Supports: OpenRouter, Claude, OpenAI, Bedrock, Vertex AI, Groq, Cohere, HuggingFace
- 12k+ stars, actively maintained

**JavaScript equivalent:** litellmjs (github.com/zya/litellmjs)
- TypeScript implementation
- Same unified interface

**Decision:** Don't reinvent the wheel. Build a thin wrapper around existing tools.

---

## Recommended Architecture

### Option A: Python Module (Recommended)
**Stack:**
- FastAPI backend (separate from Electron)
- LiteLLM for unified API
- Local server on localhost:8000

**Pros:**
- LiteLLM handles all provider complexity
- FastAPI = production-ready, fast
- Python = native Ollama integration
- Separate process = isolation

**Cons:**
- Extra dependency (Python server)
- IPC between Electron and Python

---

### Option B: TypeScript Module
**Stack:**
- Native TypeScript module
- Direct SDK integration per provider
- No separate server

**Pros:**
- Single language (TypeScript)
- No extra processes
- Simpler deployment

**Cons:**
- Manual integration for each provider
- More maintenance
- No LiteLLM benefit

---

## Providers to Support

### Tier 1 (Must Have)
**Ollama** (Local)
- API: http://localhost:11434
- No API key needed
- Models: llama3, mistral, codellama, etc.

**OpenRouter** (Cloud)
- API: https://openrouter.ai/api/v1
- Format: OpenAI-compatible
- 400+ models
- Pricing: Pay-per-use

**Claude Direct** (Cloud)
- API: https://api.anthropic.com/v1
- SDK: @anthropic-ai/sdk
- Models: claude-sonnet-4-5, claude-opus-4

---

### Tier 2 (Nice to Have)
**OpenAI Direct** (Cloud)
- API: https://api.openai.com/v1
- SDK: openai
- Models: gpt-4o, gpt-4-turbo

**Hugging Face Spaces** (Cloud/Self-Hosted)
- API: varies by space
- Free tier available
- Open source models

---

## Phase D Module Specification

### Module Name: `llm-router`

### API Design

```typescript
interface LLMRouter {
  // Initialize with provider configs
  init(config: RouterConfig): Promise<void>;
  
  // Send prompt to selected provider
  send(options: SendOptions): Promise<LLMResponse>;
  
  // Stream response
  stream(options: SendOptions): AsyncGenerator<string>;
  
  // List available models
  listModels(provider: Provider): Promise<Model[]>;
  
  // Get provider status
  getStatus(): ProviderStatus;
}
```

### Config Structure

```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434",
      "defaultModel": "llama3"
    },
    "openrouter": {
      "enabled": true,
      "apiKey": "sk-or-...",
      "defaultModel": "anthropic/claude-sonnet-4"
    },
    "claude": {
      "enabled": false,
      "apiKey": "sk-ant-...",
      "defaultModel": "claude-sonnet-4-5-20250929"
    },
    "openai": {
      "enabled": false,
      "apiKey": "sk-...",
      "defaultModel": "gpt-4o"
    }
  }
}
```

---

## Implementation Plan

### Phase D.1: Foundation (FastAPI + Ollama)
**Scope:**
- FastAPI server on localhost:8000
- Ollama integration only
- Basic `/send` endpoint
- Health check endpoint

**Deliverables:**
- `llm-router/server.py`
- `llm-router/providers/ollama.py`
- `llm-router/config.json`

**Test:**
```bash
curl http://localhost:8000/send \
  -d '{"provider": "ollama", "model": "llama3", "prompt": "Hello"}'
```

---

### Phase D.2: OpenRouter Integration
**Scope:**
- Add OpenRouter provider
- API key management
- Model selection UI

**Deliverables:**
- `llm-router/providers/openrouter.py`
- Settings panel in BrainDump

---

### Phase D.3: Claude + OpenAI
**Scope:**
- Direct Claude API
- Direct OpenAI API
- Provider switching

**Deliverables:**
- `llm-router/providers/claude.py`
- `llm-router/providers/openai.py`

---

### Phase D.4: RAG + Prompt Templates
**Scope:**
- Vector search over transcripts
- Prompt template library
- "End of day summary" button

**Deliverables:**
- `llm-router/rag/vectorstore.py`
- `llm-router/templates/prompts.json`
- UI buttons for common prompts

---

## Technical Decisions

### Why FastAPI?
- Python's best async web framework
- Auto-generated OpenAPI docs
- Native async/await
- 60k+ stars, production-ready

### Why Separate Module?
- **Reusability:** Use in other projects
- **Isolation:** LLM crashes don't kill BrainDump
- **Testability:** Unit test independently
- **Scalability:** Can run on separate machine later

### Communication: HTTP REST
**Electron → FastAPI:**
```typescript
const response = await fetch('http://localhost:8000/send', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'ollama',
    model: 'llama3',
    prompt: 'Summarize my day',
    context: transcripts
  })
});
```

---

## File Structure

```
llm-router/
├── server.py              # FastAPI app
├── config.json            # Provider configs
├── requirements.txt       # Python deps
├── providers/
│   ├── base.py           # Abstract provider
│   ├── ollama.py         # Ollama integration
│   ├── openrouter.py     # OpenRouter integration
│   ├── claude.py         # Claude direct API
│   └── openai.py         # OpenAI direct API
├── rag/
│   ├── vectorstore.py    # Embedding + search
│   └── embeddings.py     # Generate embeddings
├── templates/
│   └── prompts.json      # Prompt library
└── tests/
    ├── test_ollama.py
    ├── test_openrouter.py
    └── test_rag.py
```

---

## Dependencies

### Python
```
fastapi==0.115.0
uvicorn==0.32.0
httpx==0.28.0
ollama==0.4.0
anthropic==0.40.0
openai==1.54.0
sentence-transformers==3.3.0  # For RAG
chromadb==0.5.0               # Vector DB
```

### TypeScript (BrainDump side)
```
// No new deps - just HTTP fetch
```

---

## UI Integration Points

### Settings Panel
**New tab: "AI Assistant"**
- Provider selection dropdown
- API key inputs (secured)
- Model selection per provider
- "Test Connection" button

### History View
**New buttons:**
- "Summarize" → sends transcript to LLM
- "Classify" → 4D Value Vortex classification
- "Extract Actions" → todo list generation

### Prompt Templates
**Dropdown menu:**
- End of day summary
- Weekly report
- Action items extraction
- Meeting notes formatting
- Custom prompts (user-defined)

---

## Cost Considerations

**Ollama:** Free (local compute)
**OpenRouter:** ~$0.001 - $0.01 per request (model-dependent)
**Claude Direct:** ~$0.003 per 1k tokens
**OpenAI Direct:** ~$0.01 per 1k tokens

**Recommendation:** Default to Ollama, offer OpenRouter for advanced users.

---

## Security

### API Keys
- Stored in system keychain (macOS Keychain)
- Never in config files or git
- Encrypted at rest

### Local Server
- Bind to localhost only (no external access)
- No authentication (localhost trusted)
- CORS disabled

---

## Performance Targets

**Ollama (local):**
- Response time: 1-5 seconds (model-dependent)
- Streaming: 20-50 tokens/sec

**OpenRouter (cloud):**
- Response time: 2-10 seconds
- Streaming: varies by provider

---

## Testing Strategy

### Unit Tests
```python
def test_ollama_provider():
    provider = OllamaProvider()
    response = await provider.send("Hello", model="llama3")
    assert response.text
    assert response.model == "llama3"
```

### Integration Tests
```python
def test_server_endpoint():
    response = client.post("/send", json={
        "provider": "ollama",
        "prompt": "Test"
    })
    assert response.status_code == 200
```

### E2E Tests
- User clicks "Summarize" in history view
- Request sent to llm-router
- Response displayed in modal
- All within 10 seconds

---

## Migration Path

**Phase C → Phase D:**
1. Build llm-router standalone
2. Test independently
3. Add UI integration points to BrainDump
4. Ship Phase D as "AI Assistant" feature

**No breaking changes to Phase C features.**

---

## Open Questions

1. **RAG embeddings:** Use OpenAI embeddings or local Sentence Transformers?
   - **Recommendation:** Local (sentence-transformers) for privacy
   
2. **Vector DB:** ChromaDB vs in-memory?
   - **Recommendation:** ChromaDB (persistent, queryable)

3. **Prompt template format:** JSON vs YAML?
   - **Recommendation:** JSON (native JavaScript support)

---

## Next Steps

1. **Approve architecture** (this document)
2. **Create Phase D.1 technical plan** (FastAPI + Ollama)
3. **Build prototype** (2-3 days)
4. **Test with real transcripts**
5. **Iterate based on feedback**

---

**Status:** READY FOR REVIEW  
**Owner:** Product Development Manager  
**Next:** Get approval, start Phase D.1
