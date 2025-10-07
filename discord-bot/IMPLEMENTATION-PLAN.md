# Discord Bot Implementation Plan
*From working MVP to production-ready Discord-Claude integration*

## Current Status ✅
- [x] **MVP Bot Working**: Basic Discord bot responds to messages
- [x] **Claude Integration**: Direct Claude Code SDK integration working
- [x] **Thread Creation**: Bot creates threads for each message
- [x] **Basic Error Handling**: Shows errors in Discord embeds

---

## Phase 1: Core Reliability 🎯
*Building on the working MVP*

### 1.1 Conversation Context ✅ COMPLETED
- [x] **Add ThreadManager class** - Store conversation history per thread
- [x] **Implement conversation building** - Pass history to Claude Code SDK
- [x] **Test multi-turn conversations** - Verify context persistence
- [x] **Add conversation limits** - Cap at 50 messages per thread
- [x] **BONUS:** Thread message handling - Bot responds in existing threads

### 1.2 Response Management
- [ ] **Implement response chunking** - Handle Discord 2000 char limit
- [ ] **Add smart splitting** - Respect code blocks when chunking
- [ ] **Multi-part messages** - Send multiple messages for long responses
- [ ] **Rate limit compliance** - Wait between multiple messages

### 1.3 Enhanced Error Handling
- [ ] **Specific error types** - Map Claude errors to user-friendly messages
- [ ] **Retry logic** - Auto-retry on network/temporary failures
- [ ] **Error logging** - Log errors with context for debugging
- [ ] **Graceful degradation** - Handle bot permission issues

### 1.4 Progress Indicators
- [ ] **Progress reporter class** - Show Claude processing stages
- [ ] **Tool usage visibility** - Show when Claude uses tools
- [ ] **Timing information** - Display processing duration
- [ ] **Token usage display** - Show input/output token counts

**Phase 1 Acceptance Criteria:**
- ✅ Multi-turn conversations work correctly
- ✅ Long responses are properly chunked
- ✅ Errors show helpful recovery steps
- ✅ Users see progress during processing

---

## Phase 2: Production Features 🚀
*Adding robustness and user experience*

### 2.1 Smart Thread Naming ✅ COMPLETED
- [x] **Simple word-based naming** - Use first 8 words as thread title
- [x] **Immediate thread creation** - Thread created instantly with user message
- [x] **Sequential renaming** - Clean title applied after main processing
- [x] **Length limits** - Truncate to Discord's 100 char limit
- [x] **Fallback handling** - Graceful degradation when renaming fails

### 2.2 Resource Management ✅ COMPLETED
- [x] **Memory cleanup** - Event-driven thread deletion via Redis keyspace events
- [x] **Redis integration** - Full conversation persistence with 2-day TTL
- [x] **Thread lifecycle** - Auto-delete after 48h inactivity (last message timestamp)
- [x] **Health monitoring** - Comprehensive logging + SSH/Claude debugging access
- [x] **Startup cleanup** - Check all active threads on bot restart
- [x] **Intelligent detection** - Use last message activity vs creation time
- [x] **Consistent deletion** - Redis TTL expiry triggers Discord thread deletion

### 2.3 Security & Access Control ❌ SKIPPED
*Single-user deployment - security features not needed*
- [x] **User-thread mapping** - Not needed for single user
- [x] **Access validation** - Not needed for single user
- [x] **Rate limiting** - Not needed for single user
- [x] **API key protection** - Not needed for single user

### 2.4 Content Processing ➡️ POST-MVP
*Moved to POST-MVP-FEATURES.md - focus on core deployment first*
- [x] **URL extraction** - Moved to post-MVP features
- [x] **File attachment handling** - Moved to post-MVP features
- [x] **Image analysis** - Moved to post-MVP features
- [x] **Content type detection** - Moved to post-MVP features

**Phase 2 Acceptance Criteria:**
- ✅ Threads have meaningful names (2.1 Smart Thread Naming)
- ✅ Bot handles 10+ concurrent users (Redis scaling + conversation context)
- ✅ Memory usage remains stable (2.2 Resource Management with auto-cleanup)
- ⏸️ Various content types processed correctly (2.4 Content Processing - pending)

---

## Phase 3: Docker & Deployment ✅ COMPLETED
*Production deployment alongside existing infrastructure*

### 3.1 Docker Configuration ✅ COMPLETED
- [x] **Dockerfile creation** - Node.js with Claude Code SDK integration
- [x] **Authentication persistence** - Mount Claude config volume
- [x] **Entrypoint script** - Restore Claude auth on startup
- [x] **Health checks** - Container health monitoring with Discord status

### 3.2 Docker Compose Integration ✅ COMPLETED
- [x] **Service definition** - Discord bot replaces legacy obsidian-server
- [x] **Network integration** - Connect to existing quietloop-network
- [x] **Volume mounting** - Share vault and Claude config volumes
- [x] **Environment variables** - Production configuration with bot tokens

### 3.3 Production Configuration ✅ COMPLETED
- [x] **Environment setup** - Production .env template with Discord tokens
- [x] **Deployment script** - Automated deployment via deploy.sh
- [x] **Port integration** - Reuses existing port 3001 and obsidian.quietloop.dev
- [x] **Redis configuration** - Keyspace events enabled for thread management

### 3.4 Monitoring & Observability ✅ COMPLETED
- [x] **Health endpoint** - /health with bot status, Redis health, thread stats
- [x] **Infrastructure integration** - Reuses existing Caddy routing and SSL
- [x] **Container monitoring** - Docker health checks and restart policies
- [x] **Documentation** - Complete deployment guide in DEPLOYMENT.md

**Phase 3 Acceptance Criteria:**
- ✅ Bot runs in Docker container on production server
- ✅ Survives container restarts with auth intact
- ✅ Integrated with existing infrastructure (no changes needed)
- ✅ Monitoring and health checks functional

---

## Phase 4: Advanced Features 🌟
*Optional enhancements for better UX*

### 4.1 Command System
- [ ] **Slash commands** - /claude, /thread-history, /help
- [ ] **Bot mentions** - Respond to @obsidian-chat mentions
- [ ] **Thread management** - Commands to rename/close threads
- [ ] **Configuration commands** - User preferences

### 4.2 Enhanced Integration
- [ ] **Multiple channels** - Support different inbox channels
- [ ] **Channel-specific behavior** - Different processing per channel
- [ ] **User preferences** - Personal settings per user
- [ ] **Webhook integration** - Alternative to bot polling

### 4.3 Analytics & Insights
- [ ] **Usage analytics** - Track popular features
- [ ] **Performance insights** - Identify bottlenecks
- [ ] **User feedback** - Reaction-based feedback system
- [ ] **Cost tracking** - Monitor Claude API usage costs

**Phase 4 Acceptance Criteria:**
- ✅ Slash commands provide additional functionality
- ✅ Multiple channels supported
- ✅ Rich analytics and insights available

---

## Implementation Strategy

### Week 1: Phase 1 (Core Reliability)
**Days 1-2:** Conversation Context
- Create `ThreadManager` class
- Implement conversation history building
- Test with multi-turn conversations

**Days 3-4:** Response Management
- Implement response chunking logic
- Handle multi-part messages with rate limits
- Test with long Claude responses

**Days 5-7:** Error Handling & Progress
- Enhanced error mapping and retry logic
- Progress indicators and tool visibility
- Testing and bug fixes

### Week 2: Phase 2 (Production Features)
**Days 1-3:** Smart Features
- Thread naming system
- Content processing pipeline
- Resource management setup

**Days 4-7:** Security & Scale
- Access control implementation
- Rate limiting and security
- Load testing and optimization

### Week 3: Phase 3 (Deployment)
**Days 1-4:** Docker Setup
- Dockerfile and compose integration
- Authentication persistence
- Production configuration

**Days 5-7:** Monitoring & Deploy
- Health checks and monitoring
- Production deployment
- End-to-end testing

### Week 4: Phase 4 (Polish)
- Advanced features based on usage
- Analytics and optimization
- Documentation and handoff

---

## File Structure (Target)

```
discord-server/
├── package.json              ✅ Done
├── bot.js                     ✅ Basic version done
├── .env                       ✅ Done
├── Dockerfile                 📝 Phase 3
├── entrypoint.sh             📝 Phase 3
├── lib/
│   ├── ThreadManager.js      📝 Phase 1.1
│   ├── ClaudeProcessor.js    📝 Phase 1.1
│   ├── ResponseFormatter.js  📝 Phase 1.2
│   ├── ErrorHandler.js       📝 Phase 1.3
│   ├── ProgressReporter.js   📝 Phase 1.4
│   ├── ThreadNamer.js        📝 Phase 2.1
│   ├── ContentProcessor.js   📝 Phase 2.4
│   └── SecurityManager.js    📝 Phase 2.3
├── test/
│   ├── unit/                 📝 Ongoing
│   └── integration/          📝 Ongoing
└── docs/
    ├── API.md                📝 Phase 3
    └── DEPLOYMENT.md         📝 Phase 3
```

---

## Quick Win Tasks (Can Start Immediately)

### 🚀 **1-Hour Tasks**
- [ ] Add conversation history to existing bot
- [ ] Implement basic response chunking
- [ ] Add better error messages
- [ ] Create progress indicator embeds

### 🎯 **Half-Day Tasks**
- [ ] Create ThreadManager class
- [ ] Implement smart thread naming
- [ ] Add Redis integration for persistence
- [ ] Create Dockerfile

### 📋 **Full-Day Tasks**
- [ ] Complete response management system
- [ ] Implement comprehensive error handling
- [ ] Set up production deployment
- [ ] Add monitoring and health checks

---

## Success Metrics

**Phase 1:** Reliability
- Zero conversation context loss
- 95% uptime
- Error recovery rate > 90%

**Phase 2:** Performance
- Response time < 10 seconds
- Support 20+ concurrent users
- Memory usage stable over 24h

**Phase 3:** Production
- Zero downtime deployments
- Container restart < 30s
- 99% authentication persistence

**Phase 4:** Features
- Slash command adoption > 50%
- User satisfaction > 4/5
- Feature usage analytics available

---

## Getting Started

**Next immediate tasks (in order):**

1. **Add conversation context** (1-2 hours)
   ```js
   // Add to bot.js
   const conversations = new Map(); // threadId -> messages[]
   ```

2. **Implement response chunking** (1-2 hours)
   ```js
   // Handle Discord 2000 char limit
   function chunkResponse(text) { /* ... */ }
   ```

3. **Better error handling** (1 hour)
   ```js
   // Map Claude errors to user-friendly messages
   function handleClaudeError(error) { /* ... */ }
   ```

**Ready to start with Phase 1.1? Let's build the ThreadManager first!**