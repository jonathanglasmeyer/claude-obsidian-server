import { streamText } from 'ai';
import { claudeCode } from 'ai-sdk-provider-claude-code';

console.log('1. Creating provider...');
const provider = claudeCode('sonnet', {
  cwd: '/Users/jonathan.glasmeyer/Projects/obsidian-vault'
});
console.log('2. Provider created');

console.log('3. Starting streamText...');
const result = streamText({
  model: provider,
  messages: [{ role: 'user', content: 'Hello' }],
  maxTokens: 10,
});
console.log('4. streamText created - NO AWAIT needed in v5');

console.log('5. Checking all properties...');
console.log('All props:', Object.getOwnPropertyNames(result));
console.log('Functions:', Object.getOwnPropertyNames(result).filter(name => typeof result[name] === 'function'));

console.log('6. Testing toAIStreamResponse...');
try {
  const response = result.toAIStreamResponse();
  console.log('✅ toAIStreamResponse worked:', typeof response);
} catch (e) {
  console.log('❌ toAIStreamResponse failed:', e.message);
}

console.log('7. Testing textStream iteration...');
try {
  let chunkCount = 0;
  for await (const chunk of result.textStream) {
    console.log(`Chunk ${++chunkCount}:`, JSON.stringify(chunk));
    if (chunkCount >= 3) break; // Just test a few chunks
  }
  console.log('✅ textStream iteration works!');
} catch (e) {
  console.log('❌ textStream iteration failed:', e.message);
}