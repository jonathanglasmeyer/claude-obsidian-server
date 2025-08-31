// Test minimal streamText to identify hang point
import { streamText } from 'ai';
import { createClaudeProvider } from './server/claude-provider.js';

async function testStream() {
  console.log('🧪 Testing streamText...');
  
  try {
    const provider = createClaudeProvider();
    console.log('✅ Provider created');
    
    const messages = [{ role: 'user', content: 'Hello' }];
    console.log('📝 Starting streamText...');
    
    const result = streamText({
      model: provider,
      messages: messages,
      maxTokens: 100,
    });
    
    console.log('✅ streamText created, attempting toUIMessageStreamResponse...');
    
    // This is where it probably hangs
    const response = result.toUIMessageStreamResponse();
    console.log('✅ Response created:', response);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testStream();