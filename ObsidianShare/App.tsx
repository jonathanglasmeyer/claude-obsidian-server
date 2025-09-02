import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessions } from '@obsidian-bridge/shared-components';
import { ErrorBoundary, ChatErrorFallback } from './ErrorBoundary';
import { ChatHeader } from './components/ChatHeader';
import { SideMenu } from './components/SideMenu';
import { ChatComponent } from './components/ChatComponent';


function AppContent() {
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
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

  // Show session selector if no active session
  if (!activeSessionId) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingTop: insets.top 
      }}>
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
      <StatusBar style="dark" />
      
      <ChatHeader
        title="Obsidian Chat"
        onMenuPress={() => setSideMenuVisible(true)}
        onMorePress={() => {}}
      />

      <ErrorBoundary fallback={ChatErrorFallback}>
        <ChatComponent 
          key={activeSessionId}
          sessionId={activeSessionId}
          activeSession={activeSession}
          loadSessionMessages={loadSessionMessages}
        />
      </ErrorBoundary>

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