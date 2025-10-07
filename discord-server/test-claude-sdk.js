#!/usr/bin/env node

// Minimal Claude SDK test script
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}

console.log('🔍 Testing Claude Code SDK in isolation...');
console.log('📋 Environment check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - Has OAuth Token:', !!process.env.CLAUDE_CODE_OAUTH_TOKEN);
console.log('  - Token length:', process.env.CLAUDE_CODE_OAUTH_TOKEN?.length || 0);
console.log('  - Vault Path:', process.env.OBSIDIAN_VAULT_PATH);

try {
  console.log('\n📦 Importing Claude Code SDK...');
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  console.log('✅ Claude Code SDK imported successfully');

  console.log('\n🔐 Testing basic SDK call...');

  const stream = query({
    prompt: 'Please run: ls -la\n\nI need to see the actual output from this Bash command.',
    options: {
      files: [],
      cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault',
      timeout: 10000
    }
  });

  let fullResponse = '';
  for await (const msg of stream) {
    console.log('📨 Message type:', msg.type, 'Keys:', Object.keys(msg));

    // Log EVERYTHING to understand structure
    if (msg.type !== 'system') {
      console.log('🔍 Full message:', JSON.stringify(msg, null, 2));
    }

    if (msg.type === 'assistant' && msg.message?.content) {
      console.log('📝 Assistant content blocks:', msg.message.content.length);
      for (const contentBlock of msg.message.content) {
        console.log('  📄 Block type:', contentBlock.type);
        if (contentBlock.type === 'text') {
          fullResponse += contentBlock.text;
          console.log('  📝 Text:', JSON.stringify(contentBlock.text));
        }
        if (contentBlock.type === 'tool_use') {
          console.log('  🛠️ Tool:', contentBlock.name);
        }
      }
    }

    if (msg.type === 'tool_result') {
      console.log('🔧 TOOL RESULT FOUND!');
      console.log('  Content:', JSON.stringify(msg.content));
    }
  }

  console.log('✅ Final response:', JSON.stringify(fullResponse));

} catch (error) {
  console.error('❌ Claude SDK test failed:');
  console.error('  Error type:', error.constructor.name);
  console.error('  Error message:', error.message);
  console.error('  Stack trace:', error.stack);

  if (error.message?.includes('Missing Access')) {
    console.error('\n🔍 Authentication issue detected');
    console.error('  - OAuth token is present but not working');
    console.error('  - Check if token is valid/expired');
  }

  process.exit(1);
}

console.log('\n🎉 Claude SDK test completed successfully!');