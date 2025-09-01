import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatSession } from '@/hooks/use-sessions';
import { formatDistanceToNow } from 'date-fns';

interface SessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionCreate: () => void;
  onSessionDelete: (sessionId: string) => void;
  onSessionRename: (sessionId: string, title: string) => void;
  isCollapsed?: boolean;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onSessionRename,
  isCollapsed = false
}: SessionSidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const finishEditing = (sessionId: string) => {
    if (editTitle.trim()) {
      onSessionRename(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  return (
    <div className={`${isCollapsed ? 'w-0' : 'w-80'} border-r bg-muted/20 flex flex-col h-full transition-all duration-300 overflow-hidden`}>
      {!isCollapsed && (
        <>
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Chat Sessions</h2>
              <Button
                size="sm"
                onClick={onSessionCreate}
                className="h-8"
              >
                + New
              </Button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">No chat sessions yet</p>
                <Button
                  variant="ghost"
                  onClick={onSessionCreate}
                  className="mt-2 text-xs"
                >
                  Start your first chat
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                      session.id === activeSessionId
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onSessionSelect(session.id)}
                  >
                    {editingSessionId === session.id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Session title..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              finishEditing(session.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => finishEditing(session.id)}
                            className="h-6 px-2 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">
                              {session.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {session.messageCount || 0} messages
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                            </p>
                          </div>
                          
                          {/* Session Actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(session);
                              }}
                              className="h-6 w-6 p-0 text-xs"
                              title="Rename session"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this chat session?')) {
                                  onSessionDelete(session.id);
                                }
                              }}
                              className="h-6 w-6 p-0 text-xs hover:text-destructive"
                              title="Delete session"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}