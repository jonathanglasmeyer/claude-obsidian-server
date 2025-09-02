import React from 'react';
import { View, Text, Platform } from 'react-native';
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

  // Create proper Gesture.Tap for menu button - FORCE JS THREAD EXECUTION
  const menuTapGesture = Gesture.Tap()
    .maxDuration(250) // Quick tap only
    .maxDistance(10) // Allow small movement
    .runOnJS(true) // CRITICAL: Force callback to run on JS thread where React Context works
    .onStart(() => {
      console.log('👇 Menu Gesture.Tap onStart - running on JS thread');
    })
    .onEnd((event, success) => {
      if (success) {
        console.log('🍔 Menu button tapped via Gesture.Tap - executing on JS thread!');
        try {
          console.log('🔍 About to call onMenuPress directly (JS thread)...');
          onMenuPress(); // Can now safely call React Context function
          console.log('✅ Menu tap completed successfully');
        } catch (error) {
          console.error('❌ Menu tap failed:', error);
          console.error('❌ Error details:', error.message, error.stack);
        }
      }
    })
    .onFinalize((event, success) => {
      console.log('👆 Menu Gesture.Tap onFinalize -', success ? 'SUCCESS' : 'FAILED');
    });

  const moreTapGesture = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(10)
    .runOnJS(true) // CRITICAL: Force callback to run on JS thread where React Context works
    .onEnd((event, success) => {
      if (success && onMorePress) {
        console.log('⋮ More button tapped via Gesture.Tap - executing on JS thread!');
        try {
          onMorePress(); // Can now safely call React Context function
          console.log('✅ More tap completed successfully');
        } catch (error) {
          console.error('❌ More tap failed:', error);
        }
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
        {/* Navigation Icon - Gesture.Tap */}
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
        
        {/* Action Icon - Gesture.Tap */}
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