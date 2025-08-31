# CLAUDE.md - Mobile Obsidian Vault Integration

## Project Overview
Mobile React Native app that acts as a share target to intelligently process content into an Obsidian vault using Claude Code (Max plan, no API key required). The app receives shared URLs/text, sends them to a bridge server that runs Claude Code CLI sessions, proposes vault organization, and executes git operations upon user confirmation.

**Status: Phase 3 Complete** - Bridge server operational with AI SDK integration and vault access.

## Architecture

**Components:**
- **Mobile App (RN)** - Share target with streaming UI *(Phase 4)*
- **Bridge Server (Node.js)** - AI SDK integration with Claude Code provider ✅
- **Session Store (Redis)** - Temporary session state ✅  
- **Obsidian Vault (Git)** - Target repository with existing CLAUDE.md rules ✅

**Flow:**
1. Share URL/text → RN app → Bridge server
2. Server uses AI SDK with Claude Code provider (vault context)
3. Claude proposes file location/format via SSE stream ✅
4. User confirms/modifies → Claude executes + commits to git *(ready to test)*

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

## Deployment
```bash
# Development
npm run dev                    # localhost:3002
redis-server --daemonize yes   # Local Redis

# Production (automated)
./deploy.sh                    # Full deployment script

# Production (manual)  
rsync -avz . hetzner:~/obsidian-bridge-server/
ssh hetzner "cd ~/obsidian-bridge-server && docker compose up -d --build"

# Access via tunnel
ssh -L 3001:localhost:3001 hetzner -N  
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

## Current Status
- ✅ AI SDK streaming operational (localhost:3001) 
- ✅ Multi-turn conversations + session management
- ✅ Production deployment active on Hetzner
- ✅ Vault mounting and permissions resolved
- ✅ Claude Code reads actual CLAUDE.md rules and vault structure
- ✅ Real-time streaming validated via SSH tunnel
- ✅ Vault intelligence confirmed (categories, rules, organization)
- 🚀 **Next:** Phase 4 Android App

## API Endpoints for Mobile Integration

**Base URL:** `http://localhost:3001` (via SSH tunnel)

### Core Endpoints

**Health Check:** `GET /health`
```json
{"status":"healthy","timestamp":"2025-08-31T14:07:06.370Z","version":"1.0.0","redis":true}
```

**Create Session:** `POST /api/session`
```json
{
  "content": "URL or text to organize",
  "type": "url|text"
}
// Returns: {"sessionId": "uuid", "status": "created"}
```

**Stream Processing:** `GET /api/session/:id/stream`
- Server-Sent Events stream
- Real-time Claude responses
- Compatible with Vercel AI SDK `useChat`

**Continue Conversation:** `POST /api/session/:id/message`  
```json
{
  "message": "User response or modification"
}
```

**Execute Proposal:** `POST /api/session/:id/confirm`
```json
{
  "action": "confirm|modify|cancel"
}
```

### Integration Notes for Phase 4

**React Native:** Use `@vercel/ai` `useChat` hook with SSE endpoint
**Authentication:** OAuth token handled server-side only
**Error Handling:** Built-in timeout and retry mechanisms
**Session Management:** 5-minute timeout, Redis persistence
