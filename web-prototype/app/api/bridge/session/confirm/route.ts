import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId } = body;

    // Forward to bridge server
    const response = await fetch(`http://localhost:3001/api/session/${sessionId || 'current'}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Bridge server responded with ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Confirm API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to confirm proposal',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}