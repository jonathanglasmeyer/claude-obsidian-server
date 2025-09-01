# CLAUDE.md - Mobile Obsidian Vault Integration

## Project Overview
Mobile React Native app that acts as a share target to intelligently process content into an Obsidian vault using Claude Code (Max plan, no API key required). The app receives shared URLs/text, sends them to a bridge server that runs Claude Code CLI sessions, proposes vault organization, and executes git operations upon user confirmation.

**Status: Phase 3.9 Core Complete** - Web prototype with flexible development modes and production-ready chat interface.

## Architecture

**Components:**
- **Web Prototype (Next.js 14)** - Direct AI SDK v5 chat interface ✅ *(Phase 3.5)*
- **Mobile App (RN)** - Share target with streaming UI *(Phase 4)*
- **Bridge Server (Node.js)** - AI SDK integration with Claude Code provider ✅
- **Session Store (Redis)** - Temporary session state ✅  
- **Obsidian Vault (Git)** - Target repository with existing CLAUDE.md rules ✅

**Flows:**
1. **Web Flow**: Browser → `useChat()` → `/api/ai-chat` → `streamText()` → Claude Code CLI ✅
2. **Mobile Flow**: Share URL/text → RN app → Session API → Bridge server *(Phase 4)*
3. Server uses AI SDK with Claude Code provider (vault context)
4. Claude proposes file location/format via streaming
5. User confirms/modifies → Claude executes + commits to git

## Bridge Server

### Environment
- `CLAUDE_CODE_OAUTH_TOKEN` - From `claude setup-token`
- `OBSIDIAN_VAULT_PATH` - Local vault path
- `REDIS_URL` - Session storage

### Key Endpoints
- `POST /api/session` - Create Claude session with content
- `GET /api/session/:id/stream` - SSE stream of Claude responses
- `POST /api/session/:id/confirm` - Execute Claude's proposal

### Claude CLI Integration
Server spawns Claude Code CLI with:
- Working directory: `OBSIDIAN_VAULT_PATH`
- Context: Vault's `CLAUDE.md` with routing rules
- Model: Sonnet for implementation
- Stream parsing for proposals + real-time tokens

## React Native App

### Structure
- **Share Extension** - iOS/Android share target
- **StreamingText** - Live Claude response display
- **ProposalView** - File preview with confirm/modify actions
- **API Client** - SSE connection to bridge server

### Platform Integration
- Android Intent Filter for SEND actions (Pixel 9 target)
- Vercel AI SDK for streaming responses

## Vault Integration

Claude Code CLI will use the target vault's existing CLAUDE.md rules to determine content routing, file creation, and git operations. The bridge server simply passes shared content to Claude with vault context - all processing logic stays in the vault's command system.

## Technical Notes

### Authentication
- OAuth token stays server-side only
- No API keys in mobile app
- Claude Max plan usage tracking

### Session Management
- 5-minute session timeouts
- Redis for temporary state
- Session isolation and cleanup

### Error Handling
- CLI process failures → retry with backoff
- Network issues → offline queuing
- Proposal rejections → manual path selection

---

# DevOps & Technical Implementation

## Infrastructure
- **Production:** Hetzner VPS + Docker Compose (Node.js + Redis)
- **Development:** Local with SSH tunnel to production
- **Security:** Isolated `claude` user, SSH keys, container isolation

## AI SDK Integration (Phase 3 ✅)
- **Package:** `ai-sdk-provider-claude-code` + `ai` SDK ✅
- **Key Pattern:** `claudeCode('sonnet', {allowedTools: [...], cwd: path})` ✅
- **Architecture:** Redis + In-memory hybrid (persistent sessions + live streams) ✅
- **Streaming:** Server-Sent Events with token-by-token real-time updates ✅
- **Lazy Initialization:** Prevents Docker startup crashes, initializes on first API call ✅
- **Vault Integration:** Claude Code operates directly in `/srv/claude-jobs/obsidian-vault` ✅
- **SSH Tunnel Access:** `localhost:3001` → Hetzner production server ✅

## Development Modes ✅ *(Phase 3.9)*

**Smart Development System with Auto-Detection:**

### 🚇 Tunnel Mode (Production Vault)
```bash
# Start SSH tunnel + web prototype
ssh -L 3001:localhost:3001 hetzner -N &
cd web-prototype && pnpm run dev:tunnel
# ✅ SSH tunnel active → Next.js starts automatically
```

### 🏠 Local Mode (Local Vault) 
```bash
# Start local server + web prototype
cd server && OBSIDIAN_VAULT_PATH=/path/to/vault npm start &
cd web-prototype && pnpm run dev:local  
# ✅ Local server detected → Next.js starts automatically
```

**Health Check System:**
- Commands automatically detect if required server is running
- Show helpful instructions if prerequisites missing
- Single port (3001) for both modes - no configuration complexity

## Deployment
```bash
# Development (choose mode)
pnpm run dev:tunnel            # SSH tunnel to production
pnpm run dev:local             # Local development

# Production (automated)
./deploy.sh                    # Full deployment script

# Production (manual)  
rsync -avz . hetzner:~/obsidian-bridge-server/
ssh hetzner "cd ~/obsidian-bridge-server && docker compose up -d --build"
```

## SSH Tunnel Validation Workflow

### Current Testing Pattern

**Setup SSH Tunnel:**
```bash
ssh -L 3001:localhost:3001 hetzner -N
```
*Forwards local port 3001 to Hetzner server port 3001*

**Health Check:**
```bash
curl -s http://localhost:3001/health
# Expected: {"status":"healthy","timestamp":"...","version":"1.0.0","redis":true}
```

**Test Session Creation:**
```bash
curl -X POST http://localhost:3001/api/session \
  -H "Content-Type: application/json" \
  -d '{"content": "Test content for vault organization", "type": "text"}' \
  -s | jq -r '.sessionId'
```

**Stream AI Processing:**
```bash
curl -N http://localhost:3001/api/session/[SESSION_ID]/stream
```

**Expected Streaming Output:**
```
data: {"type":"connected","sessionId":"...","timestamp":"..."}
data: {"type":"chunk","content":"I'll analyze this content...","timestamp":"..."}
data: {"type":"chunk","content":"Based on your vault structure...","timestamp":"..."}
data: {"type":"completed","timestamp":"..."}
```

### Validation Results

**Lazy Initialization Logs:**
```
🔧 Initializing AI Service at runtime...
🏛️ Configuring Claude provider with vault path: /srv/claude-jobs/obsidian-vault
📁 Vault mounted: true, using working directory: /srv/claude-jobs/obsidian-vault
```

**Vault Integration Confirmed:**
- Claude reads actual CLAUDE.md rules (8KB)
- Recognizes vault categories (Literature, AI & Tools, Articles, etc.)
- Follows vault content organization principles
- Proposes appropriate file locations and formats

### Key Observations

**Performance:** ~3-5 second response time for content analysis
**Streaming:** Real-time token-by-token delivery via SSE
**Intelligence:** Claude applies your vault's organizational rules and suggests appropriate categorization
**Safety:** Claude requests confirmation before file operations (follows CLAUDE.md principles)

### Troubleshooting

**SSH Tunnel Issues:**
```bash
# Check if tunnel is active
lsof -i :3001

# Kill existing tunnel 
pkill -f "ssh.*3001:localhost:3001"

# Restart tunnel with verbose output
ssh -v -L 3001:localhost:3001 hetzner -N
```

**Server Status Check:**
```bash
# Check server health on Hetzner
ssh hetzner 'cd ~/obsidian-bridge-server && docker compose ps'
ssh hetzner 'cd ~/obsidian-bridge-server && docker compose logs server --tail=10'
```

**Common Issues:**
- `curl: (7) Failed to connect` → SSH tunnel not active
- `{"status":"unhealthy"}` → Redis connection issues  
- Stream timeouts → Check vault permissions or lazy initialization logs

## Phase Progress

### Phase 3: Bridge Server with AI SDK ✅
- ✅ AI SDK streaming operational (localhost:3001) 
- ✅ Multi-turn conversations + session management
- ✅ Production deployment active on Hetzner
- ✅ Vault mounting and permissions resolved
- ✅ Claude Code reads actual CLAUDE.md rules and vault structure
- ✅ Real-time streaming validated via SSH tunnel
- ✅ Vault intelligence confirmed (categories, rules, organization)

### Phase 3.5: Web Prototype ✅ *(New Phase)*
- ✅ **Direct AI SDK v5 Integration** - Zero translation layers
- ✅ **Frontend**: Next.js 14 + React 18 + AI SDK v5 `useChat()`
- ✅ **Backend**: Added `/api/ai-chat` endpoint with `streamText()`
- ✅ **Architecture**: Perfect format alignment (both ends use AI SDK v5)
- ✅ **UI**: Clean chat interface with real-time streaming
- ✅ **Deployment**: Web prototype running on `localhost:3002`
- ✅ **Integration Test**: Frontend→Backend pipeline verified

### Phase 3.5 Technical Achievements
**Problem Solved**: Originally planned complex translation between session-based SSE and AI SDK formats
**Solution**: Direct AI SDK v5 pipeline - `useChat()` → `/api/ai-chat` → `streamText()` → Claude Code CLI
**Benefit**: No format conversion overhead, native streaming, cleaner architecture

### Phase 4: Android App *(Next)*
- 🎯 React Native implementation
- 🎯 Share target functionality  
- 🎯 Mobile-optimized proposal UI
- 🎯 Can use either API approach:
  - Direct AI SDK v5 (like web prototype)
  - Session-based API (for offline/reconnect scenarios)

## API Architecture & Endpoints

**Bridge Server:** `http://localhost:3001` (via SSH tunnel)  
**Web Prototype:** `http://localhost:3002` ✅

### AI SDK v5 Integration Pattern

The bridge server uses `ai-sdk-provider-claude-code` internally with `streamText()`. The frontend uses AI SDK v5 `useChat()` hook. **Key insight: Both ends use AI SDK v5, so formats match perfectly - no translation needed.**

### Current API Endpoints (Bridge Server)

#### 1. Session-Based API (Mobile/Complex Workflows)
```
GET  /health                     → Health check + Redis status
POST /api/session               → Create session with content
GET  /api/session/:id           → Get session details  
GET  /api/session/:id/stream    → SSE stream (custom format)
POST /api/session/:id/message   → Continue conversation
POST /api/session/:id/confirm   → Execute proposals
```

**Use Case:** Mobile apps, async processing, session resume after connection drops

#### 2. Direct AI SDK v5 API ✅ *(New)*
```
POST /api/ai-chat               → Direct AI SDK v5 streaming
```

**Use Case:** Web chat interfaces, real-time streaming, native AI SDK integration

**AI SDK v5 Format:**
```json
// INPUT: useChat format
{
  "messages": [
    {"role": "user", "content": [{"type": "text", "text": "Organize this content..."}]}
  ]
}

// OUTPUT: streamText().toDataStreamResponse() 
// Native AI SDK v5 streaming - no translation needed!
```

### Web Prototype Integration ✅

#### Frontend (Next.js 14)
```
useChat() → POST /api/chat → Bridge server /api/ai-chat → streamText()
```

**Status:** ✅ **Working** - Direct AI SDK v5 pipeline operational
**URL:** `http://localhost:3002`
**Features:** Real-time streaming, chat interface, proposal handling

### Recommended API Architecture

```
┌─────────────────┐    AI SDK v5     ┌──────────────────┐    AI SDK v5    ┌─────────────────┐
│   Frontend      │ ────useChat────→ │  Bridge Server   │ ──streamText──→ │  Claude Code    │
│   useChat()     │                  │  /api/ai-chat    │                 │     CLI         │
│   localhost:3002│ ←──streaming───  │  localhost:3001  │ ←──streaming──  │                 │
└─────────────────┘    format        └──────────────────┘    format       └─────────────────┘
```

**Benefits:**
- ✅ No format translation needed
- ✅ Native AI SDK v5 streaming
- ✅ Direct `useChat` → `streamText` pipeline
- ✅ Built-in data parts support for proposals
- ✅ Maintains existing session system for mobile

### Two API Approaches Compared

#### 1. Session-Based API (Original)
**Use Case:** Complex multi-turn conversations, mobile apps, async processing
```javascript
// Step-by-step approach
POST /api/session → Creates session, starts AI processing
GET  /api/session/:id/stream → Custom SSE format, Redis persistence
POST /api/session/:id/message → Continue conversation with context
POST /api/session/:id/confirm → Execute file operations
```

**Benefits:**
- ✅ Redis persistence across requests
- ✅ Session resume/reconnect capability 
- ✅ Perfect for mobile (connection drops)
- ✅ Async processing (create session, stream later)
- ✅ Custom proposal handling (confirm/modify workflow)
- ✅ Multi-user session isolation

**Trade-offs:**
- ❌ Custom SSE format (not AI SDK native)
- ❌ More complex client integration
- ❌ Requires session management

#### 2. Direct AI SDK v5 API (New)
**Use Case:** Simple web chat interfaces, real-time streaming
```javascript
// Direct approach
POST /api/ai-chat → AI SDK v5 messages → Direct streamText() response
```

**Benefits:**
- ✅ Zero format translation
- ✅ Native AI SDK v5 streaming
- ✅ Direct `useChat` → `streamText` pipeline
- ✅ Built-in data parts for proposals
- ✅ Simpler client integration
- ✅ Less latency (no session overhead)

**Trade-offs:**
- ❌ No persistence between requests
- ❌ Connection drops = conversation lost
- ❌ No async processing capability
- ❌ Harder to implement complex proposal workflows

### When to Use Which

**Session-Based API:**
- Mobile apps (React Native, Flutter)
- Complex proposal workflows (file organization)
- Multi-step interactions requiring persistence
- When you need session resume after connection drops

**Direct AI SDK v5 API:**
- Web chat interfaces (`useChat` hook)
- Simple streaming conversations
- Real-time interactions
- When you want native AI SDK v5 integration

**Current Implementation:**
- ✅ Session-based API: Fully implemented, tested
- ✅ Direct AI SDK v5 API: Just added to bridge server
- 🎯 Web prototype: Uses direct API for simplicity
- 🎯 Mobile app: Will use session-based API for robustness

### Architecture Decision

Both APIs can coexist! Your bridge server now has:
```
/api/session/* → Session-based (Redis, persistence, mobile-first)
/api/ai-chat   → Direct AI SDK v5 (stateless, web-first)
```

This gives you the best of both worlds depending on client needs.

---

## Local Development Workflow ⚠️ IMPORTANT

### The Correct Way to Develop

**✅ USE LOCAL SERVER for development:**
```bash
# Start local bridge server with your vault
cd server && OBSIDIAN_VAULT_PATH=/Users/jonathan.glasmeyer/Projects/obsidian-vault CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_CODE_OAUTH_TOKEN npm start

# Verify local server is working
curl -s http://localhost:3001/health
# Expected: {"status":"healthy","timestamp":"...","version":"1.0.0","redis":true}

# Start web prototype (connects to local server)
cd web-prototype && pnpm run dev
# Web app: http://localhost:3002
```

### Common Gotchas & Solutions

#### 🚨 Problem: "Invalid settings: cwd: Working directory must exist"
**Cause:** Using wrong vault path for local development

**Solution:** Use correct local vault path:
```bash
# ❌ WRONG - production server path doesn't exist locally
cd server && OBSIDIAN_VAULT_PATH=/srv/claude-jobs/obsidian-vault npm start

# ✅ CORRECT - local vault path
cd server && OBSIDIAN_VAULT_PATH=/Users/jonathan.glasmeyer/Projects/obsidian-vault CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_CODE_OAUTH_TOKEN npm start
```

#### 🚨 Problem: Requests timeout or hang
**Cause:** SSH tunnel died or port conflict

**Solution:** Restart tunnel:
```bash
# Kill any existing tunnel
pkill -f "ssh.*3001:localhost:3001"

# Check if port 3001 is free
lsof -i :3001

# Restart tunnel
ssh -L 3001:localhost:3001 hetzner -N &
```

#### 🚨 Problem: Web prototype shows connection errors
**Cause:** Web prototype trying to connect to non-existent local server

**Solution:** Verify tunnel first, then restart web prototype:
```bash
# Test tunnel health
curl -s http://localhost:3001/health

# If healthy, restart web prototype
cd web-prototype && pnpm run dev
```

### Architecture: Local vs Production

```
DEVELOPMENT (via SSH tunnel):
┌─────────────────┐    localhost:3002    ┌─────────────────────┐    tunnel    ┌─────────────────────┐
│  Web Prototype  │ ────────────────────→ │   SSH Tunnel        │ ──────────→ │  Production Server  │
│  (Next.js)      │                       │  localhost:3001     │             │  Hetzner + Vault    │
└─────────────────┘                       └─────────────────────┘             └─────────────────────┘

PRODUCTION (direct):
┌─────────────────┐    obsidian.domain.com    ┌─────────────────────┐
│  Mobile App     │ ───────────────────────────→ │  Production Server  │
│  (React Native) │                              │  Hetzner + Vault    │
└─────────────────┘                              └─────────────────────┘
```

### Vault Integration Status

**Production Server (Hetzner):**
- ✅ Vault mounted at `/srv/claude-jobs/obsidian-vault`
- ✅ Claude Code CLI installed and authenticated
- ✅ Redis running and connected
- ✅ AI SDK provider working with vault context
- ✅ Real-time streaming operational

**Local Development:**
- ❌ No vault (intentionally fails with clear error)
- ✅ SSH tunnel connects to production vault
- ✅ Web prototype works seamlessly via tunnel

### Testing Commands

```bash
# Test tunnel health
curl -s http://localhost:3001/health

# Test session creation
curl -X POST http://localhost:3001/api/session \
  -H "Content-Type: application/json" \
  -d '{"content": "Test content", "type": "text"}' \
  | jq -r '.sessionId'

# Test streaming (replace SESSION_ID)
curl -N http://localhost:3001/api/session/SESSION_ID/stream

# Expected streaming output:
# data: {"type":"connected","sessionId":"...","timestamp":"..."}
# data: {"type":"chunk","content":"I'll analyze this content...","timestamp":"..."}
# data: {"type":"completed","timestamp":"..."}
```

### Current Status ✅

- **Phase 3**: Bridge server operational on production
- **Phase 3.5**: Web prototype working via SSH tunnel  
- **SSH Tunnel**: Stable connection to production vault
- **Vault Integration**: Claude reads actual CLAUDE.md rules and vault structure
- **Intelligence**: Makes smart categorization suggestions based on content
- **Ready for**: Phase 4 mobile app development

**Next Phase**: React Native app using same session-based API via production endpoints.
