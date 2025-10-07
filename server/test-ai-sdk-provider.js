#!/usr/bin/env node

import { claudeCode } from 'ai-sdk-provider-claude-code';
import { generateText } from 'ai';

async function testAISDKProvider() {
  console.log('Testing AI SDK Provider with Claude Code CLI authentication...');

  try {
    console.log('Creating Claude Code provider...');
    const model = claudeCode('sonnet', {
      cwd: '/srv/claude-jobs/obsidian-vault',
      allowedTools: ['Read', 'Write']
    });

    console.log('Provider created, testing generateText...');

    const result = await generateText({
      model,
      prompt: 'Just say "hello from ai sdk provider" and nothing else'
    });

    console.log('✅ Success! Result:', result.text);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error data:', error.data);
    console.error('Full error:', error);
  }
}

testAISDKProvider();