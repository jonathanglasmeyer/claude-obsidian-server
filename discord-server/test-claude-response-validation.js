#!/usr/bin/env node

// Detailed Claude response validation to ensure it's not a silent failure
import dotenv from 'dotenv';

dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}

console.log('🔍 Testing Claude SDK response validation...');

try {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  // Test 1: Simple response validation
  console.log('\n📝 Test 1: Simple response validation');
  const stream1 = query({
    prompt: 'Reply with exactly the word "VALIDATION_TEST_123" and nothing else.',
    options: { cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault' }
  });

  let response1 = '';
  let messageTypes1 = [];
  let hasRealContent = false;

  for await (const msg of stream1) {
    messageTypes1.push(msg.type);
    console.log(`📨 Message type: ${msg.type}`);

    if (msg.type === 'assistant' && msg.message?.content) {
      hasRealContent = true;
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          console.log(`📝 Text block: "${block.text}"`);
          response1 += block.text;
        }
      }
    }

    if (msg.type === 'result') {
      console.log(`📊 Result info:`, {
        error: msg.is_error,
        duration: msg.duration_ms,
        turns: msg.num_turns,
        cost: msg.total_cost_usd,
        hasUsage: !!msg.usage
      });
    }
  }

  console.log(`\n✅ Final response: "${response1.trim()}"`);
  console.log(`📋 Message types: ${messageTypes1.join(', ')}`);
  console.log(`🔍 Has real content: ${hasRealContent}`);

  // Test 2: Math validation (to ensure Claude is actually thinking)
  console.log('\n🧮 Test 2: Math validation (ensure Claude is thinking)');
  const stream2 = query({
    prompt: 'What is 47 + 38? Reply with only the number.',
    options: { cwd: process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault' }
  });

  let response2 = '';
  for await (const msg of stream2) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          response2 += block.text;
        }
      }
    }
  }

  console.log(`🧮 Math response: "${response2.trim()}"`);

  // Validation
  console.log('\n🎯 VALIDATION RESULTS:');

  const test1Pass = response1.trim() === 'VALIDATION_TEST_123';
  const test2Pass = response2.trim() === '85';
  const hasProperMessages = messageTypes1.includes('assistant') && messageTypes1.includes('result');
  const hasContent = hasRealContent;

  console.log(`✅ Test 1 (exact response): ${test1Pass ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Test 2 (math): ${test2Pass ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Proper message flow: ${hasProperMessages ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Has real content: ${hasContent ? 'PASS' : 'FAIL'}`);

  if (test1Pass && test2Pass && hasProperMessages && hasContent) {
    console.log('\n🎉 Claude SDK is GENUINELY FUNCTIONAL - not a silent failure!');
  } else {
    console.log('\n⚠️ POTENTIAL ISSUE: Claude may not be working properly');
    console.log('Expected "VALIDATION_TEST_123", got:', response1.trim());
    console.log('Expected "85", got:', response2.trim());
  }

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}