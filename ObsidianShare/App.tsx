import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { 
  useSessions
} from '@obsidian-bridge/shared-components';
import { ErrorBoundary, ChatErrorFallback } from './ErrorBoundary';
import { PulsingDots } from './components/PulsingDots';

// Modern ChatGPT-style message bubbles
function MessageBubble({ role, children }) {
  const isUser = role === 'user';
  
  if (isUser) {
    // User message: right-aligned light gray bubble
    return (
      <View style={{
        marginVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'flex-end',
      }}>
        <View style={{
          backgroundColor: '#f0f0f0',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 18,
          maxWidth: '80%',
        }}>
          <Text style={{
            fontSize: 16,
            lineHeight: 22,
            color: '#333',
          }}>
            {children}
          </Text>
        </View>
      </View>
    );
  }
  
  // Assistant message: full-width with left/right padding
  return (
    <View style={{
      marginVertical: 16,
      paddingHorizontal: 16,
    }}>
      <Text style={{
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
      }}>
        {children}
      </Text>
    </View>
  );
}

// 🔑 KEY INSIGHT: Separate ChatComponent per session (like Web Prototype)
function ChatComponent({ sessionId, activeSession, loadSessionMessages }) {
  console.log('💬 ChatComponent render - sessionId:', sessionId, 'loadSessionMessages:', typeof loadSessionMessages);
  
  const [inputText, setInputText] = useState('');
  const [chatError, setChatError] = useState(null);
  const scrollViewRef = useRef(null);
  
  const sessionConfig = {
    apiBaseUrl: 'http://192.168.178.147:3001', // Use localhost for local development testing
    platform: 'mobile' as const,
  };
  
  // Use ref to always get current sessionId in transport
  const currentSessionIdRef = useRef(sessionId);
  
  // Update ref when sessionId changes
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
    console.log('🔄 Updated currentSessionIdRef to:', sessionId);
  }, [sessionId]);

  // ✅ Official AI SDK with proper React Native transport  
  const chatHook = useChat({
    // Option 1: Custom transport with expo/fetch (RECOMMENDED)
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: 'http://192.168.178.147:3001/api/chat',
    }),
    
    // Session configuration
    id: sessionId,
    initialMessages: [],
    body: {
      chatId: sessionId, // Pass sessionId to server
    },
    onError: (error) => {
      console.error('🚨 useChat error:', error);
      setChatError(error);
    },
    onFinish: (message) => {
      console.log('🎯 onFinish called for sessionId:', sessionId, message);
      setChatError(null);
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
  
  // Simple error fallback (like official docs)
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
          onPress={() => window.location.reload?.() || console.log('Reload needed')}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Auto-scroll to bottom when messages change (ChatGPT style)
  useEffect(() => {
    if (messages.length > 0) {
      // Smooth scroll for new messages
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, status]); // Also trigger on status change for streaming

  // Load session messages when component mounts (same as web prototype)
  useEffect(() => {
    const controller = new AbortController();
    
    const loadMessages = async () => {
      console.log('📥 Loading messages for sessionId:', sessionId);
      
      try {
        const messages = await loadSessionMessages(sessionId);
        
        if (!controller.signal.aborted) {
          // Add IDs to messages if they don't have them (like web prototype)
          const messagesWithIds = messages.map((msg, index) => ({
            ...msg,
            id: msg.id || `${sessionId}-${index}-${Date.now()}`,
          }));
          console.log('✅ Loaded', messagesWithIds.length, 'messages, setting to useChat');
          setMessages([...messagesWithIds]);
          
          // Initial scroll to bottom (no animation for loaded messages)
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
  }, []); // Only run once on mount - sessionId is stable due to key={sessionId}

  return (
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
      >
        <Text style={{ color: '#999', padding: 16 }}>Messages count: {messages.length}</Text>
        {messages.map((message, index) => (
          <MessageBubble key={message.id || index} role={message.role}>
            {message.parts?.map((part, i) => {
              const partKey = `${message.id || index}-${i}`;
              
              switch (part.type) {
                case 'text':
                  return <Text key={partKey}>{part.text}</Text>;
                
                // Step metadata - don't render (like web prototype)
                case 'step-start':
                case 'step-finish':
                  return null;
                
                // Tool visualizations (future: replace with proper components)
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
                  // Fallback for any unknown part types
                  if (typeof part === 'string') {
                    return <Text key={partKey}>{part}</Text>;
                  }
                  return (
                    <Text key={partKey} style={{ fontStyle: 'italic', color: '#999' }}>
                      [Unknown part type: {part.type || typeof part}]
                    </Text>
                  );
              }
            }) || <Text>[No content]</Text>}
          </MessageBubble>
        ))}
        
        {/* Loading indicator - ChatGPT style pulsing dots */}
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

      {/* Modern Input */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        zIndex: 1
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: '#f8f9fa',
          borderRadius: 25,
          borderWidth: 1,
          borderColor: '#e5e5e5',
          paddingHorizontal: 16,
          paddingVertical: 10,
          maxHeight: 120,
        }}>
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 20,
              color: '#333',
              paddingVertical: 8,
            }}
            value={inputText}
            onChange={e => setInputText(e.nativeEvent.text)}
            placeholder="Ask anything"
            placeholderTextColor="#999"
            multiline
            blurOnSubmit={false}
            onSubmitEditing={() => {
              // Hardware keyboard support (like official docs)
              if (inputText.trim() && status !== 'streaming' && status !== 'submitted') {
                const messageToSend = inputText.trim();
                setInputText('');
                
                (async () => {
                  try {
                    if (sendMessage) {
                      await sendMessage({ text: messageToSend });
                    } else {
                      setInputText(messageToSend);
                    }
                  } catch (error) {
                    console.error('❌ Error via onSubmitEditing:', error);
                    setInputText(messageToSend);
                  }
                })();
              }
            }}
          />
          
          {/* Send/Mic Button */}
          <TouchableOpacity
            style={{
              marginLeft: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: inputText.trim() ? '#10a37f' : '#f0f0f0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            disabled={status === 'streaming' || status === 'submitted'}
            onPress={async () => {
              if (status === 'streaming' || status === 'submitted') return;
              
              if (inputText.trim()) {
                const messageToSend = inputText.trim();
                console.log('📤 Sending message to sessionId:', sessionId);
                console.log('📤 sendMessage type:', typeof sendMessage);
                console.log('📤 Attempting to send:', messageToSend);
                
                // Clear input immediately for better UX
                setInputText('');
                
                try {
                  if (sendMessage) {
                    // Use React Native AI SDK pattern
                    await sendMessage({ text: messageToSend });
                    console.log('✅ Message sent successfully');
                  } else {
                    console.error('❌ sendMessage is not available');
                    // Restore input text if sendMessage failed
                    setInputText(messageToSend);
                  }
                } catch (error) {
                  console.error('❌ Error sending message:', error);
                  // Restore input text on error
                  setInputText(messageToSend);
                }
              }
            }}
          >
            {inputText.trim() ? (
              <Text style={{ 
                color: 'white', 
                fontSize: 16,
                fontWeight: '600' 
              }}>
                ↑
              </Text>
            ) : (
              <Text style={{ 
                color: '#666', 
                fontSize: 16 
              }}>
                🎤
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// 🔑 Main App Component (like Web Prototype page.tsx)
export default function App() {
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  
  // Initialize sessions hook with React Native config
  const sessionConfig = {
    apiBaseUrl: 'http://192.168.178.147:3001', // Use localhost for local development testing
    platform: 'mobile' as const,
  };
  
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    loadSessionMessages,
    isInitialized,
    isLoading,
  } = useSessions(sessionConfig);

  console.log('🏠 Main App render - sessions:', sessions.length, 'activeSessionId:', activeSessionId, 'activeSession:', activeSession?.title);


  // Show loading while sessions are being loaded
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>Loading sessions...</Text>
      </View>
    );
  }

  // Show session selector if no active session
  if (!activeSessionId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666', marginBottom: 16 }}>No active session</Text>
        <TouchableOpacity 
          onPress={async () => {
            const sessionId = await createSession('New Chat');
            console.log('✅ Created new session:', sessionId);
          }}
          style={{ 
            backgroundColor: '#10a37f', 
            paddingHorizontal: 20, 
            paddingVertical: 12, 
            borderRadius: 8 
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Create New Chat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Modern Header */}
        <View style={{ 
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
          backgroundColor: '#fff',
          zIndex: 1
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => setSideMenuVisible(true)}
              style={{ 
                marginRight: 12,
                padding: 8,
              }}
            >
              <Text style={{ fontSize: 20, color: '#333' }}>←</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '600',
                  color: '#333',
                  marginRight: 8
                }}>
                  ChatGPT
                </Text>
                <View style={{
                  backgroundColor: '#10a37f',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '500' }}>5</Text>
                </View>
              </View>
              <Text style={{ 
                fontSize: 14, 
                color: '#666', 
                marginTop: 2 
              }}>
                {activeSession?.title || 'Obsidian Chat'}
              </Text>
            </View>
            
            <TouchableOpacity style={{ padding: 8 }}>
              <Text style={{ fontSize: 18, color: '#666' }}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔑 KEY: ChatComponent with session-specific key (like Web Prototype) */}
        <ErrorBoundary fallback={ChatErrorFallback}>
          <ChatComponent 
            key={activeSessionId} // Force new component instance per session
            sessionId={activeSessionId}
            activeSession={activeSession}
            loadSessionMessages={loadSessionMessages}
          />
        </ErrorBoundary>
      </SafeAreaView>

      {/* Backdrop */}
      {sideMenuVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 1999,
          }}
          onPress={() => setSideMenuVisible(false)}
          activeOpacity={1}
        />
      )}
      
      {/* Modern Side Menu */}
      {sideMenuVisible && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 320,
          backgroundColor: '#f8f9fa',
          zIndex: 2000,
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}>
          {/* Menu Header */}
          <View style={{ 
            paddingHorizontal: 20, 
            paddingVertical: 20,
            paddingTop: 50, // Account for status bar
            borderBottomWidth: 1, 
            borderBottomColor: '#e5e5e5',
            backgroundColor: '#fff'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setSideMenuVisible(false)}>
                <Text style={{ fontSize: 20, color: '#333' }}>✕</Text>
              </TouchableOpacity>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: '#333',
                marginLeft: 16
              }}>
                Chat History
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={async () => {
                console.log('Creating new chat');
                try {
                  await createSession('New Chat');
                  setSideMenuVisible(false);
                } catch (error) {
                  console.error('Failed to create new chat:', error);
                }
              }}
              style={{ 
                backgroundColor: '#10a37f', 
                paddingVertical: 12, 
                paddingHorizontal: 16, 
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginRight: 8 }}>
                +
              </Text>
              <Text style={{ color: 'white', fontWeight: '600' }}>
                New Chat
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Sessions List */}
          <ScrollView style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={{ color: '#999', padding: 16 }}>Sessions count: {sessions.length}</Text>
            {sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                onPress={() => {
                  console.log('Select session:', session.id);
                  setActiveSessionId(session.id);
                  setSideMenuVisible(false);
                }}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  marginVertical: 4,
                  backgroundColor: session.id === activeSessionId ? '#10a37f' : '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text style={{ 
                  fontSize: 15,
                  color: session.id === activeSessionId ? 'white' : '#333',
                  fontWeight: '500',
                  marginBottom: 4
                }}>
                  {session.title}
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: session.id === activeSessionId ? 'rgba(255,255,255,0.8)' : '#999'
                }}>
                  {session.messageCount || 0} messages
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}