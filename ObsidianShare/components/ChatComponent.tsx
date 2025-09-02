import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { PulsingDots } from './PulsingDots';
import { MarkdownMessage } from './MarkdownMessage';

interface ChatComponentProps {
  sessionId: string;
  activeSession: any;
  loadSessionMessages: (sessionId: string) => Promise<any[]>;
  updateSessionMessages: (sessionId: string, messages: any[]) => void;
  renameSession: (sessionId: string, title: string) => void;
  pendingFirstMessage?: string | null;
  onFirstMessageSent?: () => void;
}

export function ChatComponent({ sessionId, activeSession, loadSessionMessages, updateSessionMessages, renameSession, pendingFirstMessage, onFirstMessageSent }: ChatComponentProps) {
  console.log('💬 ChatComponent render - sessionId:', sessionId, 'loadSessionMessages:', typeof loadSessionMessages);
  
  const [chatError, setChatError] = useState(null);
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [inputFocused, setInputFocused] = useState(false);
  
  const sessionConfig = {
    apiBaseUrl: 'http://192.168.178.147:3001',
    platform: 'mobile' as const,
  };
  
  const currentSessionIdRef = useRef(sessionId);
  
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
    console.log('🔄 Updated currentSessionIdRef to:', sessionId);
  }, [sessionId]);

  const chatHook = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: 'http://192.168.178.147:3001/api/chat',
    }),
    
    id: sessionId,
    initialMessages: [],
    body: {
      chatId: sessionId,
    },
    onError: (error) => {
      console.error('🚨 useChat error:', error);
      setChatError(error);
    },
    onFinish: async (message) => {
      console.log('🎯 onFinish called for sessionId:', sessionId, message);
      setChatError(null);
      
      // Update session messages count immediately after message completion
      if (message.messages && updateSessionMessages) {
        console.log('📊 Updating session messages count to:', message.messages.length);
        updateSessionMessages(sessionId, message.messages);
      }
      
      // Clear pending first message after successful completion
      if (pendingFirstMessage) {
        console.log('✅ Clearing pendingFirstMessage after successful completion');
        
        // Only fetch title if we don't have one yet (title is still "New Chat")
        if (activeSession && activeSession.title === 'New Chat') {
          console.log('🎯 First message stream complete, fetching title from backend');
          
          const fetchTitle = async () => {
            try {
              const response = await fetch(`${sessionConfig.apiBaseUrl}/api/chats`);
              const sessions = await response.json();
              const currentSession = sessions.find(s => s.id === sessionId);
              
              if (currentSession && currentSession.title !== 'New Chat') {
                console.log('✅ Got backend title:', currentSession.title);
                renameSession(sessionId, currentSession.title);
              } else {
                console.log('⚠️ Backend title still "New Chat", something went wrong');
              }
            } catch (error) {
              console.error('❌ Error fetching title:', error);
            }
          };
          
          fetchTitle();
        } else {
          console.log('🔄 Already have title:', activeSession?.title || 'undefined');
        }
        
        onFirstMessageSent?.();
      }
    }
  });
  
  console.log('🔍 useChat hook debug:', Object.keys(chatHook));
  console.log('🔍 Available functions:', {
    messages: !!chatHook.messages,
    sendMessage: typeof chatHook.sendMessage,
    status: chatHook.status,
    error: !!chatHook.error
  });
  
  const { 
    messages, 
    sendMessage,
    status,
    error,
    setMessages 
  } = chatHook;
  
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text style={{ color: '#dc2626', fontSize: 16, textAlign: 'center' }}>
          {error.message}
        </Text>
        <TouchableOpacity 
          style={{ 
            marginTop: 16, 
            backgroundColor: '#dc2626', 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            borderRadius: 6 
          }}
          onPress={() => window.location?.reload?.() || console.log('Reload needed')}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, status]);

  useEffect(() => {
    // Skip loading messages if we have a pending first message (new chat)
    if (pendingFirstMessage) {
      console.log('🚫 Skipping message loading - have pendingFirstMessage');
      return;
    }

    const controller = new AbortController();
    
    const loadMessages = async () => {
      console.log('📥 Loading messages for sessionId:', sessionId);
      
      try {
        const messages = await loadSessionMessages(sessionId);
        
        if (!controller.signal.aborted) {
          const messagesWithIds = messages.map((msg, index) => ({
            ...msg,
            id: msg.id || `${sessionId}-${index}-${Date.now()}`,
          }));
          console.log('✅ Loaded', messagesWithIds.length, 'messages, setting to useChat');
          setMessages([...messagesWithIds]);
          
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }, 50);
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
  }, [pendingFirstMessage]);

  // Auto-send pending first message immediately when sendMessage becomes available
  useEffect(() => {
    if (pendingFirstMessage && sendMessage && status === 'ready') {
      console.log('🚀 Auto-sending pending first message:', pendingFirstMessage);
      sendMessage({ text: pendingFirstMessage }); // useChat handles optimistic display
      // Note: Don't call onFirstMessageSent() immediately - wait for completion
    }
  }, [pendingFirstMessage, sendMessage, status]);

  const handleSendMessage = async (messageText: string) => {
    if (status === 'streaming' || status === 'submitted') return;
    
    console.log('📤 Sending message to sessionId:', sessionId);
    console.log('📤 sendMessage type:', typeof sendMessage);
    console.log('📤 Attempting to send:', messageText);
    
    try {
      if (sendMessage) {
        await sendMessage({ text: messageText });
        console.log('✅ Message sent successfully');
      } else {
        console.error('❌ sendMessage is not available');
        throw new Error('SendMessage function not available');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior="padding" 
      enabled={inputFocused}
      style={{ flex: 1 }}
    >
      <>
      {/* Error Display */}
      {chatError && (
        <View style={{ 
          margin: 16, 
          padding: 12, 
          backgroundColor: '#fef2f2', 
          borderRadius: 8, 
          borderWidth: 1, 
          borderColor: '#fecaca' 
        }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#dc2626', marginBottom: 4 }}>
            🚨 Chat Error
          </Text>
          <Text style={{ fontSize: 14, color: '#b91c1c' }}>
            {chatError.message}
          </Text>
          {chatError.message.includes('structuredClone') && (
            <Text style={{ fontSize: 12, color: '#7f1d1d', fontStyle: 'italic', marginTop: 4 }}>
              💡 React Native compatibility issue detected
            </Text>
          )}
          <TouchableOpacity 
            style={{ 
              marginTop: 8, 
              backgroundColor: '#dc2626', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 4 
            }}
            onPress={() => setChatError(null)}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1, zIndex: 1, backgroundColor: '#fff' }} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="never"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {messages.map((message, index) => {
          const messageKey = `msg-${index}-${message.id || 'no-id'}`;
          
          return (
            <MessageBubble key={messageKey} role={message.role}>
              {message.parts?.map((part, i) => {
                const partKey = `${messageKey}-part-${i}`;
                
                switch (part.type) {
                  case 'text':
                    return <MarkdownMessage key={partKey} content={part.text} isAssistant={message.role === 'assistant'} />;
                  
                  case 'step-start':
                  case 'step-finish':
                    return null;
                  
                  case 'tool-Read':
                  case 'tool-Write':
                  case 'tool-Edit':
                  case 'tool-Bash':
                  case 'tool-Grep':
                  case 'tool-Glob':
                    return (
                      <View key={partKey} style={{ 
                        backgroundColor: '#f0f8ff', 
                        padding: 8, 
                        marginVertical: 4, 
                        borderRadius: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: '#007AFF'
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#007AFF', marginBottom: 4 }}>
                          🛠️ {part.type.replace('tool-', '')}
                        </Text>
                        <Text style={{ fontSize: 10, fontFamily: 'monospace', color: '#666' }}>
                          {JSON.stringify(part, null, 2)}
                        </Text>
                      </View>
                    );
                  
                  default:
                    if (typeof part === 'string') {
                      return <MarkdownMessage key={partKey} content={part} isAssistant={message.role === 'assistant'} />;
                    }
                    return (
                      <Text key={partKey} style={{ fontStyle: 'italic', color: '#999' }}>
                        [Unknown part type: {part.type || typeof part}]
                      </Text>
                    );
                }
              }) || <Text>[No content]</Text>}
            </MessageBubble>
          );
        })}
        
        {/* Loading indicator */}
        {status === 'submitted' && (
          <MessageBubble role="assistant">
            <PulsingDots />
          </MessageBubble>
        )}
        
        {/* Error indicator in chat */}
        {chatError && (
          <MessageBubble role="assistant">
            <Text style={{ fontStyle: 'italic', color: '#dc2626' }}>
              ❌ Error: {chatError.message}
            </Text>
          </MessageBubble>
        )}
      </ScrollView>

      <ChatInput
        onSend={handleSendMessage}
        disabled={status === 'streaming' || status === 'submitted'}
        showTopBorder={true}
        onFocusChange={setInputFocused}
      />
    </>
    </KeyboardAvoidingView>
  );
}