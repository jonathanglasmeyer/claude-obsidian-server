/**
 * Enhanced session manager that handles AI streaming sessions
 */
class SessionManager {
  constructor() {
    this.activeSessions = new Map(); // In-memory storage for active AI streams
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Create a new session with AI stream
   */
  async createSession(sessionId, content, type, sessionStore, conversationHistory = null) {
    console.log(`🎬 Creating AI session ${sessionId} (type: ${type})`);
    
    try {
      // Import AI service here to avoid circular dependencies
      const AIService = require('./ai-service');
      const aiService = new AIService();
      
      // Create the AI streaming session with conversation context
      const aiStream = await aiService.createStreamingSession(content, type, conversationHistory);
      
      // Store the stream in memory
      this.activeSessions.set(sessionId, {
        aiStream,
        createdAt: Date.now(),
        status: 'streaming',
        type: type
      });
      
      // Update Redis session with status
      await sessionStore.updateSession(sessionId, { 
        status: 'streaming',
        startedAt: new Date().toISOString()
      });
      
      return aiStream;
      
    } catch (error) {
      console.error(`❌ Error creating AI session ${sessionId}:`, error);
      
      // Update Redis with error status
      await sessionStore.updateSession(sessionId, { 
        status: 'error', 
        error: error.message 
      });
      
      throw error;
    }
  }

  /**
   * Get active AI stream for a session
   */
  getActiveStream(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Mark session as completed and cleanup
   */
  async completeSession(sessionId, sessionStore) {
    console.log(`✅ Completing AI session ${sessionId}`);
    
    this.activeSessions.delete(sessionId);
    
    await sessionStore.updateSession(sessionId, { 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Mark session as failed and cleanup
   */
  async failSession(sessionId, sessionStore, error) {
    console.log(`❌ Failing AI session ${sessionId}: ${error}`);
    
    this.activeSessions.delete(sessionId);
    
    await sessionStore.updateSession(sessionId, { 
      status: 'error',
      error: error,
      failedAt: new Date().toISOString()
    });
  }

  /**
   * Cleanup old sessions (older than 10 minutes)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.createdAt > maxAge) {
        console.log(`🧹 Cleaning up expired session: ${sessionId}`);
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.activeSessions.clear();
  }
}

module.exports = SessionManager;