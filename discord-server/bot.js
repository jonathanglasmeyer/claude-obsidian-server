import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local first (dev), fallback to .env (production)
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config(); // Fallback for vars not in .env.local

import express from 'express';

// File logging only for local development
// Production uses Docker logs (docker compose logs -f)

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonStyle,
  ButtonBuilder,
  MessageFlags,
  SlashCommandBuilder,
  REST,
  Routes
} from 'discord.js';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { RedisThreadManager } from './lib/RedisThreadManager.js';
import { ResponseFormatter } from './lib/ResponseFormatter.js';
import { ComponentsResponseFormatter } from './lib/ComponentsResponseFormatter.js';
import { ErrorHandler } from './lib/ErrorHandler.js';
import { ProgressReporter } from './lib/ProgressReporter.js';
import ThreadNamer from './lib/ThreadNamer.js';
import { PerformanceTracer } from './lib/PerformanceTracer.js';
import ClaudeSessionPool from './lib/ClaudeSessionPool.js';
import { buildStructuredPrompt } from './lib/MessageBuilder.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize all components (threadManager will get Discord client after ready)
let threadManager;
let sessionPool;
const responseFormatter = new ResponseFormatter();
const componentsFormatter = new ComponentsResponseFormatter();
const errorHandler = new ErrorHandler();
const threadNamer = new ThreadNamer();

// Active streams tracking for /stop command
// Maps thread ID to { stream, userId, startTime }
const activeStreams = new Map();

// Slash Commands Definition
const commands = [
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stoppt die laufende Claude-Anfrage in diesem Thread')
    .toJSON()
];

// Register slash commands with Discord
async function registerCommands() {
  try {
    console.log('🔄 Registering slash commands with Discord...');

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    // Get application ID from client after ready
    const applicationId = client.application.id;

    await rest.put(
      Routes.applicationCommands(applicationId),
      { body: commands }
    );

    console.log('✅ Slash commands registered successfully');
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
}

// HTTP Server for health checks and management endpoints
const app = express();
app.use(express.json());

client.on('clientReady', async () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  console.log(`📥 Monitoring channel: ${process.env.DISCORD_INBOX_CHANNEL_ID}`);

  try {
    // Register slash commands
    await registerCommands();

    console.log('🔄 Initializing ThreadManager...');

    // Initialize thread manager with Discord client for archiving
    threadManager = new RedisThreadManager(client);

    console.log('🔄 Starting fallback cleanup...');

    // Start fallback cleanup scheduler (includes startup cleanup)
    await threadManager.startFallbackCleanup();

    console.log('🚀 Initializing Claude Session Pool...');

    // Initialize session pool with the same Redis client as thread manager
    sessionPool = new ClaudeSessionPool(threadManager.client);

    console.log('✅ Bot initialization complete with session pooling');

  } catch (error) {
    console.error('❌ Bot initialization failed:', error);
  }
});

client.on('messageCreate', async (message) => {
  // Skip bots
  if (message.author.bot) return;

  // Wait for components to be initialized
  if (!threadManager || !sessionPool) {
    console.log('⏳ Components not yet initialized, skipping message');
    return;
  }

  // Process messages in inbox channel OR threads created from inbox channel
  const isInboxChannel = message.channel.id === process.env.DISCORD_INBOX_CHANNEL_ID;
  const isInboxThread = message.channel.isThread() &&
                        message.channel.parent?.id === process.env.DISCORD_INBOX_CHANNEL_ID;

  if (!isInboxChannel && !isInboxThread) return;

  // Build structured prompt with text, images, and documents
  const structuredPrompt = await buildStructuredPrompt(message);

  console.log(`📝 Processing message from ${message.author.tag}: ${message.content}`);
  if (structuredPrompt.hasImages) {
    console.log(`🖼️  Found ${structuredPrompt.images.length} image(s): ${structuredPrompt.images.map(i => i.name).join(', ')}`);
  }
  if (structuredPrompt.hasDocuments) {
    console.log(`📄 Found ${structuredPrompt.documents.length} document(s): ${structuredPrompt.documents.map(d => d.name).join(', ')}`);
  }

  // Initialize performance tracing
  const tracer = new PerformanceTracer();
  tracer.addMetadata('userId', message.author.id)
        .addMetadata('username', message.author.tag)
        .addMetadata('messageLength', message.content.length)
        .addMetadata('channelType', isInboxChannel ? 'inbox' : 'thread');

  let thread;

  try {

    tracer.startPhase('thread_creation', {
      isNewThread: isInboxChannel,
      channelId: message.channel.id
    });

    if (isInboxChannel) {
      // Create new thread immediately
      thread = await threadNamer.createThreadImmediate(message);
      tracer.addMetadata('threadId', thread.id);
    } else {
      // Use existing thread for thread messages
      thread = message.channel;
      tracer.addMetadata('threadId', thread.id);
    }

    tracer.endPhase({ threadName: thread.name });

    // Start progress reporting with typing indicator
    tracer.startPhase('progress_start');
    const progressReporter = new ProgressReporter(thread);
    await progressReporter.start();
    tracer.endPhase();

    // Build conversation context - use structured prompt for images and documents
    // Skip conversation context building - sessions handle context
    tracer.endPhase({
      promptLength: structuredPrompt.text.length,
      promptPreview: structuredPrompt.text.slice(0, 100) + '...',
      hasImages: structuredPrompt.hasImages,
      imageCount: structuredPrompt.images.length,
      hasDocuments: structuredPrompt.hasDocuments,
      documentCount: structuredPrompt.documents.length
    });

    // Process with Claude Code SDK with retry logic
    console.log('🤖 Calling Claude with conversation context...');

    tracer.startPhase('claude_sdk_call', {
      promptLength: structuredPrompt.text.length,
      hasImages: structuredPrompt.hasImages,
      imageCount: structuredPrompt.images.length,
      hasDocuments: structuredPrompt.hasDocuments,
      documentCount: structuredPrompt.documents.length,
      vaultPath: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault'
    });

    const claudeResult = await errorHandler.retryOperation(async () => {
      // Use session pool instead of direct query
      // Pass structured prompt for image support
      const stream = await sessionPool.processMessage(thread.id, structuredPrompt);

      // Register stream for /stop command
      activeStreams.set(thread.id, {
        stream,
        userId: message.author.id,
        startTime: Date.now()
      });

      console.log(`📋 Registered active stream for thread ${thread.id}`);

      let fullResponse = '';
      let usage = null;
      let duration = null;
      let sessionId = null;
      let toolCalls = [];
      let streamStartTime = performance.now();
      let wasInterrupted = false;

      // Tool deduplication for display (not execution)
      const reportedTools = new Set();

      try {
        for await (const msg of stream) {
        // Debug: log all message types to understand Claude stream
        console.log(`🔍 Claude stream message type: ${msg.type}`, Object.keys(msg));

        // Enhanced debugging for assistant messages to see content structure
        if (msg.type === 'assistant' && msg.message?.content) {
          console.log(`📝 Assistant content blocks:`, msg.message.content.map(c => ({ type: c.type, hasText: !!c.text, hasName: !!c.name, hasInput: !!c.input })));
        }

        if (msg.type === 'system') {
          sessionId = msg.session_id;
          console.log(`📋 Claude session: ${msg.session_id}`);
        }

        if (msg.type === 'assistant') {
          // Check for tool use within assistant messages
          if (msg.message && msg.message.content) {
            for (const contentBlock of msg.message.content) {
              if (contentBlock.type === 'tool_use') {
                // Debug: Log available IDs in contentBlock
                console.log(`🔍 Tool block IDs:`, {
                  id: contentBlock.id,
                  tool_use_id: contentBlock.tool_use_id,
                  parent_tool_use_id: msg.parent_tool_use_id,
                  uuid: msg.uuid,
                  keys: Object.keys(contentBlock)
                });

                // Use tool_use_id if available, fallback to content hash
                const toolId = contentBlock.id || contentBlock.tool_use_id || `${contentBlock.name}-${JSON.stringify(contentBlock.input)}`;

                if (reportedTools.has(toolId)) {
                  console.log(`⚠️ Skipping duplicate tool display: ${contentBlock.name} (ID: ${toolId})`);
                  continue;
                }

                reportedTools.add(toolId);
                console.log(`🛠️ Tool call detected: ${contentBlock.name} (ID: ${toolId})`);
                toolCalls.push({
                  name: contentBlock.name,
                  timestamp: performance.now(),
                  input: contentBlock.input
                });
                await progressReporter.reportToolUse(contentBlock.name, contentBlock.input);
              }
              if (contentBlock.type === 'text') {
                fullResponse += contentBlock.text;
              }
            }
          }
        }

        if (msg.type === 'tool_use') {
          // Direct tool_use events (alternative structure)
          console.log(`🛠️ Direct tool call detected: ${msg.name || msg.tool_name}`);
          await progressReporter.reportToolUse(
            msg.name || msg.tool_name,
            msg.input || msg.tool_input
          );
        }

        if (msg.type === 'tool_result') {
          // Log tool results for debugging
          console.log(`🔧 Tool result for ${msg.tool_use_id}:`, msg.content?.slice(0, 100));
        }

        if (msg.type === 'result') {
          fullResponse = msg.result;
          usage = msg.usage;
          duration = msg.duration_ms;
          break;
        }
        }
      } catch (error) {
        // Stream was interrupted or errored
        if (error.name === 'AbortError' || error.message?.includes('interrupt')) {
          console.log('🛑 Stream was interrupted by user');
          wasInterrupted = true;
        } else {
          throw error; // Re-throw non-interrupt errors
        }
      }

      const streamDuration = performance.now() - streamStartTime;
      return {
        fullResponse: fullResponse || '',
        usage,
        duration,
        sessionId,
        toolCalls: toolCalls || [],
        streamDuration,
        wasInterrupted
      };
    }, {
      context: 'Claude processing',
      maxRetries: 3
    });

    const { fullResponse, usage, duration, sessionId, toolCalls, streamDuration, wasInterrupted } = claudeResult;

    // Update session ID in session pool if we got one
    if (sessionId) {
      await sessionPool.updateSessionId(thread.id, sessionId);
    }

    tracer.endPhase({
      responseLength: fullResponse?.length || 0,
      toolCallCount: toolCalls?.length || 0,
      sessionId: sessionId,
      claudeDuration: duration,
      streamDuration: streamDuration,
      tokensUsed: usage?.total_tokens || 0
    });

    // Stop progress reporting
    tracer.startPhase('progress_stop');
    progressReporter.stop();
    tracer.endPhase();

    // If stream was interrupted or response is empty, don't send
    // The /stop command already sent a reply
    if (wasInterrupted || !fullResponse || fullResponse.trim() === '') {
      console.log('🛑 Stream interrupted or empty response, skipping send');
      tracer.addMetadata('interrupted', wasInterrupted);
      tracer.addMetadata('emptyResponse', !fullResponse || fullResponse.trim() === '');
      return;
    }

    // Prepare stats for Components v2
    const progressToolCalls = progressReporter.toolCalls || [];
    const stats = {
      duration: duration,
      tokens: usage,
      toolCount: progressToolCalls.length
    };

    console.log('📊 Progress stats:', progressReporter.getStats());

    // Try Components v2 first, fallback to chunking if needed
    tracer.startPhase('response_formatting', {
      responseLength: fullResponse.length,
      toolCallCount: progressToolCalls.length
    });

    if (componentsFormatter.shouldUseComponents(fullResponse, progressToolCalls)) {
      try {
        const componentsMessage = await componentsFormatter.formatResponse(fullResponse, progressToolCalls);
        tracer.endPhase({ formatType: 'components_v2' });

        tracer.startPhase('discord_send');
        await thread.send(componentsMessage);
        tracer.endPhase({ messageType: 'components' });
      } catch (error) {
        console.error('Components v2 failed, falling back to chunking:', error);
        tracer.endPhase({ formatType: 'components_v2_failed', error: error.message });

        // Fallback to chunking
        tracer.startPhase('response_formatting_fallback');
        await sendFallbackChunked(thread, fullResponse, usage, duration);
        tracer.endPhase({ formatType: 'chunked_fallback' });
      }
    } else {
      // Use traditional chunking for simple responses
      const chunks = responseFormatter.chunkResponse(fullResponse);
      tracer.endPhase({
        formatType: 'chunked',
        chunkCount: chunks.length
      });

      tracer.startPhase('discord_send_chunked');
      await sendFallbackChunked(thread, fullResponse, usage, duration);
      tracer.endPhase({
        messageType: 'chunked',
        chunkCount: chunks.length
      });
    }

    // Store conversation history
    tracer.startPhase('conversation_history');
    // Session handles conversation context - no need to track messages separately
    tracer.endPhase();

    console.log('✅ Response sent to Discord');

    // Step 2: Smart thread renaming (sequential, after main processing)
    if (isInboxChannel) {
      tracer.startPhase('thread_renaming');
      await threadNamer.renameThreadAfterProcessing(thread, message.content);
      tracer.endPhase();
    }

    // Generate and log final performance report
    const performanceReport = tracer.logReport();

    // Add performance report to final console output
    console.log(`\n🎯 Total Request Time: ${performanceReport.totalDurationFormatted} (${performanceReport.summary.efficiency})`);
    if (performanceReport.summary.claudePercentage) {
      console.log(`🤖 Claude Processing: ${performanceReport.summary.claudePercentage}% of total time`);
    }

  } catch (error) {
    // Stop progress reporting on error
    if (typeof progressReporter !== 'undefined') {
      progressReporter.stop();
    }

    // Log error performance report
    if (typeof tracer !== 'undefined') {
      tracer.addMetadata('error', true);
      tracer.addMetadata('errorType', error.constructor.name);
      tracer.addMetadata('errorMessage', error.message);

      const errorReport = tracer.logReport();
      console.log(`💥 Request failed after ${errorReport.totalDurationFormatted}`);
    }

    // Generate unique error ID for tracking
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Log error with full context
    errorHandler.logError(error, {
      errorId,
      userId: message.author.id,
      username: message.author.tag,
      threadId: thread?.id,
      channelId: message.channel.id,
      messageContent: message.content.slice(0, 100), // First 100 chars for context
      messageLength: message.content.length,
      timestamp: Date.now()
    });

    // Create user-friendly error embed
    const errorEmbed = errorHandler.createErrorEmbed(error, {
      errorId,
      userId: message.author.id
    });

    if (thread) {
      try {
        await thread.send({ embeds: [new EmbedBuilder(errorEmbed)] });
      } catch (discordError) {
        // Log Discord error separately
        errorHandler.logError(discordError, {
          errorId: errorId + '_discord',
          originalErrorId: errorId,
          userId: message.author.id,
          threadId: thread?.id,
          context: 'Failed to send error message to Discord'
        });

        console.error('💥 Failed to send error to Discord - this is bad!');
      }
    }
  } finally {
    // Always cleanup stream from active streams map
    if (thread?.id && activeStreams.has(thread.id)) {
      activeStreams.delete(thread.id);
      console.log(`🧹 Cleaned up active stream for thread ${thread.id}`);
    }
  }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'stop') {
    const threadId = interaction.channel?.isThread() ? interaction.channel.id : null;

    if (!threadId) {
      await interaction.reply({
        content: '❌ /stop kann nur in Threads verwendet werden',
        ephemeral: true
      });
      return;
    }

    const activeStream = activeStreams.get(threadId);

    if (!activeStream) {
      await interaction.reply({
        content: '❌ Keine aktive Claude-Anfrage in diesem Thread',
        ephemeral: true
      });
      return;
    }

    // Verify user owns this stream
    if (activeStream.userId !== interaction.user.id) {
      await interaction.reply({
        content: '❌ Du kannst nur deine eigenen Anfragen stoppen',
        ephemeral: true
      });
      return;
    }

    try {
      console.log(`🛑 User ${interaction.user.tag} stopping stream in thread ${threadId} via slash command`);

      // Interrupt only the current stream (NOT the session!)
      await activeStream.stream.interrupt();

      // Remove from active streams
      activeStreams.delete(threadId);

      await interaction.reply({
        content: 'Interrupted · What should Claude do instead?',
        ephemeral: false
      });

    } catch (error) {
      console.error('❌ Error stopping stream:', error);
      await interaction.reply({
        content: '❌ Fehler beim Stoppen der Anfrage',
        ephemeral: true
      });
    }
  }
});

/**
 * Fallback function for traditional chunking when Components v2 fails
 */
async function sendFallbackChunked(thread, fullResponse, usage, duration) {
  const chunks = responseFormatter.chunkResponse(fullResponse);
  const chunkingStats = responseFormatter.getChunkingStats(fullResponse, chunks);

  console.log('📊 Response chunking stats:', chunkingStats);

  if (chunks.length === 1) {
    // Single response - send as simple text
    await thread.send(fullResponse);
  } else {
    // Multi-part response - send chunks with delay
    await responseFormatter.sendChunkedResponse(
      async (content) => {
        return await errorHandler.retryOperation(
          () => thread.send(content),
          { context: 'Discord message send', maxRetries: 2 }
        );
      },
      chunks
    );
  }
}

// HTTP Endpoints
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    discord: {
      connected: client.isReady(),
      user: client.user?.tag || null,
      guilds: client.guilds.cache.size,
      channels: client.channels.cache.size
    },
    redis: {
      connected: !!threadManager?.client?.isReady
    },
    threads: threadManager ? (await threadManager.getStats()).activeThreads : 0,
    sessions: sessionPool ? sessionPool.getPoolStats() : null
  };

  res.json(health);
});

// Claude SDK health check - pings Claude Agent SDK with simple query
app.get('/health/claude', async (req, res) => {
  try {
    console.log('🏥 Claude SDK health check requested');

    const stream = query({
      prompt: 'What is 2+3? Reply with only the number.',
      options: {
        cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault',
        model: 'claude-sonnet-4-5-20250929',
        systemPrompt: { type: 'preset', preset: 'claude_code' }
      }
    });

    let response = '';
    let sessionId = null;
    const startTime = Date.now();

    for await (const event of stream) {
      if (event.type === 'system' && event.session_id) {
        sessionId = event.session_id;
      }
      if (event.type === 'result') {
        response = event.result;
        break;
      }
    }

    const duration = Date.now() - startTime;

    res.json({
      status: 'healthy',
      sdk: '@anthropic-ai/claude-agent-sdk',
      version: '0.1.9',
      sessionId,
      response: response.slice(0, 200),
      durationMs: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Claude SDK health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      sdk: '@anthropic-ai/claude-agent-sdk',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/admin/cleanup-threads', async (req, res) => {
  try {
    if (!threadManager) {
      return res.status(503).json({ error: 'ThreadManager not initialized' });
    }

    console.log('🧹 Manual thread cleanup requested via API');

    const inboxChannel = client.channels.cache.get(process.env.DISCORD_INBOX_CHANNEL_ID);
    if (!inboxChannel) {
      return res.status(404).json({ error: 'Inbox channel not found' });
    }

    // Get all threads in the inbox channel
    const threads = await inboxChannel.threads.fetchActive();
    const archivedThreads = await inboxChannel.threads.fetchArchived();

    const allThreads = [...threads.threads.values(), ...archivedThreads.threads.values()];
    const deletedThreads = [];

    console.log(`🔍 Found ${allThreads.length} total threads to evaluate`);

    for (const thread of allThreads) {
      try {
        console.log(`🗑️ Deleting thread: ${thread.name} (${thread.id})`);
        await thread.delete('Manual cleanup via API');
        deletedThreads.push({ id: thread.id, name: thread.name });

        // Clean up session data
        if (sessionPool) {
          await sessionPool.cleanupSession(thread.id);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to delete thread ${thread.id}:`, error.message);
      }
    }

    console.log(`✅ Thread cleanup completed: ${deletedThreads.length} threads deleted`);

    res.json({
      success: true,
      deleted: deletedThreads.length,
      threads: deletedThreads
    });

  } catch (error) {
    console.error('❌ Thread cleanup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start HTTP server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🏥 Health server listening on port ${PORT}`);
});

// Login
// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');

  if (sessionPool) {
    await sessionPool.shutdown();
  }

  if (client) {
    await client.destroy();
  }

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');

  if (sessionPool) {
    await sessionPool.shutdown();
  }

  if (client) {
    await client.destroy();
  }

  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);