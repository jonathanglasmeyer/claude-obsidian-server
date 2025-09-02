import React from 'react';
import { View, Text, Image } from 'react-native';
import { ChatInput } from './ChatInput';

interface WelcomeScreenProps {
  onFirstMessage: (message: string) => Promise<void>;
}

export function WelcomeScreen({ onFirstMessage }: WelcomeScreenProps) {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#fff'
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
          <Image 
            source={require('../assets/obsidian logo.png')}
            style={{
              width: 64,
              height: 64,
              marginBottom: 24
            }}
          />
          <Text style={{
            fontSize: 22,
            fontWeight: '500',
            color: '#000',
            textAlign: 'center',
            lineHeight: 28
          }}>
            What's on your mind?
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