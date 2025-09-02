import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 280;
const SNAP_THRESHOLD = 0.5;
const VELOCITY_THRESHOLD = 300; // Lower threshold = more sensitive to flicks

interface ProgressiveDrawerProps {
  children: React.ReactNode;
  drawerContent: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function ProgressiveDrawer({ 
  children, 
  drawerContent, 
  isOpen = false, 
  onOpenChange 
}: ProgressiveDrawerProps) {
  const drawerProgress = useSharedValue(isOpen ? 1 : 0);
  const isDrawerOpen = useSharedValue(isOpen);

  // Watch for external isOpen prop changes
  React.useEffect(() => {
    drawerProgress.value = withTiming(isOpen ? 1 : 0, { duration: 250 });
    isDrawerOpen.value = isOpen;
  }, [isOpen]);

  // Notify parent when drawer state changes
  const notifyStateChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  // Pan gesture for progressive reveal
  const panGesture = Gesture.Pan()
    .minDistance(8) // Higher to avoid conflicts with buttons
    .activeOffsetX([-15, 15]) // Balanced threshold for both directions
    .failOffsetY([-30, 30]) // Allow some vertical movement
    .maxPointers(1) // Only single finger
    .shouldCancelWhenOutside(false)
    .minPointers(1)
    .onStart((event) => {
      // Cancel any ongoing animations when user starts dragging
      console.log('🤏 Pan gesture started, current drawer open:', isDrawerOpen.value);
    })
    .onUpdate((event) => {
      // Calculate progress based on current drawer state
      const currentOffset = isDrawerOpen.value ? DRAWER_WIDTH : 0;
      const newPosition = currentOffset + event.translationX;
      const progress = Math.max(0, Math.min(1, newPosition / DRAWER_WIDTH));
      
      drawerProgress.value = progress;
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const currentProgress = drawerProgress.value;
      
      console.log('🏁 Pan gesture ended - velocity:', velocity, 'progress:', currentProgress);
      
      // Determine final state based on velocity and position
      let shouldOpen = false;
      
      if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
        shouldOpen = velocity > 0; // Positive velocity = rightward = open
        console.log('📊 Decision by velocity:', shouldOpen);
      } else {
        shouldOpen = currentProgress > SNAP_THRESHOLD;
        console.log('📊 Decision by position:', shouldOpen);
      }
      
      // Animate to final state
      const targetProgress = shouldOpen ? 1 : 0;
      const distanceToTravel = Math.abs(targetProgress - currentProgress);
      const isHighVelocity = Math.abs(velocity) > VELOCITY_THRESHOLD;
      
      // Scale duration based on how far we need to travel
      const baseDuration = isHighVelocity ? 120 : 180;
      const duration = Math.max(80, baseDuration * distanceToTravel);
      
      drawerProgress.value = withTiming(targetProgress, { 
        duration,
        easing: Easing.out(Easing.cubic)
      }, (finished) => {
        if (finished) {
          isDrawerOpen.value = shouldOpen;
          runOnJS(notifyStateChange)(shouldOpen);
          console.log('✅ Animation finished, drawer is now:', shouldOpen ? 'open' : 'closed');
        }
      });
    });

  // Animated style for the drawer
  const drawerAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      drawerProgress.value,
      [0, 1],
      [-DRAWER_WIDTH, 0]
    );
    
    return {
      transform: [{ translateX }],
    };
  });

  // Animated style for the main content (no effects, stays static)
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      // No transforms - content stays exactly as is
    };
  });

  // Animated style for overlay (darkening effect)
  const overlayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      drawerProgress.value,
      [0, 0.3, 1],
      [0, 0.1, 0.3]
    );
    
    return {
      opacity,
    };
  });

  // Tap gesture for overlay to close drawer
  const overlayTapGesture = Gesture.Tap()
    .onEnd(() => {
      if (drawerProgress.value > 0) {
        drawerProgress.value = withTiming(0, { 
          duration: 200,
          easing: Easing.out(Easing.cubic)
        }, (finished) => {
          if (finished) {
            isDrawerOpen.value = false;
            runOnJS(notifyStateChange)(false);
          }
        });
      }
    });

  return (
    <View style={styles.container}>
      {/* Main content with gesture detection - back to full coverage */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
      
      {/* Overlay for dimming effect with tap-to-close */}
      <GestureDetector gesture={overlayTapGesture}>
        <Animated.View 
          style={[styles.overlay, overlayAnimatedStyle]}
          pointerEvents={drawerProgress.value > 0.1 ? 'auto' : 'none'}
        />
      </GestureDetector>
      
      {/* Progressive drawer - NO gesture detection here */}
      <Animated.View 
        style={[styles.drawer, drawerAnimatedStyle]}
        pointerEvents="auto" // Ensure drawer content can receive touches
      >
        {drawerContent}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    pointerEvents: 'none',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});