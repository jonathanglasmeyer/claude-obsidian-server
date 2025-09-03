import React from 'react';
import { View, Text, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderlessButton } from 'react-native-gesture-handler';
import { MenuIcon } from './MenuIcon';

interface ChatHeaderProps {
  title: string;
  onMenuPress: () => void;
  onMorePress?: () => void;
}

export function ChatHeader({ title, onMenuPress, onMorePress }: ChatHeaderProps) {
  const insets = useSafeAreaInsets();


  return (
    <View style={{ 
      paddingTop: insets.top,
      height: 64 + insets.top,
      paddingHorizontal: 12,
      justifyContent: 'flex-end',
      paddingBottom: 8,
      backgroundColor: '#ffffff',
    }}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        height: 48,
      }}>
        {/* Navigation Icon - BorderlessButton with Native Ripple */}
        <BorderlessButton
          onPress={() => {
            // Menu button pressed
            try {
              onMenuPress();
              // Menu action executed
            } catch (error) {
              console.error('❌ Menu action failed:', error);
            }
          }}
          style={{ 
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: -4,
            marginRight: 8, // Add spacing between menu and title
            borderRadius: 24,
          }}
          rippleColor="rgba(29, 27, 32, 0.15)" // Native Android ripple
          borderless={false} // Contain ripple within button bounds
          activeOpacity={0.7} // iOS fallback
        >
          <MenuIcon size={24} color="#1d1b20" />
        </BorderlessButton>
        
        {/* Title */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ 
            fontSize: 17,
            fontWeight: 'normal',
            lineHeight: 22,
            color: '#000000',
            fontFamily: Platform.OS === 'ios' ? 'SF Pro Display Medium' : 'sans-serif-medium',
            letterSpacing: 0,
          }}>
            {title}
          </Text>
        </View>
        
        {/* Action Icon - BorderlessButton with Native Ripple */}
        <BorderlessButton
          onPress={() => {
            if (onMorePress) {
              // More button pressed
              try {
                onMorePress();
                // More action executed
              } catch (error) {
                console.error('❌ More action failed:', error);
              }
            }
          }}
          style={{ 
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
            marginLeft: 8, // Add spacing between title and more button
            borderRadius: 24,
          }}
          rippleColor="rgba(73, 69, 79, 0.15)" // Native Android ripple
          borderless={false} // Contain ripple within button bounds
          activeOpacity={0.7} // iOS fallback
        >
          <MaterialIcons name="more-vert" size={24} color="#49454f" />
        </BorderlessButton>
      </View>
    </View>
  );
}