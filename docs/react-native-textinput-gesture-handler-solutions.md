# React Native TextInput + Gesture Handler Solutions

## Overview
This document provides comprehensive solutions for TextInput compatibility issues with react-native-gesture-handler, specifically addressing cases where TextInput becomes unresponsive after implementing pan gestures for drawer functionality.

## Common Problem
When using `react-native-gesture-handler` with DrawerNavigator or custom pan gestures, TextInput components often stop responding to touch events due to gesture handler interference.

## Core Solutions

### 1. TextInput `rejectResponderTermination` Property (iOS)

**Most Important Solution**: Use the `rejectResponderTermination` prop to control touch event handling.

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

### 2. Gesture Handler `simultaneousWithExternalGesture` Configuration

Configure pan gestures to work simultaneously with TextInput touches:

```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Create separate gesture instances for drawer and TextInput areas
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

### 3. Using `Gesture.Native()` for ScrollView/DrawerNavigator Integration

When using React Navigation's DrawerNavigator, use `Gesture.Native()` to properly integrate with native gesture handling:

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
  // TextInput that doesn't block the scroll gesture
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

### 4. `blocksExternalGesture` for Priority Control

Use `blocksExternalGesture` when TextInput needs gesture priority:

```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function ChatInputWithPriority({ drawerGesture }) {
  const textInputGesture = Gesture.Pan()
    .blocksExternalGesture(drawerGesture) // Prevents drawer from opening when typing
    .onBegin(() => {
      console.log('TextInput gesture started');
    });

  return (
    <GestureDetector gesture={textInputGesture}>
      <TextInput
        rejectResponderTermination={false}
        placeholder="Type message..."
        style={styles.textInput}
      />
    </GestureDetector>
  );
}
```

### 5. Capture Phase Handlers for Parent Controls

Use capture phase handlers in parent components to control gesture precedence:

```javascript
import { View } from 'react-native';

function ParentContainer() {
  const handleStartShouldSetResponderCapture = (evt) => {
    // Return true to prevent child TextInput from becoming responder
    return false; // Allow TextInput to handle touches
  };

  const handleMoveShouldSetResponderCapture = (evt) => {
    // Control whether parent can steal touch events during movement
    return Math.abs(evt.nativeEvent.dx) > 20; // Only steal if horizontal movement > 20px
  };

  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={handleStartShouldSetResponderCapture}
      onMoveShouldSetResponderCapture={handleMoveShouldSetResponderCapture}
    >
      <TextInput
        placeholder="Type here..."
        style={styles.input}
      />
    </View>
  );
}
```

## Specific Drawer + TextInput Implementation

Here's a complete example for a chat input with drawer functionality:

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
      // Handle drawer opening logic
      if (Math.abs(event.translationX) > 50) {
        // Open drawer
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
  },
});

export default ChatInputScreen;
```

## Advanced Configuration Patterns

### Pattern 1: Gesture Priority Zones

Create different gesture handling zones in your app:

```javascript
// High priority zone (TextInput always responds)
const highPriorityGesture = Gesture.Pan()
  .blocksExternalGesture(drawerGesture)
  .activeOffsetX([-10, 10]); // Small activation threshold

// Low priority zone (Drawer can interrupt)
const lowPriorityGesture = Gesture.Pan()
  .simultaneousWithExternalGesture(drawerGesture)
  .activeOffsetX([-30, 30]); // Larger activation threshold
```

### Pattern 2: Conditional Gesture Handling

```javascript
function ConditionalGestureInput({ isDrawerLocked }) {
  const gesture = React.useMemo(() => {
    if (isDrawerLocked) {
      // When drawer is locked, TextInput gets all touches
      return Gesture.Pan().shouldCancelWhenOutside(false);
    } else {
      // When drawer is active, allow simultaneous gestures
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

### Pattern 3: Touch Area Detection

```javascript
const smartGesture = Gesture.Pan()
  .onBegin((event) => {
    const { x, y } = event;
    // If touch is near text input area, prioritize input
    if (y > screenHeight - 100) {
      textInputPriority.value = true;
    }
  })
  .simultaneousWithExternalGesture(drawerGesture);
```

## Debugging Tips

### 1. Add Touch Event Logging

```javascript
<TextInput
  onPressIn={(event) => console.log('TextInput pressed in:', event.nativeEvent)}
  onPressOut={(event) => console.log('TextInput pressed out:', event.nativeEvent)}
  onFocus={() => console.log('TextInput focused')}
  placeholder="Debug input..."
/>
```

### 2. Gesture State Monitoring

```javascript
const debugGesture = Gesture.Pan()
  .onBegin(() => console.log('Gesture began'))
  .onUpdate(() => console.log('Gesture updating'))
  .onEnd(() => console.log('Gesture ended'))
  .onFinalize(() => console.log('Gesture finalized'));
```

### 3. Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| TextInput not responding | No cursor, no keyboard | Set `rejectResponderTermination={false}` |
| Drawer not opening over TextInput | Swipe gestures blocked | Use `simultaneousWithExternalGesture` |
| Keyboard dismisses unexpectedly | Text input loses focus | Check parent gesture capture handlers |
| Double-tap issues | Inconsistent text selection | Implement `Gesture.Exclusive` for tap handling |

## React Native Reanimated Integration

When using react-native-reanimated (automatically installed with gesture-handler):

```javascript
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

function AnimatedTextInput() {
  const inputScale = useSharedValue(1);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      inputScale.value = withSpring(1.05);
    })
    .onFinalize(() => {
      inputScale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <TextInput
          rejectResponderTermination={false}
          placeholder="Animated input..."
        />
      </Animated.View>
    </GestureDetector>
  );
}
```

## Best Practices Summary

1. **Always test on device**: Gesture handling behavior can differ between simulator and device
2. **Start with `rejectResponderTermination={false}`**: Most TextInput issues resolve with this
3. **Use `simultaneousWithExternalGesture`**: For complex gesture interactions
4. **Implement gesture priority zones**: Different areas should have different touch priorities  
5. **Add debug logging**: Monitor gesture states and touch events during development
6. **Consider UX**: Balance between gesture convenience and input reliability
7. **Test with keyboard**: Ensure gestures work correctly when keyboard is visible
8. **Use `Gesture.Native()`**: For integration with React Navigation components

## Platform-Specific Notes

- **iOS**: `rejectResponderTermination` is iOS-only and very effective
- **Android**: May require additional `activeOffsetX/Y` configuration
- **Web**: Use `touchAction="pan-y"` on GestureDetector for scroll compatibility

This comprehensive guide should resolve most TextInput + gesture handler conflicts in React Native applications.