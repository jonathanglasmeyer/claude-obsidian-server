/**
 * RedisThreadManager - Redis-based conversation persistence
 * Phase 2.2 of Discord Bot Implementation Plan
 */

import { createClient } from 'redis';

export class RedisThreadManager {
  constructor(discordClient = null) {
    this.client = null;
    this.subscriberClient = null; // Separate client for keyspace events
    this.discordClient = discordClient;
    this.isConnected = false;
    this.maxMessages = 50;
    this.ttlSeconds = 172800; // 2 days in seconds

    // Fallback in-memory storage if Redis is down
    this.fallbackConversations = new Map();
    this.fallbackLastAccess = new Map();

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback handling
   */
  async initializeRedis() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.log('🔄 Redis max retries reached, falling back to in-memory storage');
              return false; // Stop retrying
            }
            return Math.min(retries * 1000, 5000); // Max 5s delay
          }
        }
      });

      this.client.on('error', (err) => {
        if (!err.message.includes('ECONNREFUSED')) {
          console.error('🚨 Redis connection error:', err.message);
        }
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      await this.client.connect();
      console.log('🗄️ RedisThreadManager initialized with Redis');

      // Initialize keyspace events for thread archiving
      await this.initializeKeyspaceEvents();

      // Run startup cleanup after everything is initialized
      if (this.discordClient) {
        console.log('🔄 Running immediate startup cleanup...');
        try {
          await this.performStartupCleanup();
        } catch (error) {
          console.error('⚠️ Startup cleanup failed:', error.message);
          console.log('📝 Continuing without startup cleanup to keep bot functional');
        }
      }

    } catch (error) {
      console.log('❌ Redis not available, using in-memory fallback storage');
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Initialize Redis keyspace events for automatic thread archiving
   */
  async initializeKeyspaceEvents() {
    if (!this.isConnected || !this.discordClient) {
      return;
    }

    try {
      // Enable keyspace events for expired keys
      await this.client.configSet('notify-keyspace-events', 'Ex');

      // Create separate subscriber client (Redis requirement)
      this.subscriberClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await this.subscriberClient.connect();

      // Subscribe to expired key events
      await this.subscriberClient.subscribe('__keyevent@0__:expired', (expiredKey) => {
        this.handleKeyExpiry(expiredKey);
      });

      console.log('📡 Redis keyspace events initialized for thread archiving');

    } catch (error) {
      console.error('⚠️ Failed to initialize keyspace events:', error.message);
    }
  }

  /**
   * Handle Redis key expiry events for thread archiving
   */
  async handleKeyExpiry(expiredKey) {
    // Only handle lastAccess key expiries (these expire with the conversation)
    if (!expiredKey.includes(':lastAccess')) {
      return;
    }

    try {
      // Extract thread ID from expired key: thread:1234567890:lastAccess
      const threadId = expiredKey.split(':')[1];

      if (threadId && this.discordClient) {
        await this.deleteDiscordThread(threadId);
      }

    } catch (error) {
      console.error('⚠️ Error handling key expiry:', error.message);
    }
  }

  /**
   * Delete a Discord thread when conversation expires
   */
  async deleteDiscordThread(threadId) {
    try {
      const thread = await this.discordClient.channels.fetch(threadId);

      if (thread && thread.isThread()) {
        await thread.delete('Auto-deleted after 48h inactivity');
        console.log(`🗑️ Thread ${threadId} auto-deleted after 48h inactivity`);
      }

    } catch (error) {
      // Thread might already be deleted or inaccessible
      if (!error.message.includes('Unknown Channel')) {
        console.error(`❌ Failed to delete thread ${threadId}:`, error.message);
      }
    }
  }

  /**
   * Get conversation history for a thread
   */
  async getConversation(threadId) {
    await this.updateLastAccess(threadId);

    if (this.isConnected) {
      try {
        const key = `thread:${threadId}:messages`;
        const messagesJson = await this.client.get(key);

        if (messagesJson) {
          return JSON.parse(messagesJson);
        }

        // Initialize empty conversation with TTL
        await this.client.setEx(key, this.ttlSeconds, JSON.stringify([]));
        return [];

      } catch (error) {
        console.error('⚠️ Redis get failed, using fallback:', error.message);
        return this.getFallbackConversation(threadId);
      }
    } else {
      return this.getFallbackConversation(threadId);
    }
  }

  /**
   * Add a message to thread conversation
   */
  async addMessage(threadId, role, content) {
    const message = {
      role,
      content,
      timestamp: Date.now()
    };

    if (this.isConnected) {
      try {
        const key = `thread:${threadId}:messages`;
        const conversation = await this.getConversation(threadId);

        conversation.push(message);

        // Limit conversation length
        if (conversation.length > this.maxMessages) {
          conversation.splice(0, conversation.length - this.maxMessages);
        }

        // Store with TTL renewal
        await this.client.setEx(key, this.ttlSeconds, JSON.stringify(conversation));

        console.log(`💬 Added ${role} message to thread ${threadId} (${conversation.length} total)`);

      } catch (error) {
        console.error('⚠️ Redis set failed, using fallback:', error.message);
        this.addFallbackMessage(threadId, role, content);
      }
    } else {
      this.addFallbackMessage(threadId, role, content);
    }
  }

  /**
   * Update last access timestamp with TTL
   */
  async updateLastAccess(threadId) {
    const timestamp = Date.now();

    if (this.isConnected) {
      try {
        const key = `thread:${threadId}:lastAccess`;
        await this.client.setEx(key, this.ttlSeconds, timestamp.toString());
      } catch (error) {
        // Non-critical, continue
        this.fallbackLastAccess.set(threadId, timestamp);
      }
    } else {
      this.fallbackLastAccess.set(threadId, timestamp);
    }
  }


  /**
   * Clean up old conversations (Redis handles this automatically with TTL)
   */
  async cleanup() {
    if (this.isConnected) {
      // Redis TTL handles cleanup automatically
      console.log('🧹 Redis TTL handling cleanup automatically');

      // Optional: Get stats on active threads
      try {
        const keys = await this.client.keys('thread:*:messages');
        console.log(`📊 Active threads in Redis: ${keys.length}`);
      } catch (error) {
        // Non-critical
      }
    } else {
      // Fallback cleanup for in-memory storage
      this.cleanupFallback();
    }
  }

  /**
   * Get statistics about thread management
   */
  async getStats() {
    if (this.isConnected) {
      try {
        const messageKeys = await this.client.keys('thread:*:messages');
        const accessKeys = await this.client.keys('thread:*:lastAccess');

        // Get oldest access time
        let oldestAccess = Date.now();
        if (accessKeys.length > 0) {
          const accessTimes = await Promise.all(
            accessKeys.map(key => this.client.get(key))
          );
          oldestAccess = Math.min(...accessTimes.map(t => parseInt(t)));
        }

        return {
          activeThreads: messageKeys.length,
          totalMessages: accessKeys.length, // Approximation
          oldestAccess,
          storageType: 'redis'
        };
      } catch (error) {
        return this.getFallbackStats();
      }
    } else {
      return this.getFallbackStats();
    }
  }

  /**
   * Fallback methods for when Redis is unavailable
   */
  getFallbackConversation(threadId) {
    this.fallbackLastAccess.set(threadId, Date.now());

    if (!this.fallbackConversations.has(threadId)) {
      this.fallbackConversations.set(threadId, []);
    }

    return this.fallbackConversations.get(threadId);
  }

  addFallbackMessage(threadId, role, content) {
    const conversation = this.getFallbackConversation(threadId);

    const message = {
      role,
      content,
      timestamp: Date.now()
    };

    conversation.push(message);

    if (conversation.length > this.maxMessages) {
      conversation.splice(0, conversation.length - this.maxMessages);
    }

    console.log(`💬 Added ${role} message to thread ${threadId} (${conversation.length} total) [FALLBACK]`);
  }

  cleanupFallback() {
    const now = Date.now();
    const maxAge = this.ttlSeconds * 1000; // Convert to milliseconds
    let removed = 0;

    for (const [threadId, lastAccess] of this.fallbackLastAccess.entries()) {
      if (now - lastAccess > maxAge) {
        this.fallbackConversations.delete(threadId);
        this.fallbackLastAccess.delete(threadId);

        // Delete Discord thread in fallback mode too
        if (this.discordClient) {
          this.deleteDiscordThread(threadId);
        }

        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old threads from fallback storage`);
    }
  }

  /**
   * Startup cleanup for orphaned threads and expired data
   */
  async performStartupCleanup() {
    if (!this.isConnected || !this.discordClient) {
      return;
    }

    try {
      // Get all active Discord threads from the inbox channel
      const inboxChannel = await this.discordClient.channels.fetch(process.env.DISCORD_INBOX_CHANNEL_ID);

      if (!inboxChannel) {
        throw new Error('Inbox channel not found');
      }

      // Check bot permissions in the channel
      const botMember = inboxChannel.guild.members.cache.get(this.discordClient.user.id);
      const permissions = inboxChannel.permissionsFor(botMember);

      if (!permissions || !permissions.has(['ViewChannel', 'ReadMessageHistory', 'ManageThreads'])) {
        throw new Error('Missing required permissions: ViewChannel, ReadMessageHistory, ManageThreads');
      }

      const threads = await inboxChannel.threads.fetchActive();

      // Only check active threads (archived threads can't be managed anymore)
      const activeThreads = threads.threads;

      console.log(`🧹 Starting startup cleanup: checking ${activeThreads.size} active Discord threads...`);

      let deletedCount = 0;
      let cleanedCount = 0;

      for (const [threadId, thread] of activeThreads) {

        // Get last message in thread to determine real activity
        const messages = await thread.messages.fetch({ limit: 1 });
        const lastMessage = messages.first();

        if (!lastMessage) {
          // No messages in thread, use creation time
          const threadAge = Date.now() - thread.createdTimestamp;
          var lastActivityAge = threadAge;
        } else {
          // Use last message timestamp
          var lastActivityAge = Date.now() - lastMessage.createdTimestamp;
        }

        const maxAge = this.ttlSeconds * 1000; // 48 hours in milliseconds

        // Check if we have Redis data for this thread
        const lastAccessKey = `thread:${threadId}:lastAccess`;
        const ttl = await this.client.ttl(lastAccessKey);

        // Delete if: (Last activity older than 48h) OR (Has Redis data with low TTL)
        const shouldDelete = (lastActivityAge > maxAge) || (ttl > 0 && ttl < 3600);

        if (shouldDelete) {
          try {
            await this.deleteDiscordThread(threadId);
            deletedCount++;

            // Clean up Redis data for expired threads
            if (ttl === -2) {
              await this.client.del(lastAccessKey);
              await this.client.del(`thread:${threadId}:messages`);
              cleanedCount++;
            }
          } catch (error) {
            console.error(`⚠️ Failed to archive thread ${threadId}:`, error.message);
          }
        }
      }

      if (deletedCount > 0 || cleanedCount > 0) {
        console.log(`🧹 Startup cleanup: ${deletedCount} threads deleted, ${cleanedCount} Redis entries cleaned`);
      } else {
        console.log(`🧹 Startup cleanup completed: ${activeThreads.size} threads checked, all healthy (< 48h old)`);
      }

    } catch (error) {
      if (error.message.includes('Missing Access')) {
        console.error('⚠️ Startup cleanup failed: Bot lacks Discord permissions');
        console.log('📋 Required permissions: View Channel, Read Message History, Manage Threads');
        console.log('🔧 Please check bot permissions in Discord server settings');
      } else if (error.message.includes('permissions')) {
        console.error('⚠️ Startup cleanup failed:', error.message);
        console.log('🔧 Please grant bot the required Discord permissions');
      } else {
        console.error('⚠️ Startup cleanup failed:', error.message);
      }
    }
  }

  /**
   * Daily cleanup for missed events (fallback for event-driven archiving)
   */
  async startFallbackCleanup() {
    // Startup cleanup already ran during initialization

    // Run cleanup daily at 3 AM
    const runCleanup = () => {
      this.cleanup();
      setTimeout(runCleanup, 24 * 60 * 60 * 1000); // 24 hours
    };

    // Start first cleanup in 1 hour, then every 24h
    setTimeout(runCleanup, 60 * 60 * 1000);
    console.log('🕒 Daily fallback cleanup scheduled');
  }

  getFallbackStats() {
    const totalMessages = Array.from(this.fallbackConversations.values())
      .reduce((sum, conv) => sum + conv.length, 0);

    const oldestAccess = this.fallbackLastAccess.size > 0
      ? Math.min(...Array.from(this.fallbackLastAccess.values()))
      : Date.now();

    return {
      activeThreads: this.fallbackConversations.size,
      totalMessages,
      oldestAccess,
      storageType: 'memory-fallback'
    };
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.subscriberClient) {
      await this.subscriberClient.disconnect();
      console.log('🔌 Redis subscriber disconnected');
    }

    if (this.client && this.isConnected) {
      await this.client.disconnect();
      console.log('🔌 Redis disconnected');
    }
  }
}