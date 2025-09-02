import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import { useSessions } from '@obsidian-bridge/shared-components';
import { ChatHeader } from '../components/ChatHeader';
import { WelcomeScreen } from '../components/WelcomeScreen';

export function StartNewScreen() {
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  
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
    createSession,
    isInitialized,
  } = useSessions(sessionConfig);

  console.log('🖥️ StartNewScreen render - navigation available:', !!navigation.openDrawer);

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
    navigation.navigate('Chat' as never, { sessionId, pendingFirstMessage: message } as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ChatHeader
        title="Obsidian Chat"
        onMenuPress={() => navigation.openDrawer()}
        onMorePress={() => {}}
      />
      <WelcomeScreen onFirstMessage={handleFirstMessage} />
    </View>
  );
}