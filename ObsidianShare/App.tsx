import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
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
  
  // Auto-detect server IP: Development builds or Expo Go
  const debuggerHost = Constants.debuggerHost?.split(':')[0] 
    || Constants.experienceUrl?.match(/exp:\/\/([^:]+)/)?.[1];
    
  if (!debuggerHost) {
    console.error('❌ No server IP detected - use development build or Expo Go');
  }
  
  const sessionConfig = {
    apiBaseUrl: `http://${debuggerHost}:3001`,
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
    updateSessionMessages,
    refreshSessions,
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
            updateSessionMessages={updateSessionMessages}
            renameSession={renameSession}
            pendingFirstMessage={pendingFirstMessage}
            onFirstMessageSent={() => setPendingFirstMessage(null)}
          />
        </ErrorBoundary>
      )}

      <SideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={() => setActiveSessionId(null)}
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