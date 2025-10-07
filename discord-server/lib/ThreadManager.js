export class ThreadManager {
  constructor() {
    this.conversations = new Map(); // threadId -> messages[]
    this.lastAccess = new Map();    // threadId -> timestamp
    this.maxMessages = 50;          // Limit per conversation
  }

  /**
   * Get conversation history for a thread
   */
  getConversation(threadId) {
    this.lastAccess.set(threadId, Date.now());

    if (!this.conversations.has(threadId)) {
      this.conversations.set(threadId, []);
    }

    return this.conversations.get(threadId);
  }

  /**
   * Add a message to thread conversation
   */
  addMessage(threadId, role, content) {
    const conversation = this.getConversation(threadId);

    const message = {
      role,
      content,
      timestamp: Date.now()
    };

    conversation.push(message);

    // Limit conversation length
    if (conversation.length > this.maxMessages) {
      conversation.shift(); // Remove oldest message
    }

    console.log(`💬 Added ${role} message to thread ${threadId} (${conversation.length} total)`);
  }


  /**
   * Clean up old conversations to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [threadId, lastTime] of this.lastAccess.entries()) {
      if (now - lastTime > maxAge) {
        this.conversations.delete(threadId);
        this.lastAccess.delete(threadId);
        console.log(`🧹 Cleaned up old thread: ${threadId}`);
      }
    }
  }

  /**
   * Get stats about current conversations
   */
  getStats() {
    return {
      activeThreads: this.conversations.size,
      totalMessages: Array.from(this.conversations.values())
        .reduce((sum, conv) => sum + conv.length, 0),
      oldestAccess: this.lastAccess.size > 0 ?
        Math.min(...this.lastAccess.values()) : null
    };
  }
}