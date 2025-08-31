import { streamText } from 'ai';
import { claudeCode } from 'ai-sdk-provider-claude-code';

console.log('1. Creating provider...');
const provider = claudeCode('sonnet', {
  cwd: '/Users/jonathan.glasmeyer/Projects/obsidian-vault',
  allowedTools: ['Read']
});
console.log('2. Provider created');

console.log('3. Starting streamText...');
const result = streamText({
  model: provider,
  messages: [{ role: 'user', content: 'Hello' }],
  maxTokens: 10,
});
console.log('4. streamText result created');

console.log('5. Calling toUIMessageStreamResponse...');
const response = result.toUIMessageStreamResponse();
console.log('6. Done!');