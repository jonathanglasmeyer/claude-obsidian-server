'use client';

import React, { useEffect, useState } from 'react';
import { useSessions } from '@/hooks/use-sessions';
import { SessionSidebar } from '@/components/session-sidebar';
import { ChatComponent } from '@/components/chat-component';

export default function Home() {
  // ✅ Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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

  // Check server mode for badge
  const serverMode = process.env.NEXT_PUBLIC_SERVER_MODE === 'local' ? 'LOCAL' : 'SSH';

  return (
    <div className="h-screen flex relative">
      {/* Server Mode Badge - Top Right */}
      <div className="absolute top-2 right-2 z-50">
        <span className={`px-2 py-1 text-xs font-mono rounded ${
          serverMode === 'LOCAL' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {serverMode}
        </span>
      </div>

      {/* Session Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onSessionCreate={handleSessionCreate}
        onSessionDelete={deleteSession}
        onSessionRename={renameSession}
        isCollapsed={isSidebarCollapsed}
      />

      {/* ✅ FIXED: ChatComponent with guaranteed sessionId */}
      <ChatComponent 
        key={activeSessionId} // Force new component instance per session
        sessionId={activeSessionId}
        sessionTitle={activeSession?.title || 'Chat'}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
    </div>
  );
}