import React, { useState } from 'react';
import { View, Text, Platform, Pressable, Alert } from 'react-native';
import { Menu } from 'react-native-paper';

interface Session {
  id: string;
  title?: string;
  messageCount: number;
  createdAt: string;
}

interface SessionMenuItemProps {
  session: Session;
  isActive: boolean;
  onPress: () => void;
  onRename: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  generateConversationTitle: (session: Session) => string;
}

export function SessionMenuItem({
  session,
  isActive,
  onPress,
  onRename,
  onDelete,
  generateConversationTitle
}: SessionMenuItemProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const closeMenu = () => setMenuVisible(false);
  
  const handleRename = () => {
    closeMenu();
    onRename(session.id);
  };
  
  const handleDelete = () => {
    closeMenu();
    onDelete(session.id);
  };

  return (
    <View style={{
      borderRadius: 28,
      marginHorizontal: 8,
      marginVertical: 4,
      overflow: 'hidden',
    }}>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <Pressable
            onPress={onPress}
            onLongPress={() => setMenuVisible(true)}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            style={({ pressed }) => [
              {
                paddingHorizontal: 20,
                paddingVertical: 8,
                minHeight: 56,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isActive 
                  ? 'rgba(103, 80, 164, 0.08)'  // Active
                  : (pressed || isPressed) 
                    ? 'rgba(103, 80, 164, 0.04)'  // Hover/Press
                    : 'rgba(0, 0, 0, 0.02)',      // Subtle default for usability
              }
            ]}
            android_ripple={{
              color: 'rgba(103, 80, 164, 0.12)',
              borderless: false,
            }}
          >
            <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 2 }}>
              <Text style={{
                fontSize: 15,
                fontWeight: '600',
                color: isActive ? 'rgb(124, 58, 237)' : '#1D1B20',
                lineHeight: 20,
                letterSpacing: 0.1,
                fontFamily: Platform.OS === 'android' ? 'Roboto-Medium' : 'SF Pro Display Medium',
              }}>
                {generateConversationTitle(session)}
              </Text>
              {session.messageCount > 0 && (
                <Text style={{
                  fontSize: 14,
                  fontWeight: '400',
                  color: '#79747E',
                  lineHeight: 16,
                  letterSpacing: 0.25,
                  marginTop: 2,
                  fontFamily: Platform.OS === 'android' ? 'Roboto' : 'SF Pro Display',
                }}>
                  {session.messageCount} messages
                </Text>
              )}
            </View>
          </Pressable>
        }
      >
        <Menu.Item
          leadingIcon="pencil"
          onPress={handleRename}
          title="Rename"
        />
        <Menu.Item
          leadingIcon="delete"
          onPress={handleDelete}
          title="Delete"
        />
      </Menu>
    </View>
  );
}