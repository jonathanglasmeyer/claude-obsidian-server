import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { streamText } from 'ai';
import { createClaudeProvider } from './claude-provider.js';
import SessionStore from './session-store.js';
import { extractDeltaFromChunk } from './delta-extractor.js';

const app = express();
const PORT = process.env.PORT || 3000;
const sessionStore = new SessionStore();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    redis: sessionStore.connected
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Claude Obsidian Bridge Server v2.0',
    endpoints: {
      health: '/health',
      chat: '/api/chat - Direct AI SDK v5 streaming',
      chats: '/api/chats - List all chats',
      createChat: '/api/chats (POST) - Create new chat',
      chatMessages: '/api/chats/:id/messages - Get chat history',
      deleteChat: '/api/chats/:id (DELETE) - Delete chat'
    }
  });
});

// Direct AI SDK v5 chat endpoint (main chat interface)  
app.post('/api/chat', async (req, res) => {
  try {
    console.log('🔍 Raw request debugging:');
    console.log('  - Content-Type:', req.headers['content-type']);
    console.log('  - Body exists:', !!req.body);
    console.log('  - Body type:', typeof req.body);
    console.log('  - Body content:', JSON.stringify(req.body, null, 2));
    
    // Handle missing body gracefully
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const { messages, id: chatId } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('💬 AI chat request - chatId:', chatId, 'messages:', messages.length);
    
    // The AI SDK useChat hook already sends the complete conversation
    // No need to load and append existing messages - that causes duplication!
    let allMessages = messages;
    console.log('💬 Processing', allMessages.length, 'messages from AI SDK useChat');
    
    // Create Claude provider
    const claudeProvider = createClaudeProvider();
    
    // Convert AI SDK v5 UIMessages to CoreMessages format for Claude API
    const coreMessages = allMessages.map(msg => ({
      role: msg.role,
      content: msg.parts?.map(part => {
        if (part.type === 'text') return part.text;
        return ''; // Handle other part types if needed
      }).join('') || ''
    }));
    
    const result = streamText({
      model: claudeProvider,
      messages: coreMessages,
      maxTokens: 4000,
      tools: {}, // Enable tool calling (Claude Code provider handles tool registration)
    });

    // Use simple AI SDK UI Message Stream Response (like working version)
    const streamResponse = result.toUIMessageStreamResponse();
    
    // Copy headers from AI SDK response
    for (const [key, value] of streamResponse.headers.entries()) {
      res.setHeader(key, value);
    }
    
    console.log('📤 Using AI SDK native toUIMessageStreamResponse');
    
    // Stream the response through Express with session persistence
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    
    async function streamToExpress() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
          
          // Extract assistant message content for persistence
          const deltaText = extractDeltaFromChunk(chunk);
          if (deltaText !== null) {
            assistantMessage += deltaText;
          }
        }
        res.end();
        
        // Save conversation after streaming completes
        if (chatId && assistantMessage) {
          console.log('💾 Saving chat:', chatId, 'after streaming completion');
          // Save the complete conversation including the new assistant message
          // Use AI SDK v5 parts format
          const finalMessages = [
            ...allMessages,
            { 
              role: 'assistant', 
              parts: [{ type: 'text', text: assistantMessage }] 
            }
          ];
          console.log('💾 Saving', finalMessages.length, 'total messages');
          const updatedChat = await sessionStore.saveChat(chatId, finalMessages);
        }
      } catch (error) {
        console.error('❌ Streaming error:', error);
        res.end();
      }
    }
    
    streamToExpress();
    
  } catch (error) {
    console.error('❌ AI chat error:', error);
    return res.status(500).json({ 
      error: 'AI chat request failed',
      details: error.message 
    });
  }
});

// Chat management endpoints

// List all chats
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await sessionStore.listChats();
    res.json(chats);
  } catch (error) {
    console.error('❌ Error listing chats:', error);
    res.status(500).json({ error: 'Failed to list chats' });
  }
});

// Create new chat
app.post('/api/chats', async (req, res) => {
  try {
    const { title = 'New Chat' } = req.body;
    const chatId = await sessionStore.createChat(title);
    
    console.log('📝 Created new chat:', chatId);
    res.json({ chatId, title, createdAt: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Get chat messages
app.get('/api/chats/:id/messages', async (req, res) => {
  try {
    const chatId = req.params.id;
    const messages = await sessionStore.getChatMessages(chatId);
    
    if (messages === null) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ chatId, messages });
  } catch (error) {
    console.error('❌ Error getting chat messages:', error);
    res.status(500).json({ error: 'Failed to get chat messages' });
  }
});

// Delete chat
app.delete('/api/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const deleted = await sessionStore.deleteChat(chatId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    console.log('🗑️ Deleted chat:', chatId);
    res.json({ chatId, deleted: true });
  } catch (error) {
    console.error('❌ Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Start server and connect to Redis
async function startServer() {
  try {
    // Connect to Redis
    const connected = await sessionStore.connect();
    if (!connected) {
      console.warn('⚠️  Redis not available - using memory storage');
    } else {
      console.log('✅ Redis connected');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server v2.0 running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`💬 Direct AI SDK chat: POST http://localhost:${PORT}/api/chat`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await sessionStore.cleanup();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();