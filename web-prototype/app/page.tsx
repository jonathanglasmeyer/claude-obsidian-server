'use client';

import { useChat } from '@ai-sdk/react';
import React, { useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/conversation';
import {
  Message,
  MessageContent,
  MessageAvatar,
} from '@/components/message';
import { Response } from '@/components/response';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/tool';
import { Button } from '@/components/ui/button';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from '@/components/prompt-input';
import { Loader } from '@/components/loader';
import type { ToolUIPart } from 'ai';

export default function Home() {
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, isLoading, status, error, reload, stop } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('useChat error:', error);
    },
    onFinish: (message) => {
      console.log('useChat finished:', message);
      console.log('Final message parts:', message.parts);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple: prevent submit during submitted/streaming
    if (status === 'submitted' || status === 'streaming') {
      return;
    }
    
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const renderMessagePart = (part: any, index: number) => {
    switch (part.type) {
      case 'text':
        return (
          <Response key={index}>
            {part.text}
          </Response>
        );
        
      case 'step-start':
        // Skip rendering step-start parts - handled centrally by the standalone loader
        return null;
        
      // Claude Code tool types - use the Tool component
      case 'tool-Read':
      case 'tool-Write':
      case 'tool-Edit':
      case 'tool-Bash':
      case 'tool-Grep':
      case 'tool-Glob':
        const toolName = part.type.replace('tool-', '');
        const toolPart = part as ToolUIPart;
        
        return (
          <Tool key={index}>
            <ToolHeader 
              type={toolName} 
              state={toolPart.state}
            />
            <ToolContent>
              {toolPart.input && (
                <ToolInput input={toolPart.input} />
              )}
              {(toolPart.output || toolPart.errorText) && (
                <ToolOutput 
                  output={toolPart.output}
                  errorText={toolPart.errorText}
                />
              )}
            </ToolContent>
          </Tool>
        );
        
      case 'tool-invocation':
      case 'tool-result':
        // Generic tool handling for non-Claude Code tools
        return (
          <Tool key={index}>
            <ToolHeader 
              type={part.toolName || 'Tool'} 
              state={part.state || 'output-available'}
            />
            <ToolContent>
              {part.args && (
                <ToolInput input={part.args} />
              )}
              {part.result && (
                <ToolOutput 
                  output={typeof part.result === 'string' ? part.result : JSON.stringify(part.result, null, 2)}
                  errorText={undefined}
                />
              )}
            </ToolContent>
          </Tool>
        );
        
      default:
        return (
          <div key={index} className="p-3 bg-muted rounded-lg">
            <strong>Unknown Part: {part.type}</strong>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(part, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="h-screen max-w-4xl mx-auto w-full flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <h1 className="text-xl font-semibold tracking-tight">Obsidian Vault Organizer</h1>
          <p className="text-muted-foreground text-sm mt-1">Chat with Claude to organize content in your vault</p>
        </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
          <Conversation className="flex-1">
            <ConversationContent>
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageAvatar
                    src={message.role === 'user' ? 'https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff' : 'https://ui-avatars.com/api/?name=Claude&background=8b5cf6&color=fff'}
                    name={message.role === 'user' ? 'You' : 'Claude'}
                  />
                  <MessageContent>
                    {message.parts?.map((part, index) => renderMessagePart(part, index))}
                  </MessageContent>
                </Message>
              ))}
              
              {/* Loading spinner in same position as chat bubble */}
              {status === 'submitted' && (
                <Message from="assistant">
                  <MessageAvatar
                    src="https://ui-avatars.com/api/?name=Claude&background=8b5cf6&color=fff"
                    name="Claude"
                  />
                  <MessageContent>
                    <div className="min-h-6 flex items-center">
                      <Loader size={16} />
                    </div>
                  </MessageContent>
                </Message>
              )}
              
              {error && (
                <div className="mx-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="font-medium text-destructive mb-2">
                    ❌ Error occurred
                  </div>
                  <div className="text-sm mb-3">
                    {error.message}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => reload()}>
                    🔄 Retry
                  </Button>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Input Form */}
          <div className="p-4">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={false}
              />
              <PromptInputToolbar>
                <div /> {/* Spacer */}
                {(status === 'submitted' || status === 'streaming') && stop ? (
                  <Button size="icon" onClick={stop}>
                    <div className="w-3 h-3 bg-current" />
                  </Button>
                ) : (
                  <PromptInputSubmit
                    disabled={!input.trim() || !!error || status === 'submitted' || status === 'streaming'}
                  />
                )}
              </PromptInputToolbar>
            </PromptInput>
        </div>
      </div>
    </div>
  );
}