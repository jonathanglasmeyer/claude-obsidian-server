# React Native Gesture Handler: TextInput Touch Event Propagation Research

## Executive Summary

Based on comprehensive research of official react-native-gesture-handler documentation, **there is no built-in API for selective touch event forwarding to child components like TextInput**. The library is designed with gesture handlers taking full control of touch events when active, which creates challenges for TextInput focus and keyboard interaction within gesture areas.

## Key Findings

### 1. Touch Event Control Philosophy

React Native Gesture Handler operates on the principle that **gesture handlers have exclusive control over touch events** when they become active. This design is intentional for performance and predictable gesture recognition.

- When a `GestureDetector` wraps a view, it intercepts all touch events
- Child components (including TextInput) do not receive native touch events during gesture recognition
- This is by design to prevent conflicts between gesture handlers and native UI components

### 2. No Official Touch Forwarding APIs

The documentation contains **no APIs or patterns** for:
- Selective touch event forwarding to children
- Manual event routing/delegation to specific child components
- Bypassing gesture handler touch interception
- Conditional touch passing based on target component type

### 3. Available Gesture Control APIs

While there's no touch forwarding, these APIs control gesture behavior:

#### `shouldCancelWhenOutside(value: boolean)`
```javascript
const gesture = Gesture.Pan().shouldCancelWhenOutside(true);
```
- **Purpose**: Cancels gesture when finger leaves view area
- **Default**: `false` for most handlers, `true` for `TapGesture` and `LongPressGesture`
- **Use Case**: Prevents gestures from continuing outside boundaries

#### `hitSlop(settings)`
```javascript
const gesture = Gesture.Pan().hitSlop({ left: 20, right: 20, top: 20, bottom: 20 });
// or
const gesture = Gesture.Pan().hitSlop(-10); // reduce active area by 10 points on all sides
```
- **Purpose**: Controls which part of view can begin gesture recognition
- **Primary Use**: Reducing active gesture area (negative values)
- **Limitation**: Cannot exclude specific child regions

#### `simultaneousWithExternalGesture(...)`
```javascript
const innerTap = Gesture.Tap();
const outerTap = Gesture.Tap().simultaneousWithExternalGesture(innerTap);
```
- **Purpose**: Allows multiple gestures to be recognized simultaneously
- **Use Case**: Nested gesture handlers that should both fire
- **Limitation**: Only works between gesture handlers, not with native components

#### `requireExternalGestureToFail(...)`
```javascript
const doubleTap = Gesture.Tap().numberOfTaps(2);
const singleTap = Gesture.Tap().requireExternalGestureToFail(doubleTap);
```
- **Purpose**: Makes one gesture wait for another to fail
- **Use Case**: Single/double tap disambiguation
- **Limitation**: Only works between gesture handlers

### 4. iOS-Specific: `cancelsTouchesInView` (iOS only)
```javascript
const gesture = Gesture.Pan().cancelsTouchesInView(false);
```
- **Purpose**: Controls if gesture cancels touches for native UI components when active
- **Default**: `true`
- **Platform**: iOS only
- **Note**: This is the closest API to touch forwarding, but still doesn't provide selective forwarding

### 5. Web-Specific: `touchAction`
```jsx
<GestureDetector gesture={gesture} touchAction="pan-y">
  <View />
</GestureDetector>
```
- **Purpose**: Controls CSS touch-action property for web
- **Use Case**: Allowing vertical scrolling while handling horizontal gestures
- **Platform**: Web only
- **Limitation**: CSS-level control, not component-specific

## Official Patterns and Examples

### Nested Gesture Handlers (Supported)
```jsx
const innerTap = Gesture.Tap().onStart(() => console.log('inner'));
const outerTap = Gesture.Tap()
  .onStart(() => console.log('outer'))
  .simultaneousWithExternalGesture(innerTap);

return (
  <GestureDetector gesture={outerTap}>
    <View style={styles.outer}>
      <GestureDetector gesture={innerTap}>
        <View style={styles.inner} />
      </GestureDetector>
    </View>
  </GestureDetector>
);
```

### Native UI Components (iOS-specific control)
```jsx
// iOS only - can prevent gesture from cancelling native touches
const gesture = Gesture.Pan().cancelsTouchesInView(false);
```

### Manual Gesture with Touch Callbacks
```javascript
const gesture = Gesture.Manual()
  .onTouchesDown((e, manager) => {
    // Access raw touch events
    for (const touch of e.changedTouches) {
      console.log(touch.x, touch.y);
    }
  })
  .onTouchesMove((e, manager) => {
    // Track touch movement
  })
  .onTouchesUp((e, manager) => {
    // Handle touch release
    if (e.numberOfTouches === 0) {
      manager.end();
    }
  });
```

## Alternative Approaches (Not in Official Docs)

Since there's no official touch forwarding API, developers typically use these workarounds:

### 1. Layout-Based Solutions
- Position TextInput outside gesture areas
- Use absolute positioning to overlay TextInput
- Create gesture-free zones for interactive elements

### 2. Conditional Gesture Activation
```javascript
const gesture = Gesture.Pan()
  .onBegin((event) => {
    // Check if touch started over TextInput area
    if (isTouchOverTextInput(event.x, event.y)) {
      // Don't activate gesture - but this still prevents TextInput from receiving the event
      return;
    }
  });
```

### 3. State-Based Gesture Control
- Enable/disable gestures based on app state
- Use `enabled(false)` to temporarily disable gestures

### 4. Native Module Extensions
- Create custom native modules for specific touch routing needs
- Implement platform-specific touch delegation

## Technical Limitations

### Root Cause
The fundamental issue stems from React Native's touch handling architecture:

1. **Native Touch System**: React Native uses native responder chains
2. **Gesture Handler Override**: RNGH intercepts touches at the native level
3. **Exclusive Control**: Once intercepted, touches don't reach React Native's touch system
4. **TextInput Dependency**: TextInput relies on native touch events for focus/keyboard

### Performance Considerations
The exclusive touch control is intentional for:
- **Predictable Behavior**: Prevents touch conflicts between gestures and UI
- **Performance**: Native-level gesture recognition without JS bridge overhead
- **Platform Consistency**: Uniform behavior across iOS/Android

## Recommendations

### For TextInput + Gesture Use Cases

1. **Architectural Approach**: Design UI to avoid TextInput within gesture areas
2. **Layout Solutions**: Use separate zones for gestures vs. text input
3. **State Management**: Toggle gesture handlers based on user interaction mode
4. **Platform-Specific**: Consider iOS-specific `cancelsTouchesInView(false)` for limited cases

### Not Recommended
- Attempting to manually forward touch events (not supported)
- Complex workarounds trying to bypass gesture handler control
- Expecting native TextInput behavior within active gesture areas

## Conclusion

React Native Gesture Handler's architecture prioritizes predictable, high-performance gesture recognition over flexible touch event routing. **There is no official way to selectively pass touches to child components like TextInput** while maintaining gesture handler functionality.

The recommended approach is to design UIs that separate gesture-interactive areas from text input areas, rather than attempting to mix them in the same view hierarchy.

---

*Research based on official react-native-gesture-handler documentation (287+ code snippets analyzed)*
*Generated: 2025-09-02*