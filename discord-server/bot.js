import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { query } from '@anthropic-ai/claude-code';
import { ThreadManager } from './lib/ThreadManager.js';
import { ResponseFormatter } from './lib/ResponseFormatter.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize ThreadManager and ResponseFormatter
const threadManager = new ThreadManager();
const responseFormatter = new ResponseFormatter();

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

    // Show immediate processing feedback
    const statusMessage = await thread.send({
      embeds: [new EmbedBuilder()
        .setTitle('🔄 Processing with Claude...')
        .setDescription('Analyzing your content and updating vault')
        .setColor('#FFA500')
        .setTimestamp()]
    });

    // Build conversation context
    const conversationPrompt = threadManager.buildConversationPrompt(thread.id, message.content);

    // Process with Claude Code SDK
    console.log('🤖 Calling Claude with conversation context...');
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
      if (msg.type === 'result') {
        fullResponse = msg.result;
        usage = msg.usage;
        duration = msg.duration_ms;
        break;
      }
    }

    // Handle response with smart chunking
    const chunks = responseFormatter.chunkResponse(fullResponse);
    const chunkingStats = responseFormatter.getChunkingStats(fullResponse, chunks);

    console.log('📊 Response chunking stats:', chunkingStats);

    if (chunks.length === 1) {
      // Single response - update existing status message
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Processing Complete')
        .setDescription(chunks[0])
        .setColor('#00FF00')
        .setTimestamp();

      if (usage) {
        successEmbed.addFields([
          { name: 'Duration', value: `${duration}ms`, inline: true },
          { name: 'Tokens', value: `${usage.totalTokens || 'N/A'}`, inline: true }
        ]);
      }

      await statusMessage.edit({ embeds: [successEmbed] });
    } else {
      // Multi-part response - delete status message and send chunks
      await statusMessage.delete();

      // Create header message for multi-part response
      const headerEmbed = new EmbedBuilder()
        .setTitle('✅ Processing Complete')
        .setDescription(`Response sent in ${chunks.length} parts due to length`)
        .setColor('#00FF00')
        .setTimestamp();

      if (usage) {
        headerEmbed.addFields([
          { name: 'Duration', value: `${duration}ms`, inline: true },
          { name: 'Tokens', value: `${usage.totalTokens || 'N/A'}`, inline: true },
          { name: 'Parts', value: `${chunks.length}`, inline: true }
        ]);
      }

      await thread.send({ embeds: [headerEmbed] });

      // Send chunked response
      await responseFormatter.sendChunkedResponse(
        (content) => thread.send(content),
        chunks
      );
    }

    // Store conversation history
    threadManager.addMessage(thread.id, 'user', message.content);
    threadManager.addMessage(thread.id, 'assistant', fullResponse);

    console.log('✅ Response sent to Discord');
    console.log(`📊 Thread stats:`, threadManager.getStats());

  } catch (error) {
    console.error('❌ Error processing message:', error);

    // Show error in Discord
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Processing Failed')
      .setDescription(`Error: ${error.message}`)
      .setColor('#FF0000')
      .setTimestamp();

    if (thread) {
      try {
        await thread.send({ embeds: [errorEmbed] });
      } catch (discordError) {
        console.error('❌ Failed to send error to Discord:', discordError);
      }
    }
  }
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN);