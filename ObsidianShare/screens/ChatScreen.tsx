import React from 'react';
import { View, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import { useSessions } from '@obsidian-bridge/shared-components';
import { ErrorBoundary, ChatErrorFallback } from '../ErrorBoundary';
import { ChatHeader } from '../components/ChatHeader';
import { ChatComponent } from '../components/ChatComponent';

export function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const { sessionId, pendingFirstMessage } = route.params as { sessionId: string; pendingFirstMessage?: string };
  
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
    setActiveSessionId,
    loadSessionMessages,
    updateSessionMessages,
    renameSession,
  } = useSessions(sessionConfig);

  // Set active session when this screen mounts
  React.useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, setActiveSessionId]);

  const currentSession = sessions.find(s => s.id === sessionId);

  console.log('💬 ChatScreen render - sessionId:', sessionId, 'navigation available:', !!navigation.openDrawer);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ChatHeader
        title={currentSession?.title || 'Chat'}
        onMenuPress={() => navigation.openDrawer()}
        onMorePress={() => {}}
      />
      
      <ErrorBoundary fallback={ChatErrorFallback}>
        <ChatComponent 
          key={sessionId}
          sessionId={sessionId}
          activeSession={currentSession}
          loadSessionMessages={loadSessionMessages}
          updateSessionMessages={updateSessionMessages}
          renameSession={renameSession}
          pendingFirstMessage={pendingFirstMessage}
          onFirstMessageSent={() => {}}
        />
      </ErrorBoundary>
    </View>
  );
}