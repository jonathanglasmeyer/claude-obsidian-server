import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

// ChatGPT-style pulsing loading indicator - single growing/shrinking circle
export function PulsingDots() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  return (
    <View style={{ 
      alignItems: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 4
    }}>
      <Animated.View style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#000',
        transform: [{ scale }],
      }} />
    </View>
  );
}