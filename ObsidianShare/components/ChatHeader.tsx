import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

interface ChatHeaderProps {
  title: string;
  onMenuPress: () => void;
  onMorePress?: () => void;
}

export function ChatHeader({ title, onMenuPress, onMorePress }: ChatHeaderProps) {
  const insets = useSafeAreaInsets();

  // Create a tap gesture for the menu button that has priority over pan gestures
  const menuTapGesture = Gesture.Tap()
    .onEnd(() => {
      console.log('🍔 Menu button pressed via gesture!');
      onMenuPress();
    });

  const moreTapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onMorePress) {
        console.log('⋮ More button pressed via gesture!');
        onMorePress();
      }
    });

  return (
    <View style={{ 
      paddingTop: insets.top,
      height: 64 + insets.top,
      paddingHorizontal: 12,
      justifyContent: 'flex-end',
      paddingBottom: 8,
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    }}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        height: 48,
      }}>
        {/* Navigation Icon with Gesture */}
        <GestureDetector gesture={menuTapGesture}>
          <View style={{ 
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 4,
          }}>
            <MaterialIcons name="menu" size={24} color="#1d1b20" />
          </View>
        </GestureDetector>
        
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
        
        {/* Action Icon with Gesture */}
        <GestureDetector gesture={moreTapGesture}>
          <View style={{ 
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
          }}>
            <MaterialIcons name="more-vert" size={24} color="#49454f" />
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}