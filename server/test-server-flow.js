#!/usr/bin/env node

import { claudeCode } from 'ai-sdk-provider-claude-code';
import { streamText } from 'ai';

async function testServerFlow() {
  console.log('Testing exact server flow with AI SDK provider...');

  try {
    // Simulate the exact request from your API
    const messages = [{
      "role": "user",
      "content": "Just say hi"
    }];

    console.log('Input messages:', messages);

    // Create Claude provider exactly like server
    const claudeProvider = claudeCode('sonnet', {
      cwd: '/srv/claude-jobs/obsidian-vault',
      allowedTools: [
        'Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'Grep',
        'Bash', 'WebFetch', 'WebSearch'
      ]
    });

    // Convert messages exactly like server (but simpler since no parts)
    const coreMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content || ''
    }));

    console.log('Core messages:', coreMessages);

    // Use streamText exactly like server
    const result = streamText({
      model: claudeProvider,
      messages: coreMessages,
      maxTokens: 4000,
      tools: {}, // Enable tool calling
    });

    console.log('StreamText created, collecting result...');

    // Collect the result instead of streaming
    const finalResult = await result;
    const text = await finalResult.text;
    const usage = await finalResult.usage;

    console.log('✅ Success! Result:', text);
    console.log('Usage:', usage);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error data:', error.data);
    console.error('Full error:', error);
  }
}

testServerFlow();