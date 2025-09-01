import { NextRequest } from 'next/server';

const isLocalMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SERVER_MODE === 'local';
const BACKEND_URL = isLocalMode ? 'http://localhost:3000' : 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Chats proxy error:', error);
    return Response.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const response = await fetch(`${BACKEND_URL}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Create chat proxy error:', error);
    return Response.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}