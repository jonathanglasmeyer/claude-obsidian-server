import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

class SessionStore {
  constructor() {
    this.client = null;
    this.connected = false;
    // Fallback in-memory storage if Redis fails
    this.memoryChats = new Map();
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000,
          lazyConnect: true,
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
        setTimeout(() => resolve(false), 3000);
      });

      const result = await Promise.race([connectPromise.then(() => true), timeoutPromise]);
      
      if (result) {
        this.connected = true;
        return true;
      } else {
        console.warn('⚠️  Redis connection timed out - using memory storage');
        this.connected = false;
        return false;
      }
    } catch (error) {
      console.warn('⚠️  Failed to connect to Redis - using memory storage:', error.message);
      this.connected = false;
      return false;
    }
  }

  // Generate unique chat ID
  generateChatId() {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create new chat
  async createChat(title = 'New Chat') {
    const chatId = this.generateChatId();
    const chat = {
      id: chatId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    if (this.connected) {
      // Store in Redis with long TTL (24 hours)
      await this.client.setEx(`chat:${chatId}`, 86400, JSON.stringify(chat));
      
      // Add to chat list
      await this.client.sAdd('chats:list', chatId);
    } else {
      // Store in memory
      this.memoryChats.set(chatId, chat);
    }

    return chatId;
  }

  // List all chats
  async listChats() {
    if (this.connected) {
      try {
        const chatIds = await this.client.sMembers('chats:list');
        const chats = [];
        
        for (const chatId of chatIds) {
          const chatData = await this.client.get(`chat:${chatId}`);
          if (chatData) {
            const chat = JSON.parse(chatData);
            chats.push({
              id: chat.id,
              title: chat.title,
              createdAt: chat.createdAt,
              updatedAt: chat.updatedAt,
              messageCount: chat.messages?.length || 0
            });
          }
        }
        
        // Sort by updatedAt desc
        return chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } catch (error) {
        console.error('Error listing chats from Redis:', error);
        return [];
      }
    } else {
      // Return from memory
      const chats = Array.from(this.memoryChats.values()).map(chat => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages?.length || 0
      }));
      
      return chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
  }

  // Get chat messages
  async getChatMessages(chatId) {
    console.log('🔍 getChatMessages called - connected:', this.connected, 'chatId:', chatId);
    
    if (this.connected) {
      try {
        const chatData = await this.client.get(`chat:${chatId}`);
        if (!chatData) {
          console.log('❌ Chat not found in Redis:', chatId);
          return null; // Chat not found
        }
        const chat = JSON.parse(chatData);
        console.log('✅ Found chat in Redis with', chat.messages?.length || 0, 'messages');
        return chat.messages || [];
      } catch (error) {
        console.error('Error getting chat messages from Redis:', error);
        return null;
      }
    } else {
      // Get from memory
      console.log('⚠️ Using memory fallback for chat:', chatId);
      const chat = this.memoryChats.get(chatId);
      return chat ? chat.messages || [] : null;
    }
  }

  // Save chat messages (called from onFinish callback)
  // Returns the updated chat object with the generated title
  async saveChat(chatId, messages) {
    if (this.connected) {
      try {
        // Get existing chat or create new one
        let chatData = await this.client.get(`chat:${chatId}`);
        let chat;
        
        if (chatData) {
          chat = JSON.parse(chatData);
        } else {
          // Create new chat if doesn't exist
          chat = {
            id: chatId,
            title: this.generateTitleFromMessages(messages),
            createdAt: new Date().toISOString(),
            messages: []
          };
          // Add to chat list
          await this.client.sAdd('chats:list', chatId);
        }
        
        // Update messages and timestamp
        chat.messages = messages;
        chat.updatedAt = new Date().toISOString();
        
        // Update title if it's still the default and we have messages
        if (chat.title === 'New Chat' && messages.length > 0) {
          chat.title = this.generateTitleFromMessages(messages);
          console.log(`🏷️ Auto-generated title for chat ${chatId}: "${chat.title}"`);
        }
        
        // Save with extended TTL (24 hours)
        await this.client.setEx(`chat:${chatId}`, 86400, JSON.stringify(chat));
        
        console.log(`💾 Saved chat ${chatId} with ${messages.length} messages`);
        return chat; // Return the full chat object with updated title
      } catch (error) {
        console.error('Error saving chat to Redis:', error);
        return false;
      }
    } else {
      // Save to memory
      let chat = this.memoryChats.get(chatId);
      
      if (!chat) {
        chat = {
          id: chatId,
          title: this.generateTitleFromMessages(messages),
          createdAt: new Date().toISOString(),
          messages: []
        };
      }
      
      chat.messages = messages;
      chat.updatedAt = new Date().toISOString();
      
      // Update title if it's still the default and we have messages
      if (chat.title === 'New Chat' && messages.length > 0) {
        chat.title = this.generateTitleFromMessages(messages);
        console.log(`🏷️ Auto-generated title for chat ${chatId}: "${chat.title}" (memory)`);
      }
      
      this.memoryChats.set(chatId, chat);
      
      console.log(`💾 Saved chat ${chatId} with ${messages.length} messages (memory)`);
      return chat; // Return the full chat object with updated title
    }
  }

  // Delete chat
  async deleteChat(chatId) {
    if (this.connected) {
      try {
        const exists = await this.client.exists(`chat:${chatId}`);
        if (!exists) {
          return false;
        }
        
        await this.client.del(`chat:${chatId}`);
        await this.client.sRem('chats:list', chatId);
        
        console.log(`🗑️ Deleted chat: ${chatId}`);
        return true;
      } catch (error) {
        console.error('Error deleting chat from Redis:', error);
        return false;
      }
    } else {
      // Delete from memory
      const existed = this.memoryChats.has(chatId);
      this.memoryChats.delete(chatId);
      
      if (existed) {
        console.log(`🗑️ Deleted chat: ${chatId} (memory)`);
      }
      return existed;
    }
  }

  // Generate chat title from first user message
  generateTitleFromMessages(messages) {
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage && firstUserMessage.parts) {
      const textPart = firstUserMessage.parts.find(part => part.type === 'text');
      if (textPart && textPart.text) {
        const title = textPart.text.substring(0, 50).trim();
        return title.length < textPart.text.length ? title + '...' : title;
      }
    }
    return 'New Chat';
  }

  // Legacy methods (for compatibility - can be removed later)
  async createSession(data = {}) {
    console.warn('⚠️ createSession is deprecated, use createChat instead');
    return { id: this.generateChatId(), ...data };
  }

  async getSession(sessionId) {
    console.warn('⚠️ getSession is deprecated, use getChatMessages instead');
    const messages = await this.getChatMessages(sessionId);
    return messages ? { id: sessionId, messages } : null;
  }

  async cleanup() {
    if (this.client) {
      await this.client.quit();
      console.log('👋 Redis connection closed');
    }
    
    // Clear memory storage
    this.memoryChats.clear();
  }
}

export default SessionStore;