# ScrollView + React Native Gesture Handler Integration Guide

A comprehensive guide for integrating ScrollView with React Native Gesture Handler, covering gesture coexistence patterns, conflict resolution, and best practices.

## Table of Contents

1. [Core Integration Patterns](#core-integration-patterns)
2. [Gesture.Native() with ScrollView](#gesturenative-with-scrollview)
3. [simultaneousWithExternalGesture Patterns](#simultaneouswithexternalgesture-patterns)
4. [blocksExternalGesture for ScrollView Control](#blocksexternalgesture-for-scrollview-control)
5. [Web-Specific Configuration](#web-specific-configuration)
6. [Common ScrollView Conflicts & Solutions](#common-scrollview-conflicts--solutions)
7. [Performance Optimization](#performance-optimization)
8. [Advanced Use Cases](#advanced-use-cases)
9. [Troubleshooting](#troubleshooting)

---

## Core Integration Patterns

### Basic ScrollView Setup with Gesture Handler

```jsx
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Your scrollable content */}
      </ScrollView>
    </GestureHandlerRootView>
  );
}
```

**Key Points:**
- Always wrap your app with `GestureHandlerRootView`
- Use `ScrollView` from `react-native-gesture-handler`, not React Native core
- This provides better integration with custom gestures

---

## Gesture.Native() with ScrollView

The `Gesture.Native()` pattern allows you to control interactions between ScrollView and custom gestures by creating a reference to the scroll gesture.

### Complete Implementation

```jsx
import { View, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const COLORS = ['red', 'green', 'blue', 'purple', 'orange', 'cyan'];

export default function App() {
  // Create a native gesture reference for the ScrollView
  const native = Gesture.Native();

  return (
    <GestureDetector gesture={native}>
      <ScrollView style={{ flex: 1 }}>
        <ScrollableContent scrollGesture={native} />
      </ScrollView>
    </GestureDetector>
  );
}

function ScrollableContent({ scrollGesture }) {
  return (
    <View>
      {COLORS.map((color) => (
        <Rectangle key={color} color={color} scrollGesture={scrollGesture} />
      ))}
    </View>
  );
}

function Rectangle({ color, scrollGesture }) {
  // Pan gesture that blocks the scroll gesture when active
  const pan = Gesture.Pan().blocksExternalGesture(scrollGesture);

  return (
    <View
      key={color}
      style={{ width: '100%', height: 250, backgroundColor: color }}>
      <GestureDetector gesture={pan}>
        <View style={{ width: '100%', height: 50, backgroundColor: 'black' }} />
      </GestureDetector>
    </View>
  );
}
```

**How It Works:**
1. `Gesture.Native()` creates a reference to the ScrollView's native gesture
2. Pass this reference to child components that need scroll control
3. Use `blocksExternalGesture(scrollGesture)` to prevent scrolling during custom gestures

---

## simultaneousWithExternalGesture Patterns

This pattern allows gestures to work simultaneously with ScrollView instead of blocking it.

### Basic Simultaneous Gesture

```jsx
const innerTap = Gesture.Tap()
  .onStart(() => {
    console.log('inner tap');
  });

const outerTap = Gesture.Tap()
  .onStart(() => {
    console.log('outer tap');
  })
  .simultaneousWithExternalGesture(innerTap);

return (
  <GestureHandlerRootView style={styles.container}>
    <GestureDetector gesture={outerTap}>
      <View style={styles.outer}>
        <GestureDetector gesture={innerTap}>
          <View style={styles.inner} />
        </GestureDetector>
      </View>
    </GestureDetector>
  </GestureHandlerRootView>
);
```

### Simultaneous Pan with Swipeable Components

```jsx
const panGesture = Gesture.Pan();

<GestureDetector gesture={panGesture}>
  <ReanimatedSwipeable simultaneousWithExternalGesture={panGesture}>
    {/* Swipeable content */}
  </ReanimatedSwipeable>
</GestureDetector>
```

**Use Cases:**
- Multiple taps at different levels
- Pan gestures that should work alongside scrolling
- Swipeable components within scrollable content

---

## blocksExternalGesture for ScrollView Control

Use this pattern when you need child gestures to temporarily disable scrolling.

### Pinch-to-Zoom in ScrollView

```jsx
import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const ITEMS = ['red', 'green', 'blue', 'yellow'];

function Item({ backgroundColor, scrollRef }) {
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .blocksExternalGesture(scrollRef) // Prevents scrolling during pinch
    .onBegin(() => {
      zIndex.value = 100; // Bring to front
    })
    .onChange((e) => {
      scale.value *= e.scaleChange;
    })
    .onFinalize(() => {
      scale.value = withTiming(1, undefined, (finished) => {
        if (finished) {
          zIndex.value = 1;
        }
      });
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    zIndex: zIndex.value,
  }));

  return (
    <GestureDetector gesture={pinch}>
      <Animated.View
        style={[
          { backgroundColor: backgroundColor },
          styles.item,
          animatedStyles,
        ]}
      />
    </GestureDetector>
  );
}

export default function Example() {
  const scrollRef = useRef();

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView style={styles.container} ref={scrollRef}>
        {ITEMS.map((item) => (
          <Item backgroundColor={item} key={item} scrollRef={scrollRef} />
        ))}
      </ScrollView>
    </GestureHandlerRootView>
  );
}
```

**Key Benefits:**
- Child gestures can temporarily disable parent scrolling
- Prevents unwanted scroll behavior during complex interactions
- Maintains gesture hierarchy and priority

---

## Web-Specific Configuration

### TouchAction for Vertical Scrolling

For web platforms, configure `touchAction` to ensure proper scrolling behavior:

```jsx
<GestureDetector gesture={customGesture} touchAction="pan-y">
  <ScrollView>
    {/* Content */}
  </ScrollView>
</GestureDetector>
```

### Complete Web Configuration

```jsx
const panGesture = Gesture.Pan()
  .mouseButton(MouseButton.LEFT | MouseButton.RIGHT); // Multiple mouse buttons

<GestureDetector 
  gesture={panGesture}
  touchAction="pan-y"           // Allow vertical scrolling
  userSelect="none"             // Prevent text selection
  enableContextMenu={false}     // Disable right-click menu
>
  <ScrollView>
    {/* Scrollable content */}
  </ScrollView>
</GestureDetector>
```

**Web-Specific Properties:**
- `touchAction`: Controls which touch gestures trigger default browser behavior
- `userSelect`: Prevents text selection during gestures
- `enableContextMenu`: Controls right-click context menu
- `mouseButton`: Specifies which mouse buttons activate gestures

---

## Common ScrollView Conflicts & Solutions

### 1. Vertical vs Horizontal Gesture Conflicts

**Problem:** Pan gestures interfering with vertical scrolling

**Solution:** Use directional constraints

```jsx
const horizontalPan = Gesture.Pan()
  .activeOffsetX([-10, 10])  // Only activate for horizontal movement
  .failOffsetY([-10, 10]);   // Fail if moving vertically

const verticalPan = Gesture.Pan()
  .activeOffsetY([-10, 10])  // Only activate for vertical movement  
  .failOffsetX([-10, 10]);   // Fail if moving horizontally
```

### 2. Swipe Gestures in Lists

**Problem:** Swipe actions blocking scroll

**Solution:** Use `simultaneousWithExternalGesture`

```jsx
const swipeGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])
  .simultaneousWithExternalGesture(scrollGesture);
```

### 3. Multi-Touch Conflicts

**Problem:** Multiple fingers causing scroll issues

**Solution:** Configure pointer limits

```jsx
const panGesture = Gesture.Pan()
  .minPointers(1)
  .maxPointers(1); // Single finger only

const pinchGesture = Gesture.Pinch()
  .minPointers(2); // Requires two fingers
```

### 4. Tap vs Scroll Conflicts

**Problem:** Taps not registering during scroll momentum

**Solution:** Use gesture waiting patterns

```jsx
const doubleTap = React.createRef();

const singleTap = Gesture.Tap()
  .waitFor={doubleTap}
  .onStart(() => console.log('Single tap'));

const doubleTapGesture = Gesture.Tap()
  .ref={doubleTap}
  .numberOfTaps(2)
  .onStart(() => console.log('Double tap'));

const composed = Gesture.Exclusive(doubleTapGesture, singleTap);
```

---

## Performance Optimization

### 1. Gesture Memoization

Prevent unnecessary gesture recreations:

```jsx
const gesture = React.useMemo(
  () =>
    Gesture.Tap().onStart(() => {
      console.log('Tap count:', tapCount + 1);
      setTapCount((value) => value + 1);
    }),
  [tapCount, setTapCount]
);
```

### 2. Native Driver Usage

Always use native driver for animations:

```jsx
const animatedStyle = useAnimatedStyle(() => {
  return {
    transform: [{ translateX: position.value }],
  };
});
```

### 3. Conditional Gesture Enabling

Disable gestures when not needed:

```jsx
const panGesture = Gesture.Pan()
  .enabled(isGestureEnabled)
  .onUpdate((e) => {
    position.value = e.translationX;
  });
```

---

## Advanced Use Cases

### 1. Drawer + ScrollView Integration

```jsx
function DrawerWithScrollView() {
  const drawerRef = useRef();
  
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onStart(() => drawerRef.current?.openDrawer());

  return (
    <ReanimatedDrawerLayout
      ref={drawerRef}
      renderNavigationView={() => <DrawerContent />}
      drawerPosition={DrawerPosition.LEFT}
      drawerType={DrawerType.FRONT}
    >
      <ScrollView style={styles.container}>
        <GestureDetector gesture={tapGesture}>
          <View style={styles.triggerArea}>
            <Text>Tap to open drawer</Text>
          </View>
        </GestureDetector>
        {/* Scrollable content */}
      </ScrollView>
    </ReanimatedDrawerLayout>
  );
}
```

### 2. Complex Multi-Gesture Composition

```jsx
const dragGesture = Gesture.Pan()
  .averageTouches(true)
  .onUpdate((e) => {
    offset.value = {
      x: e.translationX + start.value.x,
      y: e.translationY + start.value.y,
    };
  });

const zoomGesture = Gesture.Pinch()
  .onUpdate((event) => {
    scale.value = savedScale.value * event.scale;
  });

const rotateGesture = Gesture.Rotation()
  .onUpdate((event) => {
    rotation.value = savedRotation.value + event.rotation;
  });

// Combine all gestures
const composed = Gesture.Simultaneous(
  dragGesture,
  Gesture.Simultaneous(zoomGesture, rotateGesture)
);
```

### 3. Platform-Specific Behavior

```jsx
const panGesture = Gesture.Pan()
  .averageTouches(Platform.OS === 'android') // iOS-like behavior on Android
  .enableTrackpadTwoFingerGesture(Platform.OS === 'ios'); // Trackpad support
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. **Gestures Not Working in ScrollView**

**Symptoms:** Custom gestures don't respond inside ScrollView
**Solution:** Use `ScrollView` from gesture handler, not React Native

```jsx
// ❌ Wrong
import { ScrollView } from 'react-native';

// ✅ Correct
import { ScrollView } from 'react-native-gesture-handler';
```

#### 2. **Multiple Gesture Handler Instances**

**Symptoms:** "Multiple instances of react-native-gesture-handler" error
**Solution:** Add resolution to package.json

```json
{
  "resolutions": {
    "react-native-gesture-handler": "^2.x.x"
  }
}
```

#### 3. **Web Scrolling Disabled**

**Symptoms:** ScrollView doesn't scroll on web
**Solution:** Configure `touchAction`

```jsx
<GestureDetector gesture={gesture} touchAction="pan-y">
  <ScrollView />
</GestureDetector>
```

#### 4. **Gesture Instance Reuse Error**

**Symptoms:** Error when using same gesture instance multiple times
**Solution:** Create separate instances

```jsx
// ❌ Wrong - reusing same instance
const pan = Gesture.Pan();

<GestureDetector gesture={pan}>
  <View>
    <GestureDetector gesture={pan}> {/* Don't do this! */}
      <View />
    </GestureDetector>
  </View>
</GestureDetector>

// ✅ Correct - separate instances
const outerPan = Gesture.Pan();
const innerPan = Gesture.Pan();

<GestureDetector gesture={outerPan}>
  <View>
    <GestureDetector gesture={innerPan}>
      <View />
    </GestureDetector>
  </View>
</GestureDetector>
```

#### 5. **Modal Gesture Issues (Android)**

**Symptoms:** Gestures not working in modals on Android
**Solution:** Wrap modal content with `GestureHandlerRootView`

```jsx
import { Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function CustomModal({ children, ...rest }) {
  return (
    <Modal {...rest}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {children}
      </GestureHandlerRootView>
    </Modal>
  );
}
```

#### 6. **iOS Touch Cancellation Issues**

**Symptoms:** Native UI components not responding
**Solution:** Configure `cancelsTouchesInView`

```jsx
const gesture = Gesture.Tap()
  .cancelsTouchesInView(false) // Allow native components to receive touches
  .onStart(() => {
    // Handle tap
  });
```

### Debugging Tips

1. **Enable Gesture Logging:**
```jsx
const gesture = Gesture.Pan()
  .onBegin(() => console.log('Pan began'))
  .onUpdate(() => console.log('Pan update'))  
  .onEnd(() => console.log('Pan ended'));
```

2. **Check Gesture States:**
```jsx
const gesture = Gesture.Pan()
  .onTouchesDown((e, manager) => {
    console.log('Touches:', e.numberOfTouches);
  })
  .onTouchesUp((e, manager) => {
    if (e.numberOfTouches === 0) {
      manager.end();
    }
  });
```

3. **Test Gesture Recognition:**
```jsx
const gesture = Gesture.Pan()
  .shouldCancelWhenOutside(true) // Cancel if finger leaves view
  .hitSlop({ left: -20, right: -20 }) // Extend hit area
  .onStart(() => {
    console.log('Gesture recognized');
  });
```

---

## Best Practices Summary

1. **Always use gesture handler's ScrollView** for better integration
2. **Wrap apps with GestureHandlerRootView** at the root level
3. **Use Gesture.Native()** for scroll gesture references
4. **Configure directional constraints** to prevent conflicts
5. **Memoize gestures** to prevent unnecessary recreations
6. **Use platform-specific configurations** for optimal UX
7. **Test on all target platforms**, especially web behavior
8. **Handle edge cases** like modals and transformed views
9. **Use native driver** for animations whenever possible
10. **Debug with console logging** during development

This integration guide covers the essential patterns for successfully combining ScrollView with React Native Gesture Handler while avoiding common pitfalls and conflicts.