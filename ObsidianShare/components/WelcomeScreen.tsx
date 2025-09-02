import React, { useState } from 'react';
import { View, Text, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatInput } from './ChatInput';

interface WelcomeScreenProps {
  onFirstMessage: (message: string) => Promise<void>;
}

export function WelcomeScreen({ onFirstMessage }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [inputFocused, setInputFocused] = useState(false);
  
  return (
    <KeyboardAvoidingView 
      behavior="padding"
      enabled={inputFocused}
      style={{ 
        flex: 1, 
        backgroundColor: '#fff'
      }}
    >
      {/* Main content centered */}
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
      </TouchableWithoutFeedback>

      {/* Input at bottom */}
      <ChatInput
        onSend={onFirstMessage}
        placeholder="Type your message..."
        onFocusChange={setInputFocused}
      />
    </KeyboardAvoidingView>
  );
}