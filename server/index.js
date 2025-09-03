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
const API_SECRET_KEY = process.env.API_SECRET_KEY;
const sessionStore = new SessionStore();

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  // Skip validation for health check endpoint
  if (req.path === '/health') {
    return next();
  }

  if (!API_SECRET_KEY) {
    console.error('❌ API_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const clientApiKey = req.headers['x-api-key'];
  if (!clientApiKey || clientApiKey !== API_SECRET_KEY) {
    console.log('🔒 Unauthorized request - invalid or missing API key');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(validateApiKey);

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
      updateChat: '/api/chats/:id (PUT) - Update chat (rename)',
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
    
    // Provide specific error messages for common Claude issues
    let errorMessage = 'AI chat request failed';
    let statusCode = 500;
    
    if (error.message.includes('CLAUDE AUTHENTICATION')) {
      errorMessage = 'Claude AI authentication error';
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes('VAULT')) {
      errorMessage = 'Vault access error';
      statusCode = 503;
    } else if (error.message.includes('Claude Code process exited with code 1')) {
      errorMessage = 'Claude AI service error - likely authentication or configuration issue';
      statusCode = 503;
    }
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
      suggestion: statusCode === 503 ? 'This appears to be a server configuration issue. Please contact support.' : null
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

// Get single chat
app.get('/api/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const chat = await sessionStore.getChat(chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json(chat);
  } catch (error) {
    console.error('❌ Error getting chat:', error);
    res.status(500).json({ error: 'Failed to get chat' });
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

// Update chat (for rename)
app.put('/api/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const updates = req.body;
    
    // Validate updates
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Updates are required' });
    }
    
    const updatedChat = await sessionStore.updateChat(chatId, updates);
    
    if (!updatedChat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    console.log('✏️ Updated chat:', chatId, Object.keys(updates));
    res.json(updatedChat);
  } catch (error) {
    console.error('❌ Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server v2.0 running on port ${PORT} (all interfaces)`);
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