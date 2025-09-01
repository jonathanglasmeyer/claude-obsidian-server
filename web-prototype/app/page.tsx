'use client';

import React, { useEffect } from 'react';
import { useSessions } from '@/hooks/use-sessions';
import { SessionSidebar } from '@/components/session-sidebar';
import { ChatComponent } from '@/components/chat-component';

export default function Home() {
  // ✅ CLEAN: Only session management, no chat logic
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    renameSession,
    isInitialized,
    isLoading: sessionsLoading,
  } = useSessions();
  
  // Debug session state
  useEffect(() => {
    console.log('🏠 Home - Session State:');
    console.log('  activeSessionId:', activeSessionId);
    console.log('  sessions.length:', sessions.length);
    console.log('  isInitialized:', isInitialized);
  }, [activeSessionId, sessions.length, isInitialized]);

  // Create initial session if none exists
  useEffect(() => {
    const initSession = async () => {
      if (isInitialized && sessions.length === 0 && !sessionsLoading) {
        console.log('🆕 Creating initial session...');
        const sessionId = await createSession('New Chat');
        console.log('✅ Created initial session:', sessionId);
      }
    };
    
    initSession();
  }, [isInitialized, sessions.length, createSession, sessionsLoading]);

  const handleSessionCreate = async () => {
    const sessionId = await createSession('New Chat');
    console.log('✅ Created new session:', sessionId);
  };

  // Show loading while sessions are being loaded
  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading sessions...</div>
      </div>
    );
  }

  // Show session selector if no active session
  if (!activeSessionId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">No active session</div>
          <button 
            onClick={handleSessionCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create New Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Session Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onSessionCreate={handleSessionCreate}
        onSessionDelete={deleteSession}
        onSessionRename={renameSession}
      />

      {/* ✅ FIXED: ChatComponent with guaranteed sessionId */}
      <ChatComponent 
        key={activeSessionId} // Force new component instance per session
        sessionId={activeSessionId}
        sessionTitle={activeSession?.title || 'Chat'}
      />
    </div>
  );
}