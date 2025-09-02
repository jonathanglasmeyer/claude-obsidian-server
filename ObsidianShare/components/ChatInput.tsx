import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = "Ask anything" }: ChatInputProps) {
  const [inputText, setInputText] = useState('');

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

  return (
    <View style={{
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
      zIndex: 1
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#f8f9fa',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 120,
      }}>
        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 20,
            color: '#333',
            paddingVertical: 8,
          }}
          value={inputText}
          onChange={e => setInputText(e.nativeEvent.text)}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        
        <TouchableOpacity
          style={{
            marginLeft: 8,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: inputText.trim() ? '#10a37f' : '#f0f0f0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          disabled={disabled}
          onPress={handleSend}
        >
          {inputText.trim() ? (
            <Text style={{ 
              color: 'white', 
              fontSize: 16,
              fontWeight: '600' 
            }}>
              ↑
            </Text>
          ) : (
            <Text style={{ 
              color: '#666', 
              fontSize: 16 
            }}>
              🎤
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}