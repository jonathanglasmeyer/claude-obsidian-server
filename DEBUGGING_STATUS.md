# Claude Code CLI Debugging Status

**Issue**: `ai-sdk-provider-claude-code` fails with "Claude Code process exited with code 1" in production server context.

**Date**: 2025-09-03  
**Status**: ✅ **SOLVED** - Missing Claude OAuth token in Docker environment

---

## 🎯 Exact Error Description

### Error Pattern (Identical Local + Production)

1. ✅ **Request received** - Server processes HTTP request correctly
2. ✅ **Provider created** - `createClaudeProvider()` succeeds 
3. ✅ **streamText called** - AI SDK `streamText()` function executes
4. ✅ **Stream starts** - Returns `{"type":"start"}` and `{"type":"start-step"}`
5. 💥 **CRASH** - `{"type":"error","errorText":"Claude Code process exited with code 1"}`
6. ❌ **Stream ends** - Returns `{"type":"finish-step"}` and `{"type":"finish"}`

### Technical Error Details

```javascript
APICallError [AI_APICallError]: Claude Code process exited with code 1
    at createAPICallError (file:///Users/jonathan.glasmeyer/Projects/quietloop-claude-obsidian-server/server/node_modules/ai-sdk-provider-claude-code/dist/index.js:204:10)
    at ClaudeCodeLanguageModel.handleClaudeCodeError (file:///Users/jonathan.glasmeyer/Projects/quietloop-claude-obsidian-server/server/node_modules/ai-sdk-provider-claude-code/dist/index.js:597:12)
    at Object.start (file:///Users/jonathan.glasmeyer/Projects/quietloop-claude-obsidian-server/server/node_modules/ai-sdk-provider-claude-code/dist/index.js:867:32)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
```

**Error Data (All Undefined)**:
- `cause`: undefined
- `exitCode`: undefined  
- `stderr`: undefined
- `code`: undefined
- `promptExcerpt`: ''

### Where It Occurs

**Local Server**: `localhost:3001` - Same error  
**Production**: `obsidian.quietloop.dev` - Same error  
**Both environments**: Identical failure pattern

---

## ✅ What We've Verified Works

### 1. Claude CLI Manual Execution
```bash
# Local
cd /Users/jonathan.glasmeyer/Projects/obsidian-vault
claude --print "Say OK" # ✅ Works: "OK"

# Production Container  
ssh hetzner "docker exec obsidian-server sh -c 'cd /srv/claude-jobs/obsidian-vault && echo \"test\" | claude --print \"Just say OK\"'"
# ✅ Works: "OK"
```

### 2. Minimal Reproduction Test
**File**: `server/debug-claude-provider.js`
```javascript
const result = await streamText({
  model: claudeCode('sonnet', { cwd: VAULT_PATH, allowedTools: ['Read', 'Write', 'Edit'] }),
  messages: [{ role: 'user', content: 'Please respond with exactly: REPRO_TEST_SUCCESS' }]
});
```
**Result**: ✅ **SUCCESS** - Returns "REPRO_TEST_SUCCESS"

### 3. Express Context Test  
**File**: `server/debug-express-context.js`
```javascript
app.post('/test-claude', async (req, res) => {
  const result = await streamText({
    model: claudeCode('sonnet', { cwd: VAULT_PATH, allowedTools: ['Read', 'Write', 'Edit'] }),
    messages: [{ role: 'user', content: 'Please respond with exactly: EXPRESS_CONTEXT_SUCCESS' }]
  });
});
```
**Result**: ✅ **SUCCESS** - Returns "EXPRESS_CONTEXT_SUCCESS"

### 4. Tools Configuration Test
**File**: `server/debug-tools-test.js`  
**Tested Configurations**:
- `['Read', 'Write', 'Edit']` ✅ 
- `['Read', 'Write', 'Edit', 'MultiEdit']` ✅
- `['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep']` ✅
- `['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'Bash']` ✅
- `['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch']` ✅

**Result**: ✅ **ALL WORK** - Tools are not the problem

### 5. Empty Tools Object Test
**File**: `server/debug-tools-empty.js`
```javascript
// Test real server pattern
const result = streamText({
  model: provider,
  messages: [...],
  maxTokens: 4000,
  tools: {}, // Empty object like real server
});
```
**Result**: ✅ **SUCCESS** - Empty tools object works fine

### 6. Authentication Test
- ❌ **CLAUDE_CODE_OAUTH_TOKEN removed** from `.env`
- ✅ **Claude CLI uses existing authentication** (via `claude setup-token`)
- ✅ **Server starts without token** 
- ❌ **Same error persists** - Token was not the problem

---

## 🎯 Key Findings

### What Works vs What Fails

| Test Type | Status | Environment |
|-----------|--------|-------------|
| Manual Claude CLI | ✅ Works | Local + Production |
| Minimal streamText | ✅ Works | Isolated script |
| Express + streamText | ✅ Works | Simple Express server |
| All tool configs | ✅ Works | Isolated tests |
| Empty tools object | ✅ Works | Isolated tests |
| **Real server** | ❌ **FAILS** | Local + Production |

### The Mystery

**Same code works in isolation but fails in real server context**

**Hypothesis**: Something in the real server environment interferes with Claude CLI process execution, but we cannot isolate what.

---

## 🔍 Investigation Areas Explored

### ❌ Ruled Out (Confirmed NOT the cause)

1. **Authentication Issues** - Token removed, Claude CLI auth verified
2. **Tool Configuration** - All combinations tested and work
3. **Deployment Architecture** - Issue exists both local + production  
4. **Network/Port Issues** - Health checks work, API responds
5. **Vault Path Issues** - Path verified, manual CLI works
6. **Express Middleware** - Simple Express server works
7. **AI SDK Integration** - Basic streamText works in isolation

### 🤔 Still Investigating

1. **Message Processing Differences** - Real server has complex message handling
2. **Stream Response Processing** - Real server uses `toUIMessageStreamResponse()`
3. **Session Management** - Real server integrates with Redis sessions
4. **Process Environment** - Real server has different environment/context
5. **Concurrent Requests** - Real server may handle multiple simultaneous requests

### 📍 Current Focus

The error occurs at `ai-sdk-provider-claude-code/dist/index.js:867:32` in the `Object.start` function, suggesting the Claude CLI process fails to start or execute properly when called from the real server context.

---

## 🚀 Next Steps

1. **Message Processing Analysis** - Compare exact message format differences
2. **Stream Response Investigation** - Test `toUIMessageStreamResponse()` vs direct streaming  
3. **Session Store Impact** - Test server without Redis integration
4. **Process Environment Debug** - Compare environment variables and process state
5. **Source Code Analysis** - Examine `ai-sdk-provider-claude-code` line 867 for clues

---

## 🛠️ Debug Files Created

- `server/debug-claude-provider.js` - Minimal reproduction (✅ works)
- `server/debug-express-context.js` - Express context test (✅ works) 
- `server/debug-tools-test.js` - Tools configuration test (✅ works)
- `server/debug-tools-empty.js` - Empty tools object test (✅ works)

**All debug files work perfectly. Only the real server fails.**

---

## 📊 Environment Details

**Versions**:
- `ai-sdk-provider-claude-code`: `1.1.2`
- `ai`: `5.0.28` 
- Claude CLI: `1.0.102 (Claude Code)`
- Node.js: `v24.4.1`

**Environments Tested**:
- ✅ **Local Development** - macOS, direct execution
- ✅ **Production Container** - Docker on Hetzner VPS  
- ❌ **Both fail identically** in real server context

**The bug is environment-specific but not platform-specific.**

---

## 🎯 SOLUTION FOUND

### Root Cause
**Missing `CLAUDE_CODE_OAUTH_TOKEN` environment variable in Docker production environment.**

### Why This Was Confusing
1. **Manual Claude CLI worked** in production container (used existing authentication)
2. **All isolated tests worked** locally (had fallback vault paths)  
3. **Production logs showed correct vault path** (vault path was actually correct)
4. **Local server failed initially** due to different issue (incorrect vault path in `.env`)

### The Real Issue
- **Docker container**: No existing Claude authentication, needs OAuth token
- **Local development**: `claude setup-token` provides authentication
- **Production**: Must pass `CLAUDE_CODE_OAUTH_TOKEN` as environment variable

### Final Fix Applied
1. **Docker Compose**: Added `CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN}` 
2. **Environment**: Host system's OAuth token passed into container
3. **Result**: ✅ Production server fully operational

### Key Learning
The error "Claude Code process exited with code 1" can indicate **authentication failure**, not just path/configuration issues. Always verify Claude CLI authentication in containerized environments.

### Verification
```bash
curl -X POST https://obsidian.quietloop.dev/api/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"test"}]}]}'
```

**Status**: ✅ **WORKING** - Returns proper Claude AI responses with streaming