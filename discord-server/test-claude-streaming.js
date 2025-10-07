#!/usr/bin/env node

// Test Claude SDK with CORRECT streaming pattern (like bot.js uses)
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}

console.log('🔍 Testing Claude Code SDK STREAMING...');
console.log('📋 Environment check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - Has OAuth Token:', !!process.env.CLAUDE_CODE_OAUTH_TOKEN);
console.log('  - Vault Path:', process.env.OBSIDIAN_VAULT_PATH);

try {
  console.log('\n📦 Importing Claude Code SDK...');
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  console.log('✅ Claude Code SDK imported successfully');

  console.log('\n🔐 Testing STREAMING pattern (like bot.js)...');

  // Use the CORRECT streaming pattern from bot.js
  const stream = query({
    prompt: 'Hello Claude! Please respond with exactly "STREAMING_TEST_OK" and nothing else.',
    options: {
      cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault'
    }
  });

  console.log('✅ Query stream created:', stream.constructor.name);

  let fullResponse = '';
  let messageCount = 0;

  console.log('\n🔄 Starting stream iteration...');

  for await (const msg of stream) {
    messageCount++;
    console.log(`📨 Message ${messageCount}: type=${msg.type}`, Object.keys(msg));

    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          fullResponse += block.text;
        }
      }
    }
  }

  console.log('\n✅ Stream completed successfully!');
  console.log('📝 Full response:', fullResponse);
  console.log('📊 Total messages:', messageCount);

  if (fullResponse.includes('STREAMING_TEST_OK')) {
    console.log('🎉 Claude SDK streaming test PASSED!');
  } else {
    console.log('⚠️ Unexpected response, but streaming worked');
  }

} catch (error) {
  console.error('\n❌ Claude SDK streaming test failed:');
  console.error('  Error type:', error.constructor.name);
  console.error('  Error message:', error.message);
  console.error('  Stack trace:', error.stack);

  if (error.message?.includes('Symbol.asyncIterator')) {
    console.error('\n🔍 AsyncIterator issue detected:');
    console.error('  - Stream object is missing Symbol.asyncIterator');
    console.error('  - This suggests Docker environment issue');
  }

  process.exit(1);
}

console.log('\n🎉 Claude SDK streaming test completed successfully!');