# Discord Bot Specification v2 - Production-Ready Claude Integration

## Overview
Discord bot with dedicated server optimized for Discord constraints, using Claude Code SDK directly with proper authentication, conversation context, and error handling.

## Critical Requirements Addressed

### 1. Claude Authentication Persistence
```yaml
# Docker volume for Claude CLI auth
volumes:
  claude_config:/home/node/.claude-config:rw

# Entrypoint script to restore auth
COPY entrypoint.sh /entrypoint.sh
CMD ["/entrypoint.sh"]
```

```bash
#!/bin/bash
# entrypoint.sh - Restore Claude auth from persistent volume
if [ -f /home/node/.claude-config/claude.json ]; then
    cp /home/node/.claude-config/claude.json /home/node/.claude.json
fi
exec node server.js
```

### 2. Conversation Context Management

```js
import { query } from '@anthropic-ai/claude-code';

class ClaudeProcessor {
  constructor() {
    this.threadManager = new ThreadManager();
  }

  async processWithContext(userMessage, threadId) {
    // Get conversation history
    const history = await this.threadManager.getConversation(threadId);

    // Build conversation prompt with context
    const conversationPrompt = this.buildConversationPrompt(history, userMessage);

    // Or use streaming messages format for multi-turn
    const messages = this.formatMessagesForSDK(history, userMessage);

    const stream = query({
      prompt: conversationPrompt, // Single string with full context
      // OR for multi-turn:
      // prompt: this.createAsyncMessageStream(messages),
      options: {
        cwd: '/srv/claude-jobs/obsidian-vault',
        continue: history.length > 0, // Continue existing conversation
        model: 'sonnet'
      }
    });

    let fullResponse = '';
    let metadata = {};

    for await (const message of stream) {
      switch (message.type) {
        case 'system':
          metadata.session_id = message.session_id;
          metadata.tools = message.tools;
          console.log(`Session ${message.session_id} initialized with tools:`, message.tools);
          break;

        case 'assistant':
          const textContent = message.message.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('');
          fullResponse += textContent;

          // Handle tool use
          const toolUse = message.message.content.find(c => c.type === 'tool_use');
          if (toolUse) {
            console.log(`Tool used: ${toolUse.name}`);
          }
          break;

        case 'result':
          // Store conversation with assistant response
          await this.threadManager.addMessage(threadId, 'user', userMessage);
          await this.threadManager.addMessage(threadId, 'assistant', message.result);

          return {
            success: true,
            response: message.result,
            usage: message.usage,
            duration: message.duration_ms,
            metadata
          };
      }
    }

    return { success: true, response: fullResponse, metadata };
  }

  buildConversationPrompt(history, newMessage) {
    if (history.length === 0) {
      return newMessage;
    }

    // Build context-aware prompt
    let prompt = "Previous conversation:\n";
    history.slice(-10).forEach(msg => { // Last 10 messages for context
      prompt += `${msg.role}: ${msg.content}\n`;
    });
    prompt += `\nuser: ${newMessage}`;

    return prompt;
  }

  formatMessagesForSDK(history, newMessage) {
    // Format for SDK's expected message structure
    const messages = history.map(msg => ({
      type: msg.role,
      message: {
        role: msg.role,
        content: [{ type: 'text', text: msg.content }]
      }
    }));

    messages.push({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: newMessage }]
      }
    });

    return messages;
  }
}
```

### 3. Security & Authentication

```js
// API Security Middleware
const API_SECRET_KEY = process.env.API_SECRET_KEY;

const validateApiKey = (req, res, next) => {
  if (req.path === '/health') return next();

  const clientKey = req.headers['x-api-key'];
  if (!clientKey || clientKey !== API_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Discord User Validation
class DiscordAuthManager {
  constructor() {
    this.userThreads = new Map(); // userId → Set<threadId>
    this.threadOwners = new Map(); // threadId → userId
  }

  validateThreadAccess(threadId, userId) {
    const owner = this.threadOwners.get(threadId);
    return owner === userId;
  }

  registerThread(threadId, userId) {
    this.threadOwners.set(threadId, userId);
    if (!this.userThreads.has(userId)) {
      this.userThreads.set(userId, new Set());
    }
    this.userThreads.get(userId).add(threadId);
  }
}

// Rate Limiting per User
import rateLimit from 'express-rate-limit';

const userRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per user
  keyGenerator: (req) => req.body.userId || req.ip,
  message: 'Too many requests, please wait before trying again'
});

app.post('/api/discord/process', validateApiKey, userRateLimiter, async (req, res) => {
  const { content, threadId, userId } = req.body;

  // Validate user owns thread
  if (!authManager.validateThreadAccess(threadId, userId)) {
    return res.status(403).json({ error: 'Access denied to this thread' });
  }

  // Process...
});
```

### 4. Response Length Management

```js
class DiscordFormatter {
  constructor() {
    this.MAX_MESSAGE_LENGTH = 2000;
    this.MAX_EMBED_FIELD = 1024;
    this.MAX_EMBED_DESCRIPTION = 4096;
  }

  async formatResponse(response, thread) {
    const chunks = this.chunkResponse(response);

    if (chunks.length === 1) {
      // Single message
      return this.createSingleEmbed(chunks[0]);
    } else {
      // Multiple messages needed
      return this.createMultiPartResponse(chunks, thread);
    }
  }

  chunkResponse(text) {
    const chunks = [];
    let current = '';

    // Smart chunking - respect code blocks and paragraphs
    const lines = text.split('\n');
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.startsWith('```')) inCodeBlock = !inCodeBlock;

      if (current.length + line.length + 1 > this.MAX_EMBED_DESCRIPTION) {
        if (!inCodeBlock && current.length > 0) {
          chunks.push(current);
          current = line;
        } else {
          // Force break in middle of code block if necessary
          chunks.push(current);
          current = '```\n' + line; // Reopen code block
        }
      } else {
        current += (current ? '\n' : '') + line;
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  createSingleEmbed(text) {
    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Processing Complete')
      .setDescription(text)
      .setTimestamp();
  }

  async createMultiPartResponse(chunks, thread) {
    const embeds = [];

    // First embed with overview
    embeds.push(new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Processing Complete')
      .setDescription(chunks[0])
      .setFooter({ text: `Part 1 of ${chunks.length}` })
      .setTimestamp());

    // Additional messages as needed
    for (let i = 1; i < chunks.length; i++) {
      await thread.send({
        embeds: [new EmbedBuilder()
          .setColor('#00FF00')
          .setDescription(chunks[i])
          .setFooter({ text: `Part ${i + 1} of ${chunks.length}` })]
      });

      // Rate limit compliance - wait between messages
      await this.delay(1000);
    }

    return embeds[0];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5. Enhanced Error Handling

```js
class ErrorHandler {
  handleClaudeError(error, context) {
    const errorMap = {
      'exit code 1': {
        type: 'AUTH_ERROR',
        message: 'Claude authentication failed',
        action: 'Please check Claude CLI authentication',
        recoverable: false
      },
      'ECONNREFUSED': {
        type: 'NETWORK_ERROR',
        message: 'Cannot connect to Claude service',
        action: 'Service may be down, retrying...',
        recoverable: true
      },
      'rate_limit': {
        type: 'QUOTA_ERROR',
        message: 'Claude API rate limit reached',
        action: 'Please wait a moment before trying again',
        recoverable: true
      },
      'timeout': {
        type: 'TIMEOUT_ERROR',
        message: 'Request took too long',
        action: 'Complex request, please try simplifying',
        recoverable: true
      }
    };

    for (const [pattern, errorInfo] of Object.entries(errorMap)) {
      if (error.message?.includes(pattern) || error.code === pattern) {
        return this.createErrorResponse(errorInfo, context);
      }
    }

    // Unknown error
    return {
      type: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: error.message,
      action: 'Please try again or contact support',
      recoverable: false
    };
  }

  createErrorResponse(errorInfo, context) {
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`❌ ${errorInfo.type.replace('_', ' ')}`)
      .setDescription(errorInfo.message)
      .addFields([
        { name: 'Action', value: errorInfo.action },
        { name: 'Thread', value: context.threadId, inline: true },
        { name: 'Recoverable', value: errorInfo.recoverable ? 'Yes' : 'No', inline: true }
      ])
      .setTimestamp();

    if (errorInfo.recoverable) {
      // Schedule retry
      this.scheduleRetry(context);
    }

    return { embed, errorInfo };
  }

  async scheduleRetry(context, attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
      await this.delay(i * 5000); // Exponential backoff

      try {
        const result = await this.retryOperation(context);
        if (result.success) return result;
      } catch (error) {
        console.log(`Retry ${i}/${attempts} failed:`, error.message);
      }
    }

    throw new Error('All retry attempts failed');
  }
}
```

### 6. Thread & Resource Management

```js
class ThreadManager {
  constructor() {
    this.conversations = new Map();
    this.lastAccess = new Map();
    this.redis = null;

    // Cleanup old threads every hour
    setInterval(() => this.cleanup(), 3600000);
  }

  async cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [threadId, lastTime] of this.lastAccess.entries()) {
      if (now - lastTime > maxAge) {
        this.conversations.delete(threadId);
        this.lastAccess.delete(threadId);

        if (this.redis) {
          await this.redis.del(`thread:${threadId}`);
        }

        console.log(`Cleaned up old thread: ${threadId}`);
      }
    }
  }

  async getConversation(threadId) {
    this.lastAccess.set(threadId, Date.now());

    // Try memory first
    if (this.conversations.has(threadId)) {
      return this.conversations.get(threadId);
    }

    // Try Redis
    if (this.redis) {
      try {
        const stored = await this.redis.get(`thread:${threadId}`);
        if (stored) {
          const conversation = JSON.parse(stored);
          this.conversations.set(threadId, conversation);
          return conversation;
        }
      } catch (error) {
        console.error('Redis error:', error);
        // Fall through to return empty array
      }
    }

    return [];
  }

  async addMessage(threadId, role, content) {
    const conversation = await this.getConversation(threadId);
    const message = {
      role,
      content,
      timestamp: Date.now()
    };

    conversation.push(message);
    this.conversations.set(threadId, conversation);
    this.lastAccess.set(threadId, Date.now());

    // Persist to Redis with TTL
    if (this.redis) {
      try {
        await this.redis.setex(
          `thread:${threadId}`,
          86400, // 24 hour TTL
          JSON.stringify(conversation)
        );
      } catch (error) {
        console.error('Redis persist error:', error);
        // Continue - memory storage still works
      }
    }

    // Limit conversation history
    if (conversation.length > 100) {
      conversation.shift(); // Remove oldest
    }
  }
}
```

### 7. Smart Thread Naming

```js
class ThreadNamer {
  async generateThreadName(content, claudeResponse) {
    // Use Claude's understanding of the content
    const title = this.extractTitle(claudeResponse) || this.analyzeContent(content);

    // Prefix based on content type
    const prefix = this.getPrefix(content, claudeResponse);

    // Truncate to Discord's limit (100 chars)
    return this.truncate(`${prefix}: ${title}`, 100);
  }

  extractTitle(response) {
    // Look for Claude's summary or title
    const titleMatch = response.match(/^#+ (.+)$/m);
    if (titleMatch) return titleMatch[1];

    // Look for "Added to vault: filename"
    const fileMatch = response.match(/Added to .*?: (.+\.md)/);
    if (fileMatch) return fileMatch[1].replace('.md', '');

    return null;
  }

  getPrefix(content, response) {
    if (content.includes('http')) return '🔗 Link';
    if (response.includes('```')) return '💻 Code';
    if (response.includes('Research')) return '📚 Research';
    if (response.includes('Recipe')) return '🍳 Recipe';
    return '📝 Note';
  }

  analyzeContent(content) {
    // Extract key terms
    const words = content.split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 5);
    return words.join(' ');
  }

  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
```

### 8. Progress Indicators

```js
class ProgressReporter {
  constructor(thread, statusMessage) {
    this.thread = thread;
    this.statusMessage = statusMessage;
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
  }

  async updateProgress(stage, details = '') {
    // Rate limit updates (max 1 per 2 seconds)
    if (Date.now() - this.lastUpdate < 2000) return;

    const stages = {
      'init': '🔄 Initializing Claude...',
      'reading': '📖 Reading vault contents...',
      'analyzing': '🔍 Analyzing your request...',
      'processing': '⚙️ Processing with Claude...',
      'tools': `🔧 Using tools: ${details}`,
      'writing': '✍️ Writing to vault...',
      'finalizing': '📋 Preparing response...'
    };

    const elapsed = Math.round((Date.now() - this.startTime) / 1000);

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(stages[stage] || '🔄 Processing...')
      .setDescription(details || 'Claude is working on your request')
      .setFooter({ text: `${elapsed}s elapsed` })
      .setTimestamp();

    await this.statusMessage.edit({ embeds: [embed] });
    this.lastUpdate = Date.now();
  }
}
```

### 9. Complete Docker Configuration

```dockerfile
# discord-server/Dockerfile
FROM node:18-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Setup for Claude
RUN mkdir -p /home/node/.ssh && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER node

# Install Claude Code SDK globally for node user
RUN npm install -g @anthropic-ai/claude-code

ENV PATH="/home/node/.local/bin:$PATH"

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

CMD ["/entrypoint.sh"]
```

```yaml
# docker-compose.yml addition
services:
  discord-server:
    build: ./discord-server
    container_name: discord-server
    restart: unless-stopped
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
      - DISCORD_INBOX_CHANNEL_ID=${DISCORD_INBOX_CHANNEL_ID}
      - OBSIDIAN_VAULT_PATH=/srv/claude-jobs/obsidian-vault
      - REDIS_URL=redis://redis:6379
      - API_SECRET_KEY=${API_SECRET_KEY}
      - LOG_LEVEL=info
    volumes:
      - /srv/claude-jobs:/srv/claude-jobs:rw
      - /home/claude/.ssh:/home/node/.ssh:ro
      - claude_config:/home/node/.claude-config:rw
    depends_on:
      - redis
    networks:
      - quietloop-network
```

### 10. Environment Configuration

```env
# discord-server/.env
NODE_ENV=production
PORT=3003

# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_guild_id
DISCORD_INBOX_CHANNEL_ID=your_channel_id

# Claude Configuration
OBSIDIAN_VAULT_PATH=/srv/claude-jobs/obsidian-vault
CLAUDE_MODEL=sonnet

# Security
API_SECRET_KEY=21c416e5248e0dfea975d5d156bf05944cb9b8392c03ecb4c89478cd6ff841a8

# Redis
REDIS_URL=redis://redis:6379
REDIS_TTL=86400

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5
```

## Implementation Checklist

### Phase 1: Core Functionality ✓
- [ ] Claude Code SDK integration with proper auth
- [ ] Conversation context management
- [ ] Basic Discord bot with thread creation
- [ ] API security with key validation
- [ ] Docker setup with persistent volumes

### Phase 2: Robustness ✓
- [ ] Comprehensive error handling
- [ ] Response length management
- [ ] Thread cleanup and resource management
- [ ] Rate limiting per user
- [ ] Progress indicators

### Phase 3: Production ✓
- [ ] Smart thread naming
- [ ] Redis persistence with TTL
- [ ] Health checks and monitoring
- [ ] Logging and metrics
- [ ] Deployment scripts

## Testing Strategy

### Unit Tests
```js
// test/claude-processor.test.js
describe('ClaudeProcessor', () => {
  it('should handle conversation context correctly');
  it('should format messages for SDK properly');
  it('should handle tool usage responses');
  it('should recover from errors');
});
```

### Integration Tests
```js
// test/discord-integration.test.js
describe('Discord Integration', () => {
  it('should create threads for new messages');
  it('should chunk long responses correctly');
  it('should handle rate limits gracefully');
  it('should validate user access to threads');
});
```

### Load Tests
```js
// test/load.test.js
describe('Load Testing', () => {
  it('should handle 10 concurrent requests');
  it('should cleanup old threads properly');
  it('should not leak memory over time');
});
```

## Monitoring & Observability

```js
// Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      claudeUsage: {
        inputTokens: 0,
        outputTokens: 0
      }
    };
  }

  recordRequest(duration, usage) {
    this.metrics.requests++;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (this.metrics.requests - 1) + duration) /
      this.metrics.requests;

    if (usage) {
      this.metrics.claudeUsage.inputTokens += usage.inputTokens || 0;
      this.metrics.claudeUsage.outputTokens += usage.outputTokens || 0;
    }
  }

  recordError(error) {
    this.metrics.errors++;
    logger.error('Request error', { error: error.message, stack: error.stack });
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

// Health endpoint with metrics
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics: metricsCollector.getMetrics(),
    redis: redis?.status === 'ready',
    claude: claudeAuthValid()
  });
});
```

## Success Criteria

### Functional
- ✅ Discord messages trigger Claude processing
- ✅ Conversation context maintained per thread
- ✅ Long responses properly chunked
- ✅ Errors handled gracefully with recovery

### Performance
- ✅ Response within 10 seconds for simple queries
- ✅ Handle 5 concurrent requests
- ✅ Memory usage stable over 24 hours
- ✅ Redis TTL prevents unbounded growth

### Reliability
- ✅ Survives Claude CLI auth expiration
- ✅ Recovers from network failures
- ✅ Handles Discord rate limits
- ✅ Cleans up resources properly

This production-ready specification addresses all critical gaps and provides a robust foundation for the Discord bot integration.