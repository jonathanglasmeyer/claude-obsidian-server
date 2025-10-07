#!/usr/bin/env node

import { query } from '@anthropic-ai/claude-code';

async function testClaudeCodeSDK() {
  console.log('Testing Claude Code SDK with CLI authentication...');

  try {
    const stream = query({
      prompt: 'Just say "hello from claude code" and nothing else',
      options: {
        cwd: '/srv/claude-jobs/obsidian-vault'
      }
    });

    console.log('Query created, streaming responses...');

    for await (const message of stream) {
      console.log('Message type:', message.type);

      if (message.type === 'assistant') {
        console.log('✅ Assistant response:', message.message.content);
      } else if (message.type === 'result') {
        console.log('✅ Final result:', message.result);
        break;
      } else if (message.type === 'system') {
        console.log('📋 System:', message.subtype);
      }
    }

    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testClaudeCodeSDK();