# React Native Development Guide

> **Consolidation Note**: This document combines `RN_AI_SDK_BEST_PRACTICES.md` and `react-native-vercel-ai-api.md` into a comprehensive React Native development reference.

## Table of Contents

1. [Official AI SDK Setup (2025)](#official-ai-sdk-setup-2025)
2. [Dependencies & Polyfills](#dependencies--polyfills)  
3. [Chat Implementation Patterns](#chat-implementation-patterns)
4. [Network Transport Configuration](#network-transport-configuration)
5. [Message Handling & Persistence](#message-handling--persistence)
6. [Error Handling](#error-handling)
7. [Migration from Community Packages](#migration-from-community-packages)
8. [Production Checklist](#production-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Official AI SDK Setup (2025)

### ✅ The Definitive Answer

**OFFICIAL WAY**: Use `@ai-sdk/react` (Vercel's official package)  
**AVOID**: `react-native-vercel-ai` (legacy community package - doesn't exist officially)

**Key Fact**: There is NO separate `react-native-vercel-ai` package. You use the standard `@ai-sdk/react` package with React Native-specific configurations.

---

## Dependencies & Polyfills

### Core Dependencies
```bash
# Official AI SDK (REQUIRED)
npm install @ai-sdk/react ai

# Required React Native polyfills  
npm install @ungap/structured-clone @stardazed/streams-text-encoding

# Expo fetch for proper streaming support
npm install expo
```

### Metro Configuration
Add to `metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
```

### Polyfills Setup
Create `polyfills.js` in your project root:
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

Import polyfills in your root file (FIRST import):
```javascript
// index.ts or App.tsx
import './polyfills'; // MUST be first import
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

---

## Chat Implementation Patterns

### useChat Hook API Reference
The `useChat` hook returns these properties:

```typescript
import { useChat } from '@ai-sdk/react'; // ✅ OFFICIAL

const {
  messages,           // UIMessage[] - Array of chat messages
  error,              // Error | undefined - Any errors that occurred  
  append,             // Function to append messages (legacy)
  reload,             // Function to reload/retry last message
  stop,               // Function to stop current streaming
  setMessages,        // Function to set messages directly
  input,              // string - Current input value (built-in input handling)
  setInput,           // Function to set input value
  handleInputChange,  // Function to handle input changes
  handleSubmit,       // Function to handle form submission
  isLoading,          // boolean - Whether a request is in progress
  status,             // 'streaming' | 'submitted' | 'ready' - Current status
  data,               // Additional data from the response
  sendMessage         // Function to send messages programmatically ✅ MODERN
} = useChat();
```

### Basic Chat Component
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
  SafeAreaView,
  StyleSheet 
} from 'react-native';

export default function ChatApp() {
  const [input, setInput] = useState('');
  
  const { 
    messages, 
    sendMessage, // ✅ Modern API - preferred over append
    status,
    error 
  } = useChat({
    // Option 1: Custom transport with expo/fetch (RECOMMENDED)
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: 'http://localhost:3001/api/chat',
    }),
    
    // Option 2: Simple API endpoint (fallback - may have issues)
    // api: 'http://localhost:3001/api/chat',
    
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => reload()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message, index) => (
          <View key={message.id || index} style={styles.messageContainer}>
            <Text style={styles.roleText}>
              {message.role === 'user' ? 'You' : 'Claude'}:
            </Text>
            <Text style={styles.messageText}>
              {message.parts?.map(part => 
                part.text || (typeof part === 'string' ? part : '')
              ).join('') || message.content}
            </Text>
          </View>
        ))}
        
        {(status === 'streaming' || status === 'submitted') && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Claude is typing...</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          editable={status !== 'streaming' && status !== 'submitted'}
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || status === 'streaming' || status === 'submitted'}
          style={[
            styles.sendButton,
            (!input.trim() || status === 'streaming' || status === 'submitted') && styles.sendButtonDisabled
          ]}
        >
          <Text style={styles.sendButtonText}>
            {status === 'streaming' || status === 'submitted' ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  roleText: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontStyle: 'italic',
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
```

---

## Network Transport Configuration

### The Critical Issue: React Native Fetch
React Native requires specific fetch implementation for streaming support. The default fetch may cause "Network request failed" errors.

### ✅ Correct: DefaultChatTransport + expo/fetch
```typescript
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    fetch: expoFetch as unknown as typeof globalThis.fetch, // Key difference
    api: 'http://192.168.178.147:3001/api/chat',
  }),
  
  // Session management
  id: sessionId,
  body: { chatId: sessionId }
});
```

### ❌ Problematic: Simple API Configuration
```typescript
// This may cause network issues in React Native
const { messages, sendMessage } = useChat({
  api: 'http://localhost:3001/api/chat', // May fail with streaming
});
```

### TextInput Event Handling Differences
React Native TextInput events differ from web:

```typescript
// ❌ Web pattern (won't work in RN)
onChange={e => setInput(e.target.value)}

// ✅ React Native patterns
onChangeText={text => setInput(text)}  // Preferred
// OR
onChange={e => setInput(e.nativeEvent.text)}
```

---

## Message Handling & Persistence

### AI SDK v5 Message Format
React Native uses the same AI SDK v5 message format as web:

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{
    type: 'text' | 'tool-invocation' | 'tool-result';
    text?: string;
    // ... other type-specific properties
  }>;
}
```

### Proper Message Rendering
```typescript
// ✅ Correct rendering for all message formats
{messages.map((message, index) => (
  <View key={message.id || index}>
    <Text>{message.role}:</Text>
    <Text>
      {message.parts?.map(part => 
        part.text || (typeof part === 'string' ? part : '')
      ).join('') || message.content || ''}
    </Text>
  </View>
))}
```

### Session Management
```typescript
const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

const { messages, sendMessage } = useChat({
  id: sessionId, // Persistent chat sessions
  transport: new DefaultChatTransport({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: '/api/chat',
  }),
  body: { chatId: sessionId }, // Pass to server
  
  // Load initial messages
  initialMessages: loadedMessages,
});
```

### Programmatic Message Sending Patterns
```typescript
// ✅ Modern API - sendMessage (PREFERRED)
await sendMessage({ text: "Hello, how can you help me?" });

// ✅ With parts array
await sendMessage({
  parts: [{ type: 'text', text: "Hello, how can you help me?" }]
});

// ✅ With role specification  
await sendMessage({
  role: 'user',
  parts: [{ type: 'text', text: input }]
});

// ❌ Legacy API - append (being phased out)
append({ role: 'user', content: 'Hello' });
```

---

## Error Handling

### Comprehensive Error Handling
```typescript
import { Alert } from 'react-native';

const { messages, sendMessage, error, reload } = useChat({
  transport: new DefaultChatTransport({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: '/api/chat',
  }),
  onError: (error) => {
    console.error('Chat error:', error);
    Alert.alert(
      'Error',
      `Failed to send message: ${error.message}`,
      [
        { text: 'OK' },
        { text: 'Retry', onPress: () => reload() }
      ]
    );
  },
  onFinish: (message) => {
    console.log('Message completed:', message);
  },
});

// In render:
{error && (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>
      An error occurred: {error.message}
    </Text>
    <TouchableOpacity onPress={() => reload()}>
      <Text>Retry</Text>
    </TouchableOpacity>
  </View>
)}
```

### Common Error Types
1. **Network request failed**: Use `expo/fetch` with `DefaultChatTransport`
2. **structuredClone is not defined**: Import polyfills first
3. **Cannot resolve package exports**: Add Metro configuration
4. **Messages showing "[object Object]"**: Fix message rendering pattern
5. **sendMessage is not a function**: Check import from `@ai-sdk/react`

---

## Migration from Community Packages

If migrating from unofficial packages:

### 1. Update Dependencies
```bash
# Remove any community packages
npm uninstall react-native-vercel-ai

# Add official packages
npm install @ai-sdk/react @stardazed/streams-text-encoding
```

### 2. Update Imports
```javascript
// OLD (Community - if you had this)
// import { useChat } from 'react-native-vercel-ai';

// NEW (Official)  
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
```

### 3. Update API Calls
```javascript
// OLD (Web-style patterns that don't work in RN)
const { handleInputChange, handleSubmit } = useChat();
handleInputChange({ target: { value: text } });
handleSubmit();

// NEW (Official - native React Native patterns)
const { sendMessage } = useChat();
await sendMessage({ text: messageText });
```

---

## Production Checklist

- ✅ Use `@ai-sdk/react` (official package, not community alternatives)
- ✅ Add required polyfills (`@ungap/structured-clone`, `@stardazed/streams-text-encoding`)
- ✅ Configure Metro for package exports
- ✅ Use `expo/fetch` with `DefaultChatTransport`
- ✅ Implement proper error handling with `onError` callback
- ✅ Test streaming works on actual devices (not just simulator)
- ✅ Implement loading states using `status` property
- ✅ Handle message persistence with session IDs
- ✅ Add proper TypeScript types
- ✅ Test with production API endpoints
- ✅ Implement retry mechanisms for failed requests
- ✅ Add proper keyboard handling and input UX

---

## Troubleshooting

### Network Issues
**Problem**: "Network request failed" errors  
**Solution**: Use `DefaultChatTransport` with `expo/fetch`
```typescript
transport: new DefaultChatTransport({
  fetch: expoFetch as unknown as typeof globalThis.fetch,
  api: 'your-api-endpoint',
})
```

### Polyfill Issues
**Problem**: "structuredClone is not defined"  
**Solution**: Ensure polyfills are imported FIRST in your app entry point
```javascript
import './polyfills'; // Must be first import
```

**Problem**: "Cannot resolve package exports"  
**Solution**: Add Metro configuration
```javascript
config.resolver.unstable_enablePackageExports = true;
```

### Streaming Issues
**Problem**: Streaming not working or hanging  
**Solutions**:
- Use `expo/fetch` with `DefaultChatTransport`
- Check server supports proper streaming headers
- Test on actual device, not just simulator

### Message Display Issues
**Problem**: Messages show "[object Object]" instead of text  
**Solution**: Fix message rendering to handle AI SDK v5 parts format:
```typescript
{message.parts?.map(part => part.text || '').join('') || message.content || ''}
```

### Hook Issues
**Problem**: "sendMessage is not a function"  
**Solutions**:
- Check import is from `@ai-sdk/react`, not community package
- Verify polyfills are loaded
- Check useChat configuration

### Status/Loading Issues
**Problem**: "isLoading is not a function" or loading states not working  
**Solution**: Use `status` instead of `isLoading`:
```typescript
const { status } = useChat();
const isLoading = status === 'streaming' || status === 'submitted';
```

### Session Persistence Issues
**Problem**: Messages not persisting between sessions  
**Solutions**:
- Ensure `id` prop is passed to `useChat`
- Verify `body` contains session identifier for server
- Check server-side session storage implementation

### Development vs Production
**Problem**: Works in development but fails in production  
**Solutions**:
- Update API URLs for production endpoints
- Check network security policies
- Verify SSL/TLS certificates for HTTPS endpoints
- Test on actual devices, not just simulators

---

## Platform Differences

### iOS vs Android
- **Fetch behavior**: May vary between platforms - always test both
- **Keyboard handling**: iOS and Android have different keyboard behaviors
- **Network requests**: SSL/certificate handling may differ

### Simulator vs Device
- **Always test on real devices** for networking and performance
- **Simulator networking** may not reflect real-world conditions
- **Performance characteristics** differ significantly

### Development vs Production
- **API endpoints**: Update URLs for production
- **Error handling**: More robust error handling needed in production
- **Logging**: Remove debug logs for production builds

---

## Best Practices

1. **Official Packages Only**: Use `@ai-sdk/react`, avoid community wrappers
2. **Transport Configuration**: Always use `DefaultChatTransport` + `expo/fetch`
3. **Error Boundaries**: Implement comprehensive error handling
4. **Loading States**: Use `status` property for UX feedback
5. **Message Persistence**: Implement proper session management
6. **Testing**: Test on actual devices, not just simulators
7. **Performance**: Optimize for React Native constraints
8. **TypeScript**: Use proper typing for better development experience

---

## Resources

- **Official AI SDK**: https://sdk.vercel.ai
- **React Native Docs**: https://reactnative.dev
- **Expo Documentation**: https://docs.expo.dev
- **AI SDK React**: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat

---

*This guide combines the best practices for React Native development with AI SDK v5, focusing on official packages and proven patterns for production applications.*