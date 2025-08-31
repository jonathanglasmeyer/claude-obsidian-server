import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { streamText } from 'ai';
import SessionStore from './session-store.js';
import AIService from './ai-service.js';
import SessionManager from './session-manager.js';
import { createClaudeProvider } from './claude-provider.js';

const app = express();
const PORT = process.env.PORT || 3000;
const sessionStore = new SessionStore();
let aiService = null;  // Initialize lazily
const sessionManager = new SessionManager();

function getAIService() {
  if (!aiService) {
    console.log('🔧 Initializing AI Service at runtime...');
    aiService = new AIService();
  }
  return aiService;
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    redis: sessionStore.connected
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Claude Obsidian Bridge Server',
    endpoints: {
      health: '/health',
      session: '/api/session (POST) - Create new session',
      sessionDetails: '/api/session/:id (GET) - Get session details',
      stream: '/api/session/:id/stream (GET) - AI streaming response',
      message: '/api/session/:id/message (POST) - Continue conversation',
      confirm: '/api/session/:id/confirm (POST) - Execute AI proposal'
    }
  });
});

// Session endpoints
app.post('/api/session', async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Create session with initial data
    const session = await sessionStore.createSession({
      content,
      type,
      status: 'created'
    });

    console.log(`📝 Created session ${session.id} for ${type} content`);

    // Start AI processing asynchronously
    setImmediate(async () => {
      try {
        await sessionStore.updateSession(session.id, { status: 'processing' });
        await sessionManager.createSession(session.id, content, type, sessionStore);
      } catch (error) {
        console.error(`❌ Error starting AI stream for session ${session.id}:`, error);
      }
    });

    res.json({ sessionId: session.id, status: 'created' });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.get('/api/session/:id', async (req, res) => {
  try {
    const session = await sessionStore.getSession(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Continue conversation endpoint
app.post('/api/session/:id/message', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`💬 Adding message to session ${sessionId}`);

    // Add user message to conversation history
    await sessionStore.addMessage(sessionId, {
      role: 'user',
      content: message
    });

    // Start AI processing for continuation
    setImmediate(async () => {
      try {
        await sessionStore.updateSession(sessionId, { status: 'processing' });
        
        // Get conversation history for context
        const messages = await sessionStore.getMessages(sessionId);
        await sessionManager.createSession(sessionId, message, 'continuation', sessionStore, messages);
      } catch (error) {
        console.error(`❌ Error continuing AI session for ${sessionId}:`, error);
      }
    });

    res.json({ sessionId, status: 'message_added', message: 'Continue via stream endpoint' });

  } catch (error) {
    console.error('Error adding message to session:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// SSE Stream endpoint
app.get('/api/session/:id/stream', async (req, res) => {
  const sessionId = req.params.id;
  
  try {
    // Verify session exists
    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    console.log(`🔄 AI SSE stream connection opened for session: ${sessionId}`);

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      sessionId,
      timestamp: new Date().toISOString() 
    })}\n\n`);

    // Wait for AI stream to be ready
    let retries = 0;
    const maxRetries = 30; // 15 seconds max wait
    
    while (retries < maxRetries) {
      const currentSession = await sessionStore.getSession(sessionId);
      
      if (currentSession.status === 'error') {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: currentSession.error || 'Unknown error occurred',
          timestamp: new Date().toISOString()
        })}\n\n`);
        return;
      }
      
      if (currentSession.status === 'streaming') {
        const activeSession = sessionManager.getActiveStream(sessionId);
        
        if (activeSession && activeSession.aiStream) {
          console.log(`🤖 Starting AI stream for session: ${sessionId}`);
          
          try {
            // Stream AI responses in real-time
            for await (const chunk of activeSession.aiStream.textStream) {
              res.write(`data: ${JSON.stringify({
                type: 'chunk',
                content: chunk,
                timestamp: new Date().toISOString()
              })}\n\n`);
            }
            
            // Stream completed
            res.write(`data: ${JSON.stringify({
              type: 'completed',
              timestamp: new Date().toISOString()
            })}\n\n`);
            
            await sessionManager.completeSession(sessionId, sessionStore);
            return;
            
          } catch (streamError) {
            console.error(`❌ Error streaming AI response:`, streamError);
            res.write(`data: ${JSON.stringify({
              type: 'error',
              message: 'Streaming error: ' + streamError.message,
              timestamp: new Date().toISOString()
            })}\n\n`);
            
            await sessionManager.failSession(sessionId, sessionStore, streamError.message);
            return;
          }
        }
      }
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }
    
    // Timeout waiting for AI stream
    res.write(`data: ${JSON.stringify({
      type: 'error', 
      message: 'Timeout waiting for AI response',
      timestamp: new Date().toISOString()
    })}\n\n`);

  } catch (error) {
    console.error('Error setting up AI SSE stream:', error);
    res.status(500).json({ error: 'Failed to setup stream' });
  }
  
  // Handle connection cleanup
  req.on('close', () => {
    console.log(`❌ AI SSE connection closed for session: ${sessionId}`);
  });
});

// Confirmation endpoint
app.post('/api/session/:id/confirm', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { action = 'confirm' } = req.body;
    
    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`✅ Processing confirmation for session ${sessionId} with action: ${action}`);

    // Update session status
    await sessionStore.updateSession(sessionId, {
      status: 'confirming',
      action,
      confirmedAt: new Date().toISOString()
    });

    // Execute the AI proposal
    try {
      const result = await getAIService().executeProposal(session, action);
      
      await sessionStore.updateSession(sessionId, {
        status: result.success ? 'executed' : 'failed',
        result: result,
        executedAt: new Date().toISOString()
      });

      res.json({ 
        sessionId, 
        status: result.success ? 'executed' : 'failed',
        message: result.message,
        result: result
      });

    } catch (executionError) {
      console.error(`❌ Error executing AI proposal for session ${sessionId}:`, executionError);
      
      await sessionStore.updateSession(sessionId, {
        status: 'failed',
        error: executionError.message,
        failedAt: new Date().toISOString()
      });

      res.status(500).json({ 
        error: 'Failed to execute proposal',
        details: executionError.message 
      });
    }

  } catch (error) {
    console.error('Error confirming session:', error);
    res.status(500).json({ error: 'Failed to confirm session' });
  }
});

// Direct AI SDK v5 endpoint - no session management, direct streaming
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('🤖 AI SDK v5 chat request with', messages.length, 'messages');
    console.log('📝 Message format:', JSON.stringify(messages[0], null, 2));
    
    // Create provider directly to bypass AIService issues
    const claudeProvider = createClaudeProvider();
    
    // Convert UIMessages to CoreMessages format manually
    const coreMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.parts?.map(part => part.text).join('') || msg.content || ''
    }));
    
    const result = streamText({
      model: claudeProvider,
      messages: coreMessages,
      maxTokens: 4000,
      onError: ({ error }) => {
        console.error('🚨 StreamText error (suppressed):', error);
      }
    });

    // Use AI SDK's UI Message Stream Response for useChat compatibility
    const streamResponse = result.toUIMessageStreamResponse();
    
    // Copy headers from AI SDK response
    for (const [key, value] of streamResponse.headers.entries()) {
      res.setHeader(key, value);
    }
    
    console.log('📤 Using AI SDK native toUIMessageStreamResponse');
    
    // Stream the response
    const reader = streamResponse.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      console.log('📤 Stream completed with UI message format');
      res.end();
    } catch (streamError) {
      console.error('❌ Stream iteration error:', streamError);
      reader.releaseLock();
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed', details: streamError.message });
      }
    }
    
  } catch (error) {
    console.error('❌ AI SDK v5 chat error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'AI chat request failed',
        details: error.message 
      });
    }
  }
});

// Start server and connect to Redis
async function startServer() {
  try {
    // Try to connect to Redis but continue without it
    const connected = await sessionStore.connect();
    if (!connected) {
      console.warn('⚠️  Redis not available - sessions will be stored in memory only');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      sessionManager.shutdown();
      await sessionStore.cleanup();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();