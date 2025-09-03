import React, { useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { BorderlessButton, GestureDetector, Gesture, TextInput } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  showTopBorder?: boolean;
  onFocusChange?: (focused: boolean) => void;
  inputFocused?: boolean;
}

export function ChatInput({ onSend, disabled = false, placeholder = "Ask anything", showTopBorder = false, onFocusChange, inputFocused: controlledInputFocused }: ChatInputProps) {
  console.log('💬 ChatInput component LOADED');
  const [inputText, setInputText] = useState('');
  const [localInputFocused, setLocalInputFocused] = useState(false);
  const textInputRef = useRef(null);
  const touchStartPos = useRef(null);
  
  // Use controlled prop if provided, otherwise local state
  const inputFocused = controlledInputFocused !== undefined ? controlledInputFocused : localInputFocused;


  const handleSend = async () => {
    if (disabled || !inputText.trim()) return;
    
    const messageToSend = inputText.trim();
    setInputText('');
    
    try {
      await onSend(messageToSend);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setInputText(messageToSend);
    }
  };

  console.log('🎨 ChatInput render - inputFocused:', inputFocused, 'paddingBottom:', inputFocused ? 8 : 24);

  console.log('🧪 Using gesture-handler TextInput for native gesture coexistence');

  return (
    <View style={{
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: inputFocused ? 8 : 32,
      backgroundColor: '#fff',
      borderTopWidth: showTopBorder ? 1 : 0,
      borderTopColor: '#e5e5e5',
      zIndex: 1
    }}>
          <View 
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              backgroundColor: '#f6f6f6',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              maxHeight: 100,
            }}
          >
        <TextInput
          ref={textInputRef}
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 20,
            color: '#333',
            paddingVertical: 6,
          }}
          value={inputText}
          onChange={e => setInputText(e.nativeEvent.text)}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          rejectResponderTermination={false}  // Allow parent responder to terminate (iOS)
          onPressIn={() => console.log('📱 gesture-handler TextInput onPressIn')}
          onPressOut={() => console.log('📱 gesture-handler TextInput onPressOut')}
          onFocus={(event) => {
            console.log('🔍 gesture-handler TextInput onFocus event:', event);
            console.log('🔍 Calling onFocusChange(true) for KeyboardAvoidingView');
            if (controlledInputFocused === undefined) {
              setLocalInputFocused(true);
            }
            onFocusChange?.(true);
          }}
          onBlur={(event) => {
            console.log('🔍 gesture-handler TextInput onBlur event:', event);
            console.log('🔍 Calling onFocusChange(false) for KeyboardAvoidingView');
            if (controlledInputFocused === undefined) {
              setLocalInputFocused(false);
            }
            onFocusChange?.(false);
          }}
          onSelectionChange={(event) => {
            console.log('📝 TextInput selection change:', event.nativeEvent.selection);
          }}
          onContentSizeChange={(event) => {
            console.log('📏 TextInput content size change:', event.nativeEvent.contentSize);
          }}
        />
        
        <BorderlessButton
          style={{
            marginLeft: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: inputText.trim() ? '#000' : '#d0d0d0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          enabled={!disabled && !!inputText.trim()}
          onPress={handleSend}
        >
          <Svg width="16" height="16" viewBox="0 0 20 20" fill={inputText.trim() ? 'white' : '#666'}>
            <Path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z" />
          </Svg>
        </BorderlessButton>
          </View>
    </View>
  );
}