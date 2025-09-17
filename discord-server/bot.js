import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { query } from '@anthropic-ai/claude-code';
import { ThreadManager } from './lib/ThreadManager.js';
import { ResponseFormatter } from './lib/ResponseFormatter.js';
import { ErrorHandler } from './lib/ErrorHandler.js';
import { ProgressReporter } from './lib/ProgressReporter.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize ThreadManager, ResponseFormatter and ErrorHandler
const threadManager = new ThreadManager();
const responseFormatter = new ResponseFormatter();
const errorHandler = new ErrorHandler();

// Cleanup old conversations every hour
setInterval(() => {
  threadManager.cleanup();
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
      // Create new thread for main channel messages
      thread = await message.startThread({
        name: `Processing: ${message.content.slice(0, 50)}...`,
        autoArchiveDuration: 1440 // 24 hours
      });
    } else {
      // Use existing thread for thread messages
      thread = message.channel;
    }

    // Start progress reporting with typing indicator
    const progressReporter = new ProgressReporter(thread);
    await progressReporter.start();

    // Build conversation context
    const conversationPrompt = threadManager.buildConversationPrompt(thread.id, message.content);

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
        if (msg.type === 'system') {
          console.log(`📋 Claude session: ${msg.session_id}`);
        }
        if (msg.type === 'assistant') {
          const textContent = msg.message.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('');
          fullResponse += textContent;
        }
        if (msg.type === 'tool_use') {
          // Report tool usage to progress tracker
          await progressReporter.reportToolUse(msg.tool_name, msg.tool_input);
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

    // Handle response with smart chunking
    const chunks = responseFormatter.chunkResponse(fullResponse);
    const chunkingStats = responseFormatter.getChunkingStats(fullResponse, chunks);

    console.log('📊 Response chunking stats:', chunkingStats);
    console.log('📊 Progress stats:', progressReporter.getStats());

    if (chunks.length === 1) {
      // Single response - send enhanced summary embed
      const summaryEmbed = progressReporter.createSummary(fullResponse, usage, duration);
      await thread.send({ embeds: [new EmbedBuilder(summaryEmbed)] });
    } else {
      // Multi-part response - send summary header then chunks
      const summaryEmbed = progressReporter.createSummary(
        `Response sent in ${chunks.length} parts due to length`,
        usage,
        duration
      );
      summaryEmbed.fields.push({
        name: '📄 Parts',
        value: `${chunks.length}`,
        inline: true
      });

      await thread.send({ embeds: [new EmbedBuilder(summaryEmbed)] });

      // Send chunked response with retry logic
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

    // Store conversation history
    threadManager.addMessage(thread.id, 'user', message.content);
    threadManager.addMessage(thread.id, 'assistant', fullResponse);

    console.log('✅ Response sent to Discord');
    console.log(`📊 Thread stats:`, threadManager.getStats());

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

// Login
client.login(process.env.DISCORD_BOT_TOKEN);