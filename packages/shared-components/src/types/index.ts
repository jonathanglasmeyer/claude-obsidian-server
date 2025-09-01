export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: any[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface SessionsConfig {
  apiBaseUrl: string;
  platform: 'web' | 'mobile';
}

// Tool UI types for cross-platform compatibility
export interface ToolUIPart {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: any;
  output?: string;
  errorText?: string;
}