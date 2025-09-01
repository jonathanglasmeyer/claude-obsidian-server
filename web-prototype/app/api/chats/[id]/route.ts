import { NextRequest } from 'next/server';

const BACKEND_URL = 'http://localhost:3000';

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