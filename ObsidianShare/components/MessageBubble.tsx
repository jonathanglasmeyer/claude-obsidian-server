import React from 'react';
import { View } from 'react-native';
import { MarkdownMessage } from './MarkdownMessage';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
}

export function MessageBubble({ role, children }: MessageBubbleProps) {
  const isUser = role === 'user';
  
  if (isUser) {
    // User message: right-aligned light gray bubble
    return (
      <View style={{
        marginVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'flex-end',
      }}>
        <View style={{
          backgroundColor: '#f0f0f0',
          paddingHorizontal: 16,
          paddingVertical: 4,
          borderRadius: 18,
          maxWidth: '80%',
        }}>
          {typeof children === 'string' ? (
            <MarkdownMessage content={children} isAssistant={false} />
          ) : (
            children
          )}
        </View>
      </View>
    );
  }
  
  // Assistant message: full-width with left/right padding
  return (
    <View style={{
      marginVertical: 8,
      paddingHorizontal: 16,
    }}>
      {typeof children === 'string' ? (
        <MarkdownMessage content={children} isAssistant={true} />
      ) : (
        children
      )}
    </View>
  );
}