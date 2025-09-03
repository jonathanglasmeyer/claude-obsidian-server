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
      console.log('⌨️ Keyboard DID SHOW:', event.endCoordinates.height);
      setKeyboardVisible(true);
      setInputFocused(true); // Also set focus when keyboard shows
    });
    
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      console.log('⌨️ Keyboard DID HIDE - forcing both states to false');
      setKeyboardVisible(false);
      setInputFocused(false); // Force reset on keyboard hide
    });
    
    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);
  
  const handleFocusChange = (focused: boolean) => {
    console.log('🌟 WelcomeScreen handleFocusChange:', focused, '→ KeyboardAvoidingView enabled:', focused);
    setInputFocused(focused);
  };
  
  // Use keyboard visibility as the primary source of truth
  // Enable KeyboardAvoidingView whenever keyboard is visible
  const shouldEnableKeyboardAvoiding = keyboardVisible;
  
  console.log('🏠 WelcomeScreen render - inputFocused:', inputFocused, 'keyboardVisible:', keyboardVisible, 'KeyboardAvoidingView enabled:', shouldEnableKeyboardAvoiding);
  
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
        onFocusChange={handleFocusChange}
        inputFocused={inputFocused}
      />
    </KeyboardAvoidingView>
  );
}