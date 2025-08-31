'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('useChat error:', error);
    },
    onFinish: (message) => {
      console.log('useChat finished:', message);
    }
  });

  console.log('useChat state:', { 
    messagesCount: messages?.length || 0, 
    input, 
    isLoading,
    sendMessage: typeof sendMessage,
    hasMessages: !!messages,
    actualMessages: messages
  });

  const [debugResponse, setDebugResponse] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!', { input, messagesLength: messages?.length || 0 });
    
    if (input.trim()) {
      // Debug: Manual fetch to see raw response
      console.log('🔍 DEBUG: Making manual request...');
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: [{ type: 'text', text: input }] }] 
        })
      }).then(async (response) => {
        console.log('🔍 DEBUG: Response received', response.status);
        const reader = response.body?.getReader();
        if (reader) {
          let result = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);
            result += chunk;
            console.log('🔍 DEBUG: Raw chunk:', JSON.stringify(chunk));
          }
          console.log('🔍 DEBUG: Full response:', result);
          setDebugResponse(result);
        }
      }).catch(err => {
        console.error('🔍 DEBUG: Error:', err);
      });
      
      // Also try useChat
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="container">
      <h1>📝 Obsidian Vault Organizer</h1>
      <p>Chat with Claude to organize content in your vault</p>

      <div>
        {messages?.map((m) => (
          <div key={m.id} className="message">
            <strong>{m.role === 'user' ? 'You: ' : 'Claude: '}</strong>
            {m.parts?.map((part: any, index: number) => 
              part.type === 'text' ? <span key={index}>{part.text}</span> : null
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
      
      <div style={{marginTop: '20px', padding: '10px', background: '#f5f5f5'}}>
        <strong>Debug Info:</strong>
        <br />Messages: {messages?.length || 0}
        <br />Input: "{input || ''}"
        <br />Loading: {String(isLoading || false)}
        {debugResponse && (
          <div style={{marginTop: '10px'}}>
            <strong>Raw Response:</strong>
            <pre style={{fontSize: '12px', background: '#eee', padding: '5px'}}>
              {debugResponse}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}