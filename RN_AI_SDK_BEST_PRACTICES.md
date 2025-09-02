# React Native AI SDK Best Practices (2025)

**Status:** Production-Ready Official Implementation  
**Last Updated:** September 2025

## ✅ The Definitive Answer

**OFFICIAL WAY:** Use `@ai-sdk/react` (Vercel's official package)  
**AVOID:** `react-native-vercel-ai` (legacy community package)

## 🎯 Official Setup (Blessed Path)

### 1. Dependencies

```bash
# Core AI SDK (OFFICIAL)
npm install ai @ai-sdk/react @ai-sdk/openai zod

# Required React Native polyfills  
npm install @ungap/structured-clone @stardazed/streams-text-encoding

# Expo fetch for proper streaming support
npm install expo
```

### 2. Metro Configuration

Add to `metro.config.js`:
```javascript
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;
module.exports = config;
```

### 3. Polyfills Setup

Create `polyfills.js`:
```javascript
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
```

Import in your root file:
```javascript
// index.ts
import './polyfills'; // FIRST import
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

### 4. Component Implementation

```typescript
import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react'; // ✅ OFFICIAL
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView 
} from 'react-native';

export default function ChatApp() {
  const [input, setInput] = useState('');
  
  const { 
    messages, 
    sendMessage, // ✅ Available in official SDK
    status,
    error 
  } = useChat({
    // Option 1: Custom transport with expo/fetch (RECOMMENDED)
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: '/api/chat',
    }),
    
    // Option 2: Simple API endpoint (fallback)
    // api: '/api/chat',
    
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Message completed:', message);
    }
  });

  const handleSend = async () => {
    if (input.trim() && status !== 'streaming' && status !== 'submitted') {
      await sendMessage({ text: input }); // ✅ Official API
      setInput('');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {messages.map((message) => (
          <View key={message.id} style={{ marginVertical: 8 }}>
            <Text style={{ fontWeight: 'bold' }}>{message.role}:</Text>
            <Text>
              {message.parts?.map(part => part.text || (typeof part === 'string' ? part : '')).join('') || message.content}
            </Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={{ flexDirection: 'row', padding: 16 }}>
        <TextInput
          style={{ 
            flex: 1, 
            borderWidth: 1, 
            borderColor: '#ccc', 
            padding: 8, 
            marginRight: 8 
          }}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          editable={status !== 'streaming' && status !== 'submitted'}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || status === 'streaming' || status === 'submitted'}
          style={{ 
            backgroundColor: input.trim() && status !== 'streaming' && status !== 'submitted' ? '#007AFF' : '#ccc',
            padding: 12,
            borderRadius: 4 
          }}
        >
          <Text style={{ color: 'white' }}>
            {status === 'streaming' || status === 'submitted' ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

## 🚫 What NOT to Use

### ❌ Community Package (Legacy)
```javascript
// DON'T USE THIS
import { useChat } from 'react-native-vercel-ai'; 

// Problems:
// - Not officially maintained by Vercel
// - Limited API (no sendMessage function)  
// - Uses older patterns (handleInputChange/handleSubmit)
// - Less reliable for production
```

## 🔄 Migration from Community Package

If migrating from `react-native-vercel-ai`:

### 1. Update Dependencies
```bash
# Remove community package
npm uninstall react-native-vercel-ai

# Add official packages (if not already installed)
npm install @ai-sdk/react @stardazed/streams-text-encoding
```

### 2. Update Imports
```javascript
// OLD (Community)
import { useChat } from 'react-native-vercel-ai';

// NEW (Official)  
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
```

### 3. Update API Calls
```javascript
// OLD (Community - web pattern)
const { handleInputChange, handleSubmit } = useChat();
handleInputChange({ target: { value: text } });
handleSubmit();

// NEW (Official - native pattern)
const { sendMessage } = useChat();
await sendMessage({ text: messageText });
```

## 🎯 Production Checklist

- ✅ Use `@ai-sdk/react` (official package)
- ✅ Add required polyfills (`@ungap/structured-clone`, `@stardazed/streams-text-encoding`)
- ✅ Configure Metro for package exports
- ✅ Use `expo/fetch` with `DefaultChatTransport`
- ✅ Handle errors with `onError` callback
- ✅ Test streaming works on actual devices
- ✅ Remove any `react-native-vercel-ai` dependencies

## 📊 Why This Approach?

**✅ Official Support:** Maintained by Vercel team  
**✅ Feature Complete:** Full API compatibility with web  
**✅ Future Proof:** Active development and updates  
**✅ Production Ready:** Used by major apps  
**✅ Better Performance:** Native streaming support where available

## 🔍 Troubleshooting

### Common Issues:

**"sendMessage is not a function"**
- Check you're importing from `@ai-sdk/react`, not `react-native-vercel-ai`

**"structuredClone is not defined"**  
- Ensure polyfills are imported first in your app entry point

**"Cannot resolve package exports"**
- Add `config.resolver.unstable_enablePackageExports = true` to Metro config

**Streaming not working**
- Use `expo/fetch` with `DefaultChatTransport` for proper streaming support

**Messages showing "[object Object]" instead of text**
- Ensure proper AI SDK v5 parts format rendering: `message.parts?.map(part => part.text).join('')`

**"isLoading is not a function" or loading states not working**
- Use `status` instead of `isLoading`: `status === 'streaming'` or `status === 'submitted'`

## 📝 Notes

- This guide reflects the **current best practices** as of September 2025
- The community package `react-native-vercel-ai` served its purpose but is now superseded
- For latest updates, check [official Vercel AI SDK documentation](https://sdk.vercel.ai)