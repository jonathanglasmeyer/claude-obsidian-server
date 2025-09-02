import React from 'react';
import { View, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSessionsContext } from '@obsidian-bridge/shared-components';
import { useDrawerContext } from '../contexts/DrawerContext';
import { ErrorBoundary, ChatErrorFallback } from '../ErrorBoundary';
import { ChatHeader } from '../components/ChatHeader';
import { ChatComponent } from '../components/ChatComponent';

export function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { openDrawer } = useDrawerContext();
  const { sessionId, pendingFirstMessage } = route.params as { sessionId: string; pendingFirstMessage?: string };
  
  // Use shared sessions context
  const {
    sessions,
    activeSession,
    setActiveSessionId,
    loadSessionMessages,
    updateSessionMessages,
    renameSession,
  } = useSessionsContext();

  // Set active session when this screen mounts
  React.useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, setActiveSessionId]);

  const currentSession = sessions.find(s => s.id === sessionId);

  console.log('💬 ChatScreen render - sessionId:', sessionId, 'drawer context available:', !!openDrawer);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ChatHeader
        title={currentSession?.title || 'Chat'}
        onMenuPress={() => openDrawer()}
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