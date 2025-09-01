# AI SDK v5 Components Research

## Key Findings from Context7 Documentation

### 1. AI SDK v5 Architecture Overview

**Three Main Packages:**
- **AI SDK Core**: Server-side text/object generation (`streamText`, `streamObject`)
- **AI SDK UI**: Client-side React hooks (`@ai-sdk/react`, `useChat`, `useObject`) ✅ **Production Ready**
- **AI SDK RSC**: React Server Components (`streamUI`) ⚠️ **Experimental - Not for Production**

**Our Focus**: AI SDK UI with `@ai-sdk/react` package.

### 2. Current AI SDK v5 Message Structure

**Key Change**: Messages now use `message.parts[]` array instead of `message.content` string.

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{
    type: 'text' | 'tool-invocation' | 'tool-result' | 'reasoning' | 'file' | 'source' | string;
    text?: string;
    // ... other type-specific properties
  }>;
  metadata?: { duration?: number; model?: string; totalTokens?: number };
}
```

### 3. Proper Message Rendering Patterns

**✅ Correct v5 Pattern:**
```tsx
{messages.map(message => (
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
          return <details key={index}><summary>Reasoning</summary><pre>{part.text}</pre></details>;
        default:
          return <div key={index}>{JSON.stringify(part, null, 2)}</div>;
      }
    })}
  </div>
))}
```

**❌ Our Current Primitive Pattern:**
```tsx
// This is what we currently have - only handles text parts
{m.parts?.map((part: any, index: number) => 
  part.type === 'text' ? <span key={index}>{part.text}</span> : null
)}
```

### 4. Tool Call Visualization

**Key Insight**: AI SDK v5 has built-in support for tool call visualization via message parts.

**Tool Part Types for Claude Code CLI:**
- `'tool-Read'` - When Claude reads files
- `'tool-Write'` - When Claude writes files  
- `'tool-Edit'` - When Claude edits files
- `'tool-Bash'` - When Claude runs commands
- `'tool-Grep'` - When Claude searches content

**Tool States:**
- `'input-streaming'` - Tool parameters being received
- `'input-available'` - Tool ready to execute  
- `'output-available'` - Tool execution completed
- `'output-error'` - Tool execution failed

### 5. Advanced Message Features

**Metadata Support:**
```tsx
{message.metadata?.duration && <div>Duration: {message.metadata.duration}ms</div>}
{message.metadata?.model && <div>Model: {message.metadata.model}</div>}
{message.metadata?.totalTokens && <div>Tokens: {message.metadata.totalTokens}</div>}
```

**Loading States:**
```tsx
{message.parts.map((part, i) => {
  if (part.type === 'text' && part.state === 'streaming') {
    return <span key={i}>{part.text}<span className="cursor">▎</span></span>;
  }
})}
```

### 6. Error Handling

**Built-in Error Support:**
```tsx
const { messages, error, reload, status } = useChat();

{error && (
  <div className="error">
    <div>An error occurred: {error.message}</div>
    <button onClick={() => reload()}>Retry</button>
  </div>
)}
```

### 7. What We Need to Implement

**Phase 3.7.1 Tasks:**

1. **Replace Primitive Message Rendering**:
   - Switch from basic `<div>` to proper part-based rendering
   - Handle all part types (text, tool calls, reasoning, errors)

2. **Tool Call Visualization**:
   - Show when Claude is reading/writing/editing files
   - Display tool parameters and results
   - Add progress indicators for tool execution

3. **Better UI Components**:
   - Proper loading states with cursors/spinners
   - Error boundaries and retry mechanisms
   - Metadata display (duration, tokens, model)

4. **File Operation Workflow**:
   - Preview tool calls before execution
   - User confirmation for file writes/edits
   - Show git diff-style previews

### 8. Implementation Strategy

**Step 1**: Update message rendering to handle all part types
**Step 2**: Add specific renderers for Claude Code tools (Read, Write, Edit, Bash)
**Step 3**: Implement loading states and progress indicators
**Step 4**: Add error boundaries and retry functionality
**Step 5**: Create confirmation workflows for file operations

### 9. Current Status vs Reality

**What PLAN.md Claims**: "Phase 3.6 COMPLETE ✅ FULLY OPERATIONAL"

**What Actually Works**:
- ✅ Basic text streaming  
- ✅ Multi-turn conversations
- ✅ AI SDK v5 pipeline

**What's Missing**:
- ❌ Tool call visibility (major UX issue)
- ❌ Proper AI SDK components  
- ❌ Loading states and error handling
- ❌ File operation confirmations
- ❌ Professional chat UI

**Realistic Assessment**: Phase 3.6 is "Basic Streaming Works" not "Fully Operational"

### 10. CRITICAL: Wrong Approach Discovered

**❌ MISTAKE**: I built custom message components manually instead of using **AI Elements**.

**✅ CORRECT APPROACH**: Use Vercel's **AI Elements** - Professional UI components for AI apps.

### 11. AI Elements: The Right Way

**What it is**: Official Vercel component library for AI apps with pre-built:
- `Conversation` - Chat container
- `Message` - Professional messages with avatars  
- `Response` - AI responses with streaming
- `Reasoning` - Collapsible reasoning display
- `Sources` - Citations and sources
- `Tool` - Tool call visualization
- `PromptInput` - Professional input with toolbar
- And many more!

**Installation**:
```bash
npx ai-elements@latest  # Install all components
npx ai-elements@latest add message  # Install specific component
```

**Example Usage** (from Vercel docs):
```tsx
'use client';

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

export default function Chat() {
  const { messages } = useChat();

  return (
    <Conversation>
      <ConversationContent>
        {messages.map((message, index) => (
          <Message key={index} from={message.role}>
            <MessageContent>
              <Response>{message.content}</Response>
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
    </Conversation>
  );
}
```

### 12. Complete Example from Vercel Docs

**Chatbot with Reasoning, Sources, Tool Calls**:
```tsx
{messages.map((message) => (
  <div key={message.id}>
    {message.role === 'assistant' && (
      <Sources>
        <SourcesTrigger count={message.parts.filter((part) => part.type === 'source-url').length} />
        {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
          <SourcesContent key={`${message.id}-${i}`}>
            <Source href={part.url} title={part.url} />
          </SourcesContent>
        ))}
      </Sources>
    )}
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return <Response key={`${message.id}-${i}`}>{part.text}</Response>;
            case 'reasoning':
              return (
                <Reasoning key={`${message.id}-${i}`} isStreaming={status === 'streaming'}>
                  <ReasoningTrigger />
                  <ReasoningContent>{part.text}</ReasoningContent>
                </Reasoning>
              );
            default:
              return null;
          }
        })}
      </MessageContent>
    </Message>
  </div>
))}
```

### 13. Next Session Action Plan

**Step 1**: Kill current approach
- Remove all custom message rendering code from `page.tsx`
- Delete the manual styling and part handling

**Step 2**: Install AI Elements
```bash
cd web-prototype
npx ai-elements@latest  # Answer Y to setup
```

**Step 3**: Replace with AI Elements
- Import proper components: `Conversation`, `Message`, `Response`, etc.
- Use the exact pattern from Vercel docs above
- Handle Claude Code tool parts properly

**Step 4**: Test professional UI
- Should look like the Vercel docs screenshot
- Proper avatars, spacing, professional design
- Tool calls should be properly visualized

### 14. Why This Matters

**Current Status**: Homebrew components that look unprofessional
**Goal**: Production-ready UI that matches modern AI app standards

**AI Elements provides**:
- ✅ Professional design out of the box
- ✅ Proper tool call visualization  
- ✅ Built-in loading states and animations
- ✅ Accessibility and responsive design
- ✅ Consistent with modern AI UX patterns

**Key Insight**: Don't reinvent the wheel - use Vercel's battle-tested components!

### 15. Files to Modify Next Session

1. **`web-prototype/app/page.tsx`** - Replace entire message rendering section
2. **`web-prototype/package.json`** - Will be updated by AI Elements installer
3. **`components.json`** - Will be created by AI Elements setup
4. **New directory**: `components/ai-elements/` - AI Elements components

**Current Custom Code to DELETE**:
- Lines 44-321 in `page.tsx` (all the custom message rendering)
- The manual `style={{}}` objects
- The switch statement for part types

**Replace with**: Clean AI Elements pattern from the example above.

## **16. Complete AI Elements Component List**

**Registry URL**: `https://registry.ai-sdk.dev/all.json`

**All 16 Available Components**:

1. **`actions`** - AI-powered actions component (interactive buttons)
2. **`branch`** - AI-powered branch component (conversation branching)  
3. **`code-block`** - AI-powered code block component (syntax highlighting)
4. **`conversation`** - AI-powered conversation component (chat container) ⭐
5. **`image`** - AI-powered image component (AI-generated images)
6. **`inline-citation`** - AI-powered inline citation component (source refs)
7. **`loader`** - AI-powered loader component (loading states) ⭐
8. **`message`** - AI-powered message component (chat messages) ⭐
9. **`prompt-input`** - AI-powered prompt input component (advanced input) ⭐
10. **`reasoning`** - AI-powered reasoning component (collapsible reasoning) ⭐
11. **`response`** - AI-powered response component (AI text responses) ⭐
12. **`sources`** - AI-powered sources component (citations/references) ⭐
13. **`suggestion`** - AI-powered suggestion component (quick actions)
14. **`task`** - AI-powered task component (task tracking)
15. **`tool`** - AI-powered tool component (tool call visualization) ⭐⭐
16. **`web-preview`** - AI-powered web preview component (embedded pages)

**⭐ = Essential for our chat app**  
**⭐⭐ = Critical for Claude Code tool calls**

## **17. How to Fetch Component Documentation**

**Method 1: Context7 Lookup**
```
Use context7-doc-lookup agent to search for specific components:
"AI Elements Tool component usage"  
"AI Elements Message component props"
"AI Elements Conversation container setup"
```

**Method 2: Registry Direct Fetch**
```
Individual component JSON: https://registry.ai-sdk.dev/{component-name}.json
Examples:
- https://registry.ai-sdk.dev/tool.json (for tool calls!)  
- https://registry.ai-sdk.dev/message.json
- https://registry.ai-sdk.dev/conversation.json
```

**Method 3: Official Docs**
```
WebFetch: https://elements.ai-sdk.dev/components/{component-name}
Examples:
- https://elements.ai-sdk.dev/components/tool
- https://elements.ai-sdk.dev/components/message  
- https://elements.ai-sdk.dev/components/conversation
```

## **18. Critical Components for Claude Code**

**For Tool Call Visualization** (our main need):
1. **`tool`** - Shows when Claude uses Read/Write/Edit/Bash ⭐⭐
2. **`message`** - Professional message container
3. **`response`** - AI text responses  
4. **`conversation`** - Chat container
5. **`loader`** - Loading during tool execution

**Installation Command for Essentials**:
```bash
npx ai-elements@latest add tool message response conversation loader
```

## **19. Next Session Research Pattern**

**When you need component details**:

1. **Check the list above** (Section 16) for component name
2. **Use Context7**: `mcp__context7__get-library-docs("/vercel/ai-elements", "tool component usage")`  
3. **Use WebFetch**: `WebFetch("https://elements.ai-sdk.dev/components/tool", "show usage examples")`
4. **Use Registry**: `WebFetch("https://registry.ai-sdk.dev/tool.json", "extract component props and examples")`

**Key Insight**: Always research the `tool` component first - it's crucial for Claude Code visualization!