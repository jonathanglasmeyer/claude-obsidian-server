import { useState, useEffect, useCallback } from 'react';
// Platform-agnostic Message interface
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

// Configuration interface for different platforms
export interface SessionsConfig {
  apiBaseUrl: string;
  platform: 'web' | 'mobile';
}

export function useSessions(config: SessionsConfig = { apiBaseUrl: '', platform: 'web' }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions from backend API on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Loading sessions from backend API...');
        
        const response = await fetch(`${config.apiBaseUrl}/api/chats`);
        if (!response.ok) {
          throw new Error(`Failed to load sessions: ${response.status}`);
        }
        
        const backendSessions = await response.json();
        console.log('📥 Loaded sessions from backend:', backendSessions.length);
        
        // Convert backend format to frontend format
        const convertedSessions: ChatSession[] = backendSessions.map((session: any) => ({
          id: session.id,
          title: session.title,
          messages: [], // Messages loaded separately when needed
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messageCount: session.messageCount || 0,
        }));
        
        setSessions(convertedSessions);
        
        // Note: Not auto-selecting any session to always start with welcome screen
        
      } catch (error) {
        console.error('❌ Failed to load sessions from backend:', error);
        // Continue with empty sessions array
        setSessions([]);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadSessions();
  }, [config.apiBaseUrl]);

  const createSession = useCallback(async (title?: string): Promise<string> => {
    try {
      console.log('🆕 Creating new session via backend API...');
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'New Chat' }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      const newSessionData = await response.json();
      console.log('✅ Created session:', newSessionData.chatId);
      
      const newSession: ChatSession = {
        id: newSessionData.chatId,
        title: newSessionData.title,
        messages: [],
        createdAt: new Date(newSessionData.createdAt),
        updatedAt: new Date(newSessionData.createdAt),
        messageCount: 0,
      };

      setSessions(prev => [newSession, ...prev]);
      console.log('🎯 Setting newly created session as active:', newSession.id);
      setActiveSessionId(newSession.id);
      return newSession.id;
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      // Fallback: create local session (won't persist)
      const fallbackId = `temp_${Date.now()}`;
      const newSession: ChatSession = {
        id: fallbackId,
        title: title || 'New Chat (Local)',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
      };
      setSessions(prev => [newSession, ...prev]);
      console.log('🎯 Setting fallback session as active:', fallbackId);
      setActiveSessionId(fallbackId);
      return fallbackId;
    }
  }, [config.apiBaseUrl]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      console.log('🗑️ Deleting session:', sessionId);
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }
      
      console.log('✅ Deleted session from backend');
    } catch (error) {
      console.error('❌ Failed to delete session from backend:', error);
      // Continue with local deletion anyway
    }
    
    // Update local state
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      
      // If we're deleting the active session, switch to another one
      if (sessionId === activeSessionId) {
        const remaining = filtered;
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
        }
      }
      
      return filtered;
    });
  }, [activeSessionId, config.apiBaseUrl]);

  const loadSessionMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
    try {
      console.log('📥 Loading messages for session:', sessionId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats/${sessionId}/messages`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Session not found, returning empty messages');
          return [];
        }
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Loaded', data.messages?.length || 0, 'messages for session:', sessionId);
      return data.messages || [];
    } catch (error: any) {
      if (error?.name === 'TimeoutError') {
        console.error('⏱️ Message loading timed out for session:', sessionId);
      } else if (error?.name === 'AbortError') {
        console.log('🛑 Message loading cancelled for session:', sessionId);
      } else {
        console.error('❌ Failed to load session messages:', error);
      }
      return [];
    }
  }, [config.apiBaseUrl]);

  const updateSessionMessages = useCallback((sessionId: string, messages: Message[]) => {
    console.log('🔄 updateSessionMessages called for session:', sessionId, 'with', messages.length, 'messages');
    setSessions(prev => {
      const updated = prev.map(session => 
        session.id === sessionId 
          ? { ...session, messages, updatedAt: new Date(), messageCount: messages.length }
          : session
      );
      console.log('🔄 Updated sessions locally');
      return updated;
    });
  }, []);

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    // Note: Backend doesn't have rename endpoint yet, so just update locally
    console.log('📝 Renaming session locally:', sessionId, 'to:', title);
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, title, updatedAt: new Date() }
        : session
    ));
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    loadSessionMessages,
    updateSessionMessages,
    renameSession,
    isInitialized,
    isLoading,
  };
}