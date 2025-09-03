import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import Constants from 'expo-constants';
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
  // ChatComponent render
  
  const [chatError, setChatError] = useState(null);
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [inputFocused, setInputFocused] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [hasSentPendingMessage, setHasSentPendingMessage] = useState(false);
  const [titleFetched, setTitleFetched] = useState(false);
  
  // Fade in animation
  const fadeOpacity = useSharedValue(0);
  
  // Trigger fade in when sessionId changes
  useEffect(() => {
    fadeOpacity.value = 0; // Start invisible
    fadeOpacity.value = withTiming(1, { duration: 300 }); // Fade in over 300ms
  }, [sessionId]);
  
  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));
  
  // Stable ref for loadSessionMessages to avoid useEffect re-runs
  const loadSessionMessagesRef = useRef(loadSessionMessages);
  loadSessionMessagesRef.current = loadSessionMessages;
  
  // Auto-detect server IP: Development builds or Expo Go
  const debuggerHost = Constants.debuggerHost?.split(':')[0] 
    || Constants.experienceUrl?.match(/exp:\/\/([^:]+)/)?.[1];
    
  const apiBaseUrl = `http://${debuggerHost}:3001`;
  
  if (!debuggerHost) {
    console.error('❌ No server IP detected - use development build or Expo Go');
  }
  
  const currentSessionIdRef = useRef(sessionId);
  
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
    setTitleFetched(false); // Reset title fetch state for new session
    // Updated currentSessionIdRef
  }, [sessionId]);


  const chatHook = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: `${apiBaseUrl}/api/chat`,
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
    onFinish: async ({ message, messages }) => {
      setChatError(null);
      
      // Update session messages count immediately after message completion
      if (messages && updateSessionMessages) {
        updateSessionMessages(sessionId, messages);
      }
      
      // Clear pending first message after successful completion
      if (pendingFirstMessage) {
        // Fetch title for new session (only after first message completion)
        if (!titleFetched) {
          setTitleFetched(true);
          
          const fetchTitle = async () => {
            try {
              const response = await fetch(`${apiBaseUrl}/api/chats/${sessionId}`);
              const currentSession = await response.json();
              
              if (currentSession && currentSession.title !== 'New Chat') {
                renameSession(sessionId, currentSession.title);
              }
            } catch (error) {
              console.error('❌ Error fetching title:', error);
            }
          };
          
          fetchTitle();
        }
        
        onFirstMessageSent?.();
      }
    }
  });
  
  // useChat hook debug
  
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
  
  // Keyboard event listeners to handle back-gesture dismiss
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      // Keyboard DID SHOW
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
      setInputFocused(true);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Keyboard DID HIDE
      setKeyboardHeight(0);
      setKeyboardVisible(false);
      setInputFocused(false);
    });

    // Keyboard listeners registered
    
    return () => {
      // Removing keyboard listeners
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [sessionId]);

  // Reset keyboard states when session changes
  useEffect(() => {
    // Resetting keyboard states for session change
    setInputFocused(false);
    setKeyboardHeight(0);
    setKeyboardVisible(false);
    setHasSentPendingMessage(false); // Reset pending message flag for new session
    // Reset complete
  }, [sessionId]);

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
      // Skipping message loading - have pendingFirstMessage
      return;
    }

    const controller = new AbortController();
    
    const loadMessages = async () => {
      // Loading messages for sessionId
      
      try {
        const messages = await loadSessionMessagesRef.current(sessionId);
        
        if (!controller.signal.aborted) {
          const messagesWithIds = messages.map((msg, index) => ({
            ...msg,
            id: msg.id || `${sessionId}-${index}-${Date.now()}`,
          }));
          // Loaded messages, setting to useChat
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
  }, [sessionId, pendingFirstMessage]);

  // Auto-send pending first message immediately when sendMessage becomes available
  useEffect(() => {
    if (pendingFirstMessage && sendMessage && status === 'ready' && !hasSentPendingMessage) {
      // Auto-sending pending first message
      setHasSentPendingMessage(true); // Prevent infinite loop
      sendMessage({ text: pendingFirstMessage }); // useChat handles optimistic display
      // Note: Don't call onFirstMessageSent() immediately - wait for completion
    }
  }, [pendingFirstMessage, sendMessage, status, hasSentPendingMessage]);

  const handleSendMessage = async (messageText: string) => {
    if (status === 'streaming' || status === 'submitted') return;
    
    // Sending message to sessionId
    
    try {
      if (sendMessage) {
        await sendMessage({ text: messageText });
        // Message sent successfully
      } else {
        console.error('❌ sendMessage is not available');
        throw new Error('SendMessage function not available');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    
    // If content is shorter than visible area, we're always "at bottom"
    if (contentSize.height <= layoutMeasurement.height) {
      setIsScrolledToBottom(true);
      return;
    }
    
    // Check if user is scrolled to bottom (within 50px threshold)
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    
    setIsScrolledToBottom(isAtBottom);
    // Scroll position update
  };


  // KeyboardAvoidingView render state

  return (
    <KeyboardAvoidingView 
      behavior="padding" 
      enabled={keyboardVisible}
      style={[{ flex: 1 }, fadeAnimatedStyle]}
    >
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
        contentContainerStyle={{ paddingBottom: 8, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
        showTopBorder={!isScrolledToBottom}
        inputFocused={inputFocused}
        onFocusChange={(focused) => {
          // Only update if keyboard events haven't already set the state
          if (keyboardHeight === 0 || !focused) {
            setInputFocused(focused);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}