# React Native Gesture Handler & TextInput Issues

> **Consolidation Note**: This document combines `react-native-textinput-gesture-handler-solutions.md` and `ScrollView-GestureHandler-Integration.md` into a comprehensive troubleshooting guide.

## Table of Contents

1. [Common Problems Overview](#common-problems-overview)
2. [TextInput + Gesture Handler Solutions](#textinput--gesture-handler-solutions)
3. [ScrollView Integration Patterns](#scrollview-integration-patterns)
4. [Gesture Coexistence & Conflict Resolution](#gesture-coexistence--conflict-resolution)
5. [Advanced Configuration](#advanced-configuration)
6. [Debugging & Troubleshooting](#debugging--troubleshooting)
7. [Best Practices](#best-practices)

---

## Common Problems Overview

### The Core Issue
When using `react-native-gesture-handler` with DrawerNavigator or custom pan gestures, TextInput components often stop responding to touch events due to gesture handler interference.

### Root Causes
1. **Exclusive Touch Control**: Gesture handlers intercept touches at the native level
2. **TextInput Dependency**: TextInput relies on native touch events for focus/keyboard
3. **Gesture Hierarchy**: Parent gestures can prevent child components from receiving touches
4. **ScrollView Conflicts**: Vertical/horizontal gesture conflicts in scrollable content

---

## TextInput + Gesture Handler Solutions

### 1. TextInput `rejectResponderTermination` Property (iOS)

**Most Important Solution**: Control touch event handling with this iOS-specific prop.

```javascript
import { TextInput } from 'react-native';

// Option 1: Allow parent gestures to take precedence (default: true)
<TextInput
  rejectResponderTermination={true} // Allows swipe gestures on parent components
  placeholder="Type here..."
  style={styles.input}
/>

// Option 2: Force TextInput to handle all touches (prevents parent gestures)
<TextInput
  rejectResponderTermination={false} // TextInput attempts to handle all input
  placeholder="Type here..."
  style={styles.input}
/>
```

**When to use each option:**
- `true` (default): Use when you want drawer swipes to work even when touching the TextInput
- `false`: Use when TextInput is unresponsive and you need it to capture all touch events

### 2. Gesture Handler `simultaneousWithExternalGesture`

Configure pan gestures to work simultaneously with TextInput touches:

```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const drawerPanGesture = Gesture.Pan()
  .onUpdate((event) => {
    // Handle drawer pan gesture
  });

// Configure TextInput wrapper to allow simultaneous gestures
const textInputGesture = Gesture.Pan()
  .shouldCancelWhenOutside(false)
  .simultaneousWithExternalGesture(drawerPanGesture);

function ChatInput() {
  return (
    <GestureDetector gesture={textInputGesture}>
      <View style={styles.inputContainer}>
        <TextInput
          rejectResponderTermination={false}
          placeholder="Type your message..."
          style={styles.textInput}
        />
      </View>
    </GestureDetector>
  );
}
```

### 3. Using `Gesture.Native()` for ScrollView/DrawerNavigator

Use `Gesture.Native()` to properly integrate with React Navigation components:

```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ScrollView } from 'react-native';

function ChatScreen() {
  const native = Gesture.Native();
  
  return (
    <GestureDetector gesture={native}>
      <ScrollView style={{ flex: 1 }}>
        <ChatInput scrollGesture={native} />
      </ScrollView>
    </GestureDetector>
  );
}

function ChatInput({ scrollGesture }) {
  const textInputPan = Gesture.Pan()
    .simultaneousWithExternalGesture(scrollGesture);

  return (
    <GestureDetector gesture={textInputPan}>
      <View style={styles.inputContainer}>
        <TextInput
          rejectResponderTermination={true}
          placeholder="Type message..."
          style={styles.textInput}
        />
      </View>
    </GestureDetector>
  );
}
```

### 4. Complete Drawer + TextInput Implementation

```javascript
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDrawerStatus } from '@react-navigation/drawer';

function ChatInputScreen() {
  const drawerStatus = useDrawerStatus();
  
  // Configure gesture for drawer opening (edge swipe)
  const drawerOpenGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Only activate near screen edges
    .onUpdate((event) => {
      if (Math.abs(event.translationX) > 50) {
        // Open drawer logic
      }
    });

  // Configure TextInput area gesture
  const textInputAreaGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(drawerOpenGesture)
    .shouldCancelWhenOutside(false);

  return (
    <View style={styles.container}>
      {/* Main content area */}
      <GestureDetector gesture={drawerOpenGesture}>
        <View style={styles.messagesContainer}>
          {/* Messages list */}
        </View>
      </GestureDetector>
      
      {/* Input area with priority touch handling */}
      <GestureDetector gesture={textInputAreaGesture}>
        <View style={styles.inputContainer}>
          <TextInput
            rejectResponderTermination={false} // Ensure TextInput gets touches
            placeholder="Type your message..."
            style={styles.textInput}
            multiline
            onPressIn={() => console.log('TextInput pressed')}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
```

---

## ScrollView Integration Patterns

### Basic ScrollView Setup

Always use ScrollView from gesture handler for better integration:

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

### Native Gesture Reference Pattern

```jsx
import { View, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
      {ITEMS.map((item) => (
        <InteractiveItem key={item} scrollGesture={scrollGesture} />
      ))}
    </View>
  );
}

function InteractiveItem({ scrollGesture }) {
  // Pan gesture that blocks the scroll gesture when active
  const pan = Gesture.Pan().blocksExternalGesture(scrollGesture);

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.interactiveArea} />
    </GestureDetector>
  );
}
```

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

function ZoomableItem({ backgroundColor, scrollRef }) {
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
          { backgroundColor },
          styles.item,
          animatedStyles,
        ]}
      />
    </GestureDetector>
  );
}
```

---

## Gesture Coexistence & Conflict Resolution

### Directional Gesture Separation

Prevent conflicts by constraining gesture directions:

```jsx
const horizontalPan = Gesture.Pan()
  .activeOffsetX([-10, 10])  // Only activate for horizontal movement
  .failOffsetY([-10, 10]);   // Fail if moving vertically

const verticalPan = Gesture.Pan()
  .activeOffsetY([-10, 10])  // Only activate for vertical movement  
  .failOffsetX([-10, 10]);   // Fail if moving horizontally
```

### Multi-Touch Gesture Control

```jsx
const singleFingerPan = Gesture.Pan()
  .minPointers(1)
  .maxPointers(1); // Single finger only

const twoFingerPinch = Gesture.Pinch()
  .minPointers(2); // Requires two fingers
```

### Gesture Priority Zones

Create different zones with different touch priorities:

```jsx
// High priority zone (TextInput always responds)
const highPriorityGesture = Gesture.Pan()
  .blocksExternalGesture(drawerGesture)
  .activeOffsetX([-10, 10]); // Small activation threshold

// Low priority zone (Drawer can interrupt)
const lowPriorityGesture = Gesture.Pan()
  .simultaneousWithExternalGesture(drawerGesture)
  .activeOffsetX([-30, 30]); // Larger activation threshold
```

### Conditional Gesture Handling

```jsx
function ConditionalGestureInput({ isDrawerLocked }) {
  const gesture = React.useMemo(() => {
    if (isDrawerLocked) {
      return Gesture.Pan().shouldCancelWhenOutside(false);
    } else {
      return Gesture.Pan()
        .simultaneousWithExternalGesture(drawerGesture)
        .activeOffsetX([-15, 15]);
    }
  }, [isDrawerLocked]);

  return (
    <GestureDetector gesture={gesture}>
      <TextInput
        rejectResponderTermination={!isDrawerLocked}
        placeholder="Type message..."
      />
    </GestureDetector>
  );
}
```

---

## Advanced Configuration

### Web-Specific Configuration

For web platforms, configure `touchAction` to ensure proper scrolling:

```jsx
<GestureDetector 
  gesture={customGesture}
  touchAction="pan-y"           // Allow vertical scrolling
  userSelect="none"             // Prevent text selection
  enableContextMenu={false}     // Disable right-click menu
>
  <ScrollView>
    {/* Content */}
  </ScrollView>
</GestureDetector>
```

### iOS Touch Cancellation Control

```jsx
const gesture = Gesture.Tap()
  .cancelsTouchesInView(false) // Allow native components to receive touches
  .onStart(() => {
    // Handle tap
  });
```

### Capture Phase Handlers

Control gesture precedence at the parent level:

```jsx
function ParentContainer() {
  const handleStartShouldSetResponderCapture = (evt) => {
    return false; // Allow TextInput to handle touches
  };

  const handleMoveShouldSetResponderCapture = (evt) => {
    // Only steal if horizontal movement > 20px (drawer gesture)
    return Math.abs(evt.nativeEvent.dx) > 20;
  };

  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={handleStartShouldSetResponderCapture}
      onMoveShouldSetResponderCapture={handleMoveShouldSetResponderCapture}
    >
      <TextInput placeholder="Type here..." />
    </View>
  );
}
```

---

## Debugging & Troubleshooting

### Add Touch Event Logging

```javascript
<TextInput
  onPressIn={(event) => console.log('TextInput pressed in:', event.nativeEvent)}
  onPressOut={(event) => console.log('TextInput pressed out:', event.nativeEvent)}
  onFocus={() => console.log('TextInput focused')}
  placeholder="Debug input..."
/>
```

### Gesture State Monitoring

```javascript
const debugGesture = Gesture.Pan()
  .onBegin(() => console.log('Gesture began'))
  .onUpdate(() => console.log('Gesture updating'))  
  .onEnd(() => console.log('Gesture ended'))
  .onFinalize(() => console.log('Gesture finalized'));
```

### Common Issues & Quick Fixes

| Issue | Symptoms | Solution |
|-------|----------|----------|
| TextInput not responding | No cursor, no keyboard | Set `rejectResponderTermination={false}` |
| Drawer not opening over TextInput | Swipe gestures blocked | Use `simultaneousWithExternalGesture` |
| Keyboard dismisses unexpectedly | Text input loses focus | Check parent gesture capture handlers |
| Double-tap issues | Inconsistent text selection | Implement `Gesture.Exclusive` for tap handling |
| Scroll conflicts | Vertical/horizontal gesture interference | Use directional constraints (`activeOffsetX/Y`) |

### Platform-Specific Issues

#### Android
- May require additional `activeOffsetX/Y` configuration
- Test touch behavior thoroughly on actual devices

#### iOS  
- `rejectResponderTermination` is iOS-only but very effective
- `cancelsTouchesInView` provides additional control

#### Web
- Use `touchAction="pan-y"` for scroll compatibility
- Configure `userSelect` and `enableContextMenu` as needed

---

## Best Practices

### Design Guidelines
1. **Separate gesture zones** - Avoid TextInput within active gesture areas when possible
2. **Edge-based drawer gestures** - Use `activeOffsetX` to limit drawer activation to screen edges
3. **Clear visual feedback** - Indicate when gestures are active vs. text input mode

### Implementation Guidelines
1. **Always test on device** - Gesture behavior differs between simulator and device
2. **Start with `rejectResponderTermination={false}`** - Most TextInput issues resolve with this
3. **Use `simultaneousWithExternalGesture`** for complex gesture interactions
4. **Implement gesture priority zones** - Different areas should have different touch priorities  
5. **Add debug logging** - Monitor gesture states during development
6. **Consider UX balance** - Balance between gesture convenience and input reliability
7. **Test with keyboard visible** - Ensure gestures work correctly when keyboard is shown
8. **Use `Gesture.Native()`** for React Navigation component integration

### Performance Guidelines
1. **Memoize gestures** - Prevent unnecessary recreations with `React.useMemo`
2. **Use native driver** - For reanimated animations
3. **Conditional enabling** - Disable gestures when not needed with `enabled(false)`
4. **Limit active gestures** - Don't run unnecessary gesture handlers simultaneously

### Architecture Guidelines
1. **Layer gesture handlers logically** - Parent/child gesture relationships should be clear
2. **Keep gesture logic close to UI** - Don't separate gesture configuration from components
3. **Handle edge cases** - Modal containers, transformed views, etc.
4. **Plan for accessibility** - Ensure gesture interactions work with screen readers

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Multiple instances of react-native-gesture-handler" | Version conflicts | Add resolution to package.json |
| "Gesture instance reuse error" | Same gesture used multiple times | Create separate instances for each detector |
| "Cannot use gesture handler outside GestureHandlerRootView" | Missing root wrapper | Wrap app with GestureHandlerRootView |
| "TextInput not responding to touch" | Gesture interference | Use rejectResponderTermination={false} |

### Quick Fixes
```bash
# Version resolution in package.json
{
  "resolutions": {
    "react-native-gesture-handler": "^2.x.x"
  }
}

# Modal gesture support (Android)
<Modal>
  <GestureHandlerRootView style={{ flex: 1 }}>
    {children}
  </GestureHandlerRootView>
</Modal>
```

---

This comprehensive guide should resolve most TextInput + gesture handler conflicts and ScrollView integration issues in React Native applications. The key is understanding the gesture hierarchy and using the appropriate configuration for your specific use case.