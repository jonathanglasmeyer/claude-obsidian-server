// polyfills.js - Official AI SDK React Native Support (Official Pattern)
import { Platform } from 'react-native';
import structuredClone from '@ungap/structured-clone';

console.log('🔧 Setting up official AI SDK React Native polyfills...');

if (Platform.OS !== 'web') {
  const setupPolyfills = async () => {
    try {
      const { polyfillGlobal } = await import(
        'react-native/Libraries/Utilities/PolyfillFunctions'
      );

      const { TextEncoderStream, TextDecoderStream } = await import(
        '@stardazed/streams-text-encoding'
      );

      if (!('structuredClone' in global)) {
        polyfillGlobal('structuredClone', () => structuredClone);
        console.log('✅ structuredClone polyfill installed (official pattern)');
      }

      polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
      console.log('✅ TextEncoderStream polyfill installed (official pattern)');
      
      polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
      console.log('✅ TextDecoderStream polyfill installed (official pattern)');
      
    } catch (error) {
      console.warn('⚠️ Official polyfills setup failed:', error.message);
      // Fallback to direct assignment
      if (!global.structuredClone) {
        global.structuredClone = structuredClone;
        console.log('✅ structuredClone fallback installed');
      }
    }
  };

  setupPolyfills();
} else {
  console.log('📱 Web platform detected - skipping mobile polyfills');
}

console.log('✅ Official AI SDK React Native polyfills ready');

export {};