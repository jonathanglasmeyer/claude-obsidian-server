import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Session {
  id: string;
  title?: string;
  messageCount: number;
  createdAt: string;
}

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => Promise<void>;
}

function generateConversationTitle(session: Session): string {
  if (!session || !session.messageCount || session.messageCount === 0) {
    return 'New Chat';
  }
  
  const date = new Date(session.createdAt || Date.now());
  const isToday = date.toDateString() === new Date().toDateString();
  
  if (isToday) {
    return `Chat ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return `Chat ${date.toLocaleDateString()}`;
  }
}

export function SideMenu({
  visible,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession
}: SideMenuProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 1999,
        }}
        onPress={onClose}
        activeOpacity={1}
      />
      
      {/* Side Menu */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 280,
        backgroundColor: '#fef7ff',
        zIndex: 2000,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
      }}>
        {/* Menu Header */}
        <View style={{ 
          paddingHorizontal: 24,
          paddingVertical: 24,                 
          paddingTop: insets.top + 24,
          borderBottomWidth: 1, 
          borderBottomColor: '#e7e0ec',
          backgroundColor: '#ffffff'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
            <TouchableOpacity 
              onPress={onClose}
              style={{ 
                padding: 12,
                borderRadius: 20,
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#49454f" />
            </TouchableOpacity>
          </View>
          
          {/* New Chat Button */}
          <TouchableOpacity 
            onPress={async () => {
              console.log('Creating new chat');
              try {
                await onCreateSession();
                onClose();
              } catch (error) {
                console.error('Failed to create new chat:', error);
              }
            }}
            style={{ 
              backgroundColor: 'rgb(124, 58, 237)', 
              paddingVertical: 12, 
              paddingHorizontal: 16, 
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginRight: 8 }}>
              +
            </Text>
            <Text style={{ color: 'white', fontWeight: '600' }}>
              New Chat
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Spacer */}
        <View style={{ height: 24 }} />
        
        {/* Sessions List */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 8, paddingTop: 8 }}>
          {sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => {
                console.log('Select session:', session.id);
                onSelectSession(session.id);
                onClose();
              }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 28,
                marginHorizontal: 8,
                marginVertical: 4,
                minHeight: 56,
                backgroundColor: session.id === activeSessionId ? 'rgba(124, 58, 237, 0.12)' : '#FFFFFF',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 2 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: session.id === activeSessionId ? 'rgb(124, 58, 237)' : '#1D1B20',
                  lineHeight: 20,
                  letterSpacing: 0.1,
                  fontFamily: Platform.OS === 'android' ? 'Roboto-Medium' : 'SF Pro Display',
                }}>
                  {generateConversationTitle(session)}
                </Text>
                {session.messageCount > 0 && (
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: '#49454F',
                    lineHeight: 20,
                    letterSpacing: 0.25,
                    marginTop: 2,
                    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'SF Pro Display',
                  }}>
                    {session.messageCount} messages
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );
}