import { NextRequest } from 'next/server';

const isLocalMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SERVER_MODE === 'local';
const BACKEND_URL = isLocalMode ? 'http://localhost:3000' : 'http://localhost:3001';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chats/${params.id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Backend request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Delete chat proxy error:', error);
    return Response.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}