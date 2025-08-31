# AI SDK v5 + Claude Code Provider Research

## Key Findings

### Correct Streaming Method
- **WRONG**: `result.toDataStreamResponse()` (doesn't exist)
- **RIGHT**: `result.toUIMessageStreamResponse()` (works with useChat)

### Message Format
- **Frontend**: AI SDK v5 sends `{role, parts: [{type: 'text', text: '...'}]}` 
- **Backend**: Convert to `{role, content: 'text'}` for streamText()
- **Response**: Native AI SDK v5 format via `toUIMessageStreamResponse()`

### Working Implementation

```javascript
// Backend conversion
const coreMessages = messages.map(msg => ({
  role: msg.role,
  content: msg.parts?.map(part => part.text).join('') || msg.content || ''
}));

const result = streamText({
  model: claudeProvider,
  messages: coreMessages,
  maxTokens: 4000,
});

// Correct streaming response
return result.toUIMessageStreamResponse();
```

### Available Methods on StreamText Result
- `toUIMessageStreamResponse()` - For useChat() compatibility
- `toTextStreamResponse()` - For simple text streaming  
- `textStream` - AsyncIterable for manual streaming
- `text`, `usage`, `finishReason` - Promises for completion data

### Architecture
- Frontend: `useChat()` with native AI SDK v5 format
- Backend: `ai-sdk-provider-claude-code` with format conversion
- No custom streaming formats - use native AI SDK v5 throughout

## Status
✅ Backend returns proper AI SDK v5 streaming format
✅ Frontend receives compatible response format  
✅ Local development server working with actual vault
❌ Web prototype fetch timeout - connection issue

## Remaining Tasks

### Immediate (Critical Path)
1. **Fix web prototype connection timeout**
   - Frontend getting `fetch failed` / `Headers Timeout Error` 
   - Bridge server may be hanging on `toUIMessageStreamResponse()`
   - Need working end-to-end streaming validation

2. **Validate complete web chat flow**
   - User types message → appears in chat
   - Claude streams response → appears in chat  
   - Multiple messages work correctly
   - Error handling works

### Phase 4: Mobile App Development
3. **React Native setup**
   - `npx react-native init ObsidianShare`
   - Share intent configuration (Android)
   - Core dependencies installation

4. **Share target implementation**
   - Android manifest configuration
   - Share intent handler service
   - Content extraction and queueing

5. **Mobile UI components**
   - Share screen with content preview
   - Streaming text component for Claude responses
   - Proposal view with confirm/cancel actions
   - Error state handling

6. **API integration**
   - Use session-based API (not direct AI SDK for mobile)
   - Handle network disconnections gracefully
   - Session resumption for multi-turn conversations

### Phase 5: Production Polish
7. **Production deployment**
   - Deploy working changes to Hetzner
   - Update production with vault context
   - SSL/domain configuration

8. **Error handling & monitoring**
   - Comprehensive error boundaries
   - Logging and monitoring setup
   - Performance optimization

9. **Documentation**
   - Update PLAN.md with current status
   - API documentation for both endpoints
   - Setup instructions for local development

## Next Actions
1. Debug why `toUIMessageStreamResponse()` causes timeout
2. Get basic "hello" message working end-to-end
3. Move to mobile development once web prototype validates