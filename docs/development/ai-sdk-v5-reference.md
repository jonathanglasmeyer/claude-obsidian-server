# AI SDK v5 Complete Reference

> **Consolidation Note**: This document combines information from `ai-sdk-v5.md`, `claude-code-sdk.md`, `AI_SDK_V5_COMPONENTS.md`, and troubleshooting guides into a single comprehensive reference.

## Table of Contents

1. [Quick Start & Installation](#quick-start--installation)
2. [Provider Configuration](#provider-configuration)
3. [Core APIs](#core-apis)
4. [Message Formats & Streaming](#message-formats--streaming)
5. [Tool Management](#tool-management)
6. [Object Generation](#object-generation)
7. [UI Components (AI Elements)](#ui-components-ai-elements)
8. [Session Management](#session-management)
9. [Error Handling & Authentication](#error-handling--authentication)
10. [Migration from v4](#migration-from-v4)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start & Installation

### Prerequisites
- Node.js 18+
- Claude Code CLI authentication

### Installation
```bash
npm install ai ai-sdk-provider-claude-code
npm install -g @anthropic-ai/claude-code
claude login
```

### Basic Usage
```typescript
import { streamText, generateText } from 'ai';
import { claudeCode } from 'ai-sdk-provider-claude-code';

// Simple text generation
const result = await generateText({
  model: claudeCode('sonnet'),
  prompt: 'Write a haiku about programming',
});

console.log(result.text);

// Streaming text
const stream = streamText({
  model: claudeCode('sonnet'),
  prompt: 'Explain React hooks',
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

---

## Provider Configuration

### Claude Code Provider Setup
```typescript
import { createClaudeCode } from 'ai-sdk-provider-claude-code';

// Basic provider
const claude = createClaudeCode({
  defaultSettings: {
    cwd: '/path/to/project',  // Working directory
    pathToClaudeCodeExecutable: '/usr/local/bin/claude',
    permissionMode: 'default', // 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  }
});

// Advanced configuration
const advancedClaude = createClaudeCode({
  defaultSettings: {
    customSystemPrompt: 'You are a helpful coding assistant.',
    appendSystemPrompt: 'Always use type hints in Python code.',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
    disallowedTools: ['Delete'],
    maxTurns: 10,
    maxThinkingTokens: 50000,
    mcpServers: {
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
      }
    },
    logger: {
      warn: (message) => console.warn('Claude:', message),
      error: (message) => console.error('Claude:', message),
    }
  }
});
```

### Environment Variables
```bash
# Required
CLAUDE_CODE_OAUTH_TOKEN    # From `claude setup-token`

# Optional for server applications
OBSIDIAN_VAULT_PATH        # Working directory path
PORT                       # Server port
```

---

## Core APIs

### Text Generation
```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: claudeCode('sonnet'),
  messages: [
    { role: 'user', content: [{ type: 'text', text: 'Hello!' }] }
  ],
  // Optional settings
  maxOutputTokens: 1000,
  temperature: 0.7,  // Note: Not supported by Claude Code SDK
});

console.log(result.text);
console.log(result.usage); // { inputTokens, outputTokens, totalTokens }
console.log(result.providerMetadata); // Claude-specific metadata
```

### Streaming Text
```typescript
import { streamText } from 'ai';

const result = streamText({
  model: claudeCode('opus'),
  prompt: 'Write a story about AI',
});

// Option 1: Stream chunks
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Option 2: Wait for complete result
const text = await result.text;
const usage = await result.usage;
const finishReason = await result.finishReason;
```

### Multi-turn Conversations
```typescript
import { generateText, ModelMessage } from 'ai';

const messages: ModelMessage[] = [];

// First turn
messages.push({
  role: 'user',
  content: [{ type: 'text', text: 'My name is Alice' }]
});

const response1 = await generateText({
  model: claudeCode('sonnet'),
  messages,
});

messages.push({
  role: 'assistant', 
  content: response1.content
});

// Second turn - remembers context
messages.push({
  role: 'user',
  content: [{ type: 'text', text: 'What is my name?' }]
});

const response2 = await generateText({
  model: claudeCode('sonnet'),
  messages,
});

console.log(response2.text); // "Alice"
```

---

## Message Formats & Streaming

### AI SDK v5 Message Structure
```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{
    type: 'text' | 'tool-invocation' | 'tool-result' | 'reasoning' | string;
    text?: string;
    // ... other type-specific properties
  }>;
  metadata?: {
    duration?: number;
    model?: string;
    totalTokens?: number;
  };
}
```

### Proper Message Rendering
```typescript
// ✅ Correct v5 pattern
messages.map(message => (
  <div key={message.id}>
    <strong>{message.role === 'user' ? 'You: ' : 'Claude: '}</strong>
    {message.parts.map((part, index) => {
      switch (part.type) {
        case 'text':
          return <span key={index}>{part.text}</span>;
        case 'tool-invocation':
          return <div key={index}>🔧 {part.toolInvocation.toolName}...</div>;
        case 'tool-result':
          return <div key={index}>✅ Tool completed</div>;
        case 'reasoning':
          return <details key={index}>
            <summary>Reasoning</summary>
            <pre>{part.text}</pre>
          </details>;
        default:
          return <div key={index}>{JSON.stringify(part, null, 2)}</div>;
      }
    })}
  </div>
))
```

### Server-Sent Events Format
For web applications using AI SDK v5 streaming endpoints:
```javascript
// Server: Use toUIMessageStreamResponse()
return result.toUIMessageStreamResponse({
  originalMessages: messages,
  onFinish: async ({ messages: updatedMessages }) => {
    await sessionStore.saveChat(chatId, updatedMessages);
  },
});

// Client: Handle streaming response
const { messages, sendMessage, status } = useChat({
  api: '/api/chat',
  onFinish: (message) => {
    console.log('Message completed:', message);
  }
});
```

---

## Tool Management

### Built-in Tools
Claude Code provides these built-in tools:
- `Read` - Read files
- `Write` - Create/overwrite files  
- `Edit` - Modify existing files
- `Bash` - Execute shell commands
- `Grep` - Search file contents
- `LS` - List directory contents

### Tool Permission Control
```typescript
// Allowlist approach
const restrictedClaude = createClaudeCode({
  allowedTools: ['Read', 'LS', 'Grep'], // Only these tools
});

// Denylist approach  
const safeClaude = createClaudeCode({
  disallowedTools: ['Write', 'Edit', 'Bash'], // Block dangerous operations
});

// Specific Bash command control
const gitOnlyClaude = createClaudeCode({
  allowedTools: [
    'Read',
    'Bash(git status)',
    'Bash(git diff:*)',  // Wildcards supported
    'Bash(git log:*)'
  ],
});
```

### MCP Server Integration
```typescript
// External MCP servers
const claude = createClaudeCode({
  mcpServers: {
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
    },
    github: {
      type: 'sse',
      url: 'https://mcp.github.com/api',
      headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
    },
  },
});

// In-process MCP servers (SDK MCP)
import { createSdkMcpServer, tool } from 'ai-sdk-provider-claude-code';
import { z } from 'zod';

const customServer = createSdkMcpServer({
  name: 'custom-tools',
  tools: [
    tool(
      'calculate',
      'Perform calculations',
      {
        expression: z.string().describe('Mathematical expression'),
      },
      async ({ expression }) => ({
        content: [{ 
          type: 'text', 
          text: `Result: ${eval(expression)}` 
        }]
      })
    )
  ]
});

const claude = createClaudeCode({
  mcpServers: {
    custom: customServer
  }
});
```

---

## Object Generation

### Basic Object Generation
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const result = await generateObject({
  model: claudeCode('sonnet'),
  schema: z.object({
    name: z.string().describe('Full name'),
    age: z.number().describe('Age in years'),
    email: z.string().email().describe('Email address'),
    interests: z.array(z.string()).describe('List of hobbies'),
  }),
  prompt: 'Generate a profile for a software developer',
});

console.log(result.object);
// {
//   name: "Alex Chen",
//   age: 28, 
//   email: "alex.chen@example.com",
//   interests: ["coding", "open source", "machine learning"]
// }
```

### Complex Nested Objects
```typescript
const complexResult = await generateObject({
  model: claudeCode('sonnet'),
  schema: z.object({
    company: z.object({
      departments: z.array(z.object({
        name: z.string(),
        teams: z.array(z.object({
          name: z.string(),
          members: z.number(),
        })),
      })),
    }),
  }),
  prompt: 'Generate a company org structure',
});
```

### Object Generation Best Practices
1. **Start simple**: Begin with basic schemas and add complexity gradually
2. **Use descriptions**: Add `.describe()` to schema fields for better results
3. **Handle errors**: Implement retry logic for production use
4. **Validate schemas**: Test schemas independently before using

### Retry Pattern for Production
```typescript
async function generateWithRetry(schema, prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateObject({
        model: claudeCode('sonnet'),
        schema,
        prompt
      });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## UI Components (AI Elements)

### Introduction to AI Elements
AI Elements is Vercel's official component library for AI applications. Instead of building custom chat UIs, use these production-ready components.

### Installation
```bash
npx ai-elements@latest          # Install all components
npx ai-elements@latest add message  # Install specific component
```

### Core Components for Claude Code

#### **Essential Components**
1. **`conversation`** - Chat container with proper layout
2. **`message`** - Professional message display with avatars
3. **`response`** - AI text responses with streaming support
4. **`tool`** ⭐⭐ - **Critical for Claude Code tool visualization**
5. **`loader`** - Loading states during tool execution
6. **`reasoning`** - Collapsible reasoning display

#### **Complete Chat Implementation**
```tsx
import { useChat } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
} from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { Tool } from '@/components/ai-elements/tool';

export default function Chat() {
  const { messages } = useChat({
    api: '/api/chat'
  });

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return <Response key={i}>{part.text}</Response>;
                  case 'tool-Read':
                  case 'tool-Write':
                  case 'tool-Edit':
                  case 'tool-Bash':
                    return <Tool key={i} part={part} />;
                  default:
                    return null;
                }
              })}
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
    </Conversation>
  );
}
```

#### **Tool Visualization for Claude Code**
The `Tool` component automatically handles Claude Code tool calls:
- **`tool-Read`** - File reading operations
- **`tool-Write`** - File creation/overwriting  
- **`tool-Edit`** - File modifications
- **`tool-Bash`** - Shell command execution

```tsx
// Automatic tool call display
{message.parts.map((part, i) => {
  if (part.type.startsWith('tool-')) {
    return <Tool key={i} part={part} />;
  }
})}
```

---

## Session Management

### Basic Session Patterns
```typescript
// Option 1: Message history approach (Recommended)
const messages: ModelMessage[] = loadPreviousMessages();

const result = await generateText({
  model: claudeCode('sonnet'),
  messages: [...messages, newUserMessage],
});

// Option 2: Session resumption (Limited)
const result = await generateText({
  model: claudeCode('sonnet', { resume: sessionId }),
  messages: [newUserMessage],
});
```

### Server-Side Session Persistence
```javascript
// Express server with session management
app.post('/api/chat', async (req, res) => {
  const { messages, chatId } = req.body;
  
  // Load existing conversation
  const existingMessages = await sessionStore.getChatMessages(chatId);
  const allMessages = [...existingMessages, ...messages];
  
  // Convert to Claude format
  const coreMessages = allMessages.map(msg => ({
    role: msg.role,
    content: msg.parts?.map(part => part.text || '').join('') || ''
  }));
  
  // Stream response
  const result = streamText({
    model: createClaudeProvider(),
    messages: coreMessages,
  });
  
  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages: updatedMessages }) => {
      await sessionStore.saveChat(chatId, updatedMessages);
    },
  });
});
```

---

## Error Handling & Authentication

### Authentication Setup
```bash
# Install CLI globally
npm install -g @anthropic-ai/claude-code

# Authenticate
claude login

# Verify authentication  
claude auth status
```

### Error Handling Patterns
```typescript
import { 
  isAuthenticationError, 
  isTimeoutError, 
  getErrorMetadata 
} from 'ai-sdk-provider-claude-code';

try {
  const result = await generateText({
    model: claudeCode('opus'),
    prompt: 'Hello!',
  });
} catch (error) {
  if (isAuthenticationError(error)) {
    console.error('Please run "claude login" to authenticate');
  } else if (isTimeoutError(error)) {
    console.error('Request timed out. Consider using AbortController.');
  } else if (error instanceof APICallError) {
    const metadata = getErrorMetadata(error);
    console.error('CLI error:', {
      message: error.message,
      isRetryable: error.isRetryable,
      exitCode: metadata?.exitCode,
      stderr: metadata?.stderr,
    });
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Timeout Handling for Long Tasks
```typescript
// Custom timeout for complex tasks
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort(new Error('Request timeout after 10 minutes'));
}, 600000);

try {
  const result = await generateText({
    model: claudeCode('opus'),
    prompt: 'Complex analysis task...',
    abortSignal: controller.signal,
  });
  
  clearTimeout(timeoutId);
  console.log(result.text);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled or timed out');
  }
}
```

---

## Migration from v4

### Key Changes in v5

#### 1. Message Format
```typescript
// ❌ v4 format (NOT supported)
{ role: 'user', content: 'Hello' }

// ✅ v5 format (required)
{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }
```

#### 2. Token Usage Properties
```typescript
// ❌ v4 property names
console.log(usage.promptTokens);
console.log(usage.completionTokens);

// ✅ v5 property names
console.log(usage.inputTokens);
console.log(usage.outputTokens);
console.log(usage.totalTokens); // New in v5
```

#### 3. Streaming API Changes
```typescript
// ❌ v4 streaming pattern
const { textStream } = await streamText({...});

// ✅ v5 streaming pattern
const result = streamText({...});
const text = await result.text;
const usage = await result.usage;

// Or stream chunks
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

#### 4. Result Structure
```typescript
// ❌ v4 pattern
const { text, usage } = await generateText(...);

// ✅ v5 pattern  
const result = await generateText(...);
console.log(result.text);
console.log(result.usage);
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
**Problem**: Getting authentication errors  
**Solution**:
```bash
claude login
claude auth status
npx tsx examples/check-cli.ts  # Verify setup
```

#### 2. Message Format Errors  
**Problem**: "Invalid message content format"  
**Solution**: Ensure v5 format with parts array:
```typescript
// ✅ Correct
{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }
```

#### 3. Object Generation Failures
**Problem**: Claude returns text instead of JSON  
**Solutions**:
- Simplify schema - start with fewer fields
- Add field descriptions with `.describe()`
- Implement retry logic
- Use more explicit prompts

#### 4. Tool Permission Issues
**Problem**: Tools blocked or not working  
**Solutions**:
```typescript
// Check allowed tools
const claude = createClaudeCode({
  allowedTools: ['Read', 'Write', 'Edit'],  // Explicit allowlist
});

// Or remove restrictions
const claude = createClaudeCode({
  permissionMode: 'bypassPermissions',
});
```

#### 5. Long-Running Task Timeouts
**Problem**: Complex queries timing out  
**Solution**: Use custom timeouts with AbortSignal (see Error Handling section)

#### 6. Provider Metadata Missing
**Problem**: Can't access session IDs or costs  
**Solution**:
```typescript
const result = await generateText({...});
const metadata = result.providerMetadata?.['claude-code'];
console.log({
  sessionId: metadata?.sessionId,
  costUsd: metadata?.costUsd,
  durationMs: metadata?.durationMs
});
```

### Performance Tips
1. **Use `sonnet` for faster responses**, `opus` for complex reasoning
2. **Implement proper error boundaries** in React applications  
3. **Use AbortController** for cancellable requests
4. **Memoize gestures and expensive computations**
5. **Consider streaming** for better user experience

### Debugging
```bash
# Test CLI setup
npx tsx examples/check-cli.ts

# Test basic functionality
npx tsx examples/basic-usage.ts

# Test streaming
npx tsx examples/streaming.ts

# Test object generation
npx tsx examples/generate-object-basic.ts
```

---

## Limitations

- **No image support**: Claude Code SDK doesn't support image inputs
- **No embedding support**: Text embeddings not available
- **Limited model options**: Only 'opus' and 'sonnet' models  
- **No native JSON mode**: Object generation uses prompt engineering
- **Session management**: Message history recommended over session resumption
- **Platform-specific**: Some features may vary between iOS/Android/Web

---

## Resources

- **Official AI SDK Docs**: https://sdk.vercel.ai
- **Claude Code CLI**: https://docs.anthropic.com/claude-code
- **AI Elements**: https://elements.ai-sdk.dev  
- **Examples**: `examples/` directory in this project
- **GitHub Issues**: For bug reports and feature requests

---

*This consolidated reference combines information from multiple AI SDK v5 documentation sources to provide a single source of truth for development with Claude Code provider.*