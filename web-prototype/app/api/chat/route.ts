import { NextRequest } from 'next/server';
import { getApiHeaders } from '../../../lib/api-headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, chatId: bodyChatId } = body;
    
    // Extract chatId from query string AND body (body takes precedence)
    const { searchParams } = new URL(req.url);
    const queryChatId = searchParams.get('chatId') === 'new' ? null : searchParams.get('chatId');
    const chatId = bodyChatId || queryChatId;
    
    // Explicit mode selection via environment variable
    const isLocalMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SERVER_MODE === 'local';
    const apiUrl = isLocalMode ? 'http://localhost:3000/api/chat' : 'http://localhost:3001/api/chat';
    const serverType = isLocalMode ? 'LOCAL' : 'SSH';
    
    console.log(`🔗 Connecting to ${serverType} server at ${apiUrl}`);
    
    console.log('Frontend messages:', messages.length, 'messages');
    console.log('Frontend chatId (from query):', queryChatId);
    console.log('Frontend chatId (from body):', bodyChatId);
    console.log('Frontend chatId (final):', chatId);
    console.log('Request URL:', req.url);
    console.log(`Connecting to: ${apiUrl}`);
    
    // 🚨 HARD ERROR: Reject requests without chatId
    if (!chatId) {
      console.error('❌ CRITICAL ERROR: No chatId provided! Cannot send message without session.');
      console.error('   - Query chatId:', queryChatId);
      console.error('   - Body chatId:', bodyChatId);
      console.error('   - This indicates a serious bug in session management');
      return Response.json(
        { 
          error: 'CRITICAL: No chatId provided',
          details: 'Cannot send message without active session ID. This is a bug in the frontend.',
          debug: {
            url: req.url,
            hasQuery: !!queryChatId,
            hasBody: !!bodyChatId,
            messagesCount: messages?.length || 0
          }
        },
        { status: 400 }
      );
    }
    
    const headers = getApiHeaders();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ messages, chatId }),
      // No timeout - let Claude take as long as needed
    });

    if (!response.ok) {
      throw new Error(`AI chat failed: ${response.status}`);
    }

    console.log('Proxying AI SDK v5 response directly...');
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Read a bit of the response to debug
    const responseClone = response.clone();
    const reader = responseClone.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const decoded = new TextDecoder().decode(value);
      console.log('First chunk received:', JSON.stringify(decoded));
      reader.releaseLock();
    }
    
    // Direct passthrough - AI SDK v5 format with ALL headers from backend
    const headers = new Headers();
    
    // Copy all headers from backend response (especially X-Vercel-AI-Data-Stream)
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    
    // Ensure critical AI SDK v5 headers are set
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');
    
    console.log('Forwarding headers:', Object.fromEntries(headers.entries()));
    
    // Direct passthrough - the bridge server already uses native AI SDK format
    return new Response(response.body, { headers });

  } catch (error) {
    console.error('Chat proxy error:', error);
    return Response.json(
      { 
        error: 'Failed to proxy to bridge server',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}