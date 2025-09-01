# Learnings - Session Persistence & AI SDK v5 Integration

## Critical Issues Discovered & Resolved

### 1. AI SDK v4/v5 Format Mismatch
**Problem:** Mixed message formats in Redis - old messages used `content`, new messages used `parts[]`
**Root Cause:** Backend saved assistant messages in v4 format while frontend sent v5 format
**Solution:** Fix backend message saving to use AI SDK v5 format:
```js
{ role: 'assistant', parts: [{ type: 'text', text: response }], id: 'msg_...' }
```

### 2. JSON Double-Encoding in Streaming
**Problem:** Newlines displayed as literal `\n` instead of line breaks
**Root Cause:** Streaming response extraction didn't unescape JSON-encoded characters
**Solution:** Unescape JSON in backend streaming parser:
```js
const unescapedText = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
```

### 3. Next.js API Route Aggressive Caching
**Problem:** Updated messages not visible after page reload despite correct Redis storage
**Root Cause:** Next.js cached API route responses even in development mode
**Solution:** Disable caching in API routes:
```js
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

### 4. Fetch Truncation with Large Responses
**Problem:** API returned partial message lists (16 instead of 34 messages)
**Root Cause:** Next.js fetch() had implicit timeout/connection limits
**Solution:** Configure fetch with proper timeout and headers:
```js
signal: AbortSignal.timeout(60000),
headers: { 'Connection': 'keep-alive', 'Cache-Control': 'no-cache' }
```

### 5. React Component Instance Reuse Bug
**Problem:** Messages from new chat sessions saved to wrong existing session
**Root Cause:** Missing `key` prop caused React to reuse ChatComponent instances
**Solution:** Force new component per session:
```jsx
<ChatComponent key={activeSessionId} sessionId={activeSessionId} />
```

## Architecture Insights

- **AI SDK v5** requires consistent message format throughout the pipeline
- **Streaming responses** need careful JSON parsing to avoid encoding issues
- **Next.js development** has hidden caching that can mask backend changes
- **React keys** are critical for stateful components with external dependencies
- **fetch() timeouts** in Node.js environments are not always explicit

## Debugging Methodology

1. **Trace data flow end-to-end**: Redis → Backend API → Frontend API → UI
2. **Compare direct vs proxied responses** to isolate middleware issues  
3. **Log message counts at each layer** to identify truncation points
4. **Test backend directly with curl** to eliminate frontend variables
5. **Use cache-busting parameters** when debugging API responses