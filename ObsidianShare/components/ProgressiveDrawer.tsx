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
console.log('📱 Screen width:', SCREEN_WIDTH, 'px - Drawer width:', DRAWER_WIDTH, 'px - Ratio:', (DRAWER_WIDTH/SCREEN_WIDTH*100).toFixed(1)+'%');
const DRAWER_WIDTH = 330;
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
  console.log('🎭 ProgressiveDrawer render - isOpen:', isOpen);
  
  const drawerProgress = useSharedValue(isOpen ? 1 : 0);
  const isDrawerOpen = useSharedValue(isOpen);


  // Watch for external isOpen prop changes
  React.useEffect(() => {
    console.log('🔄 External isOpen prop changed:', isOpen, 'current internal state:', isDrawerOpen.value);
    if (isOpen !== isDrawerOpen.value) {
      console.log('🔧 Syncing drawer state - prop:', isOpen, '→ internal:', isDrawerOpen.value);
      drawerProgress.value = withTiming(isOpen ? 1 : 0, { duration: 250 });
      isDrawerOpen.value = isOpen;
    }
  }, [isOpen]);

  // Notify parent when drawer state changes
  const notifyStateChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  // Track initial touch position for manual activation - use shared values for thread safety
  const initialTouchX = useSharedValue(0);
  const initialTouchY = useSharedValue(0);
  const hasActivated = useSharedValue(false);

  // Define logging functions OUTSIDE component scope (JS thread)
  const debugLog = (message, data) => {
    console.log(`[ProgressiveDrawer] ${message}:`, data);
  };

  const logTouchEvent = (eventType, x, y) => {
    console.log(`[Touch] ${eventType}:`, { x, y });
  };

  // Create separate pan gesture instances with proper tap coexistence
  const createPanGesture = () => Gesture.Pan()
    .manualActivation(true)
    .shouldCancelWhenOutside(false)  // Don't cancel when finger leaves the area
    .cancelsTouchesInView(false)     // ✅ KEY: Don't cancel touches for native UI components (iOS)
    .minDistance(15)                 // Only activate after significant movement
    .blocksExternalGesture(false)    // Don't block child gestures
    .simultaneousWithExternalGesture(true) // Allow simultaneous with child gestures
    .onTouchesDown((event, manager) => {
      'worklet';
      // Store initial touch position
      initialTouchX.value = event.allTouches[0].x;
      initialTouchY.value = event.allTouches[0].y;
      hasActivated.value = false;
      
      // ✅ Safe logging with predefined function
      runOnJS(logTouchEvent)(
        'onTouchesDown', 
        initialTouchX.value.toFixed(1), 
        initialTouchY.value.toFixed(1)
      );
    })
    .onTouchesMove((event, manager) => {
      'worklet';
      if (hasActivated.value) return;

      const currentX = event.allTouches[0].x;
      const currentY = event.allTouches[0].y;
      const deltaX = Math.abs(currentX - initialTouchX.value);
      const deltaY = Math.abs(currentY - initialTouchY.value);
      
      runOnJS(debugLog)('onTouchesMove', { 
        deltaX: deltaX.toFixed(1), 
        deltaY: deltaY.toFixed(1) 
      });
      
      // Activate only if significant horizontal movement with minimal vertical
      if (deltaX > 25 && deltaX > deltaY * 1.5) {
        runOnJS(debugLog)('ACTIVATING', 'swipe detected');
        hasActivated.value = true;
        manager.activate();
      } else if (deltaY > 20) {
        runOnJS(debugLog)('FAILING', 'vertical movement');
        manager.fail();
      }
    })
    .onTouchesUp(() => {
      'worklet';
      runOnJS(logTouchEvent)('onTouchesUp', 'touch released', '');
      hasActivated.value = false;
    })
    .onTouchesCancelled(() => {
      'worklet';
      runOnJS(logTouchEvent)('onTouchesCancelled', 'cancelled', '');
      hasActivated.value = false;
    })
    .onStart((event) => {
      console.log('🤏 Pan gesture STARTED:', {
        drawerOpen: isDrawerOpen.value,
        startX: event.x.toFixed(1),
        startY: event.y.toFixed(1),
        translationX: event.translationX.toFixed(1),
        translationY: event.translationY.toFixed(1)
      });
    })
    .onUpdate((event) => {
      console.log('📈 Pan gesture UPDATE:', {
        translationX: event.translationX.toFixed(1),
        velocityX: event.velocityX.toFixed(1)
      });
      
      // Calculate progress based on current drawer state
      const currentOffset = isDrawerOpen.value ? DRAWER_WIDTH : 0;
      const newPosition = currentOffset + event.translationX;
      const progress = Math.max(0, Math.min(1, newPosition / DRAWER_WIDTH));
      
      console.log('👆 Gesture update:', {
        translationX: event.translationX.toFixed(1),
        currentOffset,
        newPosition: newPosition.toFixed(1),
        progress: progress.toFixed(2),
        drawerOpen: isDrawerOpen.value
      });
      
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
    })
    .onFinalize((event) => {
      console.log('🏁 Pan gesture FINALIZE:', {
        state: event.state,
        translationX: event.translationX?.toFixed(1) || 'N/A',
        velocityX: event.velocityX?.toFixed(1) || 'N/A'
      });
    });

  // Create individual gesture instances to avoid conflicts
  const contentPanGesture = createPanGesture();
  const overlayPanGesture = createPanGesture(); 
  const drawerPanGesture = createPanGesture();

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

  // Tap gesture for overlay to close drawer - allow pan gestures to pass through
  const overlayTapGesture = Gesture.Tap()
    .simultaneousWithExternalGesture(overlayPanGesture)
    .onEnd(() => {
      if (drawerProgress.value > 0) {
        console.log('📱 Overlay tapped, closing drawer');
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
      {/* Main content with gesture detection - but configured to share touches */}
      <GestureDetector gesture={contentPanGesture}>
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
      
      {/* Overlay for dimming effect with tap-to-close */}
      <GestureDetector gesture={Gesture.Simultaneous(overlayTapGesture, overlayPanGesture)}>
        <Animated.View 
          style={[styles.overlay, overlayAnimatedStyle]}
          pointerEvents="auto"
        />
      </GestureDetector>
      
      {/* Progressive drawer - ADD pan gesture detection here */}
      <GestureDetector gesture={drawerPanGesture}>
        <Animated.View 
          style={[styles.drawer, drawerAnimatedStyle]}
          pointerEvents="auto" // Ensure drawer content can receive touches
        >
          {drawerContent}
        </Animated.View>
      </GestureDetector>
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