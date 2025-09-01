# Server API Documentation

## Architecture Overview

The bridge server provides AI-powered chat functionality using AI SDK v5 with Claude Code provider integration. Clean, focused architecture with 4 core components.

## Core Files

### `server/index.js` - Main Server (Express + AI SDK v5)
**Purpose**: HTTP server with streaming AI chat endpoints
**Dependencies**: `claude-provider.js`, `session-store.js`, `delta-extractor.js`

#### Endpoints
```bash
# Health & Status
GET  /health                     → {"status":"healthy","version":"2.0.0","redis":boolean}

# Root Info
GET  /                          → API endpoint documentation

# AI Chat (Primary)
POST /api/chat                  → AI SDK v5 streaming chat with Claude Code
     Body: { messages: Array, chatId?: string }
     Response: Server-sent events stream

# Session Management
GET    /api/chats               → List all chat sessions
POST   /api/chats               → Create new chat session
GET    /api/chats/:id/messages  → Load chat history  
DELETE /api/chats/:id          → Delete chat session
```

#### Key Functions
- **Direct AI SDK v5 integration**: `streamText()` with Claude Code provider
- **Session persistence**: Redis with 24h TTL + conversation history
- **Streaming response**: Server-sent events with real-time AI tokens
- **Error handling**: Vault validation, token limits, connection failures

---

### `server/claude-provider.js` - Claude Code Configuration
**Purpose**: Configure AI SDK provider with vault-specific settings
**Exports**: `createClaudeProvider()`

#### Functions
```javascript
createClaudeProvider() → claudeCode('sonnet', {...})
```
- **Vault validation**: Checks `OBSIDIAN_VAULT_PATH` exists with `.git` or `CLAUDE.md`
- **Working directory**: Sets `cwd` to vault path for file operations
- **Tool permissions**: Configures allowed Claude Code tools
- **Environment**: Reads `CLAUDE_CODE_OAUTH_TOKEN`, `OBSIDIAN_VAULT_PATH`

---

### `server/session-store.js` - Session Persistence
**Purpose**: Redis/memory hybrid storage for chat sessions
**Exports**: `SessionStore` class

#### Methods
```javascript
// Chat CRUD
async createChat(title)                    → {id, title, createdAt, messages}
async getChat(chatId)                      → chat object | null
async updateChat(chatId, updates)          → updated chat
async deleteChat(chatId)                   → boolean
async listChats()                          → Array<chat>

// Message Management  
async addMessage(chatId, message)          → updated chat
async getChatMessages(chatId)              → Array<message>

// Connection
get connected                              → boolean (Redis status)
```

#### Features
- **Redis primary**: Production storage with 24h TTL
- **Memory fallback**: Automatic failover if Redis unavailable
- **Conversation history**: Persistent message threading
- **Session cleanup**: Automatic TTL expiration

---

### `server/delta-extractor.js` - Stream Parsing
**Purpose**: Extract text deltas from AI SDK v5 streaming chunks
**Exports**: `extractDeltaFromChunk()`

#### Functions
```javascript
extractDeltaFromChunk(chunk) → string | null
```
- **JSON parsing**: Extracts `"delta":"..."` from streaming chunks
- **Escape handling**: Properly unescapes `\n`, `\t`, `\"`, `\\`
- **Type filtering**: Only processes `"type":"text-delta"` chunks
- **Robust regex**: Handles escaped quotes within delta content

## Data Flow

### Main Chat Streaming Flow (Primary Path)
```
┌─────────────┐    POST /api/chat     ┌─────────────────┐
│   Client    │ ─────────────────────→ │   index.js      │
│ (Browser)   │                       │ (Express Server)│
└─────────────┘                       └─────────────────┘
       ↑                                       │
       │                               ┌───────┴────────┐
       │                               │  Validate &    │
       │                               │ Load History   │
       │                               └───────┬────────┘
       │                                       │
       │                               ┌───────▼────────┐
       │                               │ createClaudeProvider()
       │                               │ (claude-provider.js)
       │                               └───────┬────────┘
       │                                       │
       │                               ┌───────▼────────┐
       │                               │   streamText() │
       │                               │   AI SDK v5    │
       │                               └───────┬────────┘
       │                                       │
       │                               ┌───────▼────────┐
       │                               │ Claude Code CLI │
       │                               │ (Obsidian Vault)│
       │                               └───────┬────────┘
       │                                       │
       │                          toUIMessageStreamResponse()
       │                                       │
       │    DIRECT STREAM                      ▼
       │ ◄──────────────────────────────────────┘
       │    (Server-Sent Events)              
       │
   ┌───▼────┐
   │ Real-  │
   │ time   │
   │ Chat   │
   │ UI     │
   └────────┘
```

### Parallel Session Persistence (Side Process)
```
       Stream Chunks (copy)
              │
              ▼
    ┌─────────────────┐     Extract Text     ┌─────────────────┐
    │extractDeltaFrom │ ─────────────────→   │ Accumulate      │
    │Chunk()          │                      │ assistantMessage│
    │(delta-extractor)│                      │                 │
    └─────────────────┘                      └─────────┬───────┘
                                                       │
                                              After Stream Complete
                                                       │
                                               ┌───────▼────────┐
                                               │  SessionStore  │
                                               │ .saveChat()    │
                                               │ (Redis/Memory) │
                                               └────────────────┘
```

### Session Management Flow
```
┌─────────────┐    GET /api/chats     ┌─────────────────┐
│   Client    │ ─────────────────────→ │   index.js      │
└─────────────┘                       └─────────┬───────┘
       ↑                                       │
       │                               ┌───────▼────────┐
       │ ◄───────────────────────────── │  SessionStore  │
       │      Chat List/History        │   .listChats() │
       │                               │   .getChat()   │
                                       └────────────────┘
```

## Environment Variables

```bash
# Required
CLAUDE_CODE_OAUTH_TOKEN    # From `claude setup-token`
OBSIDIAN_VAULT_PATH        # Local vault directory path

# Optional
PORT                       # Server port (default: 3000)
REDIS_URL                  # Redis connection (falls back to memory)
```

## Error Handling

- **Vault not mounted**: Clear error message with SSH tunnel instructions
- **Claude auth failure**: Token validation and setup guidance  
- **Redis connection**: Automatic fallback to in-memory storage
- **Stream interruption**: Graceful error responses
- **Invalid JSON**: Request validation with helpful error messages

## Session Architecture

- **Stateless HTTP**: Each request is independent
- **Session persistence**: Chat history maintained via SessionStore
- **Stream isolation**: Individual AI sessions per chat request
- **Memory management**: TTL-based cleanup prevents memory leaks

---

*Generated: September 2025 - Current as of AI SDK v5 architecture*