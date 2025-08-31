// Test script to debug Claude provider hanging issue
import { createClaudeProvider } from './server/claude-provider.js';

console.log('🧪 Testing Claude provider creation...');

try {
  const provider = createClaudeProvider();
  console.log('✅ Provider created successfully:', provider);
} catch (error) {
  console.error('❌ Provider creation failed:', error);
}

console.log('🏁 Test complete');