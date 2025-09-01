import { NextRequest } from 'next/server';

const isLocalMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SERVER_MODE === 'local';
const BACKEND_URL = isLocalMode ? 'http://localhost:3000' : 'http://localhost:3001';

// Disable Next.js API Route caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 Web prototype fetching messages for:', params.id);
    
    const response = await fetch(`${BACKEND_URL}/api/chats/${params.id}/messages`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(60000), // 60s timeout
      // Increase buffer limits
      size: 0, // No size limit
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return Response.json({ messages: [] });
      }
      throw new Error(`Backend request failed: ${response.status}`);
    }
    
    const responseText = await response.text();
    console.log('🔍 Raw response text length:', responseText.length);
    console.log('🔍 Raw response preview:', responseText.substring(0, 100));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.log('📄 Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from backend');
    }
    
    console.log('📥 Backend returned', data.messages?.length || 0, 'messages');
    console.log('📄 Parsed data preview:', JSON.stringify(data, null, 2).substring(0, 200));
    
    return Response.json(data);
  } catch (error) {
    console.error('Chat messages proxy error:', error);
    return Response.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}