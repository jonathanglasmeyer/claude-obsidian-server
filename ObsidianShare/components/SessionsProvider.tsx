import React, { createContext, useContext, ReactNode } from 'react';
import { useSessions, SessionsConfig } from '../hooks/use-sessions-local';

// Context types
interface SessionsContextValue extends ReturnType<typeof useSessions> {}

interface SessionsProviderProps {
  children: ReactNode;
  config: SessionsConfig;
}

// Create context
const SessionsContext = createContext<SessionsContextValue | null>(null);

// Provider component
export function SessionsProvider({ children, config }: SessionsProviderProps) {
  const sessionsData = useSessions(config);
  
  return (
    <SessionsContext.Provider value={sessionsData}>
      {children}
    </SessionsContext.Provider>
  );
}

// Custom hook to use the context
export function useSessionsContext() {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error('useSessionsContext must be used within a SessionsProvider');
  }
  return context;
}