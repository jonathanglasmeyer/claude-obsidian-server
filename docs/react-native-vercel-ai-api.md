# React Native with Vercel AI SDK - Definitive API Documentation

## Key Finding: There is NO separate `react-native-vercel-ai` package

The confusion stems from the fact that there is **no separate** `react-native-vercel-ai` package. Instead, you use the standard **`@ai-sdk/react`** package with React Native-specific configurations.

## Correct Package and Import

```bash
npm install @ai-sdk/react ai
```

```typescript
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
```

## React Native useChat API - CORRECT INTERFACE

The `useChat` hook returns the following properties (your list was accurate):

```typescript
const {
  messages,           // UIMessage[] - Array of chat messages
  error,              // Error | undefined - Any errors that occurred
  append,             // Function to append messages (legacy)
  reload,             // Function to reload/retry last message
  stop,               // Function to stop current streaming
  setMessages,        // Function to set messages directly
  input,              // string - Current input value (when using built-in input handling)
  setInput,           // Function to set input value
  handleInputChange,  // Function to handle input changes
  handleSubmit,       // Function to handle form submission
  isLoading,          // boolean - Whether a request is in progress
  data,               // Additional data from the response
  sendMessage         // Function to send messages programmatically ✅
} = useChat();
```

## Critical Point: sendMessage vs append

**You are correct** - `sendMessage` is the modern, preferred method for sending messages programmatically. The `append` function is legacy and being phased out.

## React Native Specific Configuration

### 1. Basic React Native Setup with Expo

```typescript
import { generateAPIUrl } from '@/utils';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { View, TextInput, ScrollView, Text, SafeAreaView } from 'react-native';

export default function App() {
  const [input, setInput] = useState('');
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch, // 🔑 Key difference
      api: generateAPIUrl('/api/chat'),
    }),
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: '100%' }}>
      <View style={{ height: '95%', display: 'flex', flexDirection: 'column', paddingHorizontal: 8 }}>
        <ScrollView style={{ flex: 1 }}>
          {messages.map(m => (
            <View key={m.id} style={{ marginVertical: 8 }}>
              <Text style={{ fontWeight: '700' }}>{m.role}</Text>
              {m.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return <Text key={`${m.id}-${i}`}>{part.text}</Text>;
                }
              })}
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          <TextInput
            style={{ backgroundColor: 'white', padding: 8 }}
            placeholder="Say something..."
            value={input}
            onChange={e => setInput(e.nativeEvent.text)}
            onSubmitEditing={e => {
              e.preventDefault();
              sendMessage({ text: input }); // 🔑 Correct usage
              setInput('');
            }}
            autoFocus={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

### 2. Programmatic Message Sending Patterns

#### Basic Text Message
```typescript
// ✅ Correct - Modern API
sendMessage({ text: "Hello, how can you help me?" });

// ✅ Also correct - Using parts array
sendMessage({
  parts: [{ type: 'text', text: "Hello, how can you help me?" }]
});

// ❌ Incorrect - This is the legacy append method
append({ role: 'user', content: 'Hello' });
```

#### With Role Specification
```typescript
sendMessage({
  role: 'user',
  parts: [{ type: 'text', text: input }]
});
```

#### Multimodal Messages (Text + Image)
```typescript
sendMessage({
  parts: [
    { type: 'text', text: 'What do you see in this image?' },
    { type: 'image', image: base64Image }
  ]
});
```

## React Native Specific Considerations

### 1. Fetch Polyfill for Expo
```typescript
import { fetch as expoFetch } from 'expo/fetch';

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    fetch: expoFetch as unknown as typeof globalThis.fetch, // Required for Expo
    api: '/api/chat',
  }),
});
```

### 2. TextInput Event Handling
React Native TextInput events are different from web:

```typescript
// ❌ Web pattern (won't work in RN)
onChange={e => setInput(e.target.value)}

// ✅ React Native pattern
onChange={e => setInput(e.nativeEvent.text)}
// OR
onChangeText={text => setInput(text)} // Preferred RN approach
```

### 3. Form Submission in React Native
```typescript
const handleSubmit = () => {
  if (input.trim()) {
    sendMessage({ text: input });
    setInput('');
  }
};

// Use onSubmitEditing for TextInput
<TextInput
  onSubmitEditing={handleSubmit}
  // ... other props
/>
```

## Input Handling Patterns

### Option 1: Manual Input Management (Recommended for RN)
```typescript
const [input, setInput] = useState('');
const { messages, sendMessage } = useChat({
  // ... transport config
});

// Handle input manually
const handleSend = () => {
  sendMessage({ text: input });
  setInput('');
};
```

### Option 2: Built-in Input Handling
```typescript
const { 
  messages, 
  input,           // Built-in input state
  setInput,        // Built-in input setter
  handleSubmit,    // Built-in form handler
  sendMessage 
} = useChat();

// Less common in React Native due to form handling differences
```

## Message Structure

Messages follow this structure:

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{
    type: 'text' | 'image' | 'tool-call' | 'tool-result';
    text?: string;
    image?: string;
    // ... other type-specific properties
  }>;
  createdAt?: Date;
}
```

## Error Handling in React Native

```typescript
const { messages, sendMessage, error, reload } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
  }),
  onError: (error) => {
    console.error('Chat error:', error);
    // Handle error in RN-specific way (e.g., show alert)
    Alert.alert('Error', 'Failed to send message');
  },
});

// In render:
{error && (
  <View>
    <Text>An error occurred: {error.message}</Text>
    <Button title="Retry" onPress={() => reload()} />
  </View>
)}
```

## Session Management

```typescript
const { messages, sendMessage } = useChat({
  id: 'unique-chat-id', // Persist chat sessions
  initialMessages: loadedMessages, // Load previous messages
  transport: new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: {
        id,
        message: messages[messages.length - 1], // Send only latest
      },
    }),
  }),
});
```

## Differences from Standard @ai-sdk/react

1. **No differences in API** - Same `useChat` hook interface
2. **Transport configuration** - Need to specify `fetch` polyfill for Expo
3. **Event handling** - React Native event patterns vs web
4. **UI components** - Use React Native components instead of HTML elements
5. **Form handling** - Different patterns for input submission

## Complete Working Example

```typescript
import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
} from 'react-native';

export default function ChatScreen() {
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, error, isLoading } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: 'http://localhost:3000/api/chat', // Your API endpoint
    }),
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message) => (
          <View key={message.id} style={styles.messageContainer}>
            <Text style={styles.roleText}>
              {message.role === 'user' ? 'You' : 'AI'}:
            </Text>
            {message.parts.map((part, index) => {
              if (part.type === 'text') {
                return (
                  <Text key={index} style={styles.messageText}>
                    {part.text}
                  </Text>
                );
              }
              return null;
            })}
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text>AI is typing...</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          multiline
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />
        <TouchableOpacity 
          style={[styles.sendButton, isLoading && styles.disabledButton]}
          onPress={handleSend}
          disabled={isLoading || !input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
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
    marginBottom: 16,
  },
  roleText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
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
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
```

## Summary

- **Package**: Use `@ai-sdk/react` (NOT a separate react-native package)
- **Hook**: `useChat()` with identical API to web
- **Send messages**: Use `sendMessage({ text: "message" })` 
- **Key difference**: Configure `DefaultChatTransport` with Expo fetch polyfill
- **Your understanding**: ✅ Correct - `sendMessage` exists and is the preferred method