import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';

// Custom provider that connects to our bridge server
function createBridgeProvider() {
  return {
    id: 'bridge-server',
    
    async stream(options: any) {
      const { messages } = options;
      const lastMessage = messages[messages.length - 1];
      
      try {
        // First create a session with the bridge server
        const sessionResponse = await fetch('http://localhost:3001/api/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: lastMessage.content,
            type: 'text'
          }),
        });

        if (!sessionResponse.ok) {
          throw new Error(`Bridge server responded with ${sessionResponse.status}`);
        }

        const { sessionId } = await sessionResponse.json();
        
        // Now connect to the streaming endpoint
        const streamResponse = await fetch(`http://localhost:3001/api/session/${sessionId}/stream`, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });

        if (!streamResponse.ok) {
          throw new Error(`Stream failed with ${streamResponse.status}`);
        }

        const reader = streamResponse.body?.getReader();
        if (!reader) {
          throw new Error('No stream reader available');
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Create a readable stream that transforms bridge server SSE to AI SDK format
        const stream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      
                      if (data.type === 'chunk' && data.content) {
                        // Transform to AI SDK format
                        const aiChunk = {
                          type: 'text-delta',
                          textDelta: data.content,
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(aiChunk)}\n\n`));
                      } else if (data.type === 'completed') {
                        // Signal completion
                        controller.enqueue(encoder.encode('data: {"type":"finish","finishReason":"stop"}\n\n'));
                        controller.close();
                        return;
                      } else if (data.type === 'data-proposal') {
                        // Pass through proposal data
                        const proposalChunk = {
                          type: 'data',
                          data: data.data,
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(proposalChunk)}\n\n`));
                      }
                    } catch (parseError) {
                      console.error('Failed to parse SSE data:', parseError);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Stream error:', error);
              controller.error(error);
            } finally {
              reader.releaseLock();
            }
          },
        });

        return {
          stream,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      } catch (error) {
        console.error('Bridge provider error:', error);
        throw error;
      }
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Use our custom bridge provider
    const provider = createBridgeProvider();
    
    const result = await streamText({
      model: provider as any, // Type assertion for custom provider
      messages,
      maxTokens: 4000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}