const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

class SessionStore {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000, // 2 second timeout
          lazyConnect: true, // Don't connect immediately
        }
      });
      
      this.client.on('error', (err) => {
        console.warn('⚠️  Redis Client Error (non-fatal):', err.message);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Redis');
        this.connected = true;
      });

      // Try to connect with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(false), 3000); // 3 second timeout
      });

      const result = await Promise.race([connectPromise.then(() => true), timeoutPromise]);
      
      if (result) {
        this.connected = true;
        return true;
      } else {
        console.warn('⚠️  Redis connection timed out - continuing without Redis');
        this.connected = false;
        return false;
      }
    } catch (error) {
      console.warn('⚠️  Failed to connect to Redis - continuing without Redis:', error.message);
      this.connected = false;
      return false;
    }
  }

  async createSession(data = {}) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'created',
      messages: [], // Conversation history
      ...data
    };

    // Set with 5-minute TTL (300 seconds)
    await this.client.setEx(`session:${sessionId}`, 300, JSON.stringify(session));
    
    console.log(`📝 Created session: ${sessionId}`);
    return session;
  }

  async getSession(sessionId) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    const sessionData = await this.client.get(`session:${sessionId}`);
    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData);
  }

  async updateSession(sessionId, updates) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Extend TTL on update
    await this.client.setEx(`session:${sessionId}`, 300, JSON.stringify(updatedSession));
    
    console.log(`📝 Updated session: ${sessionId}`);
    return updatedSession;
  }

  async deleteSession(sessionId) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    await this.client.del(`session:${sessionId}`);
    console.log(`🗑️  Deleted session: ${sessionId}`);
  }

  async addMessage(sessionId, message) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };

    session.messages = session.messages || [];
    session.messages.push(messageWithTimestamp);

    // Keep only last 20 messages to prevent memory issues
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }

    // Extend TTL on activity
    await this.client.setEx(`session:${sessionId}`, 300, JSON.stringify(session));
    
    console.log(`💬 Added message to session: ${sessionId}`);
    return session;
  }

  async getMessages(sessionId) {
    const session = await this.getSession(sessionId);
    return session ? session.messages || [] : [];
  }

  async cleanup() {
    if (this.client) {
      await this.client.quit();
      console.log('👋 Redis connection closed');
    }
  }
}

module.exports = SessionStore;