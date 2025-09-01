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
import { 
  useSessions
} from '@obsidian-bridge/shared-components';

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

  // ✅ AI SDK v5: useChat with session-specific key (like Web Prototype)
  const { 
    messages, 
    sendMessage, 
    isLoading: chatLoading, 
    status, 
    error, 
    reload, 
    stop, 
    setMessages 
  } = useChat({
    key: sessionId, // 🔑 Force recreation when sessionId changes
    transport: new DefaultChatTransport({
      api: 'http://192.168.178.147:3001/api/chat',
      body: () => {
        console.log('🚀 Transport body function called - sessionId:', currentSessionIdRef.current);
        return {
          chatId: currentSessionIdRef.current, // Dynamic chatId evaluation per request
        };
      },
    }),
    initialMessages: [], // Will be loaded via useEffect
    onError: (error) => {
      console.error('useChat error:', error);
    },
    onFinish: (message) => {
      console.log('🎯 onFinish called for sessionId:', sessionId, message);
    }
  });
  
  // Load session messages when sessionId changes (same as web prototype)
  useEffect(() => {
    if (!sessionId) return;
    
    const controller = new AbortController();
    
    const loadMessages = async () => {
      console.log('📥 Loading messages for sessionId:', sessionId, 'loadSessionMessages type:', typeof loadSessionMessages);
      
      if (!loadSessionMessages) {
        console.error('❌ loadSessionMessages is not available');
        setMessages([]);
        return;
      }
      
      try {
        const sessionMessages = await loadSessionMessages(sessionId);
        
        if (!controller.signal.aborted) {
          // Force unique IDs for all messages to fix React key duplication
          const messagesWithIds = sessionMessages.map((msg, index) => ({
            ...msg,
            id: `msg-${sessionId}-${index}-${msg.role}-${(msg.content || '').slice(0, 10).replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`,
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

  return (
    <>
      {/* Messages */}
      <ScrollView 
        style={{ flex: 1, zIndex: 1, backgroundColor: '#fff' }} 
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <Text style={{ color: '#999', padding: 16 }}>Messages count: {messages.length}</Text>
        {messages.map((message, index) => (
          <MessageBubble key={message.id || index} role={message.role}>
            {message.content}
          </MessageBubble>
        ))}
        
        {/* Loading indicator */}
        {(status === 'submitted' || status === 'streaming') && (
          <MessageBubble role="assistant">
            <Text style={{ fontStyle: 'italic', color: '#666' }}>Typing...</Text>
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
            onChangeText={setInputText}
            placeholder="Ask anything"
            placeholderTextColor="#999"
            multiline
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
            disabled={status === 'submitted' || status === 'streaming'}
            onPress={() => {
              if (status === 'submitted' || status === 'streaming') {
                return;
              }
              
              if (inputText.trim()) {
                console.log('📤 Sending message to sessionId:', sessionId);
                sendMessage({ text: inputText });
                setInputText('');
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
        <Text style={{ color: 'red', padding: 16 }}>About to render ChatComponent for session: {activeSessionId}</Text>
        <ChatComponent 
          key={activeSessionId} // Force new component instance per session
          sessionId={activeSessionId}
          activeSession={activeSession}
          loadSessionMessages={loadSessionMessages}
        />
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