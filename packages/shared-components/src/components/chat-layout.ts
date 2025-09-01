// Platform-agnostic chat layout utilities
export interface ChatLayoutProps {
  sessionId: string;
  sessionTitle: string;
  onToggleSidebar?: () => void;
}

export interface ConversationProps {
  children: React.ReactNode;
  className?: string;
}

export interface PromptInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

// Layout constants that work across platforms
export const chatLayoutConstants = {
  header: {
    height: 64,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  conversation: {
    backgroundColor: '#fff',
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sideMenu: {
    width: 280,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  }
};

export const getChatLayoutStyle = (component: keyof typeof chatLayoutConstants) => {
  return chatLayoutConstants[component];
};