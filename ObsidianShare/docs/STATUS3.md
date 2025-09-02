# TextInput + GestureDetector Conflict - Debugging Status Report

## The Problem
**Core Issue**: React Native TextInput becomes unresponsive when wrapped by GestureDetector with Pan gesture for drawer functionality.

**Symptoms**:
- TextInput doesn't respond to taps/touches
- Keyboard doesn't appear when TextInput is tapped
- Console shows: `Pan gesture FINALIZE: {state: 1, translationX: '0.0', velocityX: '0.0'}` for every tap
- App crashes when adding debug logs to worklets

## Current Architecture
```jsx
// ProgressiveDrawer wraps entire app content
<GestureDetector gesture={contentPanGesture}>
  <Animated.View style={[styles.content, contentAnimatedStyle]}>
    {children} // Contains WelcomeScreen with ChatInput
  </Animated.View>
</GestureDetector>

// ChatInput has its own priority gesture (recent addition)
<GestureDetector gesture={textInputPriorityGesture}>
  <View style={inputContainerStyle}>
    <TextInput /> // This doesn't work
  </View>
</GestureDetector>
```

## Attempted Solutions & Results

### 1. TouchableOpacity → BorderlessButton
- **Tried**: Replaced TouchableOpacity with BorderlessButton for send button
- **Result**: ❌ Didn't solve TextInput issue, only affected send button

### 2. Manual Activation with Movement Detection
- **Tried**: `manualActivation(true)` + custom `onTouchesDown`/`onTouchesMove` logic
- **Implementation**: Only activate pan gesture after 25px+ horizontal movement
- **Result**: ❌ Gesture still claims all touch events immediately, TextInput never gets them
- **Issue**: Even with manual activation, `onTouchesDown` is called for every touch

### 3. Thread Safety Fixes
- **Tried**: Using `useSharedValue` instead of regular variables in worklets
- **Tried**: Proper `runOnJS()` syntax for console.log in worklets
- **Result**: ❌ Still crashes when adding debug logs to worklets
- **Current**: Running without logs to avoid crashes, but core issue remains

### 4. Context7 Research Solutions
- **Tried**: `cancelsTouchesInView(false)` (iOS-specific)
- **Tried**: `simultaneousWithExternalGesture(true)`
- **Tried**: `blocksExternalGesture(false)`
- **Tried**: ChatInput priority gesture with `Gesture.Tap()`
- **Result**: ❌ TextInput still unresponsive

### 5. Gesture Configuration Variations
- **Tried**: Various `activeOffsetX/Y` values ([-20,20], [-30,30], [-40,40])
- **Tried**: `failOffsetY` configurations
- **Tried**: `minDistance` settings (15px, 25px, 30px)
- **Tried**: `shouldCancelWhenOutside(true/false)`
- **Result**: ❌ No improvement in TextInput responsiveness

### 6. Alternative Gesture Types
- **Tried**: `Gesture.Native()` instead of `Gesture.Pan()`
- **Tried**: `Gesture.Manual()` with custom logic
- **Result**: ❌ Either didn't work or caused other issues

## Current Code State
```jsx
// ProgressiveDrawer gesture configuration
const createPanGesture = () => Gesture.Pan()
  .manualActivation(true)
  .shouldCancelWhenOutside(false)
  .cancelsTouchesInView(false)     // iOS-specific
  .minDistance(15)
  .blocksExternalGesture(false)
  .simultaneousWithExternalGesture(true)
  .onTouchesDown((event, manager) => {
    // Claims touch immediately, stores position
  })
  .onTouchesMove((event, manager) => {
    // Only activates after 25px+ horizontal movement
    // But TextInput never gets the touch by this point
  })
```

## Key Insights Discovered

### 1. The Fundamental Problem
- **GestureDetector wrapping content = claims ALL touch events immediately**
- Even with `manualActivation(true)`, `onTouchesDown` fires for every touch
- TextInput never receives touch events because they're consumed by gesture handler
- `FINALIZE {state: 1}` means gesture failed, but damage already done

### 2. Thread Safety is Secondary
- The thread safety issues (crashes) are real but separate from main problem
- Core issue is touch event interception, not thread communication
- Fixing crashes doesn't solve TextInput unresponsiveness

### 3. Properties Don't Solve Root Cause
- `cancelsTouchesInView`, `simultaneousWithExternalGesture` etc. help but don't fix fundamental issue
- These properties work for minor conflicts, not when parent gesture wraps entire content

## Failed Debugging Attempts
- **Console logs in worklets**: Cause immediate app crashes
- **Complex state management**: Overengineered, doesn't address root cause  
- **Multiple gesture priorities**: Added complexity without solving core issue

## What We Haven't Tried Yet

### 1. Architecture Change
- **Move GestureDetector OFF main content**: Only apply to specific edge areas
- **Separate gesture zones**: TextInput areas completely outside gesture detection
- **React Navigation DrawerNavigator**: Use battle-tested solution instead of custom

### 2. Alternative Touch Handling
- **Native touch responder system**: Use React Native's built-in touch handling
- **Pressable with gesture coordination**: Combine Pressable with gesture logic
- **Portal/Modal approach**: TextInput in different render tree

### 3. Edge-Only Activation (Properly Implemented)
- **True edge detection**: Only activate gesture from screen edges (0-50px from left)
- **Center area exclusion**: 90% of screen has no gesture detection
- **User education**: Drawer only opens from left edge (common UX pattern)

## Conclusion
Current approach of wrapping entire content in GestureDetector is fundamentally flawed for apps containing interactive components like TextInput. The gesture handler will always intercept touches before child components can respond.

**Most promising next step**: Architectural change to limit gesture detection to specific screen areas, leaving TextInput areas completely unaffected by gesture handling.

**Alternative**: Switch to React Navigation DrawerNavigator which has solved these exact conflicts in production apps.

## Technical Debt
- Multiple failed approaches have left code complex and hard to debug
- Worklet logging is unreliable, making debugging difficult  
- Manual activation logic is sophisticated but ineffective for this use case

## Latest Update: runOnJS Crash Fix (Context7 Research)

### Problem Identified
**runOnJS crashes caused by incorrect usage patterns**:
- ❌ Functions defined inside worklets: `runOnJS(() => console.log('msg'))()`
- ❌ Inline function creation in UI thread scope
- ❌ Wrong argument passing syntax

### Solution Applied
```jsx
// ✅ CORRECT: Define functions in component scope (JS thread)
const debugLog = (message, data) => {
  console.log(`[ProgressiveDrawer] ${message}:`, data);
};

const logTouchEvent = (eventType, x, y) => {
  console.log(`[Touch] ${eventType}:`, { x, y });
};

// ✅ CORRECT: Use predefined functions in worklets
.onTouchesDown((event, manager) => {
  'worklet';
  runOnJS(logTouchEvent)(
    'onTouchesDown', 
    event.allTouches[0].x.toFixed(1), 
    event.allTouches[0].y.toFixed(1)
  );
})
```

### Key Learning
**runOnJS Rule**: Functions must be defined in JS thread scope, not inside worklets. The worklet can only call pre-existing JS functions via runOnJS bridge.

### Status
- ✅ **Crash-free debugging now possible**
- 🔄 **Core TextInput issue remains unresolved** - debugging logs will help identify root cause
- 📊 **Next step**: Analyze touch event flow to understand where TextInput loses touch events