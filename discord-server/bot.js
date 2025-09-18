import dotenv from 'dotenv';
dotenv.config();

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
  MessageFlags
} from 'discord.js';
import { query } from '@anthropic-ai/claude-code';
import { RedisThreadManager } from './lib/RedisThreadManager.js';
import { ResponseFormatter } from './lib/ResponseFormatter.js';
import { ComponentsResponseFormatter } from './lib/ComponentsResponseFormatter.js';
import { ErrorHandler } from './lib/ErrorHandler.js';
import { ProgressReporter } from './lib/ProgressReporter.js';
import ThreadNamer from './lib/ThreadNamer.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize all components
const threadManager = new RedisThreadManager();
const responseFormatter = new ResponseFormatter();
const componentsFormatter = new ComponentsResponseFormatter();
const errorHandler = new ErrorHandler();
const threadNamer = new ThreadNamer();

// Cleanup old conversations every hour
setInterval(async () => {
  await threadManager.cleanup();
}, 60 * 60 * 1000);

client.on('clientReady', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  console.log(`📥 Monitoring channel: ${process.env.DISCORD_INBOX_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
  // Skip bots
  if (message.author.bot) return;

  // Process messages in inbox channel OR threads created from inbox channel
  const isInboxChannel = message.channel.id === process.env.DISCORD_INBOX_CHANNEL_ID;
  const isInboxThread = message.channel.isThread() &&
                        message.channel.parent?.id === process.env.DISCORD_INBOX_CHANNEL_ID;

  if (!isInboxChannel && !isInboxThread) return;

  console.log(`📝 Processing message from ${message.author.tag}: ${message.content}`);


  let thread;

  try {

    if (isInboxChannel) {
      // Create new thread immediately
      thread = await threadNamer.createThreadImmediate(message);
    } else {
      // Use existing thread for thread messages
      thread = message.channel;
    }

    // Start progress reporting with typing indicator
    const progressReporter = new ProgressReporter(thread);
    await progressReporter.start();

    // Build conversation context
    const conversationPrompt = await threadManager.buildConversationPrompt(thread.id, message.content);

    // Process with Claude Code SDK with retry logic
    console.log('🤖 Calling Claude with conversation context...');

    const claudeResult = await errorHandler.retryOperation(async () => {
      const stream = query({
        prompt: conversationPrompt,
        options: {
          cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault'
        }
      });

      let fullResponse = '';
      let usage = null;
      let duration = null;

      for await (const msg of stream) {
        // Debug: log all message types to understand Claude stream
        console.log(`🔍 Claude stream message type: ${msg.type}`, Object.keys(msg));

        // Enhanced debugging for assistant messages to see content structure
        if (msg.type === 'assistant' && msg.message?.content) {
          console.log(`📝 Assistant content blocks:`, msg.message.content.map(c => ({ type: c.type, hasText: !!c.text, hasName: !!c.name, hasInput: !!c.input })));
        }

        if (msg.type === 'system') {
          console.log(`📋 Claude session: ${msg.session_id}`);
        }

        if (msg.type === 'assistant') {
          // Check for tool use within assistant messages
          if (msg.message && msg.message.content) {
            for (const contentBlock of msg.message.content) {
              if (contentBlock.type === 'tool_use') {
                console.log(`🛠️ Tool call detected: ${contentBlock.name}`);
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

      return { fullResponse, usage, duration };
    }, {
      context: 'Claude processing',
      maxRetries: 3
    });

    const { fullResponse, usage, duration } = claudeResult;

    // Stop progress reporting
    progressReporter.stop();

    // Prepare stats for Components v2
    const toolCalls = progressReporter.toolCalls || [];
    const stats = {
      duration: duration,
      tokens: usage,
      toolCount: toolCalls.length
    };

    console.log('📊 Progress stats:', progressReporter.getStats());

    // Try Components v2 first, fallback to chunking if needed
    if (componentsFormatter.shouldUseComponents(fullResponse, toolCalls)) {
      try {
        const componentsMessage = await componentsFormatter.formatResponse(fullResponse, toolCalls);
        await thread.send(componentsMessage);
      } catch (error) {
        console.error('Components v2 failed, falling back to chunking:', error);
        // Fallback to chunking
        await sendFallbackChunked(thread, fullResponse, usage, duration);
      }
    } else {
      // Use traditional chunking for simple responses
      await sendFallbackChunked(thread, fullResponse, usage, duration);
    }

    // Store conversation history
    await threadManager.addMessage(thread.id, 'user', message.content);
    await threadManager.addMessage(thread.id, 'assistant', fullResponse);

    console.log('✅ Response sent to Discord');
    console.log(`📊 Thread stats:`, await threadManager.getStats());

    // Step 2: Smart thread renaming (sequential, after main processing)
    if (isInboxChannel) {
      await threadNamer.renameThreadAfterProcessing(thread, message.content);
    }

  } catch (error) {
    // Stop progress reporting on error
    if (typeof progressReporter !== 'undefined') {
      progressReporter.stop();
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

// Login
client.login(process.env.DISCORD_BOT_TOKEN);