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
  console.log('🔍 ChatScreen drawerContext:', drawerContext);
  console.log('🔍 ChatScreen drawerContext.openDrawer type:', typeof drawerContext.openDrawer);
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

  console.log('💬 ChatScreen render - sessionId:', sessionId, 'drawer context available:', !!openDrawer);

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
            console.log('🎯 ChatScreen onMenuPress called');
            console.log('🔍 About to call openDrawer, type:', typeof openDrawer);
            console.log('🔍 openDrawer value:', openDrawer);
            try {
              if (typeof openDrawer === 'function') {
                openDrawer();
              } else {
                console.error('❌ openDrawer is not a function:', typeof openDrawer, openDrawer);
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