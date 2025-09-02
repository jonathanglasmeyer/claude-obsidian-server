import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    }}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        height: 48,
      }}>
        {/* Navigation Icon */}
        <TouchableOpacity 
          onPress={onMenuPress}
          style={{ 
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 4,
          }}
        >
          <MaterialIcons name="menu" size={24} color="#1d1b20" />
        </TouchableOpacity>
        
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
        
        {/* Action Icon */}
        <TouchableOpacity 
          onPress={onMorePress}
          style={{ 
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
          }}
        >
          <MaterialIcons name="more-vert" size={24} color="#49454f" />
        </TouchableOpacity>
      </View>
    </View>
  );
}