'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSessions } from '@/hooks/use-sessions';
import { UserAvatar } from '@/components/avatars/user-avatar';
import { ClaudeAvatar } from '@/components/avatars/claude-avatar';
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

interface ChatComponentProps {
  sessionId: string;
  sessionTitle: string;
}

export function ChatComponent({ sessionId, sessionTitle }: ChatComponentProps) {
  const [input, setInput] = useState('');
  const { loadSessionMessages } = useSessions();
  
  // Use ref to always get current sessionId in transport body function
  const currentSessionIdRef = useRef(sessionId);
  
  // Update ref when sessionId prop changes
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
    console.log('🔄 Updated currentSessionIdRef to:', sessionId);
  }, [sessionId]);

  console.log('🚀 ChatComponent initialized with sessionId:', sessionId);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleChatError = useCallback((error: Error) => {
    console.error('useChat error:', error);
  }, []);
  
  const handleChatFinish = useCallback((message: any) => {
    console.log('🎯 onFinish called for sessionId:', sessionId, message);
    // Note: Don't use updateSessionMessages here - it's handled by backend persistence
    // The backend already saves the conversation when chatId is provided
  }, [sessionId]);

  // Debug config
  console.log('🔧 ChatComponent useChat config:', {
    sessionId,
    key: sessionId,
    sessionIdType: typeof sessionId,
    sessionIdDefined: sessionId !== undefined
  });

  // ✅ AI SDK v5: useChat with dynamic transport configuration
  const { messages, sendMessage, isLoading, status, error, reload, stop, setMessages } = useChat({
    key: sessionId, // Force recreation when sessionId changes
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => {
        console.log('🚀 Transport body function called - sessionId:', sessionId, typeof sessionId);
        return {
          chatId: sessionId, // Dynamic chatId evaluation per request
        };
      },
    }),
    initialMessages: [], // Will be loaded via useEffect
    onError: handleChatError,
    onFinish: handleChatFinish
  });

  // Load session messages when component mounts
  useEffect(() => {
    const controller = new AbortController();
    
    const loadMessages = async () => {
      console.log('📥 Loading messages for sessionId:', sessionId);
      try {
        const messages = await loadSessionMessages(sessionId);
        
        if (!controller.signal.aborted) {
          // Add IDs to messages if they don't have them
          const messagesWithIds = messages.map((msg, index) => ({
            ...msg,
            id: msg.id || `${sessionId}-${index}-${Date.now()}`,
          }));
          console.log('✅ Loaded', messagesWithIds.length, 'messages, setting to useChat');
          setMessages([...messagesWithIds]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('❌ Failed to load messages:', error);
          setMessages([]);
        }
      }
    };
    
    loadMessages();
    
    return () => {
      controller.abort();
    };
  }, [sessionId, loadSessionMessages, setMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submit during processing
    if (status === 'submitted' || status === 'streaming') {
      return;
    }
    
    if (input.trim()) {
      console.log('📤 Sending message to sessionId:', sessionId);
      sendMessage({ text: input });
      setInput('');
    }
  };

  const renderMessagePart = (part: any, key: string) => {
    switch (part.type) {
      case 'text':
        return (
          <Response key={key}>
            {part.text}
          </Response>
        );
        
      case 'step-start':
        return null;
        
      // Claude Code tool types
      case 'tool-Read':
      case 'tool-Write':
      case 'tool-Edit':
      case 'tool-Bash':
      case 'tool-Grep':
      case 'tool-Glob':
        const toolName = part.type.replace('tool-', '');
        const toolPart = part as ToolUIPart;
        
        return (
          <Tool key={key}>
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
        return (
          <Tool key={key}>
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
          <div key={key} className="p-3 bg-muted rounded-lg">
            <strong>Unknown Part: {part.type}</strong>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(part, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold tracking-tight">Obsidian Vault Organizer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chat: {sessionTitle}
        </p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.map((message, messageIndex) => {
              if (!message.id) {
                console.error('🚨 Message without ID found:', message);
              }
              // Use messageIndex to ensure unique keys even with duplicate message IDs
              const uniqueKey = `${message.id || 'no-id'}-${messageIndex}`;
              return (
                <Message key={uniqueKey} from={message.role}>
                  {message.role === 'user' ? (
                    <UserAvatar key={`${uniqueKey}-avatar`} />
                  ) : (
                    <ClaudeAvatar key={`${uniqueKey}-avatar`} />
                  )}
                  <MessageContent>
                    {message.parts ? (
                      message.parts.map((part, index) => renderMessagePart(part, `${uniqueKey}-${index}`))
                    ) : message.content ? (
                      renderMessagePart({ type: 'text', text: message.content }, `${uniqueKey}-text`)
                    ) : null}
                  </MessageContent>
                </Message>
              );
            })}
            
            {/* Loading spinner */}
            {status === 'submitted' && (
              <Message key="loading-message" from="assistant">
                <ClaudeAvatar key="loading-avatar" />
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