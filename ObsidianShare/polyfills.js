// polyfills.js - Official AI SDK React Native Support
import { Platform } from 'react-native';
import structuredClone from '@ungap/structured-clone';

console.log('🔧 Setting up official AI SDK React Native polyfills...');

// Setup structuredClone (required by AI SDK)
if (!global.structuredClone) {
  global.structuredClone = structuredClone;
  console.log('✅ structuredClone polyfill installed');
}

// Setup streaming text encoding for React Native
const setupStreamPolyfills = async () => {
  if (Platform.OS !== 'web') {
    try {
      const { TextEncoderStream, TextDecoderStream } = await import(
        '@stardazed/streams-text-encoding'
      );
      
      if (!global.TextEncoderStream) {
        global.TextEncoderStream = TextEncoderStream;
        console.log('✅ TextEncoderStream polyfill installed');
      }
      
      if (!global.TextDecoderStream) {
        global.TextDecoderStream = TextDecoderStream;
        console.log('✅ TextDecoderStream polyfill installed');
      }
      
    } catch (error) {
      console.warn('⚠️ Streaming polyfills not available:', error.message);
    }
  }
};

// Setup polyfills asynchronously
setupStreamPolyfills();

console.log('✅ Official AI SDK React Native polyfills ready');