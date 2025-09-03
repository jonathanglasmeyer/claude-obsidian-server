import { useState, useEffect, useCallback } from 'react';
import { getApiHeaders } from '../config';

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

  // Function to load/refresh sessions from backend
  const refreshSessions = useCallback(async (preserveActiveSession = false) => {
    try {
      setIsLoading(true);
      // Loading sessions from backend API
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats`, {
        headers: getApiHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status}`);
      }
      
      const backendSessions = await response.json();
      // Loaded sessions from backend
      
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
      
      // Preserve active session if requested and it still exists
      if (preserveActiveSession && activeSessionId) {
        const sessionStillExists = convertedSessions.some(s => s.id === activeSessionId);
        if (!sessionStillExists) {
          setActiveSessionId(null);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to load sessions from backend:', error);
      // Continue with existing sessions array
    } finally {
      setIsLoading(false);
    }
  }, [config.apiBaseUrl, activeSessionId]);

  // Load sessions from backend API on mount
  useEffect(() => {
    const loadSessions = async () => {
      await refreshSessions(false);
      setIsInitialized(true);
    };

    loadSessions();
  }, [refreshSessions]);

  const createSession = useCallback(async (title?: string): Promise<string> => {
    try {
      // Creating new session via backend API
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ title: title || 'New Chat' }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      const newSessionData = await response.json();
      // Created session
      
      const newSession: ChatSession = {
        id: newSessionData.chatId,
        title: newSessionData.title,
        messages: [],
        createdAt: new Date(newSessionData.createdAt),
        updatedAt: new Date(newSessionData.createdAt),
        messageCount: 0,
      };

      setSessions(prev => [newSession, ...prev]);
      // Setting newly created session as active
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
      // Setting fallback session as active
      setActiveSessionId(fallbackId);
      return fallbackId;
    }
  }, [config.apiBaseUrl]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      // Deleting session
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats/${sessionId}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      });
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }
      
      // Deleted session from backend
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
      // Loading messages for session
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats/${sessionId}/messages`, {
        signal: controller.signal,
        headers: getApiHeaders(),
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
      // Loaded messages for session
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
    // updateSessionMessages called for session
    setSessions(prev => {
      const updated = prev.map(session => 
        session.id === sessionId 
          ? { ...session, messages, updatedAt: new Date(), messageCount: messages.length }
          : session
      );
      // Updated sessions locally
      return updated;
    });
  }, []);

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    try {
      // Renaming session via backend API
      
      const response = await fetch(`${config.apiBaseUrl}/api/chats/${sessionId}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.error('❌ Chat not found for rename:', sessionId);
          return;
        }
        throw new Error(`Failed to rename session: ${response.status}`);
      }
      
      const updatedChat = await response.json();
      // Renamed session successfully
      
      // Update local state with server response
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, title: updatedChat.title, updatedAt: new Date(updatedChat.updatedAt) }
          : session
      ));
    } catch (error) {
      console.error('❌ Failed to rename session:', error);
      // Fallback to local rename
      // Falling back to local rename
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, title, updatedAt: new Date() }
          : session
      ));
    }
  }, [config.apiBaseUrl]);

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
    refreshSessions,
    renameSession,
    isInitialized,
    isLoading,
  };
}