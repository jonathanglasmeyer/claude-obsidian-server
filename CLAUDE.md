# CLAUDE.md - Mobile Obsidian Vault Integration

## Project Overview
Mobile React Native app that acts as a share target to intelligently process content into an Obsidian vault using Claude Code (Max plan, no API key required). The app receives shared URLs/text, sends them to a bridge server that runs Claude Code CLI sessions, proposes vault organization, and executes git operations upon user confirmation.

## Architecture

**Components:**
- **Mobile App (RN)** - Share target with streaming UI
- **Bridge Server (Node.js)** - Manages Claude Code CLI sessions via child processes
- **Session Store (Redis)** - Temporary session state
- **Obsidian Vault (Git)** - Target repository with existing CLAUDE.md rules

**Flow:**
1. Share URL/text → RN app → Bridge server
2. Server spawns `claude code` CLI with vault context
3. Claude proposes file location/format via SSE stream
4. User confirms/modifies → Claude executes + commits to git

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
- **Package:** `ai-sdk-provider-claude-code` + `ai` SDK
- **Key Pattern:** `claudeCode('sonnet', {allowedTools: [...], cwd: path})`
- **Architecture:** Redis + In-memory hybrid (persistent sessions + live streams)
- **Streaming:** Server-Sent Events with token-by-token real-time updates

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

## Current Status
- ✅ AI SDK streaming operational (localhost:3002)  
- ✅ Multi-turn conversations + session management
- ✅ Production deployment ready
- 🚀 **Next:** Phase 4 Android App
