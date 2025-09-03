import React, { useState, useEffect } from 'react';
import { View, Text, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatInput } from './ChatInput';

interface WelcomeScreenProps {
  onFirstMessage: (message: string) => Promise<void>;
}

export function WelcomeScreen({ onFirstMessage }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Listen to keyboard events directly
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (event) => {
      // WelcomeScreen Keyboard DID SHOW
      setKeyboardVisible(true);
      setInputFocused(true); // Also set focus when keyboard shows
    });
    
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      // WelcomeScreen Keyboard DID HIDE
      setKeyboardVisible(false);
      setInputFocused(false); // Force reset on keyboard hide
    });
    
    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);
  
  const handleFocusChange = (focused: boolean) => {
    // WelcomeScreen handleFocusChange
    setInputFocused(focused);
  };
  
  // Use keyboard visibility as the primary source of truth
  // Enable KeyboardAvoidingView whenever keyboard is visible
  const shouldEnableKeyboardAvoiding = keyboardVisible;
  
  // WelcomeScreen render
  
  return (
    <KeyboardAvoidingView 
      behavior="padding"
      enabled={shouldEnableKeyboardAvoiding}
      style={{ 
        flex: 1, 
        backgroundColor: '#fff'
      }}
    >
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
        onFocusChange={handleFocusChange}
        inputFocused={inputFocused}
      />
    </KeyboardAvoidingView>
  );
}