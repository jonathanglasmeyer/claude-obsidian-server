// Platform-agnostic message interfaces and utilities
export interface MessageProps {
  from: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
}

export interface MessageContentProps {
  children: React.ReactNode;
  className?: string;
}

// Message styling utilities that can be adapted per platform
export const messageStyles = {
  container: {
    user: {
      alignSelf: 'flex-end' as const,
      backgroundColor: '#f5f5f5',
      borderRadius: 16,
      marginLeft: 48,
      marginRight: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    assistant: {
      alignSelf: 'flex-start' as const,
      backgroundColor: 'transparent',
      marginHorizontal: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    system: {
      alignSelf: 'center' as const,
      backgroundColor: '#e3f2fd',
      borderRadius: 8,
      marginHorizontal: 24,
      paddingHorizontal: 12,
      paddingVertical: 8,
    }
  },
  text: {
    user: {
      color: '#333',
      fontSize: 16,
      lineHeight: 20,
    },
    assistant: {
      color: '#000',
      fontSize: 16,
      lineHeight: 22,
    },
    system: {
      color: '#1976d2',
      fontSize: 14,
      lineHeight: 18,
    }
  }
};

export const getMessageStyle = (role: 'user' | 'assistant' | 'system', type: 'container' | 'text') => {
  return messageStyles[type][role];
};