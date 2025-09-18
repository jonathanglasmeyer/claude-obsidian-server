import { query } from '@anthropic-ai/claude-code';

class ClaudeSessionPool {
  constructor(redisClient) {
    this.sessionCache = new Map(); // threadId -> session
    this.sessionMetadata = new Map(); // threadId -> { sessionId, lastUsed, messageCount }
    this.redis = redisClient;

    console.log('🚀 Claude Session Pool initialized');
    this.maxIdleTime = 30 * 60 * 1000; // 30 minutes
    this.maxConcurrentSessions = 10;
    this.contextWindowThreshold = 180000; // ~90% of 200k tokens (Claude Sonnet)

    // Start cleanup scheduler
    this.startCleanupScheduler();
  }

  async getOrCreateSession(threadId, initialPrompt = null) {
    try {
      // Check memory cache first - if found, use it exclusively
      if (this.sessionCache.has(threadId)) {
        const metadata = this.sessionMetadata.get(threadId);
        if (metadata) {
          metadata.lastUsed = Date.now();
          metadata.messageCount++;

          // Check if we need context compaction
          if (metadata.messageCount > 50) { // Rough context threshold
            console.log(`🔄 Context threshold reached for thread ${threadId}, considering compaction`);
          }
        }

        console.log(`♻️  Reusing cached session for thread ${threadId}`);
        return this.sessionCache.get(threadId);
      }

      // Check Redis for persisted session ID
      const persistedSessionId = await this.redis.get(`claude_session:${threadId}`);
      if (persistedSessionId) {
        console.log(`🔄 Resuming session ${persistedSessionId} for thread ${threadId}`);

        try {
          const session = query({
            prompt: initialPrompt || "Continue our conversation",
            options: {
              resume: persistedSessionId,
              cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault'
            }
          });

          // Cache the resumed session
          this.sessionCache.set(threadId, session);
          this.sessionMetadata.set(threadId, {
            sessionId: persistedSessionId,
            lastUsed: Date.now(),
            messageCount: 1,
            resumed: true
          });

          return session;
        } catch (error) {
          console.warn(`⚠️  Failed to resume session ${persistedSessionId}:`, error.message);
          // Fall through to create new session
        }
      }

      // Enforce session limits before creating new
      if (this.sessionCache.size >= this.maxConcurrentSessions) {
        await this.cleanupOldestSession();
      }

      // Create new session
      console.log(`🆕 Creating new Claude session for thread ${threadId}`);

      const session = query({
        prompt: initialPrompt || "Start new Discord conversation",
        options: {
          cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault',
          maxTurns: 100,
          permissionMode: 'bypassPermissions' // Set bypass permissions for Discord bot
        }
      });

      // Session ID will be extracted during stream processing in bot.js
      // Don't consume the stream here to preserve session context
      const sessionId = null; // Will be set by bot.js after processing

      // Cache the new session
      this.sessionCache.set(threadId, session);
      this.sessionMetadata.set(threadId, {
        sessionId: sessionId,
        lastUsed: Date.now(),
        messageCount: 1,
        created: Date.now()
      });

      // Session ID will be persisted after stream processing in bot.js
      // Don't persist here since we don't have the actual session ID yet

      return session;

    } catch (error) {
      console.error(`❌ Failed to get/create session for thread ${threadId}:`, error);
      throw error;
    }
  }

  async processMessage(threadId, prompt) {
    try {
      // Check if this is a cached session (existing conversation)
      if (this.sessionCache.has(threadId)) {
        console.log(`🔄 Continuing existing session for thread ${threadId}`);

        // Get session metadata to resume with specific session ID
        const metadata = this.sessionMetadata.get(threadId);
        if (!metadata?.sessionId) {
          console.warn(`⚠️  No session ID found for thread ${threadId}, creating new session`);
          await this.cleanupSession(threadId);
          return await this.getOrCreateSession(threadId, prompt);
        }

        // Resume specific session by ID with detailed logging
        console.log(`🔄 Resuming session ${metadata.sessionId} for thread ${threadId}`);
        const continueSession = query({
          prompt: prompt,
          options: {
            resume: metadata.sessionId,
            cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault',
            permissionMode: 'bypassPermissions'
          }
        });

        // Update metadata
        metadata.lastUsed = Date.now();
        metadata.messageCount++;

        return continueSession;
      }

      // New session - create and return
      const session = await this.getOrCreateSession(threadId, prompt);
      return session;

    } catch (error) {
      console.error(`❌ Failed to process message for thread ${threadId}:`, error);

      // Cleanup broken session and retry once
      await this.cleanupSession(threadId);

      // Retry with new session
      const retrySession = await this.getOrCreateSession(threadId, prompt);
      return retrySession;
    }
  }


  // Set the session ID after it's extracted from stream processing
  async updateSessionId(threadId, sessionId) {
    try {
      console.log(`💾 Updating session ID for thread ${threadId}: ${sessionId}`);

      // Update metadata
      const metadata = this.sessionMetadata.get(threadId);
      if (metadata) {
        metadata.sessionId = sessionId;
      }

      // Persist session mapping to Redis
      await this.redis.setEx(
        `claude_session:${threadId}`,
        this.maxIdleTime / 1000, // TTL in seconds
        sessionId
      );

      console.log(`✅ Session ID persisted to Redis for thread ${threadId}`);
    } catch (error) {
      console.error(`❌ Failed to update session ID for thread ${threadId}:`, error);
    }
  }

  async cleanupSession(threadId) {
    try {
      console.log(`🧹 Cleaning up session for thread ${threadId}`);

      const session = this.sessionCache.get(threadId);
      if (session) {
        try {
          await session.interrupt();
        } catch (error) {
          console.warn(`⚠️  Error interrupting session for thread ${threadId}:`, error.message);
        }
      }

      this.sessionCache.delete(threadId);
      this.sessionMetadata.delete(threadId);

      await this.redis.del(`claude_session:${threadId}`);

    } catch (error) {
      console.error(`❌ Error during session cleanup for thread ${threadId}:`, error);
    }
  }

  async cleanupOldestSession() {
    let oldestThreadId = null;
    let oldestTime = Date.now();

    for (const [threadId, metadata] of this.sessionMetadata) {
      if (metadata.lastUsed < oldestTime) {
        oldestTime = metadata.lastUsed;
        oldestThreadId = threadId;
      }
    }

    if (oldestThreadId) {
      console.log(`🗑️  Cleaning up oldest session: ${oldestThreadId}`);
      await this.cleanupSession(oldestThreadId);
    }
  }

  startCleanupScheduler() {
    // Run cleanup every 5 minutes
    setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);

    console.log('🕐 Started session cleanup scheduler (5 min intervals)');
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    const expiredThreads = [];

    for (const [threadId, metadata] of this.sessionMetadata) {
      if (now - metadata.lastUsed > this.maxIdleTime) {
        expiredThreads.push(threadId);
      }
    }

    if (expiredThreads.length > 0) {
      console.log(`🧹 Cleaning up ${expiredThreads.length} expired sessions`);

      for (const threadId of expiredThreads) {
        await this.cleanupSession(threadId);
      }
    }
  }

  // Statistics and monitoring
  getPoolStats() {
    const stats = {
      activeSessions: this.sessionCache.size,
      totalSessions: this.sessionMetadata.size,
      maxConcurrent: this.maxConcurrentSessions,
      sessions: []
    };

    for (const [threadId, metadata] of this.sessionMetadata) {
      stats.sessions.push({
        threadId,
        sessionId: metadata.sessionId,
        messageCount: metadata.messageCount,
        lastUsed: metadata.lastUsed,
        ageMinutes: Math.floor((Date.now() - metadata.lastUsed) / 60000),
        resumed: metadata.resumed || false
      });
    }

    return stats;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down Claude Session Pool...');

    const shutdownPromises = [];
    for (const [threadId, session] of this.sessionCache) {
      shutdownPromises.push(
        session.interrupt().catch(error =>
          console.warn(`⚠️  Error shutting down session ${threadId}:`, error.message)
        )
      );
    }

    await Promise.all(shutdownPromises);

    this.sessionCache.clear();
    this.sessionMetadata.clear();

    console.log('✅ Claude Session Pool shutdown complete');
  }
}

export default ClaudeSessionPool;