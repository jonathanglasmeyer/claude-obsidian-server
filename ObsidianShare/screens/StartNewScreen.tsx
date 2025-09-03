import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSessions } from '../hooks/use-sessions-local';
import { getServerConfig } from '../config';
import { useDrawerContext } from '../contexts/DrawerContext';
import { ChatHeader } from '../components/ChatHeader';
import { WelcomeScreen } from '../components/WelcomeScreen';

export function StartNewScreen() {
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const drawerContext = useDrawerContext();
  // StartNewScreen drawerContext initialization
  const { openDrawer } = drawerContext;
  
  const sessionConfig = getServerConfig();
  
  const {
    createSession,
    isInitialized,
  } = useSessions(sessionConfig);

  // StartNewScreen render

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
    // Creating new session with first message
    setPendingFirstMessage(message);
    const sessionId = await createSession('New Chat');
    // Created new session
    navigation.navigate('Chat' as never, { sessionId, pendingFirstMessage: message } as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ChatHeader
        title="Obsidian Chat"
        onMenuPress={() => openDrawer()}
        onMorePress={() => {}}
      />
      <WelcomeScreen onFirstMessage={handleFirstMessage} />
    </View>
  );
}