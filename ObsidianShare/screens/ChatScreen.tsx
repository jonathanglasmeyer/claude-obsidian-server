import React from 'react';
import { View, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSessionsContext } from '../components/SessionsProvider';
import { useDrawerContext } from '../contexts/DrawerContext';
import { ErrorBoundary, ChatErrorFallback } from '../ErrorBoundary';
import { ChatHeader } from '../components/ChatHeader';
import { ChatComponent } from '../components/ChatComponent';

export function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const drawerContext = useDrawerContext();
  // ChatScreen drawerContext initialization
  const { openDrawer } = drawerContext;
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

  // ChatScreen render

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ErrorBoundary fallback={({ error, retry }) => (
        <View style={{ padding: 16, backgroundColor: '#fee', borderBottomWidth: 1, borderColor: '#fcc' }}>
          <Text style={{ color: '#c33', fontWeight: 'bold' }}>⚠️ Header Error</Text>
          <Text style={{ color: '#c33', fontSize: 12 }}>{error.message}</Text>
          <Text style={{ color: '#999', fontSize: 10, marginTop: 4 }}>
            Tap to retry or use gesture to open drawer
          </Text>
        </View>
      )}>
        <ChatHeader
          title={currentSession?.title || 'Chat'}
          onMenuPress={() => {
            // ChatScreen onMenuPress called
            try {
              if (typeof openDrawer === 'function') {
                openDrawer();
              } else {
                // openDrawer is not a function
              }
            } catch (error) {
              console.error('❌ ChatScreen openDrawer failed:', error);
              throw error;
            }
          }}
          onMorePress={() => {}}
        />
      </ErrorBoundary>
      
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