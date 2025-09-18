/**
 * RedisThreadManager - Redis-based conversation persistence
 * Phase 2.2 of Discord Bot Implementation Plan
 */

import { createClient } from 'redis';

export class RedisThreadManager {
  constructor() {
    this.client = null;
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

    } catch (error) {
      console.log('❌ Redis not available, using in-memory fallback storage');
      this.isConnected = false;
      this.client = null;
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
   * Build conversation prompt from history
   */
  async buildConversationPrompt(threadId, newMessage) {
    const conversation = await this.getConversation(threadId);

    let prompt = 'Previous conversation:\n\n';

    for (const msg of conversation) {
      prompt += `${msg.role}: ${msg.content}\n\n`;
    }

    prompt += `user: ${newMessage}\n\nassistant: `;
    return prompt;
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
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old threads from fallback storage`);
    }
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
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      console.log('🔌 Redis disconnected');
    }
  }
}