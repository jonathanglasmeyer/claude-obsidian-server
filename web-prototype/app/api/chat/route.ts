import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;
    
    // Always connect to localhost:3001 - either SSH tunnel or local server
    const apiUrl = 'http://localhost:3001/api/ai-chat';
    console.log('🔗 Connecting to bridge server at localhost:3001');
    
    console.log('Frontend messages:', JSON.stringify(messages, null, 2));
    console.log(`Connecting to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
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