import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

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
    return 'Untitled chat';  // Better than "New Chat" - less confusing
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
        {/* Top Safe Area Spacer */}
        <View style={{ height: insets.top + 16 }} />
        
        {/* M3-Compliant New Chat List Item */}
        <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
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
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Create new chat"
            accessibilityHint="Starts a new conversation"
            style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,                    // M3 minimum touch target
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 24,                 // M3 full pill shape
              backgroundColor: 'transparent',
            }}
            android_ripple={{               // M3 ripple effect
              color: 'rgba(103, 80, 164, 0.12)',
              borderless: false,
            }}
          >
            {/* M3 Leading Icon */}
            <View style={{ 
              width: 24, 
              height: 24, 
              marginRight: 12,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Svg width="20" height="20" viewBox="0 0 20 20">
                <Path 
                  fill="#49454F"              // M3 On-Surface color
                  d="M2.6687 11.333V8.66699C2.6687 7.74455 2.66841 7.01205 2.71655 6.42285C2.76533 5.82612 2.86699 5.31731 3.10425 4.85156L3.25854 4.57617C3.64272 3.94975 4.19392 3.43995 4.85229 3.10449L5.02905 3.02149C5.44666 2.84233 5.90133 2.75849 6.42358 2.71582C7.01272 2.66769 7.74445 2.66797 8.66675 2.66797H9.16675C9.53393 2.66797 9.83165 2.96586 9.83179 3.33301C9.83179 3.70028 9.53402 3.99805 9.16675 3.99805H8.66675C7.7226 3.99805 7.05438 3.99834 6.53198 4.04102C6.14611 4.07254 5.87277 4.12568 5.65601 4.20313L5.45581 4.28906C5.01645 4.51293 4.64872 4.85345 4.39233 5.27149L4.28979 5.45508C4.16388 5.7022 4.08381 6.01663 4.04175 6.53125C3.99906 7.05373 3.99878 7.7226 3.99878 8.66699V11.333C3.99878 12.2774 3.99906 12.9463 4.04175 13.4688C4.08381 13.9833 4.16389 14.2978 4.28979 14.5449L4.39233 14.7285C4.64871 15.1465 5.01648 15.4871 5.45581 15.7109L5.65601 15.7969C5.87276 15.8743 6.14614 15.9265 6.53198 15.958C7.05439 16.0007 7.72256 16.002 8.66675 16.002H11.3337C12.2779 16.002 12.9461 16.0007 13.4685 15.958C13.9829 15.916 14.2976 15.8367 14.5447 15.7109L14.7292 15.6074C15.147 15.3511 15.4879 14.9841 15.7117 14.5449L15.7976 14.3447C15.8751 14.128 15.9272 13.8546 15.9587 13.4688C16.0014 12.9463 16.0017 12.2774 16.0017 11.333V10.833C16.0018 10.466 16.2997 10.1681 16.6667 10.168C17.0339 10.168 17.3316 10.4659 17.3318 10.833V11.333C17.3318 12.2555 17.3331 12.9879 17.2849 13.5771C17.2422 14.0993 17.1584 14.5541 16.9792 14.9717L16.8962 15.1484C16.5609 15.8066 16.0507 16.3571 15.4246 16.7412L15.1492 16.8955C14.6833 17.1329 14.1739 17.2354 13.5769 17.2842C12.9878 17.3323 12.256 17.332 11.3337 17.332H8.66675C7.74446 17.332 7.01271 17.3323 6.42358 17.2842C5.90135 17.2415 5.44665 17.1577 5.02905 16.9785L4.85229 16.8955C4.19396 16.5601 3.64271 16.0502 3.25854 15.4238L3.10425 15.1484C2.86697 14.6827 2.76534 14.1739 2.71655 13.5771C2.66841 12.9879 2.6687 12.2555 2.6687 11.333ZM13.4646 3.11328C14.4201 2.334 15.8288 2.38969 16.7195 3.28027L16.8865 3.46485C17.6141 4.35685 17.6143 5.64423 16.8865 6.53613L16.7195 6.7207L11.6726 11.7686C11.1373 12.3039 10.4624 12.6746 9.72827 12.8408L9.41089 12.8994L7.59351 13.1582C7.38637 13.1877 7.17701 13.1187 7.02905 12.9707C6.88112 12.8227 6.81199 12.6134 6.84155 12.4063L7.10132 10.5898L7.15991 10.2715C7.3262 9.53749 7.69692 8.86241 8.23218 8.32715L13.2791 3.28027L13.4646 3.11328ZM15.7791 4.2207C15.3753 3.81702 14.7366 3.79124 14.3035 4.14453L14.2195 4.2207L9.17261 9.26856C8.81541 9.62578 8.56774 10.0756 8.45679 10.5654L8.41772 10.7773L8.28296 11.7158L9.22241 11.582L9.43433 11.543C9.92426 11.432 10.3749 11.1844 10.7322 10.8271L15.7791 5.78027L15.8552 5.69629C16.185 5.29194 16.1852 4.708 15.8552 4.30371L15.7791 4.2207Z"
                />
              </Svg>
            </View>
            
            {/* M3 Typography - Heavier for Action */}
            <Text style={{ 
              fontSize: 14,                    // M3 Label Large
              fontWeight: '600',               // Heavier for Action Button
              lineHeight: 20,                  // M3 spec
              letterSpacing: 0.1,              // M3 Letter spacing
              color: '#1D1B20',                // M3 On-Surface
              fontFamily: Platform.OS === 'android' ? 'Roboto-SemiBold' : 'SF Pro Display',
              flex: 1,
            }}>
              New chat
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Spacer instead of divider - cleaner M3 approach */}
        <View style={{ height: 8 }} />

        {/* Recent Chats Section Header */}
        {sessions.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
            <Text style={{
              fontSize: 12,                    // M3 Label Small
              fontWeight: '500',               // Medium weight for headers
              color: '#49454F',                // M3 On-Surface-Variant
              lineHeight: 16,
              letterSpacing: 0.5,              // More spacing for small text
              // No textTransform - M3 uses sentence case
              fontFamily: Platform.OS === 'android' ? 'Roboto-Medium' : 'SF Pro Display',
            }}>
              Recent chats
            </Text>
          </View>
        )}

        {/* Sessions List */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 8 }}>
          {sessions.map((session) => {
            const SessionItem = ({ children, ...props }) => {
              const [isPressed, setIsPressed] = useState(false);
              
              return (
                <Pressable
                  onPressIn={() => setIsPressed(true)}
                  onPressOut={() => setIsPressed(false)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 28,
                      marginHorizontal: 8,
                      marginVertical: 4,
                      minHeight: 56,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: session.id === activeSessionId 
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
                  {...props}
                >
                  {children}
                </Pressable>
              );
            };

            return (
              <SessionItem
                key={session.id}
                onPress={() => {
                  console.log('Select session:', session.id);
                  onSelectSession(session.id);
                  onClose();
                }}
              >
                <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 2 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '400',               // Lighter for content items
                    color: session.id === activeSessionId ? 'rgb(124, 58, 237)' : '#1D1B20',
                    lineHeight: 20,
                    letterSpacing: 0.1,
                    fontFamily: Platform.OS === 'android' ? 'Roboto-Regular' : 'SF Pro Display',
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
              </SessionItem>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}