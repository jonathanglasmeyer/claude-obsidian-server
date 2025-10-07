# Discord Bot Performance Optimization Plan

*Created: 2025-09-18*

## Current Performance Issues

### Measured Response Times
- **Simple text responses**: 6.7-7.8 seconds
- **Tool usage (Bash ls)**: 13.6 seconds
- **User feedback**: "du bist etwas langsam" (you're a bit slow)

### Root Cause Analysis

#### 1. No Session Reuse (Primary Issue)
```
📋 Claude session: aab251b8-233f-4a84-8321-adbdf2e71445  # Message 1
📋 Claude session: e63a288e-223d-49c9-a8f0-1f77b7aec799  # Message 2
📋 Claude session: e4f0f0fd-6a2a-4024-b612-c92151adacc3  # Message 3
```
**Problem**: Every message creates new Claude Code SDK session instead of reusing existing sessions per Discord thread.

#### 2. Cold Start Penalties
- **SDK Initialization**: Authentication, tool setup, session creation
- **Network Handshake**: New connection establishment per request
- **Context Loading**: Full system prompt + conversation history sent each time

#### 3. Synchronous Processing
- **No Response Streaming**: Users wait for complete response
- **Sequential Tool Execution**: Tools run one after another
- **No Progress Indicators**: Long delays without feedback

#### 4. Network Latency Chain
```
Discord → Bot Server → Claude API → Tool Execution → Response → Discord
```
- **Production Server**: Additional network hop vs local development
- **Tool Roundtrips**: Bash execution adds latency
- **Large Payloads**: Full conversation context sent repeatedly

## Optimization Strategy

### Phase 1: Session Persistence (High Impact)
**Target**: Reduce 6-8s to 2-3s for text responses

#### 1.1 Claude Session Pool
```javascript
class ClaudeSessionPool {
  constructor() {
    this.sessions = new Map(); // threadId -> claudeSession
    this.lastUsed = new Map(); // threadId -> timestamp
    this.maxIdleTime = 30 * 60 * 1000; // 30 minutes
  }

  async getSession(threadId) {
    if (this.sessions.has(threadId)) {
      this.lastUsed.set(threadId, Date.now());
      return this.sessions.get(threadId);
    }

    // Create new session
    const session = await createClaudeSession();
    this.sessions.set(threadId, session);
    this.lastUsed.set(threadId, Date.now());
    return session;
  }

  cleanup() {
    const now = Date.now();
    for (const [threadId, lastUsed] of this.lastUsed) {
      if (now - lastUsed > this.maxIdleTime) {
        this.sessions.get(threadId)?.close();
        this.sessions.delete(threadId);
        this.lastUsed.delete(threadId);
      }
    }
  }
}
```

#### 1.2 Session Lifecycle Management
- **Per-Thread Sessions**: Map Discord threads to Claude sessions
- **Automatic Cleanup**: Remove sessions after 30min inactivity
- **Graceful Shutdown**: Close sessions on bot restart
- **Error Recovery**: Re-create sessions on API errors

### Phase 2: Response Streaming (Medium Impact)
**Target**: Provide immediate feedback, reduce perceived latency

#### 2.1 Progressive Response Updates
```javascript
async function streamResponse(thread, claudeStream) {
  let fullResponse = '';
  let lastUpdate = Date.now();
  const updateInterval = 1500; // Update every 1.5s

  for await (const chunk of claudeStream) {
    if (chunk.type === 'text') {
      fullResponse += chunk.content;

      // Send progressive updates
      if (Date.now() - lastUpdate > updateInterval) {
        await thread.send(`${fullResponse}...`);
        lastUpdate = Date.now();
      }
    }
  }

  // Send final response
  await thread.send(fullResponse);
}
```

#### 2.2 Real-time Progress Indicators
- **Typing Indicators**: Show bot is processing
- **Tool Execution Updates**: "Running bash command..."
- **Progressive Text**: Stream partial responses
- **ETA Estimates**: Based on message complexity

### Phase 3: Smart Caching (Medium Impact)
**Target**: Sub-second responses for repeated queries

#### 3.1 Response Caching Strategy
```javascript
class ResponseCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 10 * 60 * 1000; // 10 minutes
  }

  getCacheKey(message, threadContext) {
    return crypto.createHash('sha256')
      .update(JSON.stringify({
        message: message.trim().toLowerCase(),
        recentContext: threadContext.slice(-3) // Last 3 messages
      }))
      .digest('hex');
  }

  async get(key) {
    const cached = this.cache.get(key);
    if (!cached || Date.now() - cached.timestamp > this.ttl) {
      return null;
    }
    return cached.response;
  }
}
```

#### 3.2 Cache Invalidation
- **Time-based**: 10-minute TTL for most responses
- **Context-sensitive**: Invalidate on thread state changes
- **Tool Results**: Cache bash output for identical commands
- **Selective Caching**: Only cache deterministic responses

### Phase 4: Architecture Optimizations (Low Impact)
**Target**: Reduce overhead and improve scalability

#### 4.1 Connection Pooling
- **Persistent Connections**: Keep-alive to Claude API
- **Connection Multiplexing**: Share connections across threads
- **Circuit Breaker**: Handle API rate limits gracefully

#### 4.2 Async Processing Pipeline
```javascript
async function processMessage(message, thread) {
  // Start multiple operations in parallel
  const [session, threadContext, cachedResponse] = await Promise.all([
    sessionPool.getSession(thread.id),
    threadManager.getContext(thread.id),
    responseCache.get(getCacheKey(message))
  ]);

  if (cachedResponse) {
    return await thread.send(cachedResponse);
  }

  // Process with streaming
  const stream = session.createStream(message, threadContext);
  await streamResponse(thread, stream);
}
```

## Implementation Priority

### Immediate (Week 1): Session Persistence
1. **Claude Session Pool**: Implement session reuse per thread
2. **Session Lifecycle**: Automatic cleanup and error recovery
3. **Testing**: Validate session reuse reduces response times
4. **Monitoring**: Add session pool metrics to health endpoint

### Short-term (Week 2): Response Streaming
1. **Progressive Updates**: Stream partial responses to Discord
2. **Tool Progress**: Show real-time tool execution status
3. **Typing Indicators**: Immediate feedback on message received
4. **Error Handling**: Graceful stream interruption recovery

### Medium-term (Week 3): Smart Caching
1. **Response Cache**: Cache deterministic responses
2. **Tool Result Cache**: Cache bash command outputs
3. **Cache Metrics**: Hit rates and performance impact
4. **Cache Invalidation**: Context-aware cache management

### Long-term (Month 2): Advanced Optimizations
1. **Connection Pooling**: Persistent API connections
2. **Parallel Processing**: Concurrent tool execution
3. **Predictive Caching**: Pre-cache likely responses
4. **Performance Analytics**: Detailed latency tracking

## Success Metrics

### Performance Targets
- **Text Responses**: < 2 seconds (from 6-8s)
- **Tool Responses**: < 5 seconds (from 13s)
- **Cache Hit Rate**: > 20% for repeated queries
- **Session Reuse**: > 80% of messages use existing sessions

### Monitoring Implementation
```javascript
const metrics = {
  responseTime: new Map(), // threadId -> duration
  sessionReuse: { hits: 0, misses: 0 },
  cacheHits: { hits: 0, misses: 0 },
  toolExecutionTime: new Map() // toolName -> durations[]
};
```

### Health Endpoint Extensions
```json
{
  "performance": {
    "avgResponseTime": "2.3s",
    "sessionPoolSize": 3,
    "cacheHitRate": "24%",
    "activeSessions": 3
  }
}
```

## Risk Mitigation

### Memory Management
- **Session Limits**: Max 50 concurrent sessions
- **Cache Size**: Max 1000 cached responses
- **Memory Monitoring**: Auto-cleanup on high usage

### Error Recovery
- **Session Failures**: Auto-recreate on API errors
- **Cache Corruption**: Fallback to direct API calls
- **Stream Interruption**: Resume from last known state

### Backward Compatibility
- **Graceful Degradation**: Fall back to current behavior on errors
- **Feature Flags**: Enable optimizations incrementally
- **A/B Testing**: Compare performance before/after

## Technical Implementation Notes

### Session Pool Integration
```javascript
// Current: bot.js line ~XX
const response = await callClaude(message, threadContext);

// Optimized:
const session = await sessionPool.getSession(thread.id);
const response = await session.processMessage(message, threadContext);
```

### Redis Session Storage
- **Session Metadata**: Store session IDs in Redis
- **Cross-Instance**: Share sessions between bot restarts
- **Persistence**: Survive container updates

### Discord Rate Limits
- **Message Updates**: Respect Discord edit rate limits
- **Progressive Updates**: Batch edits to avoid throttling
- **Fallback Strategy**: Single final message if streaming fails

## Expected Outcomes

### User Experience
- **Immediate Feedback**: Users see bot is working instantly
- **Faster Responses**: 60-70% reduction in wait times
- **Better Conversations**: Maintained context reduces repetition
- **Reliability**: Fewer timeouts and failed responses

### Technical Benefits
- **Reduced API Costs**: Fewer session initializations
- **Better Scalability**: Support more concurrent users
- **Lower Server Load**: Less CPU/memory per request
- **Improved Monitoring**: Better performance visibility

### Business Impact
- **User Retention**: Faster responses = better experience
- **Cost Efficiency**: Reduced Claude API usage
- **Competitive Advantage**: Sub-3s response times
- **Foundation**: Architecture ready for advanced features

---

**Next Steps**: Begin Phase 1 implementation with session persistence and basic performance monitoring.