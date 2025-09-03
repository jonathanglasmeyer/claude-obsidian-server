// polyfills.js - Official AI SDK React Native Support (Official Pattern)
import { Platform } from 'react-native';
import structuredClone from '@ungap/structured-clone';


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
      }

      polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
      
      polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
      
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


export {};