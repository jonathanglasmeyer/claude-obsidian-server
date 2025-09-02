import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessions } from '@obsidian-bridge/shared-components';
import { ErrorBoundary, ChatErrorFallback } from './ErrorBoundary';
import { ChatHeader } from './components/ChatHeader';
import { SideMenu } from './components/SideMenu';
import { ChatComponent } from './components/ChatComponent';
import { WelcomeScreen } from './components/WelcomeScreen';


function AppContent() {
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
  const sessionConfig = {
    apiBaseUrl: 'http://192.168.178.147:3001',
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
    renameSession,
    isInitialized,
    isLoading,
  } = useSessions(sessionConfig);

  console.log('🏠 Main App render - sessions:', sessions.length, 'activeSessionId:', activeSessionId, 'activeSession:', activeSession?.title);

  // Show loading while sessions are being loaded
  if (!isInitialized) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingTop: insets.top 
      }}>
        <Text style={{ color: '#666' }}>Loading sessions...</Text>
      </View>
    );
  }

  const handleFirstMessage = async (message: string) => {
    console.log('🚀 Creating new session with first message:', message);
    setPendingFirstMessage(message);
    const sessionId = await createSession('New Chat');
    console.log('✅ Created new session:', sessionId);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="dark" />
      
      <ChatHeader
        title="Obsidian Chat"
        onMenuPress={() => setSideMenuVisible(true)}
        onMorePress={() => {}}
      />

      {!activeSessionId ? (
        <WelcomeScreen onFirstMessage={handleFirstMessage} />
      ) : (
        <ErrorBoundary fallback={ChatErrorFallback}>
          <ChatComponent 
            key={activeSessionId}
            sessionId={activeSessionId}
            activeSession={activeSession}
            loadSessionMessages={loadSessionMessages}
            pendingFirstMessage={pendingFirstMessage}
            onFirstMessageSent={() => setPendingFirstMessage(null)}
            onUpdateChatTitle={(sessionId, title) => {
              console.log('🏷️ Updating chat title for session:', sessionId, 'to:', title);
              renameSession(sessionId, title);
            }}
          />
        </ErrorBoundary>
      )}

      <SideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={() => createSession('New Chat')}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}