# Implementation Plan - Share to Obsidian Vault

## Current Status: Phase 3 Complete ✅

**Bridge Server Operational**: AI SDK streaming works with vault access via SSH tunnel (localhost:3001)
**Next Phase**: Android app development with Vercel AI SDK integration

---

## Phase 0: Basic PoC Validation (30 minutes)

### Step 0.1: Claude Code CLI Test on Hetzner
SSH into server and test Claude Code setup:
```bash
# SSH to Hetzner
ssh hetzner

# Install Claude Code CLI if not present
curl -sSL https://claude.ai/install.sh | bash
# or: npm install -g @anthropic-ai/claude-code

# Export your OAuth token (temporarily)
export CLAUDE_CODE_OAUTH_TOKEN="your-token-here"

# Basic test - does CLI work?
claude --version
claude auth status

# Test a simple command
echo "Hello from Hetzner server" | claude ask "What server am I running on?"

# Test code functionality with a dummy folder
mkdir /tmp/test-claude && cd /tmp/test-claude
echo "console.log('test');" > test.js
claude code --help
# Try: claude code "add a comment to this file"
```

**Expected Result:** CLI works, responds, can read/write files

### Step 0.2: Git Access Test
```bash
# Test git access to your vault repo (read-only first)
git clone https://github.com/your-user/obsidian-vault.git /tmp/test-vault
cd /tmp/test-vault
ls -la

# Clean up
rm -rf /tmp/test-claude /tmp/test-vault
```

**Success Criteria:**
- ✅ Claude CLI installed and authenticated
- ✅ Can process text and files
- ✅ Can access vault repository
- ❌ **STOP HERE if anything fails** - fix before proceeding

---

## Prerequisites Check
- [ ] Verify `CLAUDE_CODE_OAUTH_TOKEN` is available
- [ ] Confirm access to Obsidian vault repository
- [ ] Check Node.js ≥18 and npm/pnpm installed
- [ ] Verify Android development environment setup

## Phase 1: Security Setup - Claude User & Git Access (✅ COMPLETE)

**Production Environment Setup:**
- Dedicated `claude` user with restricted permissions
- SSH key-based GitHub vault access with deploy keys
- Isolated workspace at `/srv/claude-jobs/obsidian-vault`
- Claude Code CLI installed and authenticated

## Phase 2: Bridge Server Foundation (✅ COMPLETE)

**Docker-based Development Workflow:**
- Local development with SSH tunnel to production
- Docker Compose setup (Node.js + Redis)
- Express server with health check, session management, SSE streaming
- Deployed and running on Hetzner with localhost:3001 tunnel access

## Phase 3: AI SDK Integration with Claude Code (✅ COMPLETE)

**Technology Decision: Using `ai-sdk-provider-claude-code`**
- ✅ Wraps official Claude Code TypeScript SDK
- ✅ Full file operations support (Read, Write, Edit, Bash tools)
- ✅ Native working directory (`cwd`) support for vault context
- ✅ Built-in streaming compatible with Vercel AI SDK
- ✅ Perfect for React Native chat UI integration
- ✅ No loss of functionality vs direct Claude Code SDK

### Step 3.1: AI SDK Provider Setup ✅
- ✅ Installed `ai` and `ai-sdk-provider-claude-code` packages
- ✅ Configured Claude provider with vault working directory
- ✅ Set up tool permissions (Read, Write, Edit, Git operations)

### Step 3.2: Enhanced Session Endpoints ✅
- ✅ Updated session creation to use AI SDK streaming
- ✅ Implemented vault-context Claude provider
- ✅ Store session state with AI SDK conversation management

### Step 3.3: Real-time Streaming Integration ✅
- ✅ Replaced manual SSE with AI SDK streamText()
- ✅ Stream Claude responses directly via SSH tunnel
- ✅ Handle file operations in real-time

### Step 3.4: Vault Operations Handler ✅
- ✅ Configured allowed tools for secure vault access
- ✅ Implemented lazy initialization to prevent startup issues
- ✅ Fixed vault mounting and permissions (claude user UID 1001)
- ✅ Validated vault access and CLAUDE.md rule compliance

### Step 3.5: Mobile-Ready API ✅
- ✅ Compatible with React Native useChat hook
- ✅ Session resumption for multi-turn conversations
- ✅ Proper error handling and timeouts implemented

**Key Achievements:**
- Lazy initialization prevents Docker startup crashes
- Vault properly mounted with correct permissions
- Claude Code operates in actual Obsidian vault directory
- Real-time streaming validated via SSH tunnel (localhost:3001)
- AI respects existing vault structure and CLAUDE.md rules
## Phase 3.6: Direct AI SDK v5 Endpoint Implementation ✅ **COMPLETE**

**Objective:** Implement vanilla AI SDK v5 pipeline: `useChat()` → `/api/ai-chat` → `streamText()` with no conversion layers.

**Key Achievement:** **Fixed the core streaming issue** - `useChat` was receiving plain text instead of UI Message chunks.

**What We Accomplished:**
1. ✅ **Deployed `/api/ai-chat` endpoint** with direct Claude provider integration
2. ✅ **Fixed deployment script** to use modern `docker compose` commands
3. ✅ **CRITICAL FIX**: Changed from `toTextStreamResponse()` to `toUIMessageStreamResponse()`
4. ✅ **Updated web prototype** to use native AI SDK v5 streaming without timeouts
5. ✅ **Eliminated conversion complexity** - direct `/api/ai-chat` passthrough in web prototype
6. ✅ **Verified complete pipeline** - real-time streaming from vault-aware Claude

**Technical Root Cause & Solution:**

The core issue was format mismatch:
- **❌ Problem**: `toTextStreamResponse()` sends plain text chunks
- **✅ Solution**: `toUIMessageStreamResponse()` sends proper AI SDK v5 UI Message chunks

**Key Implementation Changes:**
- Bridge Server: Use `toUIMessageStreamResponse()` for useChat compatibility
- Web Prototype: Remove fetch timeouts for unlimited Claude processing time
- Frontend: Support AI SDK v5 message parts array format
- Architecture: Pure AI SDK v5 pipeline with zero format conversion

**Current Status:** ✅ **FULLY OPERATIONAL**
- ✅ **Real-time streaming**: Messages appear in chat as Claude types
- ✅ **Multi-turn conversations**: Conversation history maintained
- ✅ **No timeouts**: Claude can take unlimited time for complex operations
- ✅ **Vault intelligence**: Claude reads actual CLAUDE.md rules and vault structure
- ✅ **Format compatibility**: Perfect AI SDK v5 integration end-to-end

**Final Architecture:**
```
✅ useChat() → ✅ /api/chat → ✅ /api/ai-chat → ✅ toUIMessageStreamResponse() → ✅ Real-time UI updates
```

**Performance & Quality:**
- **Streaming Speed**: Real-time token-by-token delivery
- **Intelligence**: Vault-aware responses with category suggestions
- **Reliability**: No format conversion failures, pure AI SDK v5 pipeline
- **User Experience**: Natural chat interface with Claude's vault expertise
- **Web Content**: WebFetch and WebSearch enabled for URL processing

**Known Limitation: Tool Call Visibility**
- ⚠️ **Tool calls execute but are invisible** in the UI during streaming
- **Current behavior**: Text streaming pauses during tool execution, resumes after completion
- **User experience**: Brief pause in conversation flow during file operations
- **Next phase**: Phase 3.7 - Tool call progress indicators and real-time tool execution visibility

---
## Phase 4: Android App (Day 2-3)

**Simplified by AI SDK Integration:**
- Vercel AI SDK provides React Native `useChat` hook
- Built-in streaming message handling
- Native conversation state management
- Direct compatibility with Phase 3 AI SDK provider

### Step 4.1: React Native Setup
```bash
npx react-native init ObsidianShare --skip-install
cd ObsidianShare
npm install
```

### Step 4.2: Share Intent Configuration
- Edit `android/app/src/main/AndroidManifest.xml`:
  - Add share intent filter for text/plain
  - Configure activity launch mode
- Test share target appears in Android share menu

### Step 4.3: Core Dependencies
```bash
npm install react-native-share-intent
npm install react-native-sse
npm install @react-navigation/native @react-navigation/stack
```

### Step 4.4: Share Handler Service
- Create `ShareHandlerService.js`
- Extract shared content from intent
- Queue if app not running

### Step 4.5: API Client
- Create `BridgeAPI.js` with fetch wrapper
- Implement session creation
- Setup SSE connection handler

### Step 4.6: Main UI Screen
- Create `ShareScreen.js` with:
  - Shared content preview
  - Loading spinner during processing
  - Claude response streaming display
  - Confirm/Cancel buttons

### Step 4.7: Streaming Components
- Create `StreamingText.js` for live token display
- Create `ProposalView.js` for file preview
- Handle markdown rendering

## Phase 5: Integration Testing (Day 3)

### Step 5.1: Local Testing Setup
- Clone Obsidian vault locally
- Configure server with vault path
- Start Redis and server

### Step 5.2: End-to-End Flow Test
1. Share URL from browser to app
2. Verify session creation
3. Check Claude proposal stream
4. Test confirmation flow
5. Verify git commit/push

### Step 5.3: Content Type Testing
- Test article URL processing
- Test plain text snippets
- Test Twitter/X post URLs
- Verify proper vault routing

### Step 5.4: Error Scenarios
- Test network disconnection
- Test Claude timeout
- Test invalid content
- Test git push failures

## Phase 6: Deployment & Polish (Day 4)

### Step 6.1: Security Setup - Claude User & Git Access
Setup dedicated user for Claude operations:
```bash
# Create dedicated user
sudo useradd -m -s /bin/bash claude
sudo mkdir -p /srv/claude-jobs
sudo chown claude:claude /srv/claude-jobs
sudo chmod 700 /srv/claude-jobs

# Generate repo-specific SSH key
sudo -u claude ssh-keygen -t ed25519 -f /home/claude/.ssh/id_ed25519_repo -N ''

# Setup SSH config for repo access
sudo -u claude tee /home/claude/.ssh/config << EOF
Host github.com
  IdentityFile ~/.ssh/id_ed25519_repo
  IdentitiesOnly yes
  StrictHostKeyChecking yes
EOF

# Pin GitHub's host keys
sudo -u claude ssh-keyscan github.com >> /home/claude/.ssh/known_hosts

# Git configuration for the claude user
sudo -u claude git config --global user.email "claude@yourdomain.com"
sudo -u claude git config --global user.name "Claude Bot"
sudo -u claude git config --global safe.directory /srv/claude-jobs/*
```

### Step 6.2: Vault Repository Setup
```bash
# Clone Obsidian vault with repo-specific key
cd /srv/claude-jobs
sudo -u claude GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_repo -o IdentitiesOnly=yes' git clone git@github.com:owner/obsidian-vault.git

# Set permissions
sudo chmod -R 700 /srv/claude-jobs/obsidian-vault
```

**Manual Step:** Add `/home/claude/.ssh/id_ed25519_repo.pub` as Deploy Key in GitHub repo settings with write permissions.

### Step 6.3: Server Deployment & Caddy Integration
- Deploy to Hetzner server via SSH:
  ```bash
  # Copy project files to server
  scp -r . user@hetzner-server:~/obsidian-bridge-server/

  # SSH into server and build
  ssh user@hetzner-server
  cd ~/obsidian-bridge-server
  docker-compose up -d
  ```
- Add obsidian service config to ../quietloop-cashflow/docker/caddy/Caddyfile:
  ```
  obsidian.yourdomain.com {
      reverse_proxy localhost:3001
  }
  ```
- Restart Caddy container in cashflow project
- Test obsidian.domain.com routing through Cloudflare

### Step 6.4: Android App Build
```bash
cd android
./gradlew assembleRelease
```
- Generate signed APK
- Install on Pixel 9
- Test share from various apps

### Step 6.5: Monitoring Setup
- Add basic logging to server
- Monitor Redis memory usage
- Track Claude API usage

### Step 6.6: Documentation
- Update README with setup instructions
- Document environment variables
- Add troubleshooting guide

## Testing Checklist

### Server Tests
- [ ] Health check endpoint works
- [ ] Session creation returns ID
- [ ] SSE stream connects
- [ ] Claude process spawns correctly
- [ ] Proposals parsed accurately
- [ ] Git operations complete

### App Tests
- [ ] Share intent received
- [ ] Content displayed correctly
- [ ] Stream updates live
- [ ] Confirmation works
- [ ] Error states handled

### Integration Tests
- [ ] Full flow: share → process → confirm → git
- [ ] Multiple content types work
- [ ] Session timeout handled
- [ ] Concurrent sessions supported

## Environment Variables

### Server (.env)
```
CLAUDE_CODE_OAUTH_TOKEN=<token>
OBSIDIAN_VAULT_PATH=/srv/claude-jobs/obsidian-vault
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=production
CLAUDE_USER=claude
```

### App (config.js)
```javascript
export const API_BASE_URL = 'https://obsidian.yourdomain.com';
```

## Debugging Commands

```bash
# Test Claude CLI directly
CLAUDE_CODE_OAUTH_TOKEN=xxx claude code --working-dir /vault

# Monitor server logs
journalctl -u obsidian-bridge -f

# Check Redis sessions
redis-cli KEYS "session:*"

# Test SSE endpoint
curl -N http://localhost:3000/api/session/test/stream

# Build APK debug version
cd android && ./gradlew assembleDebug
```

## Success Criteria
1. ✅ Can share URL from any Android app
2. ✅ Claude proposes correct vault location
3. ✅ User can confirm/modify proposal
4. ✅ Changes committed and pushed to git
5. ✅ Full flow completes in <30 seconds



## Notes for Sonnet
- Start with Phase 1-2 (server) first - get CLI integration working
- Use console.log liberally during development
- Test with simple text before complex URLs
- Keep mobile UI minimal - focus on functionality
- Handle Claude errors gracefully - show raw output if parsing fails
