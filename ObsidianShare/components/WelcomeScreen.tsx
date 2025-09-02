import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatInput } from './ChatInput';

interface WelcomeScreenProps {
  onFirstMessage: (message: string) => Promise<void>;
}

export function WelcomeScreen({ onFirstMessage }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#fff',
      paddingTop: insets.top 
    }}>
      {/* Main content centered */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24
      }}>
        <View style={{
          alignItems: 'center',
          marginBottom: 40
        }}>
          <Text style={{
            fontSize: 32,
            marginBottom: 16
          }}>
            🤖
          </Text>
          <Text style={{
            fontSize: 24,
            fontWeight: '600',
            color: '#333',
            marginBottom: 8,
            textAlign: 'center'
          }}>
            Obsidian Chat
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#666',
            textAlign: 'center',
            lineHeight: 24
          }}>
            What can I help you with today?
          </Text>
        </View>
      </View>

      {/* Input at bottom */}
      <ChatInput
        onSend={onFirstMessage}
        placeholder="Type your message..."
      />
    </View>
  );
}